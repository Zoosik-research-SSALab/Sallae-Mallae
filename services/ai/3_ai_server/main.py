from contextlib import asynccontextmanager

from fastapi import FastAPI

from domains.finance.router import router as finance_router
from domains.news.router import router as news_router
from domains.stock.router import router as stock_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.models = {
        "stock": "loaded-stock-model",
        "news": "loaded-news-model",
        "finance": "loaded-finance-model",
    }
    yield


app = FastAPI(title="my_stock_system ai server", lifespan=lifespan)
app.include_router(stock_router, prefix="/stock", tags=["stock"])
app.include_router(news_router, prefix="/news", tags=["news"])
app.include_router(finance_router, prefix="/finance", tags=["finance"])


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "OK"}
