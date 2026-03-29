"""
scripts/catchup_inference.py
누락 기간(DB 최신일 ~ OHLCV 최신일) 일괄 추론 + DB 직접 저장.

실행: python scripts/catchup_inference.py [--skip-features] [--start YYYY-MM-DD]

흐름:
  1. DB 최신 report_date 확인
  2. OHLCV 최신 거래일 확인
  3. tft_features 피처 재생성 (--skip-features 시 생략)
  4. 누락 거래일별: TFT + LightGBM + 메타모델 추론
  5. DB 직접 UPSERT (signal + portfolio)
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import warnings
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path

import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from config import BASE_PATH, RAW_OHLCV_PATH, RAW_MACRO_PATH, RAW_UNIVERSE_PATH

warnings.filterwarnings("ignore")

# ── DB 설정 ──
from dotenv import load_dotenv

load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(PROJECT_ROOT.parent / ".env")

DB_URL = os.environ.get("AI_DB_URL")
if not DB_URL:
    raise RuntimeError("AI_DB_URL 환경변수가 설정되지 않았습니다. .env 파일을 확인하세요.")

# ── 모델 경로 ──
TFT_CKPT_DIR = BASE_PATH / "models" / "tft_v2_wf" / "checkpoints"
LGBM_CKPT_DIR = BASE_PATH / "models" / "lgbm_wf" / "checkpoints"
GARCH_CKPT_DIR = BASE_PATH / "models" / "garch_wf" / "checkpoints"
META_CKPT_DIR = BASE_PATH / "models" / "ensemble_meta" / "checkpoints"

CLEANED_FEATURES = [
    "vix_change", "vix", "macd_norm", "momentum_20d",
    "relative_return", "high_low_range", "kospi200_return", "volume_ratio_5d",
]
MAX_ENCODER_LENGTH = 30
BATCH_SIZE = 256

# v6 포트폴리오 파라미터
BUY_THRESHOLD = 0.54
TOP_N = 7
STOP_LOSS = -0.03
TAKE_PROFIT = 0.07
MODEL_EXIT = 0.45
MAX_POSITIONS = 15
REBUY_COOLDOWN = 5
BASE_HOLD_DAYS = 5
HOLD_EXTEND_THRESHOLD = 0.52
MAX_HOLD_DAYS = 15
EXTENDED_STOP_LOSS = -0.02
EXTENDED_TAKE_PROFIT = 0.10
BUY_COMMISSION = 0.00015
SELL_COMMISSION = 0.00215

PORTFOLIO_STATE_PATH = BASE_PATH / "models" / "ensemble_backtest" / "portfolio_state.json"


def log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


# ═══════════════════════════════════════════════════════════
# DB 헬퍼
# ═══════════════════════════════════════════════════════════

def get_engine():
    from sqlalchemy import create_engine
    return create_engine(DB_URL, pool_pre_ping=True)


def get_db_latest_date(engine) -> date | None:
    from sqlalchemy import text
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT MAX(report_date) FROM ml_tft_predictions")
        ).scalar()
        return row


def save_signals_to_db(engine, report_date: date, signals: list[dict]) -> None:
    """시그널을 DB에 직접 UPSERT."""
    from sqlalchemy import text

    with engine.begin() as conn:
        for s in signals:
            # TFT
            conn.execute(text("""
                INSERT INTO ml_tft_predictions (stock_id, report_date, model_version, group_id, prob, pred)
                SELECT st.id, :report_date, 'tft-v2', NULL, :prob, :pred
                FROM stocks st WHERE st.ticker = :ticker
                ON CONFLICT (stock_id, report_date, model_version) DO UPDATE
                SET prob = EXCLUDED.prob, pred = EXCLUDED.pred
            """), {
                "report_date": report_date, "ticker": s["ticker"],
                "prob": s["tft_prob"], "pred": 1 if s["tft_prob"] >= 0.5 else 0,
            })

            # LGBM
            conn.execute(text("""
                INSERT INTO ml_lgbm_predictions (stock_id, report_date, model_version, predicted_class, confidence, prob_down, prob_sideways, prob_up)
                SELECT st.id, :report_date, 'lgbm-v1',
                       CASE WHEN :prob >= 0.5 THEN 2 ELSE 0 END,
                       :prob, 1.0 - :prob, 0.0, :prob
                FROM stocks st WHERE st.ticker = :ticker
                ON CONFLICT (stock_id, report_date, model_version) DO UPDATE
                SET confidence = EXCLUDED.confidence, prob_up = EXCLUDED.prob_up,
                    prob_down = EXCLUDED.prob_down, predicted_class = EXCLUDED.predicted_class
            """), {
                "report_date": report_date, "ticker": s["ticker"], "prob": s["lgbm_prob"],
            })

            # GARCH
            garch_vol_5d = s.get("garch_vol_5d")
            if garch_vol_5d is not None and not (isinstance(garch_vol_5d, float) and np.isnan(garch_vol_5d)):
                conn.execute(text("""
                    INSERT INTO ml_garch_predictions (stock_id, report_date, model_version, vol_5d, risk_flag)
                    SELECT st.id, :report_date, 'garch-v1', :vol_5d, :risk_flag
                    FROM stocks st WHERE st.ticker = :ticker
                    ON CONFLICT (stock_id, report_date, model_version) DO UPDATE
                    SET vol_5d = EXCLUDED.vol_5d, risk_flag = EXCLUDED.risk_flag
                """), {
                    "report_date": report_date, "ticker": s["ticker"],
                    "vol_5d": garch_vol_5d,
                    "risk_flag": s.get("garch_risk_flag", False),
                })

            # Ensemble
            signal_agreement = (s["tft_prob"] >= 0.5) == (s["lgbm_prob"] >= 0.5)
            confidence_gap = abs(s["tft_prob"] - s["lgbm_prob"])
            conn.execute(text("""
                INSERT INTO ml_ensemble_predictions
                    (stock_id, report_date, model_version, ensemble_result, ensemble_confidence,
                     signal_agreement, confidence_gap, risk_flag, scenario_type, scenario_label)
                SELECT st.id, :report_date, 'ensemble-v6', :ensemble_result, :ensemble_confidence,
                       :signal_agreement, :confidence_gap, :risk_flag, :scenario_type, :scenario_label
                FROM stocks st WHERE st.ticker = :ticker
                ON CONFLICT (stock_id, report_date, model_version) DO UPDATE
                SET ensemble_result = EXCLUDED.ensemble_result,
                    ensemble_confidence = EXCLUDED.ensemble_confidence,
                    signal_agreement = EXCLUDED.signal_agreement,
                    confidence_gap = EXCLUDED.confidence_gap,
                    risk_flag = EXCLUDED.risk_flag
            """), {
                "report_date": report_date, "ticker": s["ticker"],
                "ensemble_result": 1 if s["ensemble_prob"] >= 0.5 else 0,
                "ensemble_confidence": s["ensemble_prob"],
                "signal_agreement": signal_agreement,
                "confidence_gap": confidence_gap,
                "risk_flag": s.get("garch_risk_flag", False),
                "scenario_type": s["signal"], "scenario_label": s["signal"],
            })

            # ML Report — NaN을 None으로 변환하여 JSON 직렬화 오류 방지
            garch_vol = s.get("garch_vol_5d")
            if garch_vol is not None and (isinstance(garch_vol, float) and np.isnan(garch_vol)):
                garch_vol = None
            report_data = json.dumps({
                "tft_prob": s["tft_prob"], "lgbm_prob": s["lgbm_prob"],
                "ensemble_prob": s["ensemble_prob"],
                "garch_vol_5d": garch_vol,
                "garch_risk_flag": s.get("garch_risk_flag", False),
            })
            conn.execute(text("""
                INSERT INTO ai_ml_reports
                    (stock_id, report_date, model_version, ml_signal, ml_confidence,
                     signal_agreement, confidence_gap, risk_flag, report_data)
                SELECT st.id, :report_date, 'tft-v2', :ml_signal, :ml_confidence,
                       :signal_agreement, :confidence_gap, :risk_flag, CAST(:report_data AS jsonb)
                FROM stocks st WHERE st.ticker = :ticker
                ON CONFLICT (stock_id, report_date, model_version) DO UPDATE
                SET ml_signal = EXCLUDED.ml_signal, ml_confidence = EXCLUDED.ml_confidence,
                    signal_agreement = EXCLUDED.signal_agreement, report_data = EXCLUDED.report_data
            """), {
                "report_date": report_date, "ticker": s["ticker"],
                "ml_signal": s["signal"], "ml_confidence": s["ensemble_prob"],
                "signal_agreement": signal_agreement,
                "confidence_gap": confidence_gap,
                "risk_flag": s.get("garch_risk_flag", False),
                "report_data": report_data,
            })


def save_portfolio_to_db(engine, snapshot: dict) -> None:
    """포트폴리오 데이터를 DB에 직접 저장."""
    from sqlalchemy import text

    portfolio_id = snapshot.get("portfolio_id", 1)
    snapshot_date = snapshot["date"]

    with engine.begin() as conn:
        # Snapshot
        conn.execute(text("""
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
            "portfolio_id": portfolio_id, "snapshot_date": snapshot_date,
            "portfolio_value": snapshot["portfolio_value"],
            "cash": snapshot["cash"], "n_positions": snapshot["n_positions"],
            "daily_return": snapshot.get("daily_return"),
            "cumulative_return": snapshot.get("cumulative_return"),
            "mdd": snapshot.get("mdd"),
            "sharpe_30d": snapshot.get("sharpe_30d"),
        })

        # Holdings — delete + reinsert
        conn.execute(text("""
            DELETE FROM ensemble_portfolio_holdings
            WHERE portfolio_id = :portfolio_id AND snapshot_date = :snapshot_date
        """), {"portfolio_id": portfolio_id, "snapshot_date": snapshot_date})

        for p in snapshot.get("positions", []):
            conn.execute(text("""
                INSERT INTO ensemble_portfolio_holdings
                    (portfolio_id, snapshot_date, stock_id, buy_date, buy_price, current_price,
                     shares, invested, unrealized_pnl, hold_days, is_extended, ensemble_prob)
                SELECT :portfolio_id, :snapshot_date, st.id, :buy_date, :buy_price, :current_price,
                       :shares, :invested, :unrealized_pnl, :hold_days, :is_extended, :ensemble_prob
                FROM stocks st WHERE st.ticker = :ticker
            """), {
                "portfolio_id": portfolio_id, "snapshot_date": snapshot_date,
                "ticker": p["ticker"], "buy_date": p["buy_date"],
                "buy_price": p["buy_price"], "current_price": p.get("current_price"),
                "shares": p["shares"], "invested": p["invested"],
                "unrealized_pnl": p.get("unrealized_pnl"),
                "hold_days": p["hold_days"],
                "is_extended": p.get("is_extended", False),
                "ensemble_prob": p.get("ensemble_prob"),
            })

        # Trades
        for t in snapshot.get("trades", []):
            conn.execute(text("""
                INSERT INTO ensemble_portfolio_trades
                    (portfolio_id, trade_date, stock_id, trade_type, price, shares, amount,
                     commission, pnl, return_rate, hold_days, trade_reason, is_extended, ensemble_prob)
                SELECT :portfolio_id, :trade_date, st.id, :trade_type, :price, :shares, :amount,
                       :commission, :pnl, :return_rate, :hold_days, :trade_reason, :is_extended, :ensemble_prob
                FROM stocks st WHERE st.ticker = :ticker
            """), {
                "portfolio_id": portfolio_id, "trade_date": snapshot_date,
                "ticker": t["ticker"], "trade_type": t["trade_type"],
                "price": t["price"], "shares": t["shares"], "amount": t["amount"],
                "commission": t.get("commission"), "pnl": t.get("pnl"),
                "return_rate": t.get("return_rate"), "hold_days": t.get("hold_days"),
                "trade_reason": t.get("trade_reason"),
                "is_extended": t.get("is_extended", False),
                "ensemble_prob": t.get("ensemble_prob"),
            })


