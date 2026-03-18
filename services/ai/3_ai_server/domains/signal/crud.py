"""signal/crud.py — 시그널 및 포트폴리오 DB 저장 로직."""

from __future__ import annotations

from datetime import date

from sqlalchemy import text
from sqlalchemy.orm import Session

from core.logger import logger


def upsert_tft_predictions(db: Session, report_date: date, model_version: str, signals: list[dict]) -> int:
    """ml_tft_predictions에 TFT 예측 결과를 UPSERT."""
    count = 0
    for s in signals:
        db.execute(text("""
            INSERT INTO ml_tft_predictions (stock_id, report_date, model_version, group_id, prob, pred)
            SELECT st.id, :report_date, :model_version, NULL, :prob, :pred
            FROM stocks st WHERE st.ticker = :ticker
            ON CONFLICT (stock_id, report_date, model_version) DO UPDATE
            SET prob = EXCLUDED.prob, pred = EXCLUDED.pred
        """), {
            "report_date": report_date,
            "model_version": model_version,
            "ticker": s["ticker"],
            "prob": s["tft_prob"],
            "pred": 1 if s["tft_prob"] >= 0.5 else 0,
        })
        count += 1
    return count


def upsert_lgbm_predictions(db: Session, report_date: date, model_version: str, signals: list[dict]) -> int:
    """ml_lgbm_predictions에 LightGBM 예측 결과를 UPSERT."""
    count = 0
    for s in signals:
        db.execute(text("""
            INSERT INTO ml_lgbm_predictions (stock_id, report_date, model_version, predicted_class, confidence, prob_down, prob_sideways, prob_up)
            SELECT st.id, :report_date, :model_version,
                   CASE WHEN :prob >= 0.5 THEN 2 ELSE 0 END,
                   :prob, 1.0 - :prob, 0.0, :prob
            FROM stocks st WHERE st.ticker = :ticker
            ON CONFLICT (stock_id, report_date, model_version) DO UPDATE
            SET confidence = EXCLUDED.confidence, prob_up = EXCLUDED.prob_up,
                prob_down = EXCLUDED.prob_down, predicted_class = EXCLUDED.predicted_class
        """), {
            "report_date": report_date,
            "model_version": model_version,
            "ticker": s["ticker"],
            "prob": s["lgbm_prob"],
        })
        count += 1
    return count


def upsert_garch_predictions(db: Session, report_date: date, model_version: str, signals: list[dict]) -> int:
    """ml_garch_predictions에 GARCH 변동성 결과를 UPSERT."""
    count = 0
    for s in signals:
        vol_5d = s.get("garch_vol_5d")
        risk_flag = s.get("garch_risk_flag", False)
        if vol_5d is None:
            continue
        db.execute(text("""
            INSERT INTO ml_garch_predictions (stock_id, report_date, model_version, vol_5d, risk_flag)
            SELECT st.id, :report_date, :model_version, :vol_5d, :risk_flag
            FROM stocks st WHERE st.ticker = :ticker
            ON CONFLICT (stock_id, report_date, model_version) DO UPDATE
            SET vol_5d = EXCLUDED.vol_5d, risk_flag = EXCLUDED.risk_flag
        """), {
            "report_date": report_date,
            "model_version": model_version,
            "ticker": s["ticker"],
            "vol_5d": vol_5d,
            "risk_flag": risk_flag,
        })
        count += 1
    return count


