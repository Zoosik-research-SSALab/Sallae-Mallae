"""
scripts/daily_inference.py
일별 앙상블 시그널 생성 + EC2 FastAPI 전송 스크립트.

실행: python scripts/daily_inference.py
스케줄: Windows 작업 스케줄러 매일 16:00

흐름:
  1. OHLCV 최신 날짜 확인
  2. tft_features 피처 생성 (build_tft_features)
  3. TFT + LightGBM + 메타모델 추론 (GPU)
  4. KOSPI200 200종목 필터링
  5. POST /ai/signal/upload → EC2 DB 저장
  6. 포트폴리오 시뮬레이션 (v6 알고리즘)
  7. POST /ai/signal/portfolio → EC2 DB 저장
"""

from __future__ import annotations

import json
import os
import sys
import warnings
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import requests

# 프로젝트 루트 추가
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from config import (
    BASE_PATH,
    RAW_OHLCV_PATH,
    RAW_MACRO_PATH,
    RAW_UNIVERSE_PATH,
)

warnings.filterwarnings("ignore")

# ── 설정 ──
API_BASE_URL = os.environ.get("AI_SERVER_URL", "http://localhost:8000")
API_KEY = os.environ.get("AI_INTERNAL_API_KEY", "change_me_ai_internal_key")

TFT_CKPT_DIR = BASE_PATH / "models" / "tft_v2_wf" / "checkpoints"
LGBM_CKPT_DIR = BASE_PATH / "models" / "lgbm_wf" / "checkpoints"
GARCH_CKPT_DIR = BASE_PATH / "models" / "garch_wf" / "checkpoints"

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

# 포트폴리오 상태 파일 (일별 유지)
PORTFOLIO_STATE_PATH = BASE_PATH / "models" / "ensemble_backtest" / "portfolio_state.json"


def log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


# ── Step 1: 최신 날짜 확인 ──

def get_latest_trade_date() -> str:
    """OHLCV 데이터의 최신 거래일을 반환."""
    sample = pd.read_parquet(str(RAW_OHLCV_PATH / "005930.parquet"))
    sample.index = pd.to_datetime(sample.index)
    return str(sample.index.max().date())


# ── Step 2: 피처 생성 ──

def build_features() -> None:
    """tft_features.parquet를 재생성 (추론용: 최신 날짜 유지)."""
    from features.build_tft_features import build_tft_features
    build_tft_features(inference_mode=True)


# ── Step 3: 추론 ──

