"""
네이버 금융 뉴스 파싱 유틸리티

네이버 금융(finance.naver.com)의 종목별 뉴스 탭에서
기사 목록 + 본문 스니펫을 비동기로 수집하는 공통 함수들.

백필 크롤러(backfill.py)에서 사용.
"""
import asyncio
import re
from urllib.parse import parse_qs, urljoin, urlparse

import aiohttp
from bs4 import BeautifulSoup

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import HEADERS, NAVER_FINANCE_NEWS_URL

# ---------------------------------------------------------------------------
# Semaphore (동시 요청 제한)
# ---------------------------------------------------------------------------
MAX_CONCURRENT_REQUESTS = 15
_semaphore: asyncio.Semaphore | None = None


def _get_semaphore() -> asyncio.Semaphore:
    """현재 이벤트 루프에 종속된 Semaphore를 반환 (lazy-init)."""
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(MAX_CONCURRENT_REQUESTS)
    return _semaphore


def set_semaphore_limit(limit: int) -> None:
    """Semaphore 동시 요청 수를 재설정한다."""
    global _semaphore
    _semaphore = asyncio.Semaphore(limit)


# ---------------------------------------------------------------------------
# HTTP 유틸
# ---------------------------------------------------------------------------
async def fetch_html(
    session: aiohttp.ClientSession, url: str, retries: int = 3,
) -> str | None:
    """Semaphore + 재시도 로직 포함 비동기 HTTP GET"""
    async with _get_semaphore():
        for attempt in range(retries):
            try:
                async with session.get(
                    url, headers=HEADERS, timeout=aiohttp.ClientTimeout(total=15),
                ) as resp:
                    if resp.status == 200:
                        # 네이버 금융은 euc-kr 인코딩 — resp.text() 자동 감지가 실패할 수 있음
                        raw = await resp.read()
                        for encoding in ("euc-kr", "utf-8", "cp949"):
                            try:
                                return raw.decode(encoding)
                            except (UnicodeDecodeError, LookupError):
                                continue
                        return raw.decode("utf-8", errors="replace")
                    elif resp.status == 429:
                        wait = (2 ** attempt) + 1
                        await asyncio.sleep(wait)
                        continue
                    else:
                        resp.raise_for_status()
            except Exception:
                if attempt == retries - 1:
                    return None
                await asyncio.sleep(1 + attempt)
        return None


# ---------------------------------------------------------------------------
# 텍스트 정리
# ---------------------------------------------------------------------------
def _clean_text(text: str, max_length: int = 250) -> str:
    """본문 텍스트를 정리하고 스니펫(max_length자)으로 잘라낸다."""
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\[.*?\]", "", text)
    text = text.strip()

    if len(text) > max_length:
        text = text[:max_length]
        last_space = text.rfind(" ")
        if last_space > 0:
            text = text[:last_space]
        text += "..."
    return text


# ---------------------------------------------------------------------------
# 뉴스 목록 파싱 (네이버 금융 종목 뉴스 탭)
# ---------------------------------------------------------------------------
async def parse_news_list(
    session: aiohttp.ClientSession, code: str, page: int,
) -> list[dict]:
    """종목 뉴스 목록 페이지 1장에서 기사 메타 추출."""
    url = NAVER_FINANCE_NEWS_URL.format(code=code, page=page)
    html = await fetch_html(session, url)
    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    table = soup.select_one("table.type5")
    if not table:
        return []

    articles = []
    for row in table.select("tr"):
        title_tag = row.select_one("td.title a")
        date_tag = row.select_one("td.date")
        info_tag = row.select_one("td.info")

        if title_tag and date_tag:
            title = title_tag.get_text(strip=True)
            href = title_tag.get("href", "")
            article_url = urljoin("https://finance.naver.com", href)
            articles.append({
                "code": code,
                "title": title,
                "date": date_tag.get_text(strip=True),
                "article_url": article_url,
                "source": info_tag.get_text(strip=True) if info_tag else "",
            })
    return articles


# ---------------------------------------------------------------------------
# 본문 스니펫 추출
# ---------------------------------------------------------------------------
async def extract_news_snippet(
    session: aiohttp.ClientSession,
    article: dict,
    snippet_length: int = 250,
) -> dict:
    """개별 뉴스 URL에서 본문(도입부 스니펫)을 추출한다."""
    html = await fetch_html(session, article["article_url"])
    article["body"] = ""
    article["full_body"] = ""

    if not html:
        return article

    soup = BeautifulSoup(html, "lxml")
    full_text = ""

    # 1. 네이버 금융 내 본문
    body_tag = soup.select_one("#news_read")
    if body_tag:
        full_text = body_tag.get_text()
    else:
        # 2. 리다이렉트 추적
        redirect_link = (
            soup.select_one("a.link_news_t") or soup.select_one("a#scrollDiv")
        )
        if redirect_link and redirect_link.get("href"):
            html2 = await fetch_html(session, redirect_link.get("href"))
            if html2:
                soup2 = BeautifulSoup(html2, "lxml")
                body2 = (
                    soup2.select_one("#dic_area")
                    or soup2.select_one("#newsct_article")
                    or soup2.select_one("#articeBody")
                )
                if body2:
                    full_text = body2.get_text()
        else:
            # 3. URL 직접 재구성 (oid/aid 파라미터)
            parsed = urlparse(article["article_url"])
            qs = parse_qs(parsed.query)
            oid = qs.get("office_id", qs.get("oid", [None]))[0]
            aid = qs.get("article_id", qs.get("aid", [None]))[0]
            if oid and aid:
                direct_url = f"https://n.news.naver.com/mnews/article/{oid}/{aid}"
                html3 = await fetch_html(session, direct_url)
                if html3:
                    soup3 = BeautifulSoup(html3, "lxml")
                    body3 = (
                        soup3.select_one("#dic_area")
                        or soup3.select_one("#newsct_article")
                        or soup3.select_one("#articeBody")
                    )
                    if body3:
                        full_text = body3.get_text()

    if full_text:
        full_text_clean = re.sub(r"\s+", " ", full_text).strip()
        full_text_clean = re.sub(r"\[.*?\]", "", full_text_clean).strip()
        article["full_body"] = full_text_clean
        article["body"] = _clean_text(full_text, max_length=snippet_length)

    return article
