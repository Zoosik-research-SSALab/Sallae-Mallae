from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from core.auth import verify_internal_api_key
from core.config import get_session
from domains.debate.schemas import DebateInputsResponse, DebateResultRequest, DebateResultResponse, DebateTargetsResponse
from domains.debate.service import get_debate_inputs, get_debate_targets, save_debate_result

router = APIRouter(dependencies=[Depends(verify_internal_api_key)])


@router.get("/targets", response_model=DebateTargetsResponse)
def debate_targets(
    report_date: date,
    market_type: str = Query(default="KOSPI", min_length=1, max_length=20),
    source: str = Query(default="trading_history", min_length=1, max_length=30),
    portfolio_id: int | None = Query(default=None, ge=1),
    stock_id: list[int] | None = Query(default=None),
    limit: int | None = Query(default=None, ge=1, le=300),
    db: Session = Depends(get_session),
) -> DebateTargetsResponse:
    """토론 배치 대상 종목 목록을 조회한다."""
    return get_debate_targets(
        db,
        report_date=report_date,
        market_type=market_type,
        source=source,
        portfolio_id=portfolio_id,
        stock_ids=tuple(stock_id) if stock_id else None,
        limit=limit,
    )


@router.get("/inputs/{stock_id}", response_model=DebateInputsResponse)
def debate_inputs(
    stock_id: int,
    report_date: date,
    debate_version: str = Query(default="debate-v1", min_length=1, max_length=20),
    model_version: str | None = Query(default=None, min_length=1, max_length=20),
    news_limit: int = Query(default=10, ge=1, le=20),
    financial_limit: int = Query(default=4, ge=1, le=8),
    db: Session = Depends(get_session),
) -> DebateInputsResponse:
    """종목별 토론 입력 패킷을 조회한다."""
    return get_debate_inputs(
        db,
        stock_id=stock_id,
        report_date=report_date,
        debate_version=debate_version,
        model_version=model_version,
        news_limit=news_limit,
        financial_limit=financial_limit,
    )


@router.post("/results", response_model=DebateResultResponse)
def debate_results(payload: DebateResultRequest, db: Session = Depends(get_session)) -> DebateResultResponse:
    """토론 결과를 저장한다."""
    return save_debate_result(db, payload)
