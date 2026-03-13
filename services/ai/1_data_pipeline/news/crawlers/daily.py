"""
뉴스 일일 크롤러 — 네이버 금융 뉴스탭 기반

네이버 금융(finance.naver.com)의 종목별 뉴스 탭에서
최신 뉴스를 수집 → DB 적재한다.
매일 스케줄러로 실행하거나 수동으로 실행.

사용법:
  # 오늘 기준 전 종목 크롤링 (최근 3페이지) → DB 적재
  python -m crawlers.daily

  # 기간 필터링 (수집 후 날짜 범위 밖 기사 제외)
  python -m crawlers.daily --start-date 2026-03-01 --end-date 2026-03-12

  # 특정 종목만
  python -m crawlers.daily --codes 005930 000660

  # 페이지 수 조절
  python -m crawlers.daily --max-pages 10

  # DB 적재 없이 CSV만 저장
  python -m crawlers.daily --csv-only
"""
import argparse
import asyncio
import logging
import random
import sys
from datetime import date, datetime

import aiohttp
import pandas as pd

from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import OUTPUT_DIR
from kospi200 import get_kospi200_stocks
from crawlers.naver_finance import (
    extract_news_snippet,
    parse_news_list,
    set_semaphore_limit,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 크롤링 설정
# ---------------------------------------------------------------------------
DAILY_MAX_PAGES = 10
DAILY_PAGE_DELAY = (0.5, 1.2)
DAILY_STOCK_COOLDOWN = 3
DAILY_BATCH_COOLDOWN = 30
DAILY_SEMAPHORE_LIMIT = 8


# ---------------------------------------------------------------------------
# 날짜 파싱
# ---------------------------------------------------------------------------
def _parse_date(date_str: str) -> datetime | None:
    """다양한 날짜 형식을 datetime으로 변환."""
    if not date_str:
        return None
    for fmt in ("%Y.%m.%d", "%Y-%m-%d", "%Y.%m.%d."):
        try:
            return datetime.strptime(date_str.strip().rstrip("."), fmt.rstrip("."))
        except ValueError:
            continue
    return None


# ---------------------------------------------------------------------------
# 단일 종목 크롤링
# ---------------------------------------------------------------------------
async def crawl_stock(
    session: aiohttp.ClientSession,
    code: str,
    name: str,
    max_pages: int = DAILY_MAX_PAGES,
    start_date: date | None = None,
    end_date: date | None = None,
) -> pd.DataFrame:
    """단일 종목의 최신 뉴스를 네이버 금융 뉴스탭에서 수집한다.
    start_date/end_date가 지정되면 해당 범위 밖 기사를 필터링.
    """
    all_articles: list[dict] = []

    for page in range(1, max_pages + 1):
        articles = await parse_news_list(session, code, page)
        if not articles:
            break

        for a in articles:
            a["name"] = name

        # 본문 스니펫 수집
        snippet_tasks = [extract_news_snippet(session, art) for art in articles]
        completed = await asyncio.gather(*snippet_tasks, return_exceptions=True)
        valid = [r for r in completed if isinstance(r, dict)]
        all_articles.extend(valid)

        await asyncio.sleep(random.uniform(*DAILY_PAGE_DELAY))

    if not all_articles:
        return pd.DataFrame()

    df = pd.DataFrame(all_articles)
    df = df.drop_duplicates(subset=["title", "date"], keep="first").reset_index(drop=True)

    # 날짜 필터링
    if start_date or end_date:
        df["_parsed_date"] = df["date"].apply(lambda d: _parse_date(str(d)))
        if start_date:
            start_dt = datetime.combine(start_date, datetime.min.time())
            df = df[df["_parsed_date"].isna() | (df["_parsed_date"] >= start_dt)]
        if end_date:
            end_dt = datetime.combine(end_date, datetime.max.time())
            df = df[df["_parsed_date"].isna() | (df["_parsed_date"] <= end_dt)]
        df = df.drop(columns=["_parsed_date"]).reset_index(drop=True)

    return df


# ---------------------------------------------------------------------------
# DB 적재
# ---------------------------------------------------------------------------
def save_to_db(df: pd.DataFrame) -> int:
    """크롤링 결과 DataFrame을 DB에 저장한다. 저장된 건수를 반환."""
    if df.empty:
        return 0

    from db import get_session
    from models import Stock, StockNews, StockNewsMap

    saved = 0
    with get_session() as session:
        try:
            for _, row in df.iterrows():
                # 종목 조회
                stock = session.query(Stock).filter(Stock.ticker == row["code"]).first()
                if not stock:
                    continue

                # URL 중복 체크
                existing = session.query(StockNews).filter(StockNews.url == row["article_url"]).first()
                if existing:
                    exists_map = (
                        session.query(StockNewsMap)
                        .filter(StockNewsMap.stock_id == stock.id, StockNewsMap.news_id == existing.id)
                        .first()
                    )
                    if not exists_map:
                        session.add(StockNewsMap(stock_id=stock.id, news_id=existing.id))
                    continue

                # 새 뉴스 저장
                news = StockNews(
                    title=row["title"],
                    snippet=row.get("body", ""),
                    url=row["article_url"],
                    publisher=row.get("source", ""),
                    published_at=_parse_date(row.get("date", "")),
                )
                session.add(news)
                session.flush()

                session.add(StockNewsMap(stock_id=stock.id, news_id=news.id))
                saved += 1

            session.commit()
        except Exception:
            session.rollback()
            raise

    return saved


# ---------------------------------------------------------------------------
# 메인 실행
# ---------------------------------------------------------------------------
async def run_daily_crawl(
    stocks_df: pd.DataFrame,
    max_pages: int = DAILY_MAX_PAGES,
    csv_only: bool = False,
    start_date: date | None = None,
    end_date: date | None = None,
) -> None:
    """전체 종목 일일 크롤링 실행."""
    set_semaphore_limit(DAILY_SEMAPHORE_LIMIT)

    logger.info(
        "일일 크롤링 시작 | 종목: %d개 | 페이지: %d | 기간: %s ~ %s",
        len(stocks_df), max_pages,
        start_date or "전체", end_date or "전체",
    )

    connector = aiohttp.TCPConnector(limit=DAILY_SEMAPHORE_LIMIT * 2)
    async with aiohttp.ClientSession(connector=connector) as session:
        for idx, (_, row) in enumerate(stocks_df.iterrows(), 1):
            code, name = row["code"], row["name"]
            logger.info("[%d/%d] %s(%s) 크롤링", idx, len(stocks_df), name, code)

            try:
                df = await crawl_stock(
                    session, code, name,
                    max_pages=max_pages,
                    start_date=start_date,
                    end_date=end_date,
                )

                if not df.empty:
                    if csv_only:
                        # 날짜별 디렉토리에 저장 (스케줄러 연동)
                        today_str = date.today().strftime("%Y%m%d")
                        daily_dir = OUTPUT_DIR / f"daily_{today_str}"
                        daily_dir.mkdir(parents=True, exist_ok=True)
                        csv_path = daily_dir / f"{code}_{name}.csv"
                        df.to_csv(csv_path, index=False, encoding="utf-8-sig")
                        logger.info("  CSV 저장: %s (%d건)", csv_path, len(df))
                    else:
                        saved = save_to_db(df)
                        logger.info("  DB 저장: %d건", saved)
                else:
                    logger.info("  수집된 뉴스 없음")

            except Exception as e:
                logger.error("  [%s(%s)] 오류: %s", name, code, e)

            # 종목 간 쿨다운
            if idx < len(stocks_df):
                await asyncio.sleep(DAILY_STOCK_COOLDOWN)

            # 25종목마다 배치 쿨다운
            if idx % 25 == 0 and idx < len(stocks_df):
                logger.info("  배치 쿨다운 %d초...", DAILY_BATCH_COOLDOWN)
                await asyncio.sleep(DAILY_BATCH_COOLDOWN)

    logger.info("일일 크롤링 완료")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="뉴스 일일 크롤러 (네이버 금융)")
    parser.add_argument("--codes", nargs="+", default=None, help="특정 종목 코드 (예: 005930 000660)")
    parser.add_argument("--max-pages", type=int, default=DAILY_MAX_PAGES, help=f"종목당 최대 페이지 수 (기본: {DAILY_MAX_PAGES})")
    parser.add_argument("--start-date", type=str, default=None, help="시작일 필터 (예: 2026-03-01)")
    parser.add_argument("--end-date", type=str, default=None, help="종료일 필터 (예: 2026-03-12)")
    parser.add_argument("--csv-only", action="store_true", help="DB 적재 없이 CSV만 저장")
    args = parser.parse_args()

    start_date = date.fromisoformat(args.start_date) if args.start_date else None
    end_date = date.fromisoformat(args.end_date) if args.end_date else None

    all_stocks = get_kospi200_stocks()
    if args.codes:
        stocks_df = all_stocks[all_stocks["code"].isin(args.codes)].reset_index(drop=True)
    else:
        stocks_df = all_stocks

    if stocks_df.empty:
        print("대상 종목이 없습니다.")
        return

    logger.info("대상: %d종목", len(stocks_df))

    asyncio.run(run_daily_crawl(
        stocks_df,
        max_pages=args.max_pages,
        csv_only=args.csv_only,
        start_date=start_date,
        end_date=end_date,
    ))


if __name__ == "__main__":
    main()
