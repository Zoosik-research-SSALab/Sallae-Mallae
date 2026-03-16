from __future__ import annotations

from datetime import date

from sqlalchemy import Select, desc, func, select
from sqlalchemy.orm import Session

from domains.debate.models import (
    AiDebateReport,
    AiMlReport,
    AiTradingHistory,
    DebateStock,
    MlEnsemblePrediction,
    MlGarchPrediction,
    MlLgbmPrediction,
    MlLstmPrediction,
    StockFinancial,
    StockNews,
    StockNewsMap,
)


def get_target_stocks(
    db: Session,
    report_date: date,
    market_type: str,
    limit: int | None,
    tickers: tuple[str, ...] | None = None,
) -> list[DebateStock]:
    stmt: Select[tuple[DebateStock]] = (
        select(DebateStock)
        .join(
            AiMlReport,
            (AiMlReport.stock_id == DebateStock.id) & (AiMlReport.report_date == report_date),
        )
        .where(DebateStock.is_active.is_(True))
        .where(DebateStock.market_type == market_type)
        .order_by(DebateStock.ticker.asc())
        .distinct()
    )
    if tickers:
        stmt = stmt.where(DebateStock.ticker.in_(tickers))
    if limit is not None:
        stmt = stmt.limit(limit)
    return db.scalars(stmt).all()


def get_target_stocks_by_trading_history(
    db: Session,
    report_date: date,
    market_type: str,
    portfolio_id: int | None,
    limit: int | None,
) -> list[DebateStock]:
    stmt: Select[tuple[DebateStock]] = (
        select(DebateStock)
        .join(AiTradingHistory, AiTradingHistory.stock_id == DebateStock.id)
        .where(DebateStock.is_active.is_(True))
        .where(DebateStock.market_type == market_type)
        .where(func.date(AiTradingHistory.trade_time) == report_date)
        .order_by(DebateStock.ticker.asc())
        .distinct()
    )
    if portfolio_id is not None:
        stmt = stmt.where(AiTradingHistory.portfolio_id == portfolio_id)
    if limit is not None:
        stmt = stmt.limit(limit)
    return db.scalars(stmt).all()


def get_stock(db: Session, stock_id: int) -> DebateStock | None:
    return db.get(DebateStock, stock_id)


def get_latest_financials(db: Session, stock_id: int, limit: int) -> list[StockFinancial]:
    stmt = (
        select(StockFinancial)
        .where(StockFinancial.stock_id == stock_id)
        .order_by(desc(StockFinancial.created_at), desc(StockFinancial.report_year), desc(StockFinancial.report_quarter))
        .limit(limit)
    )
    return db.scalars(stmt).all()


def get_ai_ml_report(db: Session, stock_id: int, report_date: date, model_version: str | None) -> AiMlReport | None:
    stmt = (
        select(AiMlReport)
        .where(AiMlReport.stock_id == stock_id)
        .where(AiMlReport.report_date == report_date)
        .order_by(desc(AiMlReport.created_at), desc(AiMlReport.model_version))
    )
    if model_version:
        stmt = stmt.where(AiMlReport.model_version == model_version)
    return db.scalars(stmt.limit(1)).first()


def _get_prediction_by_version(db: Session, model_cls: type, stock_id: int, report_date: date, model_version: str | None):
    stmt = (
        select(model_cls)
        .where(model_cls.stock_id == stock_id)
        .where(model_cls.report_date == report_date)
    )
    if model_version:
        stmt = stmt.where(model_cls.model_version == model_version)
    else:
        stmt = stmt.order_by(desc(model_cls.created_at), desc(model_cls.model_version))
    stmt = stmt.limit(1)
    return db.scalars(stmt).first()


def get_ensemble_prediction(db: Session, stock_id: int, report_date: date, model_version: str | None):
    return _get_prediction_by_version(db, MlEnsemblePrediction, stock_id, report_date, model_version)


def get_lgbm_prediction(db: Session, stock_id: int, report_date: date, model_version: str | None):
    return _get_prediction_by_version(db, MlLgbmPrediction, stock_id, report_date, model_version)


def get_lstm_prediction(db: Session, stock_id: int, report_date: date, model_version: str | None):
    return _get_prediction_by_version(db, MlLstmPrediction, stock_id, report_date, model_version)


def get_garch_prediction(db: Session, stock_id: int, report_date: date, model_version: str | None):
    return _get_prediction_by_version(db, MlGarchPrediction, stock_id, report_date, model_version)


def get_recent_news(db: Session, stock_id: int, report_date: date, limit: int) -> list[tuple[StockNews, StockNewsMap]]:
    stmt = (
        select(StockNews, StockNewsMap)
        .join(StockNewsMap, StockNewsMap.news_id == StockNews.id)
        .where(StockNewsMap.stock_id == stock_id)
        .where(func.date(StockNews.published_at) <= report_date)
        .order_by(desc(StockNews.published_at), desc(StockNews.id))
        .limit(limit)
    )
    return db.execute(stmt).all()


def get_existing_debate_report(db: Session, stock_id: int, report_date: date, debate_version: str) -> AiDebateReport | None:
    stmt = (
        select(AiDebateReport)
        .where(AiDebateReport.stock_id == stock_id)
        .where(AiDebateReport.report_date == report_date)
        .where(AiDebateReport.debate_version == debate_version)
        .limit(1)
    )
    return db.scalars(stmt).first()


def create_debate_report(
    db: Session,
    *,
    stock_id: int,
    report_date: date,
    debate_version: str,
    chairman_signal: str | None,
    debate_confidence: float | None,
    debate_summary,
    final_stances,
    debate_full_log,
    chairman_report: str | None,
) -> AiDebateReport:
    report = AiDebateReport(
        stock_id=stock_id,
        report_date=report_date,
        debate_version=debate_version,
        chairman_signal=chairman_signal,
        debate_confidence=debate_confidence,
        debate_summary=debate_summary,
        final_stances=final_stances,
        debate_full_log=debate_full_log,
        chairman_report=chairman_report,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
