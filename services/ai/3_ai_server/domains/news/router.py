from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.config import get_session
from core.response import ApiResponse, success_response
from domains.news.schemas import (
    KeywordListResponse,
    NewsInferRequest,
    NewsInferResponse,
    NewsListResponse,
    SimilarKeywordResponse,
)
from domains.news.service import (
    get_keywords_by_stock_code,
    get_news_by_stock_code,
    infer_news,
    search_similar_keywords,
)

router = APIRouter()


@router.post("/infer", response_model=ApiResponse[NewsInferResponse])
def infer(
    payload: NewsInferRequest,
    db: Session = Depends(get_session),
):
    """뉴스 감성 분석 추론 엔드포인트"""
    return success_response(data=infer_news(payload))


@router.get("/keywords/similar", response_model=ApiResponse[SimilarKeywordResponse])
def similar_keywords(
    q: str = Query(..., min_length=1, description="검색할 키워드"),
    top_k: int = Query(10, ge=1, le=50, description="반환할 최대 개수"),
    db: Session = Depends(get_session),
):
    """유사 키워드 검색 (임베딩 코사인 유사도 기반)"""
    return success_response(data=search_similar_keywords(db, query=q, top_k=top_k))


@router.get("/keywords/{code}", response_model=ApiResponse[KeywordListResponse])
def keywords_by_stock(
    code: str,
    limit: int = Query(50, ge=1, le=200, description="반환할 최대 키워드 수"),
    db: Session = Depends(get_session),
):
    """종목별 키워드 조회 (빈도순)"""
    return success_response(data=get_keywords_by_stock_code(db, code=code, limit=limit))


@router.get("/{code}", response_model=ApiResponse[NewsListResponse])
def news_by_stock(
    code: str,
    limit: int = Query(50, ge=1, le=200, description="반환할 최대 뉴스 수"),
    offset: int = Query(0, ge=0, description="오프셋 (페이지네이션)"),
    db: Session = Depends(get_session),
):
    """종목별 뉴스 조회 (최신순)"""
    return success_response(data=get_news_by_stock_code(db, code=code, limit=limit, offset=offset))
