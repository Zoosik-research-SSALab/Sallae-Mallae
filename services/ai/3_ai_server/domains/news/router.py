from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from domains.news.schemas import NewsInferRequest, NewsInferResponse
from domains.news.service import infer_news
from core.config import get_session

router = APIRouter()


@router.post("/infer", response_model=NewsInferResponse)
def infer(
    payload: NewsInferRequest,
    db: Session = Depends(get_session),
) -> NewsInferResponse:
    """뉴스 감성 분석 추론 엔드포인트"""
    return infer_news(payload)
