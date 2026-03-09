from typing import Any, Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """통일된 API 응답 포맷"""
    success: bool = True
    data: T | None = None
    message: str = "OK"


def success_response(data: Any = None, message: str = "OK") -> dict:
    """성공 응답을 생성한다."""
    return {"success": True, "data": data, "message": message}


def error_response(message: str = "Error", data: Any = None) -> dict:
    """에러 응답을 생성한다."""
    return {"success": False, "data": data, "message": message}
