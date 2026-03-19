"""
과거 뉴스 데이터 디베이트용 파일 내보내기 스크립트

GPU 서버에 적재할 과거 뉴스 데이터를 날짜별 JSON 파일로 생성한다.
각 날짜별로:
  1) 당일+전날 키워드 중 언급 횟수 상위 3개 + 키워드당 뉴스 원문/URL 2건
  2) 종목별 감성 지수 집계

사용법:
  # 전체 기간 내보내기
  python -m scripts.export_news_debate_data

  # 날짜 범위 지정
  python -m scripts.export_news_debate_data --start 2026-01-01 --end 2026-03-19

  # 출력 디렉토리 변경
  python -m scripts.export_news_debate_data --output ./output/debate_data

  # 키워드 수/뉴스 수 조정
  python -m scripts.export_news_debate_data --top-k 5 --news-per-keyword 3

  # ZIP 압축 파일로 내보내기
  python -m scripts.export_news_debate_data --zip

  # 월별 ZIP 파일로 내보내기
  python -m scripts.export_news_debate_data --zip --monthly

  # 25년 1월~3월 월별 ZIP
  python -m scripts.export_news_debate_data --start 2025-01-01 --end 2025-03-18 --zip --monthly
"""

import argparse
import json
import logging
import sys
import zipfile
from datetime import date, timedelta
from pathlib import Path

# 3_ai_server 루트를 sys.path에 추가
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.config import SessionLocal
from domains.news import crud

logger = logging.getLogger(__name__)


def get_available_date_range(db) -> tuple[date | None, date | None]:
    """DB에서 뉴스가 존재하는 최소/최대 날짜를 조회한다."""
    from sqlalchemy import func, select
    from domains.news.models import StockNews

    stmt = select(
        func.min(func.date(StockNews.published_at)),
        func.max(func.date(StockNews.published_at)),
    )
    row = db.execute(stmt).first()
    if row and row[0] and row[1]:
        return row[0], row[1]
    return None, None


def export_single_date(
    db,
    report_date: date,
    top_k: int = 3,
    news_per_keyword: int = 2,
) -> dict:
    """
    단일 날짜의 디베이트용 뉴스 데이터를 딕셔너리로 생성한다.

    처리 내용:
      - 당일+전날 키워드 중 언급 횟수 상위 top_k개 추출
      - 각 키워드별 뉴스 원문/URL을 news_per_keyword건 조회
      - 종목별 감성 지수 집계
    """
    start_date = report_date - timedelta(days=1)
    end_date = report_date

    # 1. 상위 키워드 + 뉴스
    top_keywords_raw = crud.get_top_keywords_by_date_range(
        db, start_date=start_date, end_date=end_date, top_k=top_k
    )

    top_keywords = []
    for kw in top_keywords_raw:
        news_rows = crud.get_news_by_keyword(
            db,
            keyword_id=kw["keyword_id"],
            start_date=start_date,
            end_date=end_date,
            limit=news_per_keyword,
        )
        top_keywords.append({
            "keyword": kw["name"],
            "mention_count": kw["count"],
            "news": [
                {
                    "news_id": n["news_id"],
                    "title": n["title"],
                    "snippet": n["snippet"],
                    "url": n["url"],
                    "published_at": n["published_at"].isoformat() if n["published_at"] else None,
                }
                for n in news_rows
            ],
        })

    # 2. 감성 지수
    sentiment_raw = crud.get_sentiment_indices_by_date_range(
        db, start_date=start_date, end_date=end_date
    )
    sentiment_indices = [
        {
            "stock_id": s["stock_id"],
            "ticker": s["ticker"],
            "stock_name": s["stock_name"],
            "avg_sentiment_score": float(s["avg_score"]) if s["avg_score"] is not None else None,
            "positive_count": s["positive"],
            "negative_count": s["negative"],
            "neutral_count": s["neutral"],
            "total_news_count": s["total"],
        }
        for s in sentiment_raw
    ]

    return {
        "report_date": report_date.isoformat(),
        "top_keywords": top_keywords,
        "sentiment_indices": sentiment_indices,
    }


