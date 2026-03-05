from fastapi import APIRouter

from domains.news.schemas import NewsInferRequest, NewsInferResponse
from domains.news.service import infer_news

router = APIRouter()


@router.post("/infer", response_model=NewsInferResponse)
def infer(payload: NewsInferRequest) -> NewsInferResponse:
    return infer_news(payload)
