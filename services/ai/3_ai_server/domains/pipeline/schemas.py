"""pipeline/schemas.py — 파이프라인 시그널 요청/응답 스키마."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


# ── 요청 ──

class PipelineSignalCreateRequest(BaseModel):
    signal_type: str = Field(
        ...,
        max_length=50,
        examples=["ML_INFERENCE_DONE"],
        description="시그널 종류 (예: ML_INFERENCE_DONE, NEWS_PIPELINE_DONE)",
    )


class PipelineSignalUpdateRequest(BaseModel):
    status: str = Field(
        ...,
        pattern="^(PROCESSING|DONE|FAILED)$",
        description="변경할 상태 (PROCESSING, DONE, FAILED)",
    )


# ── 응답 ──

class PipelineSignalResponse(BaseModel):
    id: int
    signal_type: str
    status: str
    retry_count: int
    created_at: datetime | None = None
    processed_at: datetime | None = None
