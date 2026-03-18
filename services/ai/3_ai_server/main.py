from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI

from core.config import settings
from core.exceptions import register_exception_handlers
from core.logger import logger
from domains.debate.router import router as debate_router
from domains.finance.router import router as finance_router
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
app.include_router(stock_router, prefix="/stock", tags=["stock"])
app.include_router(finance_router, prefix="/finance", tags=["finance"])


@app.get("/health")
def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "OK"}
