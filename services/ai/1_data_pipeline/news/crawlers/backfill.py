"""
과거 뉴스 백필(Backfill) 크롤러 — 네이버 검색 기반

네이버 검색(search.naver.com)에서 날짜 범위를 월 단위로 분할하여
종목별 과거 뉴스를 체계적으로 수집한다.
체크포인트 기반으로 중단 시 이어서 크롤링 가능.

사용법:
  # 전 종목 백필 (2025년 1월 ~ 현재)
  python -m crawlers.backfill --start-date 2025-01-01

  # 중단 후 이어서 (자동으로 checkpoint에서 재개)
  python -m crawlers.backfill --start-date 2025-01-01 --run-id backfill_20250101

  # 특정 종목 + 기간 지정
  python -m crawlers.backfill --codes 005930 000660 --start-date 2024-01-01 --end-date 2024-12-31

  # 배치 범위 (26~50번째 종목만)
  python -m crawlers.backfill --start-date 2025-01-01 --start-idx 25 --end-idx 50

  # 월당 최대 페이지 수 조절
  python -m crawlers.backfill --start-date 2025-01-01 --max-pages 10

  # 일별 크롤링 (하루당 5페이지, 커버리지 향상)
  python -m crawlers.backfill --start-date 2025-01-01 --daily --max-pages 5
"""
import argparse
import asyncio
import logging
import os
import random
import re
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from urllib.parse import quote

import aiohttp
import pandas as pd
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import HEADERS, OUTPUT_DIR
from kospi200 import get_kospi200_stocks
from crawlers.checkpoint import (
    create_checkpoint,
    get_pending_stocks,
    get_resume_page,
    print_summary,
    update_stock_progress,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 백필 설정
# ---------------------------------------------------------------------------
BACKFILL_SEMAPHORE_LIMIT = 6
BACKFILL_PAGE_DELAY = (2.0, 4.0)
BACKFILL_STOCK_COOLDOWN = 5
BACKFILL_BATCH_COOLDOWN = 60
BACKFILL_MAX_PAGES_PER_MONTH = 5
SAVE_INTERVAL = 20

_semaphore: asyncio.Semaphore | None = None


def _get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(BACKFILL_SEMAPHORE_LIMIT)
    return _semaphore


# ---------------------------------------------------------------------------
# HTTP 유틸
# ---------------------------------------------------------------------------
async def fetch_html(
    session: aiohttp.ClientSession, url: str, retries: int = 3,
) -> str | None:
    """Semaphore + 재시도 포함 비동기 HTTP GET"""
    async with _get_semaphore():
        for attempt in range(retries):
            try:
                async with session.get(
                    url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=15),
                ) as resp:
                    if resp.status == 200:
                        return await resp.text()
                    elif resp.status in (429, 403):
                        wait = (2 ** attempt) + 2
                        logger.warning("[%d] %s — %d초 대기", resp.status, url, wait)
                        await asyncio.sleep(wait)
                        continue
                    else:
                        resp.raise_for_status()
            except Exception as e:
                if attempt == retries - 1:
                    logger.error("요청 실패: %s — %s", url, e)
                    return None
                await asyncio.sleep(1 + attempt)
        return None


