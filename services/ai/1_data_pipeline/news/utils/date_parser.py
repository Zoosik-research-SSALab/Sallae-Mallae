"""
뉴스 데이터 파이프라인 — 날짜 파싱 공통 유틸

다양한 날짜 형식(절대/상대)을 datetime으로 변환한다.
daily.py, backfill_loader.py, csv_loader.py 등에서 공통으로 사용.
"""
import re
from datetime import datetime, timedelta


# 지원하는 절대 날짜 형식 (빈도 순)
_DATE_FORMATS = (
    "%Y.%m.%d %H:%M",
    "%Y-%m-%d %H:%M:%S",
    "%Y-%m-%d %H:%M",
    "%Y.%m.%d",
    "%Y-%m-%d",
    "%Y%m%d",
    "%Y년 %m월 %d일 %H:%M",
    "%Y년 %m월 %d일",
)

# 상대시간 패턴: "N분 전", "N시간 전", "N일 전"
_RELATIVE_RE = re.compile(r"(\d+)\s*(분|시간|일)\s*전")

_RELATIVE_UNITS = {
    "분": "minutes",
    "시간": "hours",
    "일": "days",
}


def parse_date(date_str: str, *, allow_relative: bool = True) -> datetime | None:
    """다양한 날짜 형식 및 상대시간('3시간 전', '1일 전' 등)을 datetime으로 변환.

    Args:
        date_str: 파싱할 날짜 문자열
        allow_relative: 상대시간 파싱 허용 여부 (기본 True).
            실시간 크롤링(daily.py)에서는 True,
            백필/CSV 적재처럼 나중에 로드하는 경우에는 False로 설정해야
            "3시간 전" 등이 적재 시각 기준으로 잘못 계산되는 것을 방지.

    Returns:
        datetime 객체 또는 파싱 실패 시 None
    """
    if not date_str or not isinstance(date_str, str):
        return None

    text = date_str.strip()
    if not text:
        return None

    # 상대시간 처리 (실시간 크롤링 전용)
    if allow_relative:
        rel = _RELATIVE_RE.match(text)
        if rel:
            amount = int(rel.group(1))
            unit = _RELATIVE_UNITS.get(rel.group(2))
            if unit:
                return datetime.now() - timedelta(**{unit: amount})

    # 절대시간 형식 시도
    cleaned = text.rstrip(".")
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt)
        except ValueError:
            continue

    return None