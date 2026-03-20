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
import re
import sys
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta

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
DAILY_PAGE_DELAY = (0.3, 0.8)
DAILY_STOCK_COOLDOWN = 20
DAILY_BATCH_COOLDOWN = 10
DAILY_BATCH_SIZE = 50
DAILY_SEMAPHORE_LIMIT = 8

# ---------------------------------------------------------------------------
# 인라인 필터링 패턴 (clean_articles.py 경량 버전)
# ---------------------------------------------------------------------------
_NOISE_TITLE_RE = re.compile(
    r"^언론사 선정|네이버 메인에서 보고 싶은|^관련뉴스|^Keep에"
)
_AD_KEYWORDS_RE = re.compile(
    "|".join(re.escape(kw) for kw in [
        "무료 상담", "수익률 보장", "카카오톡 상담", "텔레그램 추천",
        "주식리딩방", "종목추천방", "무료체험", "수익인증",
        "원금보장", "100% 수익", "VIP 추천", "선착순 모집",
    ])
)
_MIN_BODY_LENGTH = 20


def _filter_articles(df: pd.DataFrame) -> pd.DataFrame:
    """광고/노이즈 필터링 + 중복 제거 (임베딩 없는 경량 버전)."""
    if df.empty:
        return df

    # URL 중복 제거
    df = df.drop_duplicates(subset=["article_url"], keep="first")

    # 노이즈 제목 제거
    mask = df["title"].fillna("").str.contains(_NOISE_TITLE_RE, regex=True, na=False)
    df = df[~mask]

    # 광고 제거
    body_col = df.get("full_body", df.get("body", pd.Series("", index=df.index))).fillna("")
    search_col = df["title"].fillna("") + " " + body_col
    mask = search_col.str.contains(_AD_KEYWORDS_RE, regex=True, na=False)
    df = df[~mask]

    # 짧은 본문 제거
    body_col = df.get("full_body", df.get("body", pd.Series("", index=df.index))).fillna("")
    df = df[body_col.str.len() >= _MIN_BODY_LENGTH]

    # 정규화 제목 중복 제거
    def _norm(t):
        if not isinstance(t, str):
            return ""
        t = unicodedata.normalize("NFC", t)
        t = re.sub(r"[^\w가-힣a-zA-Z0-9]", "", t)
        return re.sub(r"\s+", "", t).lower()

    df["_norm"] = df["title"].apply(_norm)
    df = df.drop_duplicates(subset=["_norm"], keep="first").drop(columns=["_norm"])

    return df.reset_index(drop=True)


def _filter_and_save_to_db(df: pd.DataFrame) -> int:
    """필터링 후 DB에 저장한다. ThreadPoolExecutor에서 호출."""
    df = _filter_articles(df)
    if df.empty:
        return 0
    return save_to_db(df)


