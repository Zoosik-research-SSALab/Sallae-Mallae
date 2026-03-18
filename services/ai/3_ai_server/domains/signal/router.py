"""signal/router.py — 시그널 업로드 및 포트폴리오 업데이트 라우터."""

from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.auth import verify_internal_api_key
from core.config import get_session
from core.logger import logger
from domains.signal import crud
from domains.signal.schemas import (
    PortfolioUpdateRequest,
    PortfolioUpdateResponse,
    SignalUploadRequest,
    SignalUploadResponse,
)

router = APIRouter()


@router.post(
    "/upload",
    response_model=SignalUploadResponse,
    dependencies=[Depends(verify_internal_api_key)],
)
def upload_signals(req: SignalUploadRequest, db: Session = Depends(get_session)):
    """로컬 추론 결과를 받아 개별 모델 예측 테이블에 저장."""
    report_date = date.fromisoformat(req.date)
    signals = [s.model_dump() for s in req.signals]

    logger.info("[SIGNAL] %s 시그널 업로드: %d종목", req.date, len(signals))

    tft_cnt = crud.upsert_tft_predictions(db, report_date, "tft-v2", signals)
    lgbm_cnt = crud.upsert_lgbm_predictions(db, report_date, "lgbm-v1", signals)
    garch_cnt = crud.upsert_garch_predictions(db, report_date, "garch-v1", signals)
    ens_cnt = crud.upsert_ensemble_predictions(db, report_date, "ensemble-v6", signals)
    report_cnt = crud.upsert_ml_reports(db, report_date, req.model_version, signals)

    db.commit()

    logger.info(
        "[SIGNAL] %s 저장 완료: TFT=%d, LGBM=%d, GARCH=%d, ENS=%d, REPORT=%d",
        req.date, tft_cnt, lgbm_cnt, garch_cnt, ens_cnt, report_cnt,
    )

    return SignalUploadResponse(
        date=req.date,
        inserted=tft_cnt,
        message=f"TFT={tft_cnt}, LGBM={lgbm_cnt}, GARCH={garch_cnt}, ENS={ens_cnt}, REPORT={report_cnt}",
    )


@router.post(
    "/portfolio",
    response_model=PortfolioUpdateResponse,
    dependencies=[Depends(verify_internal_api_key)],
)
def update_portfolio(req: PortfolioUpdateRequest, db: Session = Depends(get_session)):
    """앙상블 포트폴리오 스냅샷/보유/거래를 받아 저장."""
    snapshot_date = date.fromisoformat(req.date)

    logger.info("[PORTFOLIO] %s 업데이트: 자산=%s, 포지션=%d, 거래=%d",
                req.date, f"{req.portfolio_value:,}", len(req.positions), len(req.trades))

    # 스냅샷
    snapshot_data = req.model_dump(include={
        "date", "portfolio_value", "cash", "n_positions",
        "daily_return", "cumulative_return", "mdd", "sharpe_30d",
    })
    crud.upsert_portfolio_snapshot(db, req.portfolio_id, snapshot_data)

    # 보유 종목
    holdings_count = 0
    if req.positions:
        positions = [p.model_dump() for p in req.positions]
        holdings_count = crud.insert_portfolio_holdings(db, req.portfolio_id, snapshot_date, positions)

    # 거래 이력
    trades_count = 0
    if req.trades:
        trades = [t.model_dump() for t in req.trades]
        trades_count = crud.insert_portfolio_trades(db, req.portfolio_id, snapshot_date, trades)

    db.commit()

    logger.info("[PORTFOLIO] %s 저장 완료: 스냅샷=OK, 보유=%d, 거래=%d",
                req.date, holdings_count, trades_count)

    return PortfolioUpdateResponse(
        date=req.date,
        snapshot_saved=True,
        holdings_count=holdings_count,
        trades_count=trades_count,
        message="OK",
    )
