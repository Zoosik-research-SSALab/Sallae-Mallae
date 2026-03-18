"""signal/schemas.py — 시그널 업로드 및 포트폴리오 업데이트 스키마."""

from pydantic import BaseModel, Field


# ── 시그널 업로드 ──

class SignalItem(BaseModel):
    ticker: str = Field(..., min_length=4, max_length=6)
    tft_prob: float = Field(..., ge=0.0, le=1.0)
    lgbm_prob: float = Field(..., ge=0.0, le=1.0)
    ensemble_prob: float = Field(..., ge=0.0, le=1.0)
    signal: str = Field(..., pattern="^(BUY|HOLD|SELL)$")
    garch_vol_5d: float | None = None
    garch_risk_flag: bool = False


class SignalUploadRequest(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    model_version: str = Field(default="tft-v2")
    signals: list[SignalItem] = Field(..., min_length=1)


class SignalUploadResponse(BaseModel):
    date: str
    inserted: int
    message: str


# ── 포트폴리오 업데이트 ──

class PositionItem(BaseModel):
    ticker: str
    buy_date: str
    buy_price: int
    current_price: int | None = None
    shares: int
    invested: int
    unrealized_pnl: int | None = None
    hold_days: int
    is_extended: bool = False
    ensemble_prob: float | None = None


class TradeItem(BaseModel):
    ticker: str
    trade_type: str = Field(..., pattern="^(BUY|SELL)$")
    price: int
    shares: int
    amount: int
    commission: int | None = None
    pnl: int | None = None
    return_rate: float | None = None
    hold_days: int | None = None
    trade_reason: str | None = None
    is_extended: bool = False
    ensemble_prob: float | None = None


class PortfolioUpdateRequest(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    portfolio_id: int = Field(default=1)
    portfolio_value: int
    cash: int
    n_positions: int
    daily_return: float | None = None
    cumulative_return: float | None = None
    mdd: float | None = None
    sharpe_30d: float | None = None
    positions: list[PositionItem] = Field(default_factory=list)
    trades: list[TradeItem] = Field(default_factory=list)


class PortfolioUpdateResponse(BaseModel):
    date: str
    snapshot_saved: bool
    holdings_count: int
    trades_count: int
    message: str
