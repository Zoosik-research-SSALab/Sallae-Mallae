from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from domains.finance.schemas import FinanceInferRequest, FinanceInferResponse
from domains.finance.service import infer_finance
from shared_resources.core.db import get_session

router = APIRouter()


@router.post("/infer", response_model=FinanceInferResponse)
def infer(
    payload: FinanceInferRequest,
    db: Session = Depends(get_session),
) -> FinanceInferResponse:
    """재무 분석 추론 엔드포인트"""
    return infer_finance(payload)
