"""
URL 정규화 유틸 — 네이버 금융 뉴스 URL에서 종목별 파라미터를 제거하여
같은 기사를 하나의 URL로 통일한다.

예시:
  입력: https://finance.naver.com/item/news_read.naver?article_id=0000499697&office_id=374&code=006660&page=1&sm=title_entity_id.basic
  출력: https://finance.naver.com/item/news_read.naver?article_id=0000499697&office_id=374
"""

from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

# 기사를 식별하는 핵심 파라미터만 유지
_NAVER_KEEP_PARAMS = {"article_id", "office_id"}


def normalize_news_url(url: str | None) -> str | None:
    """뉴스 URL을 정규화한다. article_id + office_id만 남기고 나머지 제거."""
    if not url:
        return url

    try:
        parsed = urlparse(url)

        # 네이버 금융 뉴스 URL만 정규화
        if "finance.naver.com" in (parsed.hostname or ""):
            params = parse_qs(parsed.query, keep_blank_values=False)
            filtered = {k: v[0] for k, v in params.items() if k in _NAVER_KEEP_PARAMS}
            if "article_id" in filtered and "office_id" in filtered:
                new_query = urlencode(sorted(filtered.items()))
                return urlunparse((parsed.scheme, parsed.netloc, parsed.path, "", new_query, ""))

        return url
    except Exception:
        return url
