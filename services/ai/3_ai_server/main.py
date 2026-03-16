from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

from core.config import settings
from core.exceptions import register_exception_handlers
from core.logger import logger
from domains.debate.router import router as debate_router
from domains.finance.router import router as finance_router
from domains.news.router import router as news_router
from domains.stock.router import router as stock_router

# .env 파일이 있으면 환경변수로 로딩
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # 서버 기동 시 초기화 로직 (모델 로딩 등)
    logger.info("AI Server starting up...")
    yield
    # 서버 종료 시 정리 로직
    logger.info("AI Server shutting down...")


app = FastAPI(title=settings.APP_TITLE, lifespan=lifespan)

register_exception_handlers(app)

app.include_router(debate_router, prefix="/ai/debate", tags=["debate"])
app.include_router(stock_router, prefix="/stock", tags=["stock"])
app.include_router(news_router, prefix="/news", tags=["news"])
app.include_router(finance_router, prefix="/finance", tags=["finance"])


@app.get("/health")
def health() -> dict[str, str]:
    """헬스체크 엔드포인트"""
    return {"status": "OK"}
