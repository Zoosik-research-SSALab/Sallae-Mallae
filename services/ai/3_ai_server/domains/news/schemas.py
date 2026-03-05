from pydantic import BaseModel, Field


class NewsInferRequest(BaseModel):
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)


class NewsInferResponse(BaseModel):
    sentiment: str
    score: float
    model_version: str