def run_inference(target_date: str) -> pd.DataFrame:
    """TFT + LightGBM + 메타모델 추론. 반환: DataFrame(ticker, tft_prob, lgbm_prob, ensemble_prob, signal)."""
    import joblib
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torch.utils.data import Dataset, DataLoader
    from sklearn.linear_model import LogisticRegression

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

    class SeqDS(Dataset):
        def __init__(self, s): self.s = s
        def __len__(self): return len(self.s)
        def __getitem__(self, i):
            x, y = self.s[i]
            return torch.tensor(x), torch.tensor(y)

    # 데이터 로드
    tft_feature_path = BASE_PATH / "processed" / "tft_features" / "tft_features.parquet"
    df = pd.read_parquet(str(tft_feature_path))
    df["date"] = pd.to_datetime(df["date"])
    # 추론 전용: target NaN(최근 ~5거래일)을 0으로 채움 (추론 시 target 미사용)
    df["target_5d"] = df["target_5d"].fillna(0).astype(int)
    feats = [c for c in CLEANED_FEATURES if c in df.columns]

    # KOSPI200 필터
    active_path = RAW_UNIVERSE_PATH / "kospi200_active.json"
    with open(str(active_path), encoding="utf-8") as f:
        active_data = json.load(f)
    k200_tickers = set(active_data["tickers"].keys())

    # 최신 체크포인트 찾기
    tft_ckpts = sorted(TFT_CKPT_DIR.glob("window_*.ckpt"))
    lgbm_ckpts = sorted(LGBM_CKPT_DIR.glob("window_*.joblib"))
    garch_ckpts = sorted(GARCH_CKPT_DIR.glob("window_*.parquet"))

    if not tft_ckpts or not lgbm_ckpts:
        raise FileNotFoundError("체크포인트 파일을 찾을 수 없습니다")

    tft_ckpt = tft_ckpts[-1]
    lgbm_ckpt = lgbm_ckpts[-1]
    garch_ckpt = garch_ckpts[-1] if garch_ckpts else None

    log(f"체크포인트: TFT={tft_ckpt.name}, LGBM={lgbm_ckpt.name}")

    # 타겟 날짜 기준 시퀀스 생성
    target_ts = pd.Timestamp(target_date)
    samples, metas = [], []
    for _, g in df.groupby("ticker"):
        if g["ticker"].iloc[0] not in k200_tickers:
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
        log(f"경고: {target_date}에 대한 시퀀스가 없습니다")
        return pd.DataFrame()

    log(f"시퀀스 생성: {len(samples)}개 종목")

    # TFT 추론
    device = "cuda" if torch.cuda.is_available() else "cpu"
    tft_model = TFTv2.load_from_checkpoint(str(tft_ckpt), strict=False)
    tft_model.eval()
    tft_model.to(device)

    loader = DataLoader(SeqDS(samples), batch_size=BATCH_SIZE * 2, shuffle=False, num_workers=0)
    tft_probs = []
    with torch.no_grad():
        for x, y in loader:
            probs = torch.softmax(tft_model(x.to(device)), dim=-1)[:, 1].cpu().numpy()
            tft_probs.extend(probs)
    del tft_model
    if device == "cuda":
        torch.cuda.empty_cache()

    # LightGBM 추론
    lgbm_model = joblib.load(str(lgbm_ckpt))
    target_df = df[(df["date"] == target_ts) & (df["ticker"].isin(k200_tickers))]
    lgbm_X = target_df[feats].values.astype(np.float32)
    lgbm_probs_all = lgbm_model.predict_proba(lgbm_X)[:, 1]
    lgbm_map = dict(zip(target_df["ticker"].values, lgbm_probs_all))
    del lgbm_model

    # GARCH 로드
    garch_map = {}
    if garch_ckpt and garch_ckpt.exists():
        garch_df = pd.read_parquet(str(garch_ckpt))
        if "ticker" in garch_df.columns:
            for _, row in garch_df.iterrows():
                garch_map[row["ticker"]] = {
                    "vol_5d": row.get("vol_5d"),
                    "risk_flag": bool(row.get("risk_flag", False)),
                }

    # 메타모델 로드 (최신 윈도우 체크포인트)
    meta_ckpt_dir = BASE_PATH / "models" / "ensemble_meta" / "checkpoints"
    meta_files = sorted(meta_ckpt_dir.glob("meta_window_*.joblib")) if meta_ckpt_dir.exists() else []
    meta_model_path = meta_files[-1] if meta_files else None
    if meta_model_path is not None and meta_model_path.exists():
        meta_model = joblib.load(str(meta_model_path))
        log(f"메타모델 로드: {meta_model_path.name} (coef={meta_model.coef_[0]})")
    else:
        meta_model = None
        log("경고: 메타모델 없음 — 단순 평균 사용")

    # 결과 조합
    results = []
    for i, m in enumerate(metas):
        ticker = m["ticker"]
        tft_p = float(tft_probs[i])
        lgbm_p = float(lgbm_map.get(ticker, 0.5))
        garch_info = garch_map.get(ticker, {})

        # 앙상블: 저장된 LR 메타모델 사용
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

    result_df = pd.DataFrame(results)
    log(f"추론 완료: {len(result_df)}종목, BUY={len(result_df[result_df['signal']=='BUY'])},"
        f" HOLD={len(result_df[result_df['signal']=='HOLD'])},"
        f" SELL={len(result_df[result_df['signal']=='SELL'])}")

    return result_df


# ── Step 0.5: 파이프라인 시그널 API ──

def post_pipeline_signal(signal_type: str = "ML_INFERENCE_DONE") -> int | None:
    """POST /ai/pipeline/signal → PENDING 시그널 생성, signal_id 반환."""
    try:
        resp = requests.post(
            f"{API_BASE_URL}/ai/pipeline/signal",
            json={"signal_type": signal_type},
            headers={"X-API-Key": API_KEY},
            timeout=10,
        )
        resp.raise_for_status()
        signal_id = resp.json()["id"]
        log(f"파이프라인 시그널 생성: id={signal_id}, type={signal_type}")
        return signal_id
    except Exception as e:
        log(f"파이프라인 시그널 생성 실패 (추론은 계속 진행): {e}")
        return None


