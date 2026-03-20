"""
CSV → DB 벌크 적재 스크립트

Google Drive에서 다운로드한 종목별 뉴스 CSV를 DB에 적재합니다.
두 가지 CSV 형식을 자동 감지하여 처리합니다:

  1. 네이버 크롤링 형식: title, article_url, source, date, code, name, body, full_body
  2. SSAFY 데이터 형식: company, title, link, published, category, category_str, reporter, article

사용법:
  # 폴더 단위 적재 (연도별)
  python load_csv_to_db.py data/news_2024/

  # 여러 폴더 순차 적재
  python load_csv_to_db.py data/news_2019/ data/news_2020/ data/news_2021/

  # 단일 CSV 파일
  python load_csv_to_db.py data/news_2024/005930_삼성전자.csv

  # SSAFY 데이터 적재 (파이프 구분자)
  python load_csv_to_db.py --ssafy data/ssafy_dataset_news_2024.csv

  # 건너뛰기 (이미 적재된 파일 스킵)
  python load_csv_to_db.py data/news_2024/ --resume

  # Google Drive에서 다운로드 후 적재
  python load_csv_to_db.py --download --year 2024
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import argparse
import glob
import json
import logging
import os
from datetime import datetime
from pathlib import Path

import pandas as pd

from config import AI_DB_URL, DATA_DIR, OUTPUT_DIR, TITLE_ONLY_NAMES
from db import get_session
from models import Base, Keyword, NewsKeywordMap, Stock, StockNews, StockNewsMap

logger = logging.getLogger(__name__)

# 체크포인트 파일 경로
CHECKPOINT_PATH = OUTPUT_DIR / "load_checkpoint.json"


# ---------------------------------------------------------------------------
# 체크포인트 관리
# ---------------------------------------------------------------------------
def _load_checkpoint() -> set[str]:
    """이미 적재 완료된 CSV 파일명 set 반환."""
    if CHECKPOINT_PATH.is_file():
        with open(CHECKPOINT_PATH, "r", encoding="utf-8") as f:
            return set(json.load(f))
    return set()


def _save_checkpoint(done: set[str]) -> None:
    """적재 완료된 파일 목록 저장."""
    with open(CHECKPOINT_PATH, "w", encoding="utf-8") as f:
        json.dump(sorted(done), f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# 날짜 파싱 (공통 유틸 사용, 상대시간 비활성화 — 적재 시각 기준 오계산 방지)
# ---------------------------------------------------------------------------
from functools import partial
from utils.date_parser import parse_date as _parse_date_raw
parse_date = partial(_parse_date_raw, allow_relative=False)


# ---------------------------------------------------------------------------
# CSV 로드 (형식 자동 감지)
# ---------------------------------------------------------------------------
def load_naver_csv(csv_path: str) -> pd.DataFrame:
    """네이버 크롤링 형식 CSV 로드. 컬럼: title, article_url, source, date, code, name, body, full_body"""
    df = pd.read_csv(
        csv_path, encoding="utf-8-sig", dtype={"code": str},
        engine="python", on_bad_lines="skip",
    )
    if "code" in df.columns:
        df["code"] = df["code"].astype(str).str.zfill(6)
    return df


def load_ssafy_csv(csv_path: str) -> pd.DataFrame:
    """SSAFY 파이프 구분 CSV 로드 및 네이버 형식으로 변환."""
    # NUL 바이트 제거
    import tempfile
    has_nul = False
    with open(csv_path, "rb") as f:
        sample = f.read(1024 * 1024)
        if b"\x00" in sample:
            has_nul = True

    read_path = csv_path
    tmp_path = None
    if has_nul:
        logger.info("  NUL 바이트 감지 → 제거 중...")
        tmp_fd, tmp_path = tempfile.mkstemp(suffix=".csv")
        with open(csv_path, "rb") as src, os.fdopen(tmp_fd, "wb") as dst:
            while True:
                chunk = src.read(4 * 1024 * 1024)
                if not chunk:
                    break
                dst.write(chunk.replace(b"\x00", b""))
        read_path = tmp_path

    try:
        df = pd.read_csv(
            read_path, sep="|", dtype=str, engine="c",
            on_bad_lines="skip",
        )
        df.columns = df.columns.str.strip()
    finally:
        if tmp_path and os.path.isfile(tmp_path):
            os.remove(tmp_path)

    return df


# ---------------------------------------------------------------------------
# SSAFY 데이터 → 종목별 분류
# ---------------------------------------------------------------------------
def classify_ssafy_articles(df: pd.DataFrame, stocks: pd.DataFrame) -> dict[str, pd.DataFrame]:
    """SSAFY 데이터의 기사를 종목명 매칭으로 분류."""
    title_series = df["title"].fillna("")
    search_series = title_series + " " + df["article"].fillna("")

    results: dict[str, pd.DataFrame] = {}
    for _, row in stocks.iterrows():
        code, name = row["code"], row["name"]

        # 짧은 이름/일반명사 → 제목만 매칭
        if len(name) <= 3 or name in TITLE_ONLY_NAMES:
            mask = title_series.str.contains(name, na=False)
        else:
            mask = search_series.str.contains(name, na=False)

        matched = df[mask]
        if matched.empty:
            continue

        out = pd.DataFrame({
            "title": matched["title"],
            "article_url": matched.get("link", ""),
            "source": matched.get("company", ""),
            "date": matched["published"].str[:10].str.replace("-", ".") if "published" in matched.columns else "",
            "code": code,
            "name": name,
            "body": matched["article"].str[:250] if "article" in matched.columns else "",
            "full_body": matched.get("article", ""),
        })
        results[code] = out

    return results


# ---------------------------------------------------------------------------
# DB 적재 (벌크)
# ---------------------------------------------------------------------------
def bulk_load_to_db(df: pd.DataFrame) -> dict[str, int]:
    """
    DataFrame을 DB에 벌크 적재.
    URL 중복은 건너뛰고, 종목-뉴스 매핑을 생성.
    반환: {"inserted": N, "skipped": N, "mapped": N}
    """
    stats = {"inserted": 0, "skipped": 0, "mapped": 0}

    if df.empty:
        return stats

    with get_session() as session:
        try:
            # 종목코드 → Stock 객체 캐시
            stock_cache: dict[str, Stock] = {}
            codes = df["code"].dropna().unique().tolist() if "code" in df.columns else []
            for code in codes:
                stock = session.query(Stock).filter(Stock.ticker == code).first()
                if stock:
                    stock_cache[code] = stock

            # 기존 URL 캐시 (중복 방지)
            existing_urls = set()
            urls_in_df = df["article_url"].dropna().unique().tolist() if "article_url" in df.columns else []
            if urls_in_df:
                # 배치로 조회 (1000개씩)
                for i in range(0, len(urls_in_df), 1000):
                    batch = urls_in_df[i:i + 1000]
                    rows = session.query(StockNews.url).filter(StockNews.url.in_(batch)).all()
                    existing_urls.update(r[0] for r in rows)

            for _, row in df.iterrows():
                url = row.get("article_url", "")
                code = str(row.get("code", "")).zfill(6) if row.get("code") else None
                stock = stock_cache.get(code) if code else None

                if not url or not stock:
                    stats["skipped"] += 1
                    continue

                if url in existing_urls:
                    # URL이 이미 있으면 매핑만 확인/추가
                    existing_news = session.query(StockNews).filter(StockNews.url == url).first()
                    if existing_news:
                        exists_map = (
                            session.query(StockNewsMap)
                            .filter(StockNewsMap.stock_id == stock.id, StockNewsMap.news_id == existing_news.id)
                            .first()
                        )
                        if not exists_map:
                            session.add(StockNewsMap(stock_id=stock.id, news_id=existing_news.id))
                            stats["mapped"] += 1
                    stats["skipped"] += 1
                    continue

                # 새 뉴스 삽입
                news = StockNews(
                    title=str(row.get("title", ""))[:255],
                    snippet=str(row.get("body", ""))[:500] if row.get("body") else None,
                    url=url,
                    publisher=str(row.get("source", ""))[:20] if row.get("source") else None,
                    published_at=parse_date(str(row.get("date", ""))),
                )
                session.add(news)
                session.flush()

                # 종목-뉴스 매핑
                session.add(StockNewsMap(stock_id=stock.id, news_id=news.id))

                existing_urls.add(url)
                stats["inserted"] += 1

                # 1000건마다 중간 커밋 (메모리 관리)
                if stats["inserted"] % 1000 == 0:
                    session.commit()
                    logger.info("  ... %d건 적재 완료", stats["inserted"])

            session.commit()
        except Exception:
            session.rollback()
            raise

    return stats


# ---------------------------------------------------------------------------
# Google Drive 다운로드 (gdown)
# ---------------------------------------------------------------------------
def download_from_drive(year: str, target_dir: Path | None = None) -> Path:
    """Google Drive에서 연도별 뉴스 폴더를 다운로드."""
    try:
        import gdown
    except ImportError:
        raise RuntimeError("gdown 패키지가 필요합니다: pip install gdown")

    from config import GDRIVE_FOLDER_ID

    if target_dir is None:
        target_dir = DATA_DIR / f"news_{year}"
    target_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Google Drive 다운로드 시작 → %s", target_dir)
    gdown.download_folder(
        id=GDRIVE_FOLDER_ID,
        output=str(target_dir),
        quiet=False,
    )
    logger.info("다운로드 완료: %s", target_dir)
    return target_dir


# ---------------------------------------------------------------------------
# 메인 실행
# ---------------------------------------------------------------------------
def process_folder(folder_path: str, resume: bool = False) -> dict[str, int]:
    """폴더 내 모든 CSV를 순차 적재."""
    csv_files = sorted(glob.glob(os.path.join(folder_path, "*.csv")))
    if not csv_files:
        logger.warning("CSV 파일 없음: %s", folder_path)
        return {"inserted": 0, "skipped": 0, "mapped": 0}

    done_files = _load_checkpoint() if resume else set()
    pending = [f for f in csv_files if os.path.basename(f) not in done_files]

    if resume and len(pending) < len(csv_files):
        logger.info("체크포인트: %d개 완료, %d개 남음", len(csv_files) - len(pending), len(pending))

    total_stats = {"inserted": 0, "skipped": 0, "mapped": 0}

    for idx, csv_path in enumerate(pending, 1):
        basename = os.path.basename(csv_path)
        logger.info("[%d/%d] %s 적재 중...", idx, len(pending), basename)

        try:
            df = load_naver_csv(csv_path)
            stats = bulk_load_to_db(df)

            for k in total_stats:
                total_stats[k] += stats[k]

            logger.info(
                "  완료: +%d건 (스킵 %d, 매핑 %d)",
                stats["inserted"], stats["skipped"], stats["mapped"],
            )

            # 체크포인트 갱신
            done_files.add(basename)
            if resume:
                _save_checkpoint(done_files)

        except Exception as e:
            logger.error("  [%s] 오류: %s", basename, e)

    return total_stats


def process_ssafy_file(csv_path: str) -> dict[str, int]:
    """SSAFY 형식 CSV를 종목별 분류 후 DB 적재."""
    from kospi200 import get_kospi200_stocks

    logger.info("SSAFY 데이터 로딩: %s", csv_path)
    df = load_ssafy_csv(csv_path)
    logger.info("  %d건 로드 완료", len(df))

    stocks = get_kospi200_stocks()
    results = classify_ssafy_articles(df, stocks)
    logger.info("  %d개 종목 매칭", len(results))

    total_stats = {"inserted": 0, "skipped": 0, "mapped": 0}

    for code, stock_df in results.items():
        name = stock_df["name"].iloc[0] if len(stock_df) > 0 else code
        stats = bulk_load_to_db(stock_df)
        for k in total_stats:
            total_stats[k] += stats[k]
        if stats["inserted"] > 0:
            logger.info("  %s(%s): +%d건", name, code, stats["inserted"])

    return total_stats


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="뉴스 CSV → DB 벌크 적재")
    parser.add_argument("paths", nargs="*", help="CSV 파일 또는 폴더 경로")
    parser.add_argument("--ssafy", action="store_true", help="SSAFY 데이터 형식 (파이프 구분자)")
    parser.add_argument("--resume", action="store_true", help="체크포인트 기반 이어서 적재")
    parser.add_argument("--download", action="store_true", help="Google Drive에서 다운로드 후 적재")
    parser.add_argument("--year", type=str, default=None, help="다운로드할 연도 (--download와 함께)")
    args = parser.parse_args()

    # Google Drive 다운로드
    if args.download:
        if not args.year:
            print("--download 사용 시 --year 필수 (예: --year 2024)")
            return
        folder = download_from_drive(args.year)
        args.paths = [str(folder)]

    if not args.paths:
        print("적재할 경로를 지정하세요.")
        parser.print_help()
        return

    grand_total = {"inserted": 0, "skipped": 0, "mapped": 0}

    for path in args.paths:
        if args.ssafy:
            stats = process_ssafy_file(path)
        elif os.path.isdir(path):
            stats = process_folder(path, resume=args.resume)
        elif os.path.isfile(path):
            logger.info("단일 파일 적재: %s", path)
            df = load_naver_csv(path)
            stats = bulk_load_to_db(df)
        else:
            logger.warning("경로 없음: %s", path)
            continue

        for k in grand_total:
            grand_total[k] += stats[k]

    logger.info(
        "전체 완료 | 삽입: %d | 스킵: %d | 매핑: %d",
        grand_total["inserted"], grand_total["skipped"], grand_total["mapped"],
    )


if __name__ == "__main__":
    main()
