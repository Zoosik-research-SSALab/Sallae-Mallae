from fastapi import APIRouter

from domains.finance.schemas import FinanceInferRequest, FinanceInferResponse
from domains.finance.service import infer_finance

router = APIRouter()


@router.post("/infer", response_model=FinanceInferResponse)
def infer(payload: FinanceInferRequest) -> FinanceInferResponse:
    return infer_finance(payload)
