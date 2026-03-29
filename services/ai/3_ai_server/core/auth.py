from fastapi import Header

from core.config import settings
from core.exceptions import UnauthorizedException


def verify_internal_api_key(x_api_key: str | None = Header(default=None, alias="X-API-Key")) -> None:
    """내부 워커 전용 API 키를 검증한다."""
    if x_api_key != settings.INTERNAL_API_KEY:
        raise UnauthorizedException("유효한 내부 API 키가 필요합니다.")