# ---------------------------------------------------------------------------
# 날짜 파싱 (공통 유틸 사용)
# ---------------------------------------------------------------------------
from utils.date_parser import parse_date as _parse_date


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

        # 날짜 범위 밖 기사가 있으면 해당 기사 제외 후 즉시 종목 크롤링 종료
        has_old = False
        if start_date:
            start_dt = datetime.combine(start_date, datetime.min.time())
            filtered = []
            for a in articles:
                parsed = _parse_date(str(a.get("date", "")))
                if parsed and parsed < start_dt:
                    has_old = True
                else:
                    filtered.append(a)
            articles = filtered
            if has_old:
                logger.info("  [%s] 페이지 %d: 날짜 범위 이전 기사 감지 → 즉시 종료", code, page)

        if not articles:
            if has_old:
                break
            continue

        # 본문 스니펫 수집 (범위 내 기사만, 페이지당 60초 타임아웃)
        snippet_tasks = [extract_news_snippet(session, art) for art in articles]
        try:
            completed = await asyncio.wait_for(
                asyncio.gather(*snippet_tasks, return_exceptions=True),
                timeout=60,
            )
            valid = [r for r in completed if isinstance(r, dict)]
            all_articles.extend(valid)
        except asyncio.TimeoutError:
            logger.warning("  [%s] 페이지 %d: 스니펫 수집 타임아웃 (60초) → 스킵", code, page)

        # 날짜 범위 이전 기사가 감지됐으면 다음 페이지 탐색 없이 즉시 종료
        if has_old:
            break

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
            # 종목 캐시: ticker → Stock (N+1 방지)
            codes = df["code"].dropna().unique().tolist()
            stock_cache = {}
            for s in session.query(Stock).filter(Stock.ticker.in_(codes)).all():
                stock_cache[s.ticker] = s

            # URL 배치 조회: 기존 URL set (N+1 방지)
            urls = df["article_url"].dropna().unique().tolist()
            existing_url_map = {}
            for batch_start in range(0, len(urls), 1000):
                batch = urls[batch_start:batch_start + 1000]
                for row in session.query(StockNews.id, StockNews.url).filter(StockNews.url.in_(batch)).all():
                    existing_url_map[row.url] = row.id

            for _, row in df.iterrows():
                stock = stock_cache.get(row["code"])
                if not stock:
                    continue

                url = row.get("article_url", "")

                # URL 중복 체크 (캐시 활용)
                if url in existing_url_map:
                    news_id = existing_url_map[url]
                    exists_map = (
                        session.query(StockNewsMap)
                        .filter(StockNewsMap.stock_id == stock.id, StockNewsMap.news_id == news_id)
                        .first()
                    )
                    if not exists_map:
                        session.add(StockNewsMap(stock_id=stock.id, news_id=news_id))
                    continue

                # 새 뉴스 저장
                news = StockNews(
                    title=row["title"],
                    snippet=row.get("body", ""),
                    url=url,
                    publisher=row.get("source", ""),
                    published_at=_parse_date(row.get("date", "")),
                )
                session.add(news)
                session.flush()

                # 캐시에 새 URL 추가 (동일 배치 내 중복 방지)
                existing_url_map[url] = news.id
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
    """전체 종목 일일 크롤링 실행.
    csv_only=False(기본)일 때 종목별 크롤링 완료 즉시 필터링+DB 적재를 백그라운드 스레드로 실행.
    """
    set_semaphore_limit(DAILY_SEMAPHORE_LIMIT)

    logger.info(
        "일일 크롤링 시작 | 종목: %d개 | 페이지: %d | 기간: %s ~ %s | 모드: %s",
        len(stocks_df), max_pages,
        start_date or "전체", end_date or "전체",
        "CSV" if csv_only else "DB 직접 적재",
    )

    # DB 적재용 스레드풀 (크롤링과 병렬로 DB 저장)
    executor = ThreadPoolExecutor(max_workers=2) if not csv_only else None
    db_futures: list = []
    loop = asyncio.get_event_loop()
    total_saved = 0

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
                        # 날짜별 디렉토리에 저장 (백업/디버그용)
                        today_str = date.today().strftime("%Y%m%d")
                        daily_dir = OUTPUT_DIR / f"daily_{today_str}"
                        daily_dir.mkdir(parents=True, exist_ok=True)
                        csv_path = daily_dir / f"{code}_{name}.csv"
                        df.to_csv(csv_path, index=False, encoding="utf-8-sig")
                        logger.info("  CSV 저장: %s (%d건)", csv_path, len(df))
                    else:
                        # 필터링 + DB 적재를 백그라운드 스레드로 실행 (크롤링 블로킹 안 함)
                        future = loop.run_in_executor(executor, _filter_and_save_to_db, df.copy())
                        db_futures.append((code, name, future))
                        logger.info("  DB 적재 제출: %d건 → 백그라운드", len(df))
                else:
                    logger.info("  수집된 뉴스 없음")

            except Exception as e:
                logger.error("  [%s(%s)] 오류: %s", name, code, e)

            # 종목 간 쿨다운
            if idx < len(stocks_df):
                await asyncio.sleep(DAILY_STOCK_COOLDOWN)

            # BATCH_SIZE 종목마다 배치 쿨다운
            if idx % DAILY_BATCH_SIZE == 0 and idx < len(stocks_df):
                logger.info("  배치 쿨다운 %d초...", DAILY_BATCH_COOLDOWN)
                await asyncio.sleep(DAILY_BATCH_COOLDOWN)

    # 모든 DB 적재 완료 대기
    if db_futures:
        logger.info("DB 적재 완료 대기 중... (%d건)", len(db_futures))
        for code, name, future in db_futures:
            try:
                saved = await asyncio.wrap_future(future)
                total_saved += saved
            except Exception as e:
                logger.error("  [%s(%s)] DB 적재 실패: %s", name, code, e)

    if executor:
        executor.shutdown(wait=False)

    logger.info("일일 크롤링 완료 | DB 적재: %d건", total_saved)


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
