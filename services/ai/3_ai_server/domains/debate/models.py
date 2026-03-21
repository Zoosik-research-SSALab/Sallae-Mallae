from __future__ import annotations

from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, BigInteger, Boolean, Date, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.config import Base
from domains.news.models import NewsAgentStockData


class DebateStock(Base):
    # news/stock 도메인과 독립적으로 읽기 전용 query shape를 유지하기 위해 별도 매핑을 둔다.
    __tablename__ = "stocks"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    ticker: Mapped[str] = mapped_column(String(6), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    market_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False)


class StockFinancial(Base):
    __tablename__ = "stock_financials"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    stock_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    report_year: Mapped[int] = mapped_column(Integer, nullable=False)
    report_quarter: Mapped[str] = mapped_column(String(10), nullable=False)
    total_assets: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    total_liabilities: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    total_equity: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    revenue: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    operating_profit: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    net_income: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    operating_cash_flow: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    per: Mapped[float | None] = mapped_column(Float, nullable=True)
    pbr: Mapped[float | None] = mapped_column(Float, nullable=True)
    roe: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AiMlReport(Base):
    __tablename__ = "ai_ml_reports"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    stock_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    report_date: Mapped[date] = mapped_column(Date, nullable=False)
    model_version: Mapped[str] = mapped_column(String(20), nullable=False)
    ml_signal: Mapped[str | None] = mapped_column(String(4), nullable=True)
    ml_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    signal_agreement: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    confidence_gap: Mapped[float | None] = mapped_column(Float, nullable=True)
    scenario_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    risk_flag: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    report_data: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MlEnsemblePrediction(Base):
    __tablename__ = "ml_ensemble_predictions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    stock_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    report_date: Mapped[date] = mapped_column(Date, nullable=False)
    model_version: Mapped[str] = mapped_column(String(20), nullable=False)
    ensemble_result: Mapped[int] = mapped_column(Integer, nullable=False)
    ensemble_confidence: Mapped[float] = mapped_column(Float, nullable=False)
    signal_agreement: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    confidence_gap: Mapped[float | None] = mapped_column(Float, nullable=True)
    risk_flag: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    scenario_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    scenario_label: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MlLgbmPrediction(Base):
    __tablename__ = "ml_lgbm_predictions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    stock_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    report_date: Mapped[date] = mapped_column(Date, nullable=False)
    model_version: Mapped[str] = mapped_column(String(20), nullable=False)
    predicted_class: Mapped[int] = mapped_column(Integer, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    prob_down: Mapped[float] = mapped_column(Float, nullable=False)
    prob_sideways: Mapped[float] = mapped_column(Float, nullable=False)
    prob_up: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MlTftPrediction(Base):
    __tablename__ = "ml_tft_predictions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    stock_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    report_date: Mapped[date] = mapped_column(Date, nullable=False)
    model_version: Mapped[str] = mapped_column(String(20), nullable=False)
    group_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    prob: Mapped[float] = mapped_column(Float, nullable=False)
    pred: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MlGarchPrediction(Base):
    __tablename__ = "ml_garch_predictions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    stock_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    report_date: Mapped[date] = mapped_column(Date, nullable=False)
    model_version: Mapped[str] = mapped_column(String(20), nullable=False)
    vol_1d: Mapped[float | None] = mapped_column(Float, nullable=True)
    vol_3d: Mapped[float | None] = mapped_column(Float, nullable=True)
    vol_5d: Mapped[float | None] = mapped_column(Float, nullable=True)
    volatility_level: Mapped[str | None] = mapped_column(String(10), nullable=True)
    risk_flag: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    percentile_vs_1y: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AiDebateReport(Base):
    __tablename__ = "ai_debate_reports"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    stock_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    report_date: Mapped[date] = mapped_column(Date, nullable=False)
    debate_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    chairman_signal: Mapped[str | None] = mapped_column(String(4), nullable=True)
    debate_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    debate_summary: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(JSON, nullable=True)
    final_stances: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(JSON, nullable=True)
    debate_full_log: Mapped[dict[str, Any] | list[Any] | None] = mapped_column(JSON, nullable=True)
    chairman_report: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class AiTradingHistory(Base):
    __tablename__ = "ai_trading_history"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    portfolio_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    stock_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    ml_report_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    debate_report_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    model_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    trade_type: Mapped[str] = mapped_column(String(4), nullable=False)
    trade_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    trade_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    trade_quantity: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    trade_amount: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    realized_profit: Mapped[int] = mapped_column(BigInteger, nullable=False)
    holding_quantity_after: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    cash_balance_after: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    avg_buy_price_after: Mapped[int | None] = mapped_column(Integer, nullable=True)


class AiPortfolio(Base):
    __tablename__ = "ai_portfolio"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    model_version: Mapped[str] = mapped_column(String(20), nullable=False)
    debate_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cumulative_return: Mapped[float | None] = mapped_column(Float, nullable=True)
    total_trades: Mapped[int] = mapped_column(Integer, nullable=False)
    winning_trades: Mapped[int] = mapped_column(Integer, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    initial_capital: Mapped[int] = mapped_column(BigInteger, nullable=False)
    cash_balance: Mapped[int] = mapped_column(BigInteger, nullable=False)
    realized_profit: Mapped[int] = mapped_column(BigInteger, nullable=False)
    unrealized_profit: Mapped[int] = mapped_column(BigInteger, nullable=False)
    total_asset_value: Mapped[int] = mapped_column(BigInteger, nullable=False)
    latest_record_date: Mapped[date | None] = mapped_column(Date, nullable=True)


class AiPortfolioHolding(Base):
    __tablename__ = "ai_portfolio_holdings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    portfolio_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    stock_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    model_version: Mapped[str] = mapped_column(String(20), nullable=False)
    portfolio_weight: Mapped[float | None] = mapped_column(Float, nullable=True)
    return_rate: Mapped[float | None] = mapped_column(Float, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    buy_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    avg_buy_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    current_price: Mapped[int | None] = mapped_column(Integer, nullable=True)
    holding_quantity: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    investment_amount: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    market_value: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    evaluation_profit: Mapped[int | None] = mapped_column(BigInteger, nullable=True)


class AiDailyPerformance(Base):
    __tablename__ = "ai_daily_performance"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    portfolio_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    model_version: Mapped[str] = mapped_column(String(20), nullable=False)
    record_date: Mapped[date] = mapped_column(Date, nullable=False)
    daily_return: Mapped[float | None] = mapped_column(Float, nullable=True)
    cumulative_return: Mapped[float | None] = mapped_column(Float, nullable=True)
    mdd: Mapped[float | None] = mapped_column(Float, nullable=True)
    cash_balance: Mapped[int] = mapped_column(BigInteger, nullable=False)
    invested_amount: Mapped[int] = mapped_column(BigInteger, nullable=False)
    market_value: Mapped[int] = mapped_column(BigInteger, nullable=False)
    realized_profit: Mapped[int] = mapped_column(BigInteger, nullable=False)
    unrealized_profit: Mapped[int] = mapped_column(BigInteger, nullable=False)
    total_asset_value: Mapped[int] = mapped_column(BigInteger, nullable=False)
    holding_count: Mapped[int] = mapped_column(Integer, nullable=False)