# ═══════════════════════════════════════════════════════════
# 추론 엔진 (daily_inference.py 로직 재사용)
# ═══════════════════════════════════════════════════════════

def load_models():
    """모든 모델을 한 번만 로드."""
    import joblib
    import torch
    import torch.nn as nn
    import torch.nn.functional as F

    try:
        import lightning.pytorch as pl
    except ImportError:
        import pytorch_lightning as pl

    # TFT 모델 정의
    class GatedLinearUnit(nn.Module):
        def __init__(self, d):
            super().__init__()
            self.fc = nn.Linear(d, d); self.gate = nn.Linear(d, d)
        def forward(self, x): return self.fc(x) * torch.sigmoid(self.gate(x))

    class GRN(nn.Module):
        def __init__(self, d_in, d_h, d_out, drop=0.1):
            super().__init__()
            self.fc1 = nn.Linear(d_in, d_h); self.fc2 = nn.Linear(d_h, d_out)
            self.gate = GatedLinearUnit(d_out); self.norm = nn.LayerNorm(d_out)
            self.drop = nn.Dropout(drop)
            self.skip = nn.Linear(d_in, d_out) if d_in != d_out else nn.Identity()
        def forward(self, x):
            r = self.skip(x); h = self.drop(F.elu(self.fc2(F.elu(self.fc1(x)))))
            return self.norm(self.gate(h) + r)

    class VSN(nn.Module):
        def __init__(self, n_v, d, drop=0.1):
            super().__init__()
            self.grns = nn.ModuleList([GRN(d, d, d, drop) for _ in range(n_v)])
            self.sg = GRN(n_v * d, d, n_v, drop)
        def forward(self, x):
            B, S, V, D = x.shape
            p = torch.stack([self.grns[i](x[:, :, i, :]) for i in range(V)], dim=2)
            w = torch.softmax(self.sg(x.reshape(B, S, V * D)), dim=-1).unsqueeze(-1)
            return (p * w).sum(dim=2)

    class TFTv2(pl.LightningModule):
        def __init__(self, n_feat, seq_len=30, d=128, heads=4, n_lstm=1, drop=0.2, n_cls=2, lr=5e-4, cw=None):
            super().__init__()
            self.save_hyperparameters(ignore=["cw"]); self.lr = lr
            self.fe = nn.Linear(1, d); self.vsn = VSN(n_feat, d, drop)
            self.lstm = nn.LSTM(d, d, n_lstm, batch_first=True)
            self.attn = nn.MultiheadAttention(d, heads, dropout=drop, batch_first=True)
            self.an = nn.LayerNorm(d); self.ag = GatedLinearUnit(d)
            self.go = GRN(d, d, d, drop); self.head = nn.Linear(d, n_cls)
            self.loss_fn = nn.CrossEntropyLoss(weight=cw) if cw is not None else nn.CrossEntropyLoss()
        def forward(self, x):
            B, S, F = x.shape; x = self.fe(x.unsqueeze(-1)); x = self.vsn(x)
            x, _ = self.lstm(x); a, _ = self.attn(x, x, x); x = self.an(x + self.ag(a))
            return self.head(self.go(x[:, -1, :]))
        def training_step(self, b, _): return self.loss_fn(self(b[0]), b[1])
        def configure_optimizers(self): return torch.optim.AdamW(self.parameters(), lr=self.lr)

    # 최신 체크포인트 로드
    tft_ckpts = sorted(TFT_CKPT_DIR.glob("window_*.ckpt"))
    lgbm_ckpts = sorted(LGBM_CKPT_DIR.glob("window_*.joblib"))
    garch_ckpts = sorted(GARCH_CKPT_DIR.glob("window_*.parquet"))
    meta_ckpts = sorted(META_CKPT_DIR.glob("meta_window_*.joblib")) if META_CKPT_DIR.exists() else []

    if not tft_ckpts or not lgbm_ckpts:
        raise FileNotFoundError("체크포인트 파일을 찾을 수 없습니다")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    log(f"디바이스: {device}")

    tft_model = TFTv2.load_from_checkpoint(str(tft_ckpts[-1]), strict=False)
    tft_model.eval().to(device)
    log(f"TFT 로드: {tft_ckpts[-1].name}")

    lgbm_model = joblib.load(str(lgbm_ckpts[-1]))
    log(f"LGBM 로드: {lgbm_ckpts[-1].name}")

    garch_map = {}
    if garch_ckpts:
        garch_df = pd.read_parquet(str(garch_ckpts[-1]))
        if "ticker" in garch_df.columns:
            for _, row in garch_df.iterrows():
                garch_map[row["ticker"]] = {
                    "vol_5d": row.get("vol_5d"),
                    "risk_flag": bool(row.get("risk_flag", False)),
                }
        log(f"GARCH 로드: {garch_ckpts[-1].name} ({len(garch_map)}종목)")

    meta_model = None
    if meta_ckpts:
        meta_model = joblib.load(str(meta_ckpts[-1]))
        log(f"메타모델 로드: {meta_ckpts[-1].name}")

    return {
        "tft": tft_model, "lgbm": lgbm_model,
        "garch_map": garch_map, "meta": meta_model,
        "device": device, "TFTv2": TFTv2,
    }