# ---------------------------------------------------------------------------
# 날짜 유틸
# ---------------------------------------------------------------------------
def generate_month_ranges(start: date, end: date) -> list[tuple[date, date]]:
    """시작~종료를 월 단위 (월초, 월말) 튜플 리스트로 분할."""
    months = []
    cur = start.replace(day=1)
    while cur <= end:
        if cur.month == 12:
            month_end = date(cur.year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(cur.year, cur.month + 1, 1) - timedelta(days=1)
        months.append((cur, min(month_end, end)))
        cur = date(cur.year + (cur.month // 12), (cur.month % 12) + 1, 1)
    return months


def generate_day_ranges(start: date, end: date) -> list[tuple[date, date]]:
    """시작~종료를 일 단위 (당일, 당일) 튜플 리스트로 분할."""
    days = []
    cur = start
    while cur <= end:
        days.append((cur, cur))
        cur += timedelta(days=1)
    return days


# ---------------------------------------------------------------------------
# 네이버 검색 URL 생성 및 파싱
# ---------------------------------------------------------------------------
def _build_search_url(query: str, start: date, end: date, page: int = 1) -> str:
    ds = start.strftime("%Y.%m.%d")
    de = end.strftime("%Y.%m.%d")
    start_c = start.strftime("%Y%m%d")
    end_c = end.strftime("%Y%m%d")
    offset = (page - 1) * 10 + 1
    return (
        f"https://search.naver.com/search.naver"
        f"?where=news&query={quote(query)}"
        f"&ds={ds}&de={de}"
        f"&nso=so:r,p:from{start_c}to{end_c}"
        f"&start={offset}"
    )


async def parse_search_page(
    session: aiohttp.ClientSession, query: str, start: date, end: date, page: int = 1,
) -> list[dict]:
    """네이버 뉴스 검색 결과 1페이지에서 기사 목록 추출."""
    url = _build_search_url(query, start, end, page)
    html = await fetch_html(session, url)
    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    articles = []

    _SKIP_TEXTS = {"네이버뉴스", "Keep에 저장", "Keep에 바로가기"}
    _SKIP_HREFS = {"#", "javascript:;"}

    for cluster in soup.find_all("div", class_="api_subject_bx"):
        naver_urls: list[str] = []
        titles: list[str] = []
        seen_naver: set[str] = set()
        seen_hrefs: set[str] = set()
        date_str = ""
        source = ""

        for a in cluster.find_all("a", href=True):
            h = a.get("href", "")
            t = a.get_text(strip=True)

            if "n.news.naver.com" in h:
                if h not in seen_naver:
                    naver_urls.append(h)
                    seen_naver.add(h)
            elif "media.naver.com/press/" in h and t and not source:
                source = t
            elif (
                t and h
                and h not in _SKIP_HREFS
                and not h.startswith("?")
                and "keep.naver.com" not in h
                and "media.naver.com" not in h
                and t not in _SKIP_TEXTS
                and not t.startswith("관련뉴스")
                and h not in seen_hrefs
            ):
                titles.append(t)
                seen_hrefs.add(h)

        for span in cluster.find_all("span"):
            t = span.get_text(strip=True)
            if re.match(r"\d{4}\.\d{2}\.\d{2}", t):
                date_str = t[:10]
                break

        for title, naver_url in zip(titles, naver_urls):
            if not (10 <= len(title) <= 150):
                continue
            articles.append({
                "title": title,
                "article_url": naver_url,
                "source": source,
                "date": date_str,
            })

    return articles


# ---------------------------------------------------------------------------
# 본문 수집
# ---------------------------------------------------------------------------
async def fetch_naver_body(
    session: aiohttp.ClientSession, article: dict, snippet_length: int = 250,
) -> dict:
    """n.news.naver.com URL에서 기사 본문을 추출."""
    article["body"] = ""
    article["full_body"] = ""

    html = await fetch_html(session, article["article_url"])
    if not html:
        return article

    soup = BeautifulSoup(html, "lxml")
    body_tag = (
        soup.select_one("#dic_area")
        or soup.select_one("#newsct_article")
        or soup.select_one("#articeBody")
    )
    if not body_tag:
        return article

    full_text = re.sub(r"\s+", " ", body_tag.get_text()).strip()
    full_text = re.sub(r"\[.*?\]", "", full_text).strip()
    article["full_body"] = full_text

    if len(full_text) > snippet_length:
        snippet = full_text[:snippet_length]
        last_space = snippet.rfind(" ")
        snippet = (snippet[:last_space] if last_space > 0 else snippet) + "..."
    else:
        snippet = full_text
    article["body"] = snippet

    return article


# ---------------------------------------------------------------------------
# 단일 종목 백필
# ---------------------------------------------------------------------------
async def backfill_stock(
    session: aiohttp.ClientSession,
    code: str,
    name: str,
    month_ranges: list[tuple[date, date]],
    checkpoint: dict,
    max_pages: int = BACKFILL_MAX_PAGES_PER_MONTH,
) -> pd.DataFrame:
    """단일 종목의 과거 뉴스를 월 단위로 네이버 검색에서 수집한다.
    체크포인트에서 마지막 월 인덱스를 읽어 이어서 시작.
    """
    start_month_idx = get_resume_page(checkpoint, code)  # 여기서 page = month index
    all_articles: list[dict] = []

    update_stock_progress(checkpoint, code, status="in_progress")
    logger.info(
        "[%s(%s)] 백필 시작 (월 %d ~ %d, 총 %d개월)",
        name, code, start_month_idx, len(month_ranges), len(month_ranges),
    )

    for month_idx in range(start_month_idx - 1, len(month_ranges)):
        m_start, m_end = month_ranges[month_idx]
        month_articles: list[dict] = []

        for page in range(1, max_pages + 1):
            page_articles = await parse_search_page(session, name, m_start, m_end, page)
            if not page_articles:
                break
            for a in page_articles:
                a["code"] = code
                a["name"] = name
            month_articles.extend(page_articles)
            await asyncio.sleep(random.uniform(*BACKFILL_PAGE_DELAY))
            if len(page_articles) < 10:
                break

        # 본문 수집
        if month_articles:
            body_tasks = [fetch_naver_body(session, a) for a in month_articles]
            completed = await asyncio.gather(*body_tasks, return_exceptions=True)
            valid = [r for r in completed if isinstance(r, dict)]
            all_articles.extend(valid)

        # 체크포인트 갱신 (month_idx + 1 = 완료된 월 수)
        update_stock_progress(
            checkpoint, code,
            last_page=month_idx + 1,
            articles_delta=len(month_articles),
        )

        if (month_idx + 1) % SAVE_INTERVAL == 0:
            logger.info(
                "  [월 %d/%d] 누적 %d건 (체크포인트 저장됨)",
                month_idx + 1, len(month_ranges), len(all_articles),
            )

    # 완료 상태
    update_stock_progress(checkpoint, code, status="done")
    if all_articles:
        logger.info("[%s(%s)] 백필 완료 — 총 %d건", name, code, len(all_articles))
    else:
        logger.info("[%s(%s)] 수집된 뉴스 없음", name, code)

    if not all_articles:
        return pd.DataFrame()

    df = pd.DataFrame(all_articles)
    df = df.drop_duplicates(subset=["article_url"], keep="first").reset_index(drop=True)
    return df


# ---------------------------------------------------------------------------
# 메인 백필 실행
# ---------------------------------------------------------------------------
async def run_backfill(
    stocks_df: pd.DataFrame,
    run_id: str,
    start_date: date,
    end_date: date,
    max_pages: int = BACKFILL_MAX_PAGES_PER_MONTH,
    daily: bool = False,
) -> None:
    """여러 종목에 대해 백필을 순차 실행한다.
    각 종목 완료 시마다 개별 CSV 저장.
    daily=True이면 월 단위 대신 일 단위로 분할하여 크롤링.
    """
    global _semaphore
    _semaphore = asyncio.Semaphore(BACKFILL_SEMAPHORE_LIMIT)

    if daily:
        date_ranges = generate_day_ranges(start_date, end_date)
        range_label = f"{len(date_ranges)}일"
    else:
        date_ranges = generate_month_ranges(start_date, end_date)
        range_label = f"{len(date_ranges)}개월"

    stock_codes = stocks_df["code"].tolist()
    checkpoint = create_checkpoint(run_id, stock_codes)
    pending = get_pending_stocks(checkpoint)

    if not pending:
        logger.info("모든 종목이 이미 완료되었습니다!")
        print_summary(checkpoint)
        return

    code_name = dict(zip(stocks_df["code"], stocks_df["name"]))

    backfill_dir = os.path.join(OUTPUT_DIR, f"backfill_{run_id}")
    os.makedirs(backfill_dir, exist_ok=True)

    logger.info(
        "백필 시작 | Run: %s | 기간: %s ~ %s (%s) | 대상: %d/%d종목 | %s당 최대 %d페이지",
        run_id, start_date, end_date, range_label, len(pending), len(stock_codes),
        "일" if daily else "월", max_pages,
    )

    connector = aiohttp.TCPConnector(limit=BACKFILL_SEMAPHORE_LIMIT * 2)
    async with aiohttp.ClientSession(connector=connector) as session:
        for idx, code in enumerate(pending, 1):
            name = code_name.get(code, code)
            logger.info("[%d/%d] %s(%s)", idx, len(pending), name, code)

            try:
                df = await backfill_stock(
                    session, code, name, date_ranges, checkpoint,
                    max_pages=max_pages,
                )

                if not df.empty:
                    csv_path = os.path.join(backfill_dir, f"{code}_{name}.csv")
                    df.to_csv(csv_path, index=False, encoding="utf-8-sig")
                    logger.info("  CSV 저장: %s (%d건)", csv_path, len(df))

            except Exception as e:
                logger.error("[%s(%s)] 오류: %s", name, code, e)
                update_stock_progress(checkpoint, code, status="failed", error=str(e))

            # 종목 간 쿨다운
            if idx < len(pending):
                await asyncio.sleep(BACKFILL_STOCK_COOLDOWN)

            # 25종목마다 배치 쿨다운
            if idx % 25 == 0 and idx < len(pending):
                logger.info("배치 쿨다운 %d초...", BACKFILL_BATCH_COOLDOWN)
                print_summary(checkpoint)
                await asyncio.sleep(BACKFILL_BATCH_COOLDOWN)

    print_summary(checkpoint)
    logger.info("CSV 저장 폴더: %s", backfill_dir)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="과거 뉴스 백필 크롤러 (네이버 검색)")
    parser.add_argument("--start-date", type=str, required=True, help="백필 시작일 (예: 2024-01-01)")
    parser.add_argument("--end-date", type=str, default=date.today().isoformat(), help="백필 종료일 (기본: 오늘)")
    parser.add_argument("--codes", nargs="+", default=None, help="특정 종목 코드 (예: 005930 000660)")
    parser.add_argument("--start-idx", type=int, default=0, help="KOSPI200 리스트 시작 인덱스 (0-based)")
    parser.add_argument("--end-idx", type=int, default=None, help="KOSPI200 리스트 종료 인덱스 (exclusive)")
    parser.add_argument("--max-pages", type=int, default=BACKFILL_MAX_PAGES_PER_MONTH, help=f"구간당 최대 페이지 수 (기본: {BACKFILL_MAX_PAGES_PER_MONTH})")
    parser.add_argument("--daily", action="store_true", help="월 단위 대신 일 단위로 크롤링 (커버리지 향상)")
    parser.add_argument("--run-id", type=str, default=None, help="세션 ID (같은 ID로 재실행하면 이어서 진행)")
    args = parser.parse_args()

    s_date = date.fromisoformat(args.start_date)
    e_date = date.fromisoformat(args.end_date)

    # 종목 리스트
    if args.codes:
        all_stocks = get_kospi200_stocks()
        stocks_df = all_stocks[all_stocks["code"].isin(args.codes)].reset_index(drop=True)
        if stocks_df.empty:
            stocks_df = pd.DataFrame([{"code": c, "name": c} for c in args.codes])
    else:
        all_stocks = get_kospi200_stocks()
        stocks_df = all_stocks.iloc[args.start_idx:args.end_idx].reset_index(drop=True)

    if stocks_df.empty:
        logger.error("대상 종목이 없습니다.")
        return

    # Run ID
    if args.run_id:
        run_id = args.run_id
    elif args.codes:
        run_id = f"custom_{s_date.strftime('%Y%m%d')}"
    else:
        run_id = f"backfill_{s_date.strftime('%Y%m%d')}_{e_date.strftime('%Y%m%d')}"

    mode = "일별" if args.daily else "월별"
    logger.info("대상 종목 %d개 | 기간: %s ~ %s | %s | Run ID: %s", len(stocks_df), s_date, e_date, mode, run_id)

    asyncio.run(run_backfill(stocks_df, run_id, s_date, e_date, max_pages=args.max_pages, daily=args.daily))


if __name__ == "__main__":
    main()