def _get_monthly_ranges(start_date: date, end_date: date) -> list[tuple[date, date]]:
    """날짜 범위를 월별로 분할한다. 반환: [(월_시작, 월_끝), ...]"""
    ranges = []
    current = start_date
    while current <= end_date:
        # 해당 월의 마지막 날 계산
        if current.month == 12:
            month_end = date(current.year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(current.year, current.month + 1, 1) - timedelta(days=1)
        month_end = min(month_end, end_date)
        ranges.append((current, month_end))
        # 다음 월 첫날로 이동
        current = month_end + timedelta(days=1)
    return ranges


def run_export(
    start_date: date | None = None,
    end_date: date | None = None,
    output_dir: str = "./output/debate_news_data",
    top_k: int = 3,
    news_per_keyword: int = 2,
    as_zip: bool = False,
    monthly: bool = False,
) -> None:
    """
    날짜 범위의 디베이트용 뉴스 데이터를 JSON 파일로 내보낸다.
    --zip: ZIP 압축, --monthly: 월별 분할 (ZIP과 함께 사용 시 월별 ZIP 생성)
    """
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    db = SessionLocal()
    try:
        # 날짜 범위 결정
        if start_date is None or end_date is None:
            db_min, db_max = get_available_date_range(db)
            if db_min is None or db_max is None:
                logger.error("DB에 뉴스 데이터가 없습니다.")
                return
            start_date = start_date or (db_min + timedelta(days=1))
            end_date = end_date or db_max

        logger.info("내보내기 범위: %s ~ %s", start_date, end_date)

        # 월별 분할 또는 전체를 하나의 범위로
        if monthly:
            ranges = _get_monthly_ranges(start_date, end_date)
            logger.info("월별 분할: %d개월", len(ranges))
        else:
            ranges = [(start_date, end_date)]

        total_exported = 0
        total_skipped = 0

        for range_start, range_end in ranges:
            current = range_start
            exported = 0
            skipped = 0
            zip_entries: list[tuple[str, str]] = []

            while current <= range_end:
                try:
                    data = export_single_date(
                        db,
                        report_date=current,
                        top_k=top_k,
                        news_per_keyword=news_per_keyword,
                    )

                    if data["top_keywords"] or data["sentiment_indices"]:
                        filename = f"{current.isoformat()}.json"
                        content = json.dumps(data, ensure_ascii=False, indent=2)

                        if as_zip:
                            zip_entries.append((filename, content))
                        else:
                            # 월별 모드: 월별 하위 폴더에 저장
                            if monthly:
                                month_dir = out_path / f"{current.year}-{current.month:02d}"
                                month_dir.mkdir(parents=True, exist_ok=True)
                                filepath = month_dir / filename
                            else:
                                filepath = out_path / filename
                            with open(filepath, "w", encoding="utf-8") as f:
                                f.write(content)

                        exported += 1
                        if exported % 10 == 0:
                            logger.info("  ... %d일 완료 (현재: %s)", exported, current)
                    else:
                        skipped += 1

                except Exception as e:
                    logger.warning("날짜 %s 처리 실패: %s", current, e)
                    db.rollback()
                    skipped += 1

                current += timedelta(days=1)

            # ZIP 파일 생성
            if as_zip and zip_entries:
                if monthly:
                    zip_name = f"debate_news_{range_start.year}-{range_start.month:02d}.zip"
                else:
                    zip_name = f"debate_news_{start_date.isoformat()}_{end_date.isoformat()}.zip"
                zip_path = out_path / zip_name
                with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
                    for fname, fcontent in zip_entries:
                        zf.writestr(fname, fcontent)
                logger.info("ZIP 생성: %s (%d개 파일)", zip_path.name, len(zip_entries))

            total_exported += exported
            total_skipped += skipped

        logger.info("내보내기 완료: %d일 생성, %d일 건너뜀", total_exported, total_skipped)
        logger.info("출력 경로: %s", out_path.resolve())

    finally:
        db.close()


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    parser = argparse.ArgumentParser(
        description="과거 뉴스 데이터 디베이트용 파일 내보내기"
    )
    parser.add_argument(
        "--start", type=date.fromisoformat, default=None,
        help="시작 날짜 (YYYY-MM-DD, 기본: DB 최소 날짜+1)",
    )
    parser.add_argument(
        "--end", type=date.fromisoformat, default=None,
        help="종료 날짜 (YYYY-MM-DD, 기본: DB 최대 날짜)",
    )
    parser.add_argument(
        "--output", type=str, default="./output/debate_news_data",
        help="출력 디렉토리 (기본: ./output/debate_news_data)",
    )
    parser.add_argument(
        "--top-k", type=int, default=3,
        help="상위 키워드 수 (기본: 3)",
    )
    parser.add_argument(
        "--news-per-keyword", type=int, default=2,
        help="키워드당 뉴스 수 (기본: 2)",
    )
    parser.add_argument(
        "--zip", action="store_true",
        help="ZIP 압축 파일로 내보내기",
    )
    parser.add_argument(
        "--monthly", action="store_true",
        help="월별로 분할 (ZIP과 함께 사용 시 월별 ZIP 생성)",
    )
    args = parser.parse_args()

    run_export(
        start_date=args.start,
        end_date=args.end,
        output_dir=args.output,
        top_k=args.top_k,
        news_per_keyword=args.news_per_keyword,
        as_zip=args.zip,
        monthly=args.monthly,
    )


if __name__ == "__main__":
    main()