def run_inference_for_date(
    target_date: str,
    df: pd.DataFrame,
    feats: list[str],
    k200_tickers: set[str],
    models: dict,
) -> pd.DataFrame:
    """단일 날짜 추론. DataFrame(ticker, tft_prob, lgbm_prob, ensemble_prob, signal, ...) 반환."""
    import torch
    from torch.utils.data import Dataset, DataLoader

    class SeqDS(Dataset):
        def __init__(self, s): self.s = s
        def __len__(self): return len(self.s)
        def __getitem__(self, i):
            x, y = self.s[i]
            return torch.tensor(x), torch.tensor(y)

    target_ts = pd.Timestamp(target_date)
    device = models["device"]
    tft_model = models["tft"]
    lgbm_model = models["lgbm"]
    garch_map = models["garch_map"]
    meta_model = models["meta"]

    # 시퀀스 생성
    samples, metas = [], []
    for _, g in df.groupby("ticker"):
        ticker = g["ticker"].iloc[0]
        if ticker not in k200_tickers:
            continue
        g = g.sort_values("time_idx")
        v = g[feats].values.astype(np.float32)
        t = g["target_5d"].values.astype(np.int64)
        d = g["date"].values
        tk = g["ticker"].values
        for i in range(MAX_ENCODER_LENGTH, len(g)):
            if d[i] == target_ts:
                samples.append((v[i - MAX_ENCODER_LENGTH:i], t[i]))
                metas.append({"date": str(d[i])[:10], "ticker": str(tk[i])})

    if not samples:
        return pd.DataFrame()

    # TFT 추론
    loader = DataLoader(SeqDS(samples), batch_size=BATCH_SIZE * 2, shuffle=False, num_workers=0)
    tft_probs = []
    with torch.no_grad():
        for x, y in loader:
            probs = torch.softmax(tft_model(x.to(device)), dim=-1)[:, 1].cpu().numpy()
            tft_probs.extend(probs)

    # LightGBM 추론
    target_df = df[(df["date"] == target_ts) & (df["ticker"].isin(k200_tickers))]
    lgbm_X = target_df[feats].values.astype(np.float32)
    lgbm_probs_all = lgbm_model.predict_proba(lgbm_X)[:, 1]
    lgbm_map = dict(zip(target_df["ticker"].values, lgbm_probs_all))

    # 결과 조합
    results = []
    for i, m in enumerate(metas):
        ticker = m["ticker"]
        tft_p = float(tft_probs[i])
        lgbm_p = float(lgbm_map.get(ticker, 0.5))
        garch_info = garch_map.get(ticker, {})

        if meta_model is not None:
            ensemble_p = float(meta_model.predict_proba(np.array([[tft_p, lgbm_p]]))[0, 1])
        else:
            ensemble_p = 0.5 * tft_p + 0.5 * lgbm_p

        if ensemble_p > BUY_THRESHOLD:
            signal = "BUY"
        elif ensemble_p < MODEL_EXIT:
            signal = "SELL"
        else:
            signal = "HOLD"

        results.append({
            "ticker": ticker,
            "tft_prob": round(tft_p, 4),
            "lgbm_prob": round(lgbm_p, 4),
            "ensemble_prob": round(ensemble_p, 4),
            "signal": signal,
            "garch_vol_5d": garch_info.get("vol_5d"),
            "garch_risk_flag": garch_info.get("risk_flag", False),
        })

    return pd.DataFrame(results)


