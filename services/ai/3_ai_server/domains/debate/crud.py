from __future__ import annotations

from datetime import UTC, date, datetime

from sqlalchemy import Select, and_, desc, func, select
from sqlalchemy.orm import Session

from domains.debate.models import (
    AiDebateReport,
    AiTradingHistory,
    DebateStock,
    MlEnsemblePrediction,
    MlGarchPrediction,
    MlLgbmPrediction,
    MlTftPrediction,
    NewsAgentStockData,
    StockFinancial,
)


def get_target_stocks(
    db: Session,
    report_date: date,
    market_type: str,
    stock_ids: tuple[int, ...] | None,
    limit: int | None,
    tickers: tuple[str, ...] | None = None,
) -> list[DebateStock]:
    ensemble_exists = (
        select(MlEnsemblePrediction.id)
        .where(MlEnsemblePrediction.stock_id == DebateStock.id)
        .where(MlEnsemblePrediction.report_date == report_date)
        .exists()
    )
    lgbm_exists = (
        select(MlLgbmPrediction.id)
        .where(MlLgbmPrediction.stock_id == DebateStock.id)
        .where(MlLgbmPrediction.report_date == report_date)
        .exists()
    )
    tft_exists = (
        select(MlTftPrediction.id)
        .where(MlTftPrediction.stock_id == DebateStock.id)
        .where(MlTftPrediction.report_date == report_date)
        .exists()
    )
    garch_exists = (
        select(MlGarchPrediction.id)
        .where(MlGarchPrediction.stock_id == DebateStock.id)
        .where(MlGarchPrediction.report_date == report_date)
        .exists()
    )
    news_exists = (
        select(NewsAgentStockData.id)
        .where(NewsAgentStockData.stock_id == DebateStock.id)
        .where(NewsAgentStockData.report_date == report_date)
        .exists()
    )
    stmt: Select[tuple[DebateStock]] = (
        select(DebateStock)
        .where(DebateStock.is_active.is_(True))
        .where(DebateStock.market_type == market_type)
        .where(and_(news_exists, ensemble_exists, lgbm_exists, tft_exists, garch_exists))
        .order_by(DebateStock.ticker.asc())
    )
    if stock_ids:
        stmt = stmt.where(DebateStock.id.in_(stock_ids))
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
    stock_ids: tuple[int, ...] | None,
    limit: int | None,
) -> list[DebateStock]:
    ensemble_exists = (
        select(MlEnsemblePrediction.id)
        .where(MlEnsemblePrediction.stock_id == DebateStock.id)
        .where(MlEnsemblePrediction.report_date == report_date)
        .exists()
    )
    lgbm_exists = (
        select(MlLgbmPrediction.id)
        .where(MlLgbmPrediction.stock_id == DebateStock.id)
        .where(MlLgbmPrediction.report_date == report_date)
        .exists()
    )
    tft_exists = (
        select(MlTftPrediction.id)
        .where(MlTftPrediction.stock_id == DebateStock.id)
        .where(MlTftPrediction.report_date == report_date)
        .exists()
    )
    garch_exists = (
        select(MlGarchPrediction.id)
        .where(MlGarchPrediction.stock_id == DebateStock.id)
        .where(MlGarchPrediction.report_date == report_date)
        .exists()
    )
    news_exists = (
        select(NewsAgentStockData.id)
        .where(NewsAgentStockData.stock_id == DebateStock.id)
        .where(NewsAgentStockData.report_date == report_date)
        .exists()
    )
    stmt: Select[tuple[DebateStock]] = (
        select(DebateStock)
        .join(AiTradingHistory, AiTradingHistory.stock_id == DebateStock.id)
        .where(DebateStock.is_active.is_(True))
        .where(DebateStock.market_type == market_type)
        .where(func.date(AiTradingHistory.trade_time) == report_date)
        .where(and_(news_exists, ensemble_exists, lgbm_exists, tft_exists, garch_exists))
        .order_by(DebateStock.ticker.asc())
        .distinct()
    )
    if portfolio_id is not None:
        stmt = stmt.where(AiTradingHistory.portfolio_id == portfolio_id)
    if stock_ids:
        stmt = stmt.where(DebateStock.id.in_(stock_ids))
    if limit is not None:
        stmt = stmt.limit(limit)
    return db.scalars(stmt).all()


def get_stock(db: Session, stock_id: int) -> DebateStock | None:
    return db.get(DebateStock, stock_id)


def get_latest_financials(db: Session, stock_id: int, limit: int) -> list[StockFinancial]:
    stmt = (
        select(StockFinancial)
        .where(StockFinancial.stock_id == stock_id)
        .order_by(
            desc(StockFinancial.created_at).nulls_last(),
            desc(StockFinancial.report_year),
            desc(StockFinancial.report_quarter),
        )
        .limit(limit)
    )
    return db.scalars(stmt).all()


def _get_prediction_by_version(db: Session, model_cls: type, stock_id: int, report_date: date, model_version: str | None):
    stmt = (
        select(model_cls)
        .where(model_cls.stock_id == stock_id)
        .where(model_cls.report_date == report_date)
    )
    if model_version:
        stmt = stmt.where(model_cls.model_version == model_version)
    else:
        stmt = stmt.order_by(desc(model_cls.created_at).nulls_last(), desc(model_cls.model_version))
    stmt = stmt.limit(1)
    return db.scalars(stmt).first()


def get_ensemble_prediction(db: Session, stock_id: int, report_date: date, model_version: str | None):
    return _get_prediction_by_version(db, MlEnsemblePrediction, stock_id, report_date, model_version)


def get_lgbm_prediction(db: Session, stock_id: int, report_date: date, model_version: str | None):
    return _get_prediction_by_version(db, MlLgbmPrediction, stock_id, report_date, model_version)


def get_tft_prediction(db: Session, stock_id: int, report_date: date, model_version: str | None):
    return _get_prediction_by_version(db, MlTftPrediction, stock_id, report_date, model_version)


def get_garch_prediction(db: Session, stock_id: int, report_date: date, model_version: str | None):
    return _get_prediction_by_version(db, MlGarchPrediction, stock_id, report_date, model_version)


def get_news_agent_stock_data(db: Session, stock_id: int, report_date: date) -> NewsAgentStockData | None:
    stmt = (
        select(NewsAgentStockData)
        .where(NewsAgentStockData.stock_id == stock_id)
        .where(NewsAgentStockData.report_date == report_date)
        .order_by(desc(NewsAgentStockData.created_at).nulls_last(), desc(NewsAgentStockData.id))
        .limit(1)
    )
    return db.scalars(stmt).first()


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
        created_at=datetime.now(UTC),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report
