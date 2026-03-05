from pydantic import BaseModel, Field


class FinanceInferRequest(BaseModel):
    stock_id: int = Field(..., ge=1)


class FinanceInferResponse(BaseModel):
    stock_id: int
    risk_level: str
    model_version: str
