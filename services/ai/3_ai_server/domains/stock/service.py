from domains.stock.schemas import StockInferRequest, StockInferResponse


def infer_stock(payload: StockInferRequest) -> StockInferResponse:
    return StockInferResponse(
        symbol=payload.symbol,
        signal="HOLD",
        confidence=0.5,
        model_version="stock-v0",
    )
