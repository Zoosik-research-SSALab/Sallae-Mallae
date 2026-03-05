from pydantic import BaseModel, Field


class StockInferRequest(BaseModel):
    symbol: str = Field(..., min_length=1)
    features: list[float] = Field(default_factory=list)


class StockInferResponse(BaseModel):
    symbol: str
    signal: str
    confidence: float
    model_version: str
