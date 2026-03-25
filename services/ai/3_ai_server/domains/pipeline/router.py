"""pipeline/router.py — 파이프라인 시그널 발행·상태 관리 라우터."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from core.auth import verify_internal_api_key
from core.config import get_session
from core.logger import logger
from domains.pipeline import crud
from domains.pipeline.schemas import (
    PipelineSignalCreateRequest,
    PipelineSignalResponse,
    PipelineSignalUpdateRequest,
)

router = APIRouter()


@router.post(
    "/signal",
    response_model=PipelineSignalResponse,
    status_code=201,
    dependencies=[Depends(verify_internal_api_key)],
)
def create_pipeline_signal(
    req: PipelineSignalCreateRequest,
    db: Session = Depends(get_session),
):
    """파이프라인 시그널을 PENDING 상태로 생성."""
    row = crud.create_signal(db, req.signal_type)
    logger.info("[PIPELINE] 시그널 생성: id=%d, type=%s", row["id"], req.signal_type)
    return PipelineSignalResponse(**row)


@router.patch(
    "/signal/{signal_id}",
    response_model=PipelineSignalResponse,
    dependencies=[Depends(verify_internal_api_key)],
)
def update_pipeline_signal(
    signal_id: int,
    req: PipelineSignalUpdateRequest,
    db: Session = Depends(get_session),
):
    """파이프라인 시그널 상태를 전이 (PROCESSING / DONE / FAILED)."""
    try:
        row = crud.update_signal_status(db, signal_id, req.status)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    if row is None:
        raise HTTPException(status_code=404, detail=f"시그널을 찾을 수 없습니다: id={signal_id}")

    logger.info("[PIPELINE] 시그널 업데이트: id=%d, status=%s", signal_id, req.status)
    return PipelineSignalResponse(**row)


@router.get(
    "/signal/latest",
    response_model=PipelineSignalResponse | None,
    dependencies=[Depends(verify_internal_api_key)],
)
def get_latest_pipeline_signal(
    signal_type: str = Query(..., description="조회할 signal_type"),
    db: Session = Depends(get_session),
):
    """특정 signal_type의 오늘자 최신 시그널을 조회."""
    row = crud.get_latest_signal(db, signal_type)
    if row is None:
        return None
    return PipelineSignalResponse(**row)
