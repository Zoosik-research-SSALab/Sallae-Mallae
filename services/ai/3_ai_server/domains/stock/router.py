from fastapi import APIRouter

from domains.stock.schemas import StockInferRequest, StockInferResponse
from domains.stock.service import infer_stock

router = APIRouter()


@router.post("/infer", response_model=StockInferResponse)
def infer(payload: StockInferRequest) -> StockInferResponse:
    return infer_stock(payload)