def upsert_ensemble_predictions(db: Session, report_date: date, model_version: str, signals: list[dict]) -> int:
    """ml_ensemble_predictions에 앙상블 결과를 UPSERT."""
    count = 0
    for s in signals:
        ensemble_result = 1 if s["ensemble_prob"] >= 0.5 else 0
        signal_agreement = (s["tft_prob"] >= 0.5) == (s["lgbm_prob"] >= 0.5)
        confidence_gap = abs(s["tft_prob"] - s["lgbm_prob"])
        risk_flag = s.get("garch_risk_flag", False)

        db.execute(text("""
            INSERT INTO ml_ensemble_predictions
                (stock_id, report_date, model_version, ensemble_result, ensemble_confidence,
                 signal_agreement, confidence_gap, risk_flag, scenario_type, scenario_label)
            SELECT st.id, :report_date, :model_version, :ensemble_result, :ensemble_confidence,
                   :signal_agreement, :confidence_gap, :risk_flag, :scenario_type, :scenario_label
            FROM stocks st WHERE st.ticker = :ticker
            ON CONFLICT (stock_id, report_date, model_version) DO UPDATE
            SET ensemble_result = EXCLUDED.ensemble_result,
                ensemble_confidence = EXCLUDED.ensemble_confidence,
                signal_agreement = EXCLUDED.signal_agreement,
                confidence_gap = EXCLUDED.confidence_gap,
                risk_flag = EXCLUDED.risk_flag
        """), {
            "report_date": report_date,
            "model_version": model_version,
            "ticker": s["ticker"],
            "ensemble_result": ensemble_result,
            "ensemble_confidence": s["ensemble_prob"],
            "signal_agreement": signal_agreement,
            "confidence_gap": confidence_gap,
            "risk_flag": risk_flag,
            "scenario_type": s["signal"],
            "scenario_label": s["signal"],
        })
        count += 1
    return count


def upsert_ml_reports(db: Session, report_date: date, model_version: str, signals: list[dict]) -> int:
    """ai_ml_reports에 ML 종합 리포트를 UPSERT."""
    import json
    count = 0
    for s in signals:
        signal_agreement = (s["tft_prob"] >= 0.5) == (s["lgbm_prob"] >= 0.5)
        confidence_gap = abs(s["tft_prob"] - s["lgbm_prob"])
        report_data = json.dumps({
            "tft_prob": s["tft_prob"],
            "lgbm_prob": s["lgbm_prob"],
            "ensemble_prob": s["ensemble_prob"],
            "garch_vol_5d": s.get("garch_vol_5d"),
            "garch_risk_flag": s.get("garch_risk_flag", False),
        })

        db.execute(text("""
            INSERT INTO ai_ml_reports
                (stock_id, report_date, model_version, ml_signal, ml_confidence,
                 signal_agreement, confidence_gap, risk_flag, report_data)
            SELECT st.id, :report_date, :model_version, :ml_signal, :ml_confidence,
                   :signal_agreement, :confidence_gap, :risk_flag, :report_data::jsonb
            FROM stocks st WHERE st.ticker = :ticker
            ON CONFLICT (stock_id, report_date, model_version) DO UPDATE
            SET ml_signal = EXCLUDED.ml_signal, ml_confidence = EXCLUDED.ml_confidence,
                signal_agreement = EXCLUDED.signal_agreement, report_data = EXCLUDED.report_data
        """), {
            "report_date": report_date,
            "model_version": model_version,
            "ticker": s["ticker"],
            "ml_signal": s["signal"],
            "ml_confidence": s["ensemble_prob"],
            "signal_agreement": signal_agreement,
            "confidence_gap": confidence_gap,
            "risk_flag": s.get("garch_risk_flag", False),
            "report_data": report_data,
        })
        count += 1
    return count


# ── 포트폴리오 ──

