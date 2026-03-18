"""
stock_news 테이블의 published_at NULL 레코드를 복구하는 스크립트

네이버 금융 기사 URL에 접근하여 발행일을 추출한 뒤 DB를 업데이트한다.

사용법:
  cd dev-ai/services/ai/1_data_pipeline/news
  python scripts/fix_null_published_at.py

  # 처리 건수 제한
  python scripts/fix_null_published_at.py --limit 5000

  # dry-run (DB 업데이트 없이 확인만)
  python scripts/fix_null_published_at.py --dry-run
"""

import argparse
import asyncio
import logging
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import aiohttp
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import HEADERS
from db import get_session
from models import StockNews

logger = logging.getLogger(__name__)

# 동시 요청 제한 (네이버 차단 방지)
CONCURRENT = 5
BATCH_SIZE = 100
REQUEST_DELAY = 0.5


# ---------------------------------------------------------------------------
# 날짜 추출
# ---------------------------------------------------------------------------
def _parse_date(date_str: str) -> datetime | None:
    """다양한 날짜 형식 및 상대시간을 datetime으로 변환."""
    if not date_str:
        return None

    text = date_str.strip()

    # 상대시간: "N분 전", "N시간 전", "N일 전"
    rel = re.match(r"(\d+)\s*(분|시간|일)\s*전", text)
    if rel:
        amount, unit = int(rel.group(1)), rel.group(2)
        now = datetime.now()
        if unit == "분":
            return now - timedelta(minutes=amount)
        elif unit == "시간":
            return now - timedelta(hours=amount)
        elif unit == "일":
            return now - timedelta(days=amount)

    cleaned = text.rstrip(".")
    for fmt in ("%Y.%m.%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M",
                "%Y.%m.%d", "%Y-%m-%d", "%Y%m%d",
                "%Y년 %m월 %d일 %H:%M", "%Y년 %m월 %d일"):
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue
    return None


async def _fetch_html(session: aiohttp.ClientSession, url: str) -> str | None:
    """비동기 HTTP GET (재시도 포함)."""
    for attempt in range(3):
        try:
            async with session.get(
                url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=15),
            ) as resp:
                if resp.status == 200:
                    return await resp.text()
                elif resp.status == 429:
                    await asyncio.sleep(2 ** attempt + 1)
                    continue
        except Exception:
            if attempt == 2:
                return None
            await asyncio.sleep(1 + attempt)
    return None


async def extract_date_from_url(
    http_session: aiohttp.ClientSession,
    semaphore: asyncio.Semaphore,
    url: str,
) -> datetime | None:
    """기사 URL에서 발행일을 추출한다."""
    async with semaphore:
        # 1차: 네이버 금융 뉴스 페이지에서 날짜 추출
        html = await _fetch_html(http_session, url)
        if not html:
            return None

        soup = BeautifulSoup(html, "lxml")

        # 네이버 금융 뉴스 페이지 날짜 위치들
        date_tag = soup.select_one(".article_info .date") or soup.select_one("span.tah")
        if date_tag:
            parsed = _parse_date(date_tag.get_text(strip=True))
            if parsed:
                return parsed

        # dd 태그 내 날짜 패턴 탐색 (네이버 금융 상세)
        for dd in soup.select("dd, span, em"):
            text = dd.get_text(strip=True)
            if re.match(r"\d{4}[.\-]", text):
                parsed = _parse_date(text)
                if parsed:
                    return parsed

        # 2차: 원본 기사 페이지로 이동하여 날짜 추출
        parsed_url = urlparse(url)
        qs = parse_qs(parsed_url.query)
        oid = qs.get("office_id", qs.get("oid", [None]))[0]
        aid = qs.get("article_id", qs.get("aid", [None]))[0]

        if oid and aid:
            direct_url = f"https://n.news.naver.com/mnews/article/{oid}/{aid}"
            html2 = await _fetch_html(http_session, direct_url)
            if html2:
                soup2 = BeautifulSoup(html2, "lxml")
                # 네이버 뉴스 발행일
                date_el = (
                    soup2.select_one("span.media_end_head_info_datestamp_time")
                    or soup2.select_one("span._ARTICLE_DATE_TIME")
                    or soup2.select_one(".article_info .date")
                )
                if date_el:
                    # data-date-time 속성 우선
                    dt_attr = date_el.get("data-date-time") or date_el.get("data-modify-date-time")
                    if dt_attr:
                        parsed = _parse_date(dt_attr)
                        if parsed:
                            return parsed
                    parsed = _parse_date(date_el.get_text(strip=True))
                    if parsed:
                        return parsed

        await asyncio.sleep(REQUEST_DELAY)
        return None


