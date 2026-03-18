from __future__ import annotations

from datetime import date

from sqlalchemy.orm import Session

from core.exceptions import BusinessException, NotFoundException
from domains.debate import crud
from domains.debate.schemas import (
    AiMlReportPayload,
    ChartPersona,
    DebateInputsResponse,
    DebatePersonas,
    DebateResultRequest,
    DebateResultResponse,
    DebateTargetsResponse,
    EnsemblePredictionPayload,
    FinancialSnapshot,
    FundamentalPersona,
    GarchPredictionPayload,
    LgbmPredictionPayload,
    TftPredictionPayload,
    NewsItem,
    NewsPersona,
    TargetItem,
)


def get_debate_targets(
    db: Session,
    *,
    report_date: date,
    market_type: str = "KOSPI",
    source: str = "trading_history",
    portfolio_id: int | None = None,
    limit: int | None = None,
) -> DebateTargetsResponse:
    normalized_source = source.strip().lower()
    if normalized_source == "trading_history":
        stocks = crud.get_target_stocks_by_trading_history(
            db,
            report_date=report_date,
            market_type=market_type,
            portfolio_id=portfolio_id,
            limit=limit,
        )
    elif normalized_source == "ml_reports":
        stocks = crud.get_target_stocks(
            db,
            report_date=report_date,
            market_type=market_type,
            limit=limit,
        )
    else:
        raise BusinessException(message=f"지원하지 않는 대상 조회 source 입니다: {source}")
    targets = [TargetItem(stock_id=stock.id, ticker=stock.ticker, stock_name=stock.name) for stock in stocks]
    return DebateTargetsResponse(report_date=report_date, source=normalized_source, count=len(targets), targets=targets)