# ═══════════════════════════════════════════════════════════
# 포트폴리오 시뮬레이션
# ═══════════════════════════════════════════════════════════

@dataclass
class Position:
    ticker: str; buy_date: str; buy_price: float; shares: int
    buy_prob: float; invested: float; hold_days: int = 0
    extended: bool = False; peak_price: float = 0.0


def load_portfolio_state() -> dict:
    if PORTFOLIO_STATE_PATH.exists():
        with open(str(PORTFOLIO_STATE_PATH), encoding="utf-8") as f:
            return json.load(f)
    return {"cash": 100_000_000, "positions": [], "cooldown": {}, "portfolio_id": 1}


def save_portfolio_state(state: dict) -> None:
    PORTFOLIO_STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(str(PORTFOLIO_STATE_PATH), "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2, default=str)


# 종가 캐시 (전체 로드 후 재사용)
_close_cache: dict[str, pd.Series] = {}


def _ensure_close_cache(tickers: set[str]) -> None:
    for ticker in tickers:
        if ticker in _close_cache:
            continue
        path = RAW_OHLCV_PATH / f"{ticker}.parquet"
        if not path.exists():
            continue
        try:
            ohlcv = pd.read_parquet(str(path))
            ohlcv.index = pd.to_datetime(ohlcv.index)
            _close_cache[ticker] = ohlcv["close"].sort_index()
        except Exception as e:
            log(f"  [WARN] {ticker} 종가 로드 실패: {e}")


def get_close_price(ticker: str, date_str: str) -> float | None:
    if ticker not in _close_cache:
        return None
    s = _close_cache[ticker]
    ts = pd.Timestamp(date_str)
    if ts in s.index:
        return float(s.loc[ts])
    mask = s.index <= ts
    return float(s.loc[mask].iloc[-1]) if mask.any() else None


def run_portfolio_simulation(target_date: str, signals_df: pd.DataFrame) -> dict:
    """v6 알고리즘으로 포트폴리오 시뮬레이션 1일치 실행."""
    state = load_portfolio_state()
    cash = state["cash"]
    positions = [Position(**p) for p in state["positions"]]
    cooldown = state.get("cooldown", {})
    portfolio_id = state.get("portfolio_id", 1)

    # 종가 캐시 확보
    tickers_needed = set(signals_df["ticker"].tolist())
    tickers_needed.update(p.ticker for p in positions)
    _ensure_close_cache(tickers_needed)

    signal_map = {row["ticker"]: row["ensemble_prob"] for _, row in signals_df.iterrows()}

    for p in positions:
        p.hold_days += 1

    # 매도
    sells = []
    trades = []
    for pos in positions:
        price = get_close_price(pos.ticker, target_date)
        if price is None:
            continue
        ret = (price - pos.buy_price) / pos.buy_price
        cp = signal_map.get(pos.ticker)
        if pos.extended:
            pos.peak_price = max(pos.peak_price, price)
        sl = EXTENDED_STOP_LOSS if pos.extended else STOP_LOSS
        if ret <= sl:
            sells.append((pos, "stop_loss")); continue
        if cp is not None and cp < MODEL_EXIT:
            sells.append((pos, "model_exit")); continue
        tp = EXTENDED_TAKE_PROFIT if pos.extended else TAKE_PROFIT
        if ret >= tp:
            sells.append((pos, "take_profit")); continue
        if pos.hold_days >= MAX_HOLD_DAYS:
            sells.append((pos, "timeout_max")); continue
        if pos.hold_days >= BASE_HOLD_DAYS and not pos.extended:
            if cp is not None and cp >= HOLD_EXTEND_THRESHOLD and ret > 0:
                pos.extended = True; pos.peak_price = price
            else:
                sells.append((pos, "timeout")); continue
        if pos.extended and pos.hold_days > BASE_HOLD_DAYS:
            if cp is not None and cp < HOLD_EXTEND_THRESHOLD:
                sells.append((pos, "ext_signal_fade")); continue

    for pos, reason in sells:
        price = get_close_price(pos.ticker, target_date)
        if price is None:
            continue
        rev = pos.shares * price
        comm = int(rev * SELL_COMMISSION)
        net = rev - comm
        cash += net
        pnl = int(net - pos.invested)
        positions.remove(pos)
        trades.append({
            "ticker": pos.ticker, "trade_type": "SELL", "price": int(price),
            "shares": pos.shares, "amount": int(net), "commission": comm,
            "pnl": pnl, "return_rate": round(pnl / pos.invested, 4),
            "hold_days": pos.hold_days, "trade_reason": reason,
            "is_extended": pos.extended, "ensemble_prob": signal_map.get(pos.ticker),
        })
        if "stop_loss" in reason:
            cooldown[pos.ticker] = str(
                (pd.Timestamp(target_date) + pd.offsets.BDay(REBUY_COOLDOWN)).date()
            )

    # 매수
    held = {p.ticker for p in positions}
    candidates = []
    today = pd.Timestamp(target_date)
    for _, row in signals_df.iterrows():
        t = row["ticker"]
        if t in held or row["ensemble_prob"] <= BUY_THRESHOLD:
            continue
        expire = cooldown.get(t)
        if expire and today < pd.Timestamp(expire):
            continue
        candidates.append((t, row["ensemble_prob"]))
    candidates.sort(key=lambda x: -x[1])

    for ticker, prob in candidates[:TOP_N]:
        if len(positions) >= MAX_POSITIONS:
            break
        price = get_close_price(ticker, target_date)
        if price is None or price <= 0:
            continue
        slots = MAX_POSITIONS - len(positions)
        alloc = min(cash / max(slots, 1), cash)
        shares = int(alloc / (price * (1 + BUY_COMMISSION)))
        if shares <= 0:
            continue
        cost = shares * price
        comm = int(cost * BUY_COMMISSION)
        total = int(cost + comm)
        if total > cash:
            continue
        cash -= total
        positions.append(Position(ticker, target_date, price, shares, prob, total, peak_price=price))
        trades.append({
            "ticker": ticker, "trade_type": "BUY", "price": int(price),
            "shares": shares, "amount": total, "commission": comm,
            "ensemble_prob": prob,
        })

    # 포트폴리오 가치
    holdings_value = sum(
        p.shares * (get_close_price(p.ticker, target_date) or 0) for p in positions
    )
    portfolio_value = int(cash + holdings_value)

    # 상태 저장
    new_state = {
        "cash": int(cash),
        "positions": [
            {"ticker": p.ticker, "buy_date": p.buy_date, "buy_price": p.buy_price,
             "shares": p.shares, "buy_prob": p.buy_prob, "invested": p.invested,
             "hold_days": p.hold_days, "extended": p.extended, "peak_price": p.peak_price}
            for p in positions
        ],
        "cooldown": cooldown,
        "portfolio_id": portfolio_id,
    }
    save_portfolio_state(new_state)

    snapshot = {
        "date": target_date,
        "portfolio_id": portfolio_id,
        "portfolio_value": portfolio_value,
        "cash": int(cash),
        "n_positions": len(positions),
        "positions": [
            {"ticker": p.ticker, "buy_date": p.buy_date, "buy_price": int(p.buy_price),
             "current_price": int(get_close_price(p.ticker, target_date) or 0),
             "shares": p.shares, "invested": int(p.invested),
             "unrealized_pnl": int((get_close_price(p.ticker, target_date) or p.buy_price) * p.shares - p.invested),
             "hold_days": p.hold_days, "is_extended": p.extended,
             "ensemble_prob": signal_map.get(p.ticker)}
            for p in positions
        ],
        "trades": trades,
    }

    return snapshot


# ═══════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(description="누락 기간 일괄 추론 + DB 저장")
    parser.add_argument("--skip-features", action="store_true", help="피처 재생성 건너뛰기")
    parser.add_argument("--start", type=str, default=None, help="시작 날짜 (YYYY-MM-DD)")
    args = parser.parse_args()

    log("=" * 70)
    log("캐치업 추론 파이프라인 시작")
    log("=" * 70)

    engine = get_engine()

    # 1. DB 최신 날짜
    db_latest = get_db_latest_date(engine)
    log(f"DB 최신 날짜: {db_latest}")

    # 2. OHLCV 최신 거래일
    sample = pd.read_parquet(str(RAW_OHLCV_PATH / "005930.parquet"))
    sample.index = pd.to_datetime(sample.index)
    ohlcv_latest = sample.index.max().date()
    log(f"OHLCV 최신 날짜: {ohlcv_latest}")

    # 시작일 결정
    if args.start:
        try:
            start_date = pd.Timestamp(args.start)
        except ValueError:
            log(f"잘못된 날짜 형식: {args.start}")
            return
        if start_date > pd.Timestamp(ohlcv_latest):
            log(f"시작 날짜가 OHLCV 최신 날짜({ohlcv_latest}) 이후입니다: {args.start}")
            return
    elif db_latest:
        start_date = pd.Timestamp(db_latest) + pd.Timedelta(days=1)
    else:
        start_date = pd.Timestamp("2025-01-01")

    # 누락 거래일 목록
    missing_dates = sample.index[
        (sample.index >= start_date) & (sample.index <= pd.Timestamp(ohlcv_latest))
    ].sort_values()
    missing_dates = [str(d.date()) for d in missing_dates]
    log(f"누락 거래일: {len(missing_dates)}일 ({missing_dates[0] if missing_dates else 'N/A'} ~ {missing_dates[-1] if missing_dates else 'N/A'})")

    if not missing_dates:
        log("이미 최신 상태입니다.")
        return

    # 3. 피처 재생성
    if not args.skip_features:
        log("피처 재생성 중...")
        from features.build_tft_features import build_tft_features
        build_tft_features(inference_mode=True)
        log("피처 재생성 완료")
    else:
        log("피처 재생성 건너뜀 (--skip-features)")

    # 4. 데이터 로드
    tft_feature_path = BASE_PATH / "processed" / "tft_features" / "tft_features.parquet"
    df = pd.read_parquet(str(tft_feature_path))
    df["date"] = pd.to_datetime(df["date"])
    # 추론 전용: target NaN(최근 ~5거래일)을 0으로 채움 (추론 시 target 미사용)
    df["target_5d"] = df["target_5d"].fillna(0).astype(int)
    feats = [c for c in CLEANED_FEATURES if c in df.columns]
    log(f"피처 데이터: {df.shape}, 날짜 범위: {df['date'].min().date()} ~ {df['date'].max().date()}")

    active_path = RAW_UNIVERSE_PATH / "kospi200_active.json"
    with open(str(active_path), encoding="utf-8") as f:
        k200_tickers = set(json.load(f)["tickers"].keys())
    log(f"KOSPI200 종목: {len(k200_tickers)}개")

    # 5. 모델 로드 (한 번만)
    models = load_models()

    # 6. 날짜별 추론 + DB 저장
    log("=" * 70)
    failed_dates: list[str] = []
    for i, target_date in enumerate(missing_dates):
        log(f"[{i+1}/{len(missing_dates)}] {target_date} 추론 중...")
        try:
            signals_df = run_inference_for_date(target_date, df, feats, k200_tickers, models)
            if signals_df.empty:
                log(f"  → {target_date} 시퀀스 없음, 건너뜀")
                continue

            buy_cnt = len(signals_df[signals_df["signal"] == "BUY"])
            log(f"  → {len(signals_df)}종목 (BUY={buy_cnt})")

            # DB 저장
            save_signals_to_db(engine, date.fromisoformat(target_date), signals_df.to_dict("records"))
            log(f"  → 시그널 DB 저장 완료")

            # 포트폴리오 시뮬레이션
            snapshot = run_portfolio_simulation(target_date, signals_df)
            log(f"  → 포트폴리오: 자산={snapshot['portfolio_value']:,}원, "
                f"포지션={snapshot['n_positions']}, 매매={len(snapshot['trades'])}건")

            # 포트폴리오 DB 저장
            save_portfolio_to_db(engine, snapshot)
            log(f"  → 포트폴리오 DB 저장 완료")
        except Exception as e:
            log(f"  [ERROR] {target_date} 처리 실패: {e}")
            failed_dates.append(target_date)
            continue

    if failed_dates:
        log(f"[WARNING] 실패한 날짜 {len(failed_dates)}건: {', '.join(failed_dates)}")

    # 7. 최종 확인
    log("=" * 70)
    new_latest = get_db_latest_date(engine)
    log(f"완료! DB 최신 날짜: {db_latest} → {new_latest}")
    log("=" * 70)


if __name__ == "__main__":
    main()
