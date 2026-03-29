from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.auth import verify_internal_api_key
from core.config import get_session
from core.response import ApiResponse, success_response
from domains.news.schemas import (
    DebateNewsDataResponse,
    NewsInferRequest,
    NewsInferResponse,
)
from domains.news.service import (
    get_debate_news_data,
    infer_news,
)

router = APIRouter()


@router.post("/infer", response_model=ApiResponse[NewsInferResponse])
def infer(
    payload: NewsInferRequest,
    db: Session = Depends(get_session),
):
    """뉴스 감성 분석 추론 엔드포인트"""
    return success_response(data=infer_news(payload))


@router.get(
    "/debate-data",
    response_model=ApiResponse[DebateNewsDataResponse],
    dependencies=[Depends(verify_internal_api_key)],
)
def debate_news_data(
    report_date: date = Query(..., description="리포트 날짜 (YYYY-MM-DD)"),
    top_k: int = Query(3, ge=1, le=10, description="상위 키워드 수"),
    news_per_keyword: int = Query(2, ge=1, le=5, description="키워드당 뉴스 수"),
    db: Session = Depends(get_session),
):
    """
    뉴스 에이전트에게 전달할 디베이트 데이터를 조회한다.

    - 당일+전날 키워드 중 언급 횟수 상위 top_k개 + 각각 뉴스 원문/URL
    - 종목별 감성 지수 (sentiment_score/label 집계)
    """
    return success_response(
        data=get_debate_news_data(
            db,
            report_date=report_date,
            top_k=top_k,
            news_per_keyword=news_per_keyword,
        )
    )
