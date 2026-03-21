from __future__ import annotations

# NOTE:
# 4_debate_worker/worker/schemas.py 와 동일한 API 계약 필드를 사용합니다.
# 공통 패키지 분리 전까지는 두 파일을 함께 수정해야 합니다.

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class TargetItem(BaseModel):
    stock_id: int
    ticker: str
    stock_name: str


class DebateTargetsResponse(BaseModel):
    report_date: date
    source: str
    count: int
    targets: list[TargetItem]


class FinancialSnapshot(BaseModel):
    report_year: int
    report_quarter: str
    total_assets: int | None = None
    total_liabilities: int | None = None
    total_equity: int | None = None
    revenue: int | None = None
    operating_profit: int | None = None
    net_income: int | None = None
    operating_cash_flow: int | None = None
    per: float | None = None
    pbr: float | None = None
    roe: float | None = None


class EnsemblePredictionPayload(BaseModel):
    model_version: str
    ensemble_result: int
    ensemble_confidence: float
    signal_agreement: bool | None = None
    confidence_gap: float | None = None
    risk_flag: bool | None = None
    scenario_type: str | None = None
    scenario_label: str | None = None


class LgbmPredictionPayload(BaseModel):
    model_version: str
    predicted_class: int
    confidence: float
    prob_down: float
    prob_sideways: float
    prob_up: float


class TftPredictionPayload(BaseModel):
    model_version: str
    group_id: str | None = None
    prob: float
    pred: int


class GarchPredictionPayload(BaseModel):
    model_version: str
    vol_1d: float | None = None
    vol_3d: float | None = None
    vol_5d: float | None = None
    volatility_level: str | None = None
    risk_flag: bool | None = None
    percentile_vs_1y: float | None = None


class KeywordNewsItem(BaseModel):
    news_id: int | None = None
    title: str
    snippet: str | None = None
    published_at: datetime | None = None
    url: str | None = None


class TopKeywordItem(BaseModel):
    keyword: str
    mention_count: int | None = None
    news: list[KeywordNewsItem] = Field(default_factory=list)


class FundamentalPersona(BaseModel):
    latest_financials: FinancialSnapshot | None = None
    recent_financials: list[FinancialSnapshot] = Field(default_factory=list)


class ChartPersona(BaseModel):
    ensemble_prediction: EnsemblePredictionPayload | None = None
    lgbm_prediction: LgbmPredictionPayload | None = None
    tft_prediction: TftPredictionPayload | None = None
    garch_prediction: GarchPredictionPayload | None = None


class NewsPersona(BaseModel):
    top_keywords: list[TopKeywordItem] = Field(default_factory=list)
    sentiment: dict[str, Any] = Field(default_factory=dict)


class DebatePersonas(BaseModel):
    fundamental: FundamentalPersona
    chart: ChartPersona
    news: NewsPersona


class DebateInputsResponse(BaseModel):
    stock_id: int
    ticker: str
    stock_name: str
    report_date: date
    debate_version: str
    personas: DebatePersonas


class DebateResultRequest(BaseModel):
    stock_id: int = Field(..., ge=1)
    ticker: str = Field(..., min_length=1, max_length=6)
    report_date: date
    debate_version: str = Field(..., min_length=1, max_length=20)
    chairman_signal: str | None = Field(default=None, max_length=4)
    debate_confidence: float | None = None
    debate_summary: dict[str, Any] | list[Any] | None = None
    final_stances: dict[str, Any] | list[Any] | None = None
    debate_full_log: dict[str, Any] | list[Any] | None = None
    chairman_report: str | None = None


class DebateResultResponse(BaseModel):
    result: str
    stock_id: int
    report_date: date
    debate_version: str
