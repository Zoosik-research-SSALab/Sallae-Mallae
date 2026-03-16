from __future__ import annotations

from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, BigInteger, Boolean, Date, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.config import Base


class DebateStock(Base):
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


class MlLstmPrediction(Base):
    __tablename__ = "ml_lstm_predictions"

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


class StockNews(Base):
    __tablename__ = "stock_news"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    publisher: Mapped[str | None] = mapped_column(String(20), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class StockNewsMap(Base):
    __tablename__ = "stock_news_map"

    stock_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    news_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    sentiment_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    sentiment_label: Mapped[str | None] = mapped_column(String(20), nullable=True)


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
