from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class BusinessException(Exception):
    """비즈니스 로직 예외"""
    def __init__(self, status_code: int = 400, message: str = "요청을 처리할 수 없습니다."):
        self.status_code = status_code
        self.message = message


class NotFoundException(BusinessException):
    """리소스를 찾을 수 없는 경우"""
    def __init__(self, message: str = "리소스를 찾을 수 없습니다."):
        super().__init__(status_code=404, message=message)


class UnauthorizedException(BusinessException):
    """인증 실패"""
    def __init__(self, message: str = "인증이 필요합니다."):
        super().__init__(status_code=401, message=message)


def register_exception_handlers(app: FastAPI) -> None:
    """FastAPI 앱에 공통 예외 핸들러를 등록한다."""

    @app.exception_handler(BusinessException)
    async def business_exception_handler(request: Request, exc: BusinessException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"success": False, "data": None, "message": exc.message},
        )

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        return JSONResponse(
            status_code=500,
            content={"success": False, "data": None, "message": "서버 내부 오류가 발생했습니다."},
        )
