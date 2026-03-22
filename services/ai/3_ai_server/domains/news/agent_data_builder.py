"""
종목별 뉴스 에이전트 데이터 생성 및 DB 저장

키워드 임베딩 완료 후 호출되어, 종목별로:
  1) 당일+전날 키워드 상위 3개 + 키워드당 뉴스 3건
  2) 종목별 감성 지수
를 집계하여 news_agent_stock_data 테이블에 저장한다.

사용법:
  # 오늘 날짜 (스케줄러 또는 수동)
  python -m domains.news.agent_data_builder

  # 특정 날짜
  python -m domains.news.agent_data_builder --date 2026-03-19

  # 과거 날짜 범위 배치 (DB 적재)
  python -m domains.news.agent_data_builder --start 2025-01-01 --end 2026-03-19

  # 과거 데이터 파일 내보내기 (종목별 폴더/날짜별 JSON)
  python -m domains.news.agent_data_builder --start 2025-01-01 --end 2026-03-19 --export ./output/agent_data

  # 파일 내보내기 + DB 적재 동시
  python -m domains.news.agent_data_builder --start 2025-01-01 --end 2026-03-19 --export ./output/agent_data --save-db
"""
from __future__ import annotations

import json
import logging
from datetime import date, timedelta
from pathlib import Path

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from core.config import SessionLocal
from domains.news import crud
from domains.news.models import NewsAgentStockData, Stock

logger = logging.getLogger(__name__)

