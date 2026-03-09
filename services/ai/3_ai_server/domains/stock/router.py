from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from domains.stock.schemas import StockInferRequest, StockInferResponse
from domains.stock.service import infer_stock
from shared_resources.core.db import get_session

router = APIRouter()


@router.post("/infer", response_model=StockInferResponse)
def infer(
    payload: StockInferRequest,
    db: Session = Depends(get_session),
) -> StockInferResponse:
    """종목 추론 엔드포인트"""
    return infer_stock(payload)