def upsert_portfolio_snapshot(db: Session, portfolio_id: int, data: dict) -> bool:
    """ensemble_portfolio_snapshots에 일별 스냅샷을 UPSERT."""
    db.execute(text("""
        INSERT INTO ensemble_portfolio_snapshots
            (portfolio_id, snapshot_date, portfolio_value, cash, n_positions,
             daily_return, cumulative_return, mdd, sharpe_30d)
        VALUES (:portfolio_id, :snapshot_date, :portfolio_value, :cash, :n_positions,
                :daily_return, :cumulative_return, :mdd, :sharpe_30d)
        ON CONFLICT (portfolio_id, snapshot_date) DO UPDATE
        SET portfolio_value = EXCLUDED.portfolio_value, cash = EXCLUDED.cash,
            n_positions = EXCLUDED.n_positions, daily_return = EXCLUDED.daily_return,
            cumulative_return = EXCLUDED.cumulative_return, mdd = EXCLUDED.mdd,
            sharpe_30d = EXCLUDED.sharpe_30d
    """), {
        "portfolio_id": portfolio_id,
        "snapshot_date": data["date"],
        "portfolio_value": data["portfolio_value"],
        "cash": data["cash"],
        "n_positions": data["n_positions"],
        "daily_return": data.get("daily_return"),
        "cumulative_return": data.get("cumulative_return"),
        "mdd": data.get("mdd"),
        "sharpe_30d": data.get("sharpe_30d"),
    })
    return True


def insert_portfolio_holdings(db: Session, portfolio_id: int, snapshot_date: date, positions: list[dict]) -> int:
    """ensemble_portfolio_holdings에 일별 보유 종목을 INSERT."""
    # 기존 해당 날짜 데이터 삭제 후 재삽입
    db.execute(text("""
        DELETE FROM ensemble_portfolio_holdings
        WHERE portfolio_id = :portfolio_id AND snapshot_date = :snapshot_date
    """), {"portfolio_id": portfolio_id, "snapshot_date": snapshot_date})

    count = 0
    for p in positions:
        db.execute(text("""
            INSERT INTO ensemble_portfolio_holdings
                (portfolio_id, snapshot_date, stock_id, buy_date, buy_price, current_price,
                 shares, invested, unrealized_pnl, hold_days, is_extended, ensemble_prob)
            SELECT :portfolio_id, :snapshot_date, st.id, :buy_date, :buy_price, :current_price,
                   :shares, :invested, :unrealized_pnl, :hold_days, :is_extended, :ensemble_prob
            FROM stocks st WHERE st.ticker = :ticker
        """), {
            "portfolio_id": portfolio_id,
            "snapshot_date": snapshot_date,
            "ticker": p["ticker"],
            "buy_date": p["buy_date"],
            "buy_price": p["buy_price"],
            "current_price": p.get("current_price"),
            "shares": p["shares"],
            "invested": p["invested"],
            "unrealized_pnl": p.get("unrealized_pnl"),
            "hold_days": p["hold_days"],
            "is_extended": p.get("is_extended", False),
            "ensemble_prob": p.get("ensemble_prob"),
        })
        count += 1
    return count


def insert_portfolio_trades(db: Session, portfolio_id: int, trade_date: date, trades: list[dict]) -> int:
    """ensemble_portfolio_trades에 매매 이력을 INSERT."""
    count = 0
    for t in trades:
        db.execute(text("""
            INSERT INTO ensemble_portfolio_trades
                (portfolio_id, trade_date, stock_id, trade_type, price, shares, amount,
                 commission, pnl, return_rate, hold_days, trade_reason, is_extended, ensemble_prob)
            SELECT :portfolio_id, :trade_date, st.id, :trade_type, :price, :shares, :amount,
                   :commission, :pnl, :return_rate, :hold_days, :trade_reason, :is_extended, :ensemble_prob
            FROM stocks st WHERE st.ticker = :ticker
        """), {
            "portfolio_id": portfolio_id,
            "trade_date": trade_date,
            "ticker": t["ticker"],
            "trade_type": t["trade_type"],
            "price": t["price"],
            "shares": t["shares"],
            "amount": t["amount"],
            "commission": t.get("commission"),
            "pnl": t.get("pnl"),
            "return_rate": t.get("return_rate"),
            "hold_days": t.get("hold_days"),
            "trade_reason": t.get("trade_reason"),
            "is_extended": t.get("is_extended", False),
            "ensemble_prob": t.get("ensemble_prob"),
        })
        count += 1
    return count