def build_stock_agent_data(
    db: Session,
    stock_id: int,
    report_date: date,
    top_k: int = 3,
    news_per_keyword: int = 3,
) -> dict:
    """
    단일 종목의 뉴스 에이전트 데이터를 집계한다.

    반환: {"stock_id", "report_date", "top_keywords": [...], "sentiment": {...}}
    """
    start_date = report_date - timedelta(days=1)
    end_date = report_date

    # 1. 종목별 상위 키워드
    top_keywords_raw = crud.get_top_keywords_by_date_range(
        db, start_date=start_date, end_date=end_date,
        top_k=top_k, stock_id=stock_id,
    )

    # 2. 키워드별 뉴스 조회
    top_keywords = []
    for kw in top_keywords_raw:
        news_rows = crud.get_news_by_keyword(
            db,
            keyword_id=kw["keyword_id"],
            start_date=start_date,
            end_date=end_date,
            limit=news_per_keyword,
            stock_id=stock_id,
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

    # 3. 종목별 감성 지수
    sentiment = crud.get_sentiment_by_stock(
        db, stock_id=stock_id, start_date=start_date, end_date=end_date
    )

    return {
        "stock_id": stock_id,
        "report_date": report_date.isoformat(),
        "top_keywords": top_keywords,
        "sentiment": sentiment,
    }


def save_to_db(db: Session, stock_id: int, report_date: date, data: dict) -> None:
    """종목별 에이전트 데이터를 news_agent_stock_data 테이블에 저장한다. (upsert)"""
    stmt = text("""
        INSERT INTO news_agent_stock_data (stock_id, report_date, top_keywords, sentiment, created_at)
        VALUES (:stock_id, :report_date, CAST(:top_keywords AS jsonb), CAST(:sentiment AS jsonb), now())
        ON CONFLICT (stock_id, report_date)
        DO UPDATE SET
            top_keywords = EXCLUDED.top_keywords,
            sentiment = EXCLUDED.sentiment,
            created_at = now()
    """)
    db.execute(stmt, {
        "stock_id": stock_id,
        "report_date": report_date,
        "top_keywords": json.dumps(data["top_keywords"], ensure_ascii=False),
        "sentiment": json.dumps(data["sentiment"], ensure_ascii=False),
    })
    db.commit()


def save_to_file(ticker: str, report_date: date, data: dict, output_dir: Path) -> None:
    """종목별 에이전트 데이터를 파일로 내보낸다. (종목 폴더/날짜별 JSON)"""
    stock_dir = output_dir / ticker
    stock_dir.mkdir(parents=True, exist_ok=True)
    filepath = stock_dir / f"{report_date.isoformat()}.json"
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def _get_stock_ticker_map(db: Session, stock_ids: list[int]) -> dict[int, str]:
    """종목 ID → ticker 매핑을 조회한다."""
    if not stock_ids:
        return {}
    rows = db.execute(
        select(Stock.id, Stock.ticker).where(Stock.id.in_(stock_ids))
    ).all()
    return {r[0]: r[1] for r in rows}


def run_build_all(
    report_date: date | None = None,
    top_k: int = 3,
    news_per_keyword: int = 3,
) -> dict:
    """
    모든 종목에 대해 뉴스 에이전트 데이터를 생성하고 DB에 저장한다.
    키워드 임베딩 완료 후 스케줄러에서 호출된다.

    반환: {"processed": int, "skipped": int}
    """
    if report_date is None:
        report_date = date.today()

    start_date = report_date - timedelta(days=1)

    db = SessionLocal()
    try:
        stock_ids = crud.get_all_stock_ids_with_news(db, start_date=start_date, end_date=report_date)
        logger.info("뉴스 에이전트 데이터 생성 시작: %d개 종목 (date=%s)", len(stock_ids), report_date)

        processed = 0
        skipped = 0

        for stock_id in stock_ids:
            try:
                data = build_stock_agent_data(
                    db, stock_id=stock_id, report_date=report_date,
                    top_k=top_k, news_per_keyword=news_per_keyword,
                )

                if data["top_keywords"] or data["sentiment"]["total"] > 0:
                    save_to_db(db, stock_id, report_date, data)
                    processed += 1
                else:
                    skipped += 1

            except Exception as e:
                logger.warning("종목 %d 처리 실패: %s", stock_id, e)
                db.rollback()
                skipped += 1

        logger.info("뉴스 에이전트 데이터 생성 완료: %d개 저장, %d개 건너뜀", processed, skipped)
        return {"processed": processed, "skipped": skipped}

    finally:
        db.close()


def run_batch(
    start_date: date,
    end_date: date,
    top_k: int = 3,
    news_per_keyword: int = 3,
    save_db: bool = True,
    export_dir: str | None = None,
    stock_ids_filter: list[int] | None = None,
) -> None:
    """
    과거 날짜 범위에 대해 종목별 에이전트 데이터를 일괄 생성한다.
    --save-db: DB에 저장, --export: 종목별 폴더에 JSON 파일로 내보내기
    stock_ids_filter: 특정 종목만 처리 (None이면 해당 날짜에 뉴스가 있는 전체 종목)
    """
    output_path = Path(export_dir) if export_dir else None
    if output_path:
        output_path.mkdir(parents=True, exist_ok=True)

    db = SessionLocal()
    try:
        current = start_date
        total_processed = 0
        total_skipped = 0
        day_count = 0

        while current <= end_date:
            day_start = current - timedelta(days=1)

            stock_ids = crud.get_all_stock_ids_with_news(db, start_date=day_start, end_date=current)
            # 종목 필터 적용
            if stock_ids_filter:
                stock_ids = [sid for sid in stock_ids if sid in stock_ids_filter]
            if not stock_ids:
                current += timedelta(days=1)
                continue

            # ticker 매핑 (파일 내보내기용)
            ticker_map = _get_stock_ticker_map(db, stock_ids) if output_path else {}

            processed = 0
            skipped = 0

            for stock_id in stock_ids:
                try:
                    data = build_stock_agent_data(
                        db, stock_id=stock_id, report_date=current,
                        top_k=top_k, news_per_keyword=news_per_keyword,
                    )

                    has_data = data["top_keywords"] or data["sentiment"]["total"] > 0
                    if not has_data:
                        skipped += 1
                        continue

                    if save_db:
                        save_to_db(db, stock_id, current, data)

                    if output_path and stock_id in ticker_map:
                        save_to_file(ticker_map[stock_id], current, data, output_path)

                    processed += 1

                except Exception as e:
                    logger.warning("종목 %d (date=%s) 처리 실패: %s", stock_id, current, e)
                    db.rollback()
                    skipped += 1

            total_processed += processed
            total_skipped += skipped
            day_count += 1

            if day_count % 7 == 0:
                logger.info("  ... %d일 완료 (현재: %s, 총 %d건)", day_count, current, total_processed)

            current += timedelta(days=1)

        logger.info("배치 완료: %d일, %d건 저장, %d건 건너뜀", day_count, total_processed, total_skipped)
        if output_path:
            logger.info("출력 경로: %s", output_path.resolve())

    finally:
        db.close()


# ---------------------------------------------------------------------------
# CLI (수동 실행용)
# ---------------------------------------------------------------------------
def main():
    import argparse

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="종목별 뉴스 에이전트 데이터 생성 (DB)")
    parser.add_argument(
        "--date", type=date.fromisoformat, default=None,
        help="단일 날짜 실행 (YYYY-MM-DD, 기본: 오늘)",
    )
    parser.add_argument(
        "--start", type=date.fromisoformat, default=None,
        help="배치 시작 날짜 (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--end", type=date.fromisoformat, default=None,
        help="배치 종료 날짜 (YYYY-MM-DD)",
    )
    parser.add_argument(
        "--export", type=str, default=None,
        help="파일 내보내기 경로 (종목별 폴더/날짜별 JSON)",
    )
    parser.add_argument(
        "--save-db", action="store_true",
        help="배치 모드에서 DB에도 저장 (기본: 파일만 내보내기)",
    )
    parser.add_argument("--top-k", type=int, default=3, help="상위 키워드 수 (기본: 3)")
    parser.add_argument("--news-per-keyword", type=int, default=3, help="키워드당 뉴스 수 (기본: 3)")
    parser.add_argument(
        "--stock-ids", nargs="+", type=int, default=None,
        help="특정 종목 ID만 처리 (예: --stock-ids 1 2 3)",
    )
    parser.add_argument(
        "--tickers", nargs="+", type=str, default=None,
        help="특정 종목 코드로 처리 (예: --tickers 005930 000660)",
    )
    args = parser.parse_args()

    # ticker → stock_id 변환
    stock_ids_filter = args.stock_ids
    if args.tickers and not stock_ids_filter:
        from core.config import SessionLocal as _SL
        from domains.news.models import Stock
        _db = _SL()
        try:
            rows = _db.query(Stock.id).filter(Stock.ticker.in_(args.tickers)).all()
            stock_ids_filter = [r[0] for r in rows]
            logger.info("종목 코드 → ID 변환: %s → %s", args.tickers, stock_ids_filter)
        finally:
            _db.close()

    # 배치 모드 (--start, --end)
    if args.start and args.end:
        if not args.export and not args.save_db:
            # 기본: DB 저장
            args.save_db = True
        run_batch(
            start_date=args.start,
            end_date=args.end,
            top_k=args.top_k,
            news_per_keyword=args.news_per_keyword,
            save_db=args.save_db,
            export_dir=args.export,
            stock_ids_filter=stock_ids_filter,
        )
    else:
        # 단일 날짜 모드 (DB 저장)
        run_build_all(
            report_date=args.date,
            top_k=args.top_k,
            news_per_keyword=args.news_per_keyword,
        )


if __name__ == "__main__":
    main()