def get_debate_inputs(
    db: Session,
    *,
    stock_id: int,
    report_date: date,
    debate_version: str,
    model_version: str | None,
    news_limit: int,
    financial_limit: int,
) -> DebateInputsResponse:
    stock = crud.get_stock(db, stock_id)
    if stock is None or not stock.is_active:
        raise NotFoundException("종목을 찾을 수 없습니다.")

    financials = crud.get_latest_financials(db, stock_id=stock_id, limit=financial_limit)
    ai_ml_report = crud.get_ai_ml_report(db, stock_id=stock_id, report_date=report_date, model_version=model_version)

    resolved_model_version = model_version or (ai_ml_report.model_version if ai_ml_report else None)

    ensemble_prediction = None
    lgbm_prediction = None
    tft_prediction = None
    garch_prediction = None
    ensemble_prediction = crud.get_ensemble_prediction(db, stock_id, report_date, resolved_model_version)
    lgbm_prediction = crud.get_lgbm_prediction(db, stock_id, report_date, resolved_model_version)
    tft_prediction = crud.get_tft_prediction(db, stock_id, report_date, resolved_model_version)
    garch_prediction = crud.get_garch_prediction(db, stock_id, report_date, resolved_model_version)

    recent_news_rows = crud.get_recent_news(db, stock_id=stock_id, report_date=report_date, limit=news_limit)

    recent_financials = [
        FinancialSnapshot(
            report_year=item.report_year,
            report_quarter=item.report_quarter,
            total_assets=item.total_assets,
            total_liabilities=item.total_liabilities,
            total_equity=item.total_equity,
            revenue=item.revenue,
            operating_profit=item.operating_profit,
            net_income=item.net_income,
            operating_cash_flow=item.operating_cash_flow,
            per=item.per,
            pbr=item.pbr,
            roe=item.roe,
        )
        for item in financials
    ]

    chart_persona = ChartPersona(
        ai_ml_report=AiMlReportPayload(
            report_date=ai_ml_report.report_date,
            model_version=ai_ml_report.model_version,
            ml_signal=ai_ml_report.ml_signal,
            ml_confidence=ai_ml_report.ml_confidence,
            signal_agreement=ai_ml_report.signal_agreement,
            confidence_gap=ai_ml_report.confidence_gap,
            scenario_type=ai_ml_report.scenario_type,
            risk_flag=ai_ml_report.risk_flag,
        ) if ai_ml_report else None,
        ensemble_prediction=EnsemblePredictionPayload(
            model_version=ensemble_prediction.model_version,
            ensemble_result=ensemble_prediction.ensemble_result,
            ensemble_confidence=ensemble_prediction.ensemble_confidence,
            signal_agreement=ensemble_prediction.signal_agreement,
            confidence_gap=ensemble_prediction.confidence_gap,
            risk_flag=ensemble_prediction.risk_flag,
            scenario_type=ensemble_prediction.scenario_type,
            scenario_label=ensemble_prediction.scenario_label,
        ) if ensemble_prediction else None,
        lgbm_prediction=LgbmPredictionPayload(
            model_version=lgbm_prediction.model_version,
            predicted_class=lgbm_prediction.predicted_class,
            confidence=lgbm_prediction.confidence,
            prob_down=lgbm_prediction.prob_down,
            prob_sideways=lgbm_prediction.prob_sideways,
            prob_up=lgbm_prediction.prob_up,
        ) if lgbm_prediction else None,
        tft_prediction=TftPredictionPayload(
            model_version=tft_prediction.model_version,
            group_id=tft_prediction.group_id,
            prob=tft_prediction.prob,
            pred=tft_prediction.pred,
        ) if tft_prediction else None,
        garch_prediction=GarchPredictionPayload(
            model_version=garch_prediction.model_version,
            vol_1d=garch_prediction.vol_1d,
            vol_3d=garch_prediction.vol_3d,
            vol_5d=garch_prediction.vol_5d,
            volatility_level=garch_prediction.volatility_level,
            risk_flag=garch_prediction.risk_flag,
            percentile_vs_1y=garch_prediction.percentile_vs_1y,
        ) if garch_prediction else None,
    )

    news_items = [
        NewsItem(
            title=news.title,
            snippet=news.snippet,
            publisher=news.publisher,
            published_at=news.published_at,
            url=news.url,
            sentiment_score=news_map.sentiment_score,
            sentiment_label=news_map.sentiment_label,
        )
        for news, news_map in recent_news_rows
    ]

    return DebateInputsResponse(
        stock_id=stock.id,
        ticker=stock.ticker,
        stock_name=stock.name,
        report_date=report_date,
        debate_version=debate_version,
        personas=DebatePersonas(
            fundamental=FundamentalPersona(
                latest_financials=recent_financials[0] if recent_financials else None,
                recent_financials=recent_financials,
            ),
            chart=chart_persona,
            news=NewsPersona(recent_news=news_items),
        ),
    )


def save_debate_result(db: Session, payload: DebateResultRequest) -> DebateResultResponse:
    stock = crud.get_stock(db, payload.stock_id)
    if stock is None or not stock.is_active:
        raise NotFoundException("종목을 찾을 수 없습니다.")
    if stock.ticker != payload.ticker:
        raise BusinessException(message="stock_id와 ticker가 일치하지 않습니다.")

    existing = crud.get_existing_debate_report(
        db,
        stock_id=payload.stock_id,
        report_date=payload.report_date,
        debate_version=payload.debate_version,
    )
    if existing is not None:
        return DebateResultResponse(
            result="duplicated",
            stock_id=payload.stock_id,
            report_date=payload.report_date,
            debate_version=payload.debate_version,
        )

    crud.create_debate_report(
        db,
        stock_id=payload.stock_id,
        report_date=payload.report_date,
        debate_version=payload.debate_version,
        chairman_signal=payload.chairman_signal,
        debate_confidence=payload.debate_confidence,
        debate_summary=payload.debate_summary,
        final_stances=payload.final_stances,
        debate_full_log=payload.debate_full_log,
        chairman_report=payload.chairman_report,
    )

    return DebateResultResponse(
        result="created",
        stock_id=payload.stock_id,
        report_date=payload.report_date,
        debate_version=payload.debate_version,
    )