# ---------------------------------------------------------------------------
# 메인 로직
# ---------------------------------------------------------------------------
async def fix_null_dates(limit: int, dry_run: bool) -> None:
    """published_at이 NULL인 레코드를 찾아 날짜를 복구한다."""
    # NULL 레코드 조회
    with get_session() as session:
        query = (
            session.query(StockNews.id, StockNews.url)
            .filter(StockNews.published_at.is_(None))
            .filter(StockNews.url.isnot(None))
            .order_by(StockNews.id.desc())
            .limit(limit)
        )
        null_records = query.all()

    total = len(null_records)
    logger.info("published_at NULL 레코드: %d건 (처리 대상: %d건)", total, min(total, limit))

    if total == 0:
        logger.info("복구할 레코드가 없습니다.")
        return

    semaphore = asyncio.Semaphore(CONCURRENT)
    connector = aiohttp.TCPConnector(limit=CONCURRENT * 2)

    updated = 0
    failed = 0

    async with aiohttp.ClientSession(connector=connector) as http_session:
        # 배치 단위로 처리
        for batch_start in range(0, total, BATCH_SIZE):
            batch = null_records[batch_start:batch_start + BATCH_SIZE]
            batch_num = batch_start // BATCH_SIZE + 1
            total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE

            logger.info("[배치 %d/%d] %d건 처리 중...", batch_num, total_batches, len(batch))

            # 비동기로 날짜 추출
            tasks = [
                extract_date_from_url(http_session, semaphore, record.url)
                for record in batch
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # DB 업데이트 (배치 단위 커밋)
            updates = []
            for record, result in zip(batch, results):
                if isinstance(result, Exception) or result is None:
                    failed += 1
                    continue
                updates.append((record.id, result))

            if updates and not dry_run:
                with get_session() as session:
                    try:
                        for news_id, pub_date in updates:
                            session.query(StockNews).filter(
                                StockNews.id == news_id
                            ).update({"published_at": pub_date})
                        session.commit()
                        updated += len(updates)
                    except Exception as e:
                        session.rollback()
                        logger.error("DB 업데이트 오류: %s", e)
            elif updates and dry_run:
                updated += len(updates)
                for news_id, pub_date in updates[:3]:
                    logger.info("  [dry-run] id=%d → %s", news_id, pub_date)

            logger.info(
                "  배치 완료: 복구 %d / 실패 %d (누적: %d/%d)",
                len(updates), len(batch) - len(updates), updated, total,
            )

    prefix = "[DRY-RUN] " if dry_run else ""
    logger.info("=" * 50)
    logger.info("%s완료: 총 %d건 중 %d건 복구, %d건 실패", prefix, total, updated, failed)
    logger.info("=" * 50)


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="published_at NULL 복구")
    parser.add_argument("--limit", type=int, default=50000, help="처리할 최대 건수 (기본: 50000)")
    parser.add_argument("--dry-run", action="store_true", help="DB 업데이트 없이 확인만")
    args = parser.parse_args()

    asyncio.run(fix_null_dates(args.limit, args.dry_run))


if __name__ == "__main__":
    main()