def patch_pipeline_signal(signal_id: int | None, status: str) -> None:
    """PATCH /ai/pipeline/signal/{id} → 상태 전이 (PROCESSING/DONE/FAILED)."""
    if signal_id is None:
        return
    try:
        resp = requests.patch(
            f"{API_BASE_URL}/ai/pipeline/signal/{signal_id}",
            json={"status": status},
            headers={"X-API-Key": API_KEY},
            timeout=10,
        )
        resp.raise_for_status()
        log(f"파이프라인 시그널 업데이트: id={signal_id}, status={status}")
    except Exception as e:
        log(f"파이프라인 시그널 업데이트 실패 (id={signal_id}, status={status}): {e}")


# ── Step 4: API 전송 ──

def post_signals(target_date: str, result_df: pd.DataFrame) -> bool:
    """POST /ai/signal/upload 으로 시그널 전송."""
    payload = {
        "date": target_date,
        "model_version": "tft-v2",
        "signals": result_df.to_dict(orient="records"),
    }
    try:
        resp = requests.post(
            f"{API_BASE_URL}/ai/signal/upload",
            json=payload,
            headers={"X-API-Key": API_KEY},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        log(f"시그널 업로드 성공: {data.get('message', 'OK')}")
        return True
    except requests.exceptions.HTTPError as e:
        log(f"시그널 업로드 실패: {e}")
        log(f"응답 본문: {e.response.content.decode('utf-8', errors='replace')}")
        return False
    except Exception as e:
        log(f"시그널 업로드 실패: {e}")
        return False


def post_portfolio(target_date: str, snapshot: dict) -> bool:
    """POST /ai/signal/portfolio 으로 포트폴리오 전송."""
    try:
        resp = requests.post(
            f"{API_BASE_URL}/ai/signal/portfolio",
            json=snapshot,
            headers={"X-API-Key": API_KEY},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        log(f"포트폴리오 업데이트 성공: {data.get('message', 'OK')}")
        return True
    except requests.exceptions.HTTPError as e:
        log(f"포트폴리오 업데이트 실패: {e}")
        log(f"응답 본문: {e.response.content.decode('utf-8', errors='replace')}")
        return False
    except Exception as e:
        log(f"포트폴리오 업데이트 실패: {e}")
        return False


# ── Step 5: 포트폴리오 시뮬레이션 ──

@dataclass
class Position:
    ticker: str; buy_date: str; buy_price: float; shares: int
    buy_prob: float; invested: float; hold_days: int = 0
    extended: bool = False; peak_price: float = 0.0


def load_portfolio_state() -> dict:
    """이전 포트폴리오 상태를 로드."""
    if PORTFOLIO_STATE_PATH.exists():
        with open(str(PORTFOLIO_STATE_PATH), encoding="utf-8") as f:
            return json.load(f)
    return {
        "cash": 100_000_000,
        "positions": [],
        "cooldown": {},
        "portfolio_id": 1,
    }


def save_portfolio_state(state: dict) -> None:
    """포트폴리오 상태를 저장."""
    PORTFOLIO_STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(str(PORTFOLIO_STATE_PATH), "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2, default=str)


def get_close_price(ticker: str, date: str) -> float | None:
    """특정 종목의 특정 날짜 종가를 반환."""
    path = RAW_OHLCV_PATH / f"{ticker}.parquet"
    if not path.exists():
        return None
    try:
        ohlcv = pd.read_parquet(str(path))
        ohlcv.index = pd.to_datetime(ohlcv.index)
        ts = pd.Timestamp(date)
        if ts in ohlcv.index:
            return float(ohlcv.loc[ts, "close"])
        mask = ohlcv.index <= ts
        if mask.any():
            return float(ohlcv.loc[mask].iloc[-1]["close"])
    except Exception:
        pass
    return None


def run_portfolio_simulation(target_date: str, signals_df: pd.DataFrame) -> dict:
    """v6 알고리즘으로 포트폴리오 시뮬레이션 1일치 실행."""
    state = load_portfolio_state()
    cash = state["cash"]
    positions = [Position(**p) for p in state["positions"]]
    cooldown = state.get("cooldown", {})
    portfolio_id = state.get("portfolio_id", 1)

    signal_map = {row["ticker"]: row["ensemble_prob"] for _, row in signals_df.iterrows()}
    day_index = 0  # 쿨다운용 인덱스

    # 보유일 증가
    for p in positions:
        p.hold_days += 1

    # 매도 판단
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
            "is_extended": pos.extended,
            "ensemble_prob": signal_map.get(pos.ticker),
        })
        if "stop_loss" in reason:
            # 쿨다운: 만료 날짜를 저장 (현재 날짜 + REBUY_COOLDOWN 거래일)
            cooldown[pos.ticker] = str(
                (pd.Timestamp(target_date) + pd.offsets.BDay(REBUY_COOLDOWN)).date()
            )

    # 매수 판단
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

    # 포트폴리오 가치 계산
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

    # API 전송용 스냅샷
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

    log(f"포트폴리오: 자산={portfolio_value:,}원, 현금={int(cash):,}원, "
        f"포지션={len(positions)}, 매매={len(trades)}건")

    return snapshot


# ── 메인 ──

def check_pipeline_signal(latest_trade_date: str) -> bool:
    """
    데이터 파이프라인 완료 시그널을 확인합니다.

    1_data_pipeline의 스케줄러가 파이프라인 완료 시 생성하는
    pipeline_signal.json을 읽어 최신 거래일 + 성공 여부를 확인합니다.

    거래일 기준으로 비교하므로 주말/공휴일에도 정상 동작합니다.

    Args:
        latest_trade_date: OHLCV 데이터의 최신 거래일 (YYYY-MM-DD)

    Returns:
        True: 최신 거래일 파이프라인이 성공적으로 완료됨
        False: 날짜 불일치 또는 파이프라인 실패
    """
    signal_path = BASE_PATH / "pipeline_signal.json"
    if not signal_path.exists():
        log("파이프라인 시그널 파일 없음 — 수동 실행으로 간주")
        return True  # 시그널 파일 없으면 수동 실행으로 간주하여 통과

    try:
        signal = json.loads(signal_path.read_text(encoding="utf-8"))

        # 스키마 버전 확인
        version = signal.get("version", 1)
        if version != 1:
            log(f"지원하지 않는 시그널 버전: {version} — 추론 건너뜀")
            return False

        signal_date = signal.get("date", "")
        signal_status = signal.get("status", "")

        if signal_date != latest_trade_date:
            log(f"시그널 날짜 불일치: signal={signal_date}, expected={latest_trade_date} — 대기")
            return False

        if signal_status != "success":
            log(f"파이프라인 실패 상태: status={signal_status} — 추론 건너뜀")
            return False

        log(f"파이프라인 완료 확인: date={signal_date}, status={signal_status}")
        return True
    except json.JSONDecodeError as exc:
        log(f"시그널 파일 파싱 실패 (쓰기 중?): {exc} — 대기")
        return False
    except KeyError as exc:
        log(f"시그널 필드 누락: {exc} — 수동 실행으로 간주")
        return True


def main():
    log("=" * 60)
    log("앙상블 시그널 파이프라인 시작")
    log("=" * 60)

    # 0. 최신 거래일 확인 + 파이프라인 시그널 확인
    latest_date = get_latest_trade_date()
    log(f"최신 거래일: {latest_date}")

    if not check_pipeline_signal(latest_date):
        log("데이터 파이프라인 미완료 — 추론 중단")
        return

    # 1. 파이프라인 시그널 생성 (PENDING)
    signal_id = post_pipeline_signal("ML_INFERENCE_DONE")

    try:
        # 2. PROCESSING 전환
        patch_pipeline_signal(signal_id, "PROCESSING")

        # 3. 피처 생성
        log("피처 생성 중...")
        build_features()

        # 4. 추론
        log(f"{latest_date} 추론 시작...")
        signals_df = run_inference(latest_date)
        if signals_df.empty:
            log("추론 결과 없음. 종료.")
            patch_pipeline_signal(signal_id, "FAILED")
            return

        # 5. 시그널 전송
        post_signals(latest_date, signals_df)

        # 6. 포트폴리오 시뮬레이션
        snapshot = run_portfolio_simulation(latest_date, signals_df)

        # 7. 포트폴리오 전송
        post_portfolio(latest_date, snapshot)

        # 8. 완료 시그널 (DONE)
        patch_pipeline_signal(signal_id, "DONE")

        log("=" * 60)
        log("파이프라인 완료")
        log("=" * 60)

    except Exception as e:
        log(f"파이프라인 실패: {e}")
        patch_pipeline_signal(signal_id, "FAILED")
        raise


if __name__ == "__main__":
    main()
