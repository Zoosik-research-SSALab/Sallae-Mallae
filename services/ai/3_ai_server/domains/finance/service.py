from domains.finance.schemas import FinanceInferRequest, FinanceInferResponse


def infer_finance(payload: FinanceInferRequest) -> FinanceInferResponse:
    return FinanceInferResponse(stock_id=payload.stock_id, risk_level="MEDIUM", model_version="finance-v0")
