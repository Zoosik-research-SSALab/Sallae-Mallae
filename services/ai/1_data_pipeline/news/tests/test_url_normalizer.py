"""normalize_news_url 단위 테스트"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from utils.url_normalizer import normalize_news_url


def test_same_article_different_code():
    """같은 기사의 종목코드가 달라도 동일한 URL로 정규화"""
    url1 = "https://finance.naver.com/item/news_read.naver?article_id=0000499697&office_id=374&code=006660&page=1&sm=title_entity_id.basic"
    url2 = "https://finance.naver.com/item/news_read.naver?article_id=0000499697&office_id=374&code=005930&page=1&sm=title_entity_id.basic"
    assert normalize_news_url(url1) == normalize_news_url(url2)


def test_different_article():
    """article_id가 다르면 다른 URL"""
    url1 = "https://finance.naver.com/item/news_read.naver?article_id=0000499697&office_id=374&code=006660"
    url2 = "https://finance.naver.com/item/news_read.naver?article_id=0000499698&office_id=374&code=006660"
    assert normalize_news_url(url1) != normalize_news_url(url2)


def test_parameter_order_independent():
    """파라미터 순서가 달라도 동일하게 정규화"""
    url1 = "https://finance.naver.com/item/news_read.naver?article_id=0000499697&office_id=374&code=006660"
    url2 = "https://finance.naver.com/item/news_read.naver?office_id=374&article_id=0000499697&code=005930"
    assert normalize_news_url(url1) == normalize_news_url(url2)


def test_keeps_article_id_and_office_id():
    """정규화 결과에 article_id와 office_id만 포함"""
    url = "https://finance.naver.com/item/news_read.naver?article_id=123&office_id=456&code=005930&page=2&sm=foo"
    result = normalize_news_url(url)
    assert "article_id=123" in result
    assert "office_id=456" in result
    assert "code=" not in result
    assert "page=" not in result
    assert "sm=" not in result


def test_none_returns_none():
    """None 입력 시 None 반환"""
    assert normalize_news_url(None) is None


def test_empty_string_returns_empty():
    """빈 문자열은 그대로 반환"""
    assert normalize_news_url("") == ""


def test_non_naver_url_unchanged():
    """네이버 금융이 아닌 URL은 변경 없이 반환"""
    url = "https://news.sbs.co.kr/article/12345"
    assert normalize_news_url(url) == url


def test_naver_without_params():
    """파라미터 없는 네이버 URL은 그대로 반환"""
    url = "https://finance.naver.com/item/news_read.naver"
    assert normalize_news_url(url) == url


def test_malformed_url():
    """잘못된 URL은 그대로 반환"""
    url = "not-a-valid-url"
    assert normalize_news_url(url) == url


if __name__ == "__main__":
    tests = [v for k, v in globals().items() if k.startswith("test_")]
    for t in tests:
        try:
            t()
            print(f"  PASS: {t.__name__}")
        except AssertionError as e:
            print(f"  FAIL: {t.__name__} - {e}")
    print(f"\n{len(tests)} tests done")
