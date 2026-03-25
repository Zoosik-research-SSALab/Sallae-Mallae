from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

from core.config import settings
from core.exceptions import register_exception_handlers
from core.logger import logger
from domains.debate.router import router as debate_router
from domains.finance.router import router as finance_router
from domains.news.router import router as news_router
from domains.pipeline.router import router as pipeline_router
from domains.signal.router import router as signal_router
from domains.stock.router import router as stock_router

# Load environment variables from .env when present.
load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup hook.
    logger.info("AI Server starting up...")
    yield
    # Shutdown hook.
    logger.info("AI Server shutting down...")


app = FastAPI(title=settings.APP_TITLE, lifespan=lifespan)

register_exception_handlers(app)

app.include_router(debate_router, prefix="/ai/debate", tags=["debate"])
app.include_router(news_router, prefix="/ai/news", tags=["news"])
app.include_router(pipeline_router, prefix="/ai/pipeline", tags=["pipeline"])
app.include_router(signal_router, prefix="/ai/signal", tags=["signal"])
app.include_router(stock_router, prefix="/ai/stock", tags=["stock"])
app.include_router(finance_router, prefix="/ai/finance", tags=["finance"])


@app.get("/health")
def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "OK"}
