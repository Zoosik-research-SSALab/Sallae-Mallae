"""
scripts/backfill_signals.py
2025-01-01 ~ 최신까지 일별 시그널 + 포트폴리오 백필 데이터 생성.

출력 (Parquet):
  backfill/daily_signals.parquet     — 일별 200종목 시그널
  backfill/daily_snapshots.parquet   — 일별 포트폴리오 스냅샷
  backfill/daily_holdings.parquet    — 일별 보유 종목 상세
  backfill/daily_trades.parquet      — 전체 매매 이력

실행: python scripts/backfill_signals.py
"""

from __future__ import annotations

import json
import sys
import warnings
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from config import BASE_PATH, RAW_OHLCV_PATH, RAW_MACRO_PATH, RAW_UNIVERSE_PATH

warnings.filterwarnings("ignore")

# ── 경로 ──
TFT_CKPT_DIR = BASE_PATH / "models" / "tft_v2_wf" / "checkpoints"
LGBM_CKPT_DIR = BASE_PATH / "models" / "lgbm_wf" / "checkpoints"
GARCH_CKPT_DIR = BASE_PATH / "models" / "garch_wf" / "checkpoints"
META_CKPT_DIR = BASE_PATH / "models" / "ensemble_meta" / "checkpoints"
TFT_FEATURE_PATH = BASE_PATH / "processed" / "tft_features" / "tft_features.parquet"
OUTPUT_DIR = BASE_PATH / "backfill"

# ── 설정 ──
CLEANED_FEATURES = [
    "vix_change", "vix", "macd_norm", "momentum_20d",
    "relative_return", "high_low_range", "kospi200_return", "volume_ratio_5d",
]
MAX_ENCODER_LENGTH = 30
BATCH_SIZE = 256

# v6 파라미터
INITIAL_CAPITAL = 100_000_000
BUY_COMMISSION = 0.00015
SELL_COMMISSION = 0.00215
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

# Walk-Forward
WF_START = "2021-01-01"
WF_END = "2026-03-31"
WF_STEP_MONTHS = 3
BT_START_WINDOW = 1
BACKFILL_START = pd.Timestamp("2025-01-01")


def log(msg: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {msg}")


def build_windows():
    windows = []
    current = pd.Timestamp(WF_START)
    end = pd.Timestamp(WF_END)
    while current < end:
        test_end = current + pd.DateOffset(months=WF_STEP_MONTHS) - pd.Timedelta(days=1)
        if test_end > end:
            test_end = end
        train_end = current - pd.Timedelta(days=1)
        windows.append((str(train_end.date()), str(current.date()), str(test_end.date())))
        current += pd.DateOffset(months=WF_STEP_MONTHS)
    return windows


def main():
    import torch
    import torch.nn as nn
    import torch.nn.functional as F
    from torch.utils.data import Dataset, DataLoader

    try:
        import lightning.pytorch as pl
    except ImportError:
        import pytorch_lightning as pl

    # ── TFT 모델 정의 ──
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

    def make_tft_samples(full_df, start, end, seq_len, feats):
        samples, metas = [], []
        s, e = pd.Timestamp(start), pd.Timestamp(end)
        for _, g in full_df.groupby("ticker"):
            g = g.sort_values("time_idx")
            v = g[feats].values.astype(np.float32)
            t = g["target_5d"].values.astype(np.int64)
            d = g["date"].values; tk = g["ticker"].values
            for i in range(seq_len, len(g)):
                if d[i] >= s and d[i] <= e:
                    samples.append((v[i - seq_len:i], t[i]))
                    metas.append({"date": str(d[i])[:10], "ticker": str(tk[i])})
        return samples, metas

    def predict_tft(model, samples):
        loader = DataLoader(SeqDS(samples), batch_size=BATCH_SIZE * 2, shuffle=False, num_workers=0)
        ps, ls = [], []
        model.eval(); model.cuda()
        with torch.no_grad():
            for x, y in loader:
                ps.extend(torch.softmax(model(x.cuda()), dim=-1)[:, 1].cpu().numpy())
                ls.extend(y.numpy())
        return np.array(ps), np.array(ls)

    def predict_lgbm(model, full_df, start, end, feats):
        s, e = pd.Timestamp(start), pd.Timestamp(end)
        mask = (full_df["date"] >= s) & (full_df["date"] <= e)
        sub = full_df[mask]
        X = sub[feats].values.astype(np.float32)
        probs = model.predict_proba(X)[:, 1]
        metas = [{"date": str(d)[:10], "ticker": t} for d, t in zip(sub["date"].values, sub["ticker"].values)]
        return probs, metas

    # ════════════════════════════════════════
    log("=" * 70)
    log("백필 시그널 생성 시작")
    log("=" * 70)

    # 데이터 로드
    df = pd.read_parquet(str(TFT_FEATURE_PATH))
    df["date"] = pd.to_datetime(df["date"])
    df["target_5d"] = df["target_5d"].astype(int)
    feats = [c for c in CLEANED_FEATURES if c in df.columns]

    with open(str(RAW_UNIVERSE_PATH / "kospi200_active.json"), encoding="utf-8") as f:
        k200_tickers = set(json.load(f)["tickers"].keys())

    windows = build_windows()

    # ── Step 1: 윈도우별 예측 수집 ──
    log("[Step 1] 윈도우별 예측 수집...")
    all_predictions = []
    last_tft_ckpt = last_lgbm_ckpt = last_garch_ckpt = None

    for i, (train_end, test_start, test_end) in enumerate(windows):
        tft_ckpt = TFT_CKPT_DIR / f"window_{i:02d}_te_{train_end}.ckpt"
        lgbm_ckpt = LGBM_CKPT_DIR / f"window_{i:02d}_te_{train_end}.joblib"
        garch_ckpt = GARCH_CKPT_DIR / f"window_{i:02d}_te_{train_end}.parquet"

        if not tft_ckpt.exists() or not lgbm_ckpt.exists():
            if last_tft_ckpt and last_lgbm_ckpt:
                tft_ckpt, lgbm_ckpt = last_tft_ckpt, last_lgbm_ckpt
                garch_ckpt = last_garch_ckpt
            else:
                continue
        else:
            last_tft_ckpt, last_lgbm_ckpt = tft_ckpt, lgbm_ckpt
            last_garch_ckpt = garch_ckpt if garch_ckpt.exists() else last_garch_ckpt

        log(f"  [{i:2d}] {test_start}~{test_end}")
        tft_model = TFTv2.load_from_checkpoint(str(tft_ckpt), strict=False)
        tft_samples, tft_metas = make_tft_samples(df, test_start, test_end, MAX_ENCODER_LENGTH, feats)
        if len(tft_samples) < 10:
            del tft_model; torch.cuda.empty_cache(); continue
        tft_probs, tft_labels = predict_tft(tft_model, tft_samples)
        del tft_model; torch.cuda.empty_cache()

        lgbm_model = joblib.load(str(lgbm_ckpt))
        lgbm_probs, lgbm_metas = predict_lgbm(lgbm_model, df, test_start, test_end, feats)
        del lgbm_model

        garch_df_loaded = None
        if garch_ckpt and garch_ckpt.exists():
            garch_df_loaded = pd.read_parquet(str(garch_ckpt))

        tft_df = pd.DataFrame(tft_metas); tft_df["tft_prob"] = tft_probs; tft_df["label"] = tft_labels
        lgbm_df = pd.DataFrame(lgbm_metas); lgbm_df["lgbm_prob"] = lgbm_probs
        merged = tft_df.merge(lgbm_df, on=["date", "ticker"], how="inner")
        merged["window"] = i

        if garch_df_loaded is not None and "ticker" in garch_df_loaded.columns:
            merged = merged.merge(garch_df_loaded[["ticker", "vol_5d", "risk_flag"]], on="ticker", how="left")
            merged["vol_5d"] = merged["vol_5d"].fillna(40.0)
            merged["risk_flag"] = merged["risk_flag"].fillna(0).astype(int)
        else:
            merged["vol_5d"] = 40.0; merged["risk_flag"] = 0

        all_predictions.append(merged)

    pred_df = pd.concat(all_predictions, ignore_index=True)

    # ── Step 2: 메타모델 체크포인트 → 앙상블 확률 ──
    log("[Step 2] 메타모델 체크포인트 로드...")
    pred_df["ensemble_prob"] = np.nan

    for i in range(BT_START_WINDOW, pred_df["window"].max() + 1):
        train_end = windows[i][0]
        meta_path = META_CKPT_DIR / f"meta_window_{i:02d}_te_{train_end}.joblib"
        test_mask = pred_df["window"] == i
        if test_mask.sum() == 0:
            continue
        if meta_path.exists():
            meta = joblib.load(str(meta_path))
        else:
            train_mask = pred_df["window"] < i
            if train_mask.sum() < 100:
                continue
            from sklearn.linear_model import LogisticRegression
            meta = LogisticRegression(random_state=42, class_weight="balanced")
            meta.fit(pred_df[train_mask][["tft_prob", "lgbm_prob"]].values,
                     pred_df[train_mask]["label"].values)

        X_test = pred_df[test_mask][["tft_prob", "lgbm_prob"]].values
        pred_df.loc[test_mask, "ensemble_prob"] = meta.predict_proba(X_test)[:, 1]

    bt_df = pred_df.dropna(subset=["ensemble_prob"]).copy()

    # ── Step 3: 일별 시그널 dict + 필터 ──
    predictions = {}
    signal_records = []  # 전체 시그널 저장용

    for _, row in bt_df.iterrows():
        d, t = row["date"], row["ticker"]
        if t not in k200_tickers:
            continue
        if pd.Timestamp(d) < BACKFILL_START:
            continue
        if d not in predictions:
            predictions[d] = {}
        ep = float(row["ensemble_prob"])
        predictions[d][t] = ep

        if ep > BUY_THRESHOLD:
            sig = "BUY"
        elif ep < MODEL_EXIT:
            sig = "SELL"
        else:
            sig = "HOLD"

        signal_records.append({
            "date": d, "ticker": t,
            "tft_prob": round(float(row["tft_prob"]), 4),
            "lgbm_prob": round(float(row["lgbm_prob"]), 4),
            "ensemble_prob": round(ep, 4),
            "signal": sig,
            "garch_vol_5d": row.get("vol_5d"),
            "garch_risk_flag": bool(row.get("risk_flag", False)),
            "label": int(row["label"]),
        })

    signals_df = pd.DataFrame(signal_records)
    signals_df["date"] = pd.to_datetime(signals_df["date"])
    log(f"[Step 3] 시그널: {len(signals_df):,}건, {signals_df['date'].nunique()} 거래일")

    # ── Step 4: 종가 로드 ──
    tickers_needed = set()
    for dp in predictions.values():
        tickers_needed.update(dp.keys())

    close_prices = {}
    for ticker in tickers_needed:
        path = RAW_OHLCV_PATH / f"{ticker}.parquet"
        if not path.exists():
            continue
        try:
            ohlcv = pd.read_parquet(str(path))
            ohlcv.index = pd.to_datetime(ohlcv.index)
            close_prices[ticker] = ohlcv["close"].sort_index()
        except Exception:
            pass

    def get_close(ticker, date):
        if ticker not in close_prices:
            return None
        s = close_prices[ticker]; ts = pd.Timestamp(date)
        if ts in s.index:
            return float(s.loc[ts])
        mask = s.index <= ts
        return float(s.loc[mask].iloc[-1]) if mask.any() else None

    # ── Step 5: 포트폴리오 시뮬레이션 (일별 상세 저장) ──
    log("[Step 5] 포트폴리오 시뮬레이션 + 일별 상세 저장...")

    @dataclass
    class Position:
        ticker: str; buy_date: str; buy_price: float; shares: int
        buy_prob: float; invested: float; hold_days: int = 0
        extended: bool = False; peak_price: float = 0.0

    cash = INITIAL_CAPITAL
    positions: list[Position] = []
    cooldown: dict[str, int] = {}

    all_snapshots = []
    all_holdings = []
    all_trades = []

    trading_dates = sorted(predictions.keys())

    for day_idx, date in enumerate(trading_dates):
        for p in positions:
            p.hold_days += 1

        date_preds = predictions.get(date, {})

        # ── 매도 ──
        sells = []
        for pos in positions:
            price = get_close(pos.ticker, date)
            if price is None:
                continue
            ret = (price - pos.buy_price) / pos.buy_price
            if pos.extended:
                pos.peak_price = max(pos.peak_price, price)
            sl = EXTENDED_STOP_LOSS if pos.extended else STOP_LOSS
            if ret <= sl:
                sells.append((pos, "ext_stop_loss" if pos.extended else "stop_loss")); continue
            cp = date_preds.get(pos.ticker)
            if cp is not None and cp < MODEL_EXIT:
                sells.append((pos, "model_exit")); continue
            tp = EXTENDED_TAKE_PROFIT if pos.extended else TAKE_PROFIT
            if ret >= tp:
                sells.append((pos, "ext_take_profit" if pos.extended else "take_profit")); continue
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
            price = get_close(pos.ticker, date)
            if price is None:
                continue
            rev = pos.shares * price
            comm = int(rev * SELL_COMMISSION)
            net = rev - comm
            cash += net
            pnl = int(net - pos.invested)
            positions.remove(pos)
            all_trades.append({
                "date": date, "ticker": pos.ticker, "trade_type": "SELL",
                "price": int(price), "shares": pos.shares, "amount": int(net),
                "commission": comm, "pnl": pnl,
                "return_rate": round(pnl / pos.invested, 4),
                "hold_days": pos.hold_days, "trade_reason": reason,
                "is_extended": pos.extended,
                "ensemble_prob": date_preds.get(pos.ticker),
                "buy_date": pos.buy_date, "buy_price": int(pos.buy_price),
            })
            if "stop_loss" in reason:
                cooldown[pos.ticker] = day_idx + REBUY_COOLDOWN

        # ── 매수 ──
        held = {p.ticker for p in positions}
        candidates = []
        for t, p in date_preds.items():
            if t in held or p <= BUY_THRESHOLD:
                continue
            if t in cooldown and day_idx < cooldown[t]:
                continue
            candidates.append((t, p))
        candidates.sort(key=lambda x: -x[1])

        for ticker, prob in candidates[:TOP_N]:
            if len(positions) >= MAX_POSITIONS:
                break
            price = get_close(ticker, date)
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
            positions.append(Position(ticker, date, price, shares, prob, total, peak_price=price))
            all_trades.append({
                "date": date, "ticker": ticker, "trade_type": "BUY",
                "price": int(price), "shares": shares, "amount": total,
                "commission": comm, "pnl": None, "return_rate": None,
                "hold_days": None, "trade_reason": None,
                "is_extended": False, "ensemble_prob": prob,
                "buy_date": date, "buy_price": int(price),
            })

        # ── 일별 스냅샷 ──
        pv = int(cash + sum(p.shares * (get_close(p.ticker, date) or 0) for p in positions))
        all_snapshots.append({
            "date": date,
            "portfolio_value": pv,
            "cash": int(cash),
            "n_positions": len(positions),
        })

        # ── 일별 보유 종목 ──
        for pos in positions:
            cur_price = get_close(pos.ticker, date)
            all_holdings.append({
                "date": date,
                "ticker": pos.ticker,
                "buy_date": pos.buy_date,
                "buy_price": int(pos.buy_price),
                "current_price": int(cur_price) if cur_price else None,
                "shares": pos.shares,
                "invested": int(pos.invested),
                "unrealized_pnl": int(cur_price * pos.shares - pos.invested) if cur_price else None,
                "hold_days": pos.hold_days,
                "is_extended": pos.extended,
                "ensemble_prob": date_preds.get(pos.ticker),
            })

        if (day_idx + 1) % 50 == 0:
            log(f"  Day {day_idx+1}/{len(trading_dates)} | {date} | "
                f"자산: {pv:,} | 수익: {(pv/INITIAL_CAPITAL-1)*100:+.1f}%")

    # 잔여 청산
    if positions:
        last = trading_dates[-1]
        for pos in list(positions):
            price = get_close(pos.ticker, last)
            if price is None:
                continue
            rev = pos.shares * price; comm = int(rev * SELL_COMMISSION); net = rev - comm
            pnl = int(net - pos.invested)
            cash += net; positions.remove(pos)
            all_trades.append({
                "date": last, "ticker": pos.ticker, "trade_type": "SELL",
                "price": int(price), "shares": pos.shares, "amount": int(net),
                "commission": comm, "pnl": pnl,
                "return_rate": round(pnl / pos.invested, 4),
                "hold_days": pos.hold_days, "trade_reason": "backtest_end",
                "is_extended": pos.extended,
                "ensemble_prob": predictions.get(last, {}).get(pos.ticker),
                "buy_date": pos.buy_date, "buy_price": int(pos.buy_price),
            })

    # ── Step 6: 저장 ──
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    signals_df.to_parquet(str(OUTPUT_DIR / "daily_signals.parquet"), index=False)
    pd.DataFrame(all_snapshots).to_parquet(str(OUTPUT_DIR / "daily_snapshots.parquet"), index=False)
    pd.DataFrame(all_holdings).to_parquet(str(OUTPUT_DIR / "daily_holdings.parquet"), index=False)
    pd.DataFrame(all_trades).to_parquet(str(OUTPUT_DIR / "daily_trades.parquet"), index=False)

    # ── 요약 ──
    snap_df = pd.DataFrame(all_snapshots)
    trade_df = pd.DataFrame(all_trades)
    sell_df = trade_df[trade_df["trade_type"] == "SELL"]

    final = snap_df["portfolio_value"].iloc[-1]
    total_ret = final / INITIAL_CAPITAL - 1

    print("\n" + "=" * 70)
    print("  백필 데이터 생성 완료")
    print("=" * 70)
    print(f"  기간: {snap_df['date'].iloc[0]} ~ {snap_df['date'].iloc[-1]}")
    print(f"  수익률: {total_ret*100:+.2f}%")
    print(f"\n  저장 파일:")
    print(f"    daily_signals.parquet   : {len(signals_df):>8,}건 (일별 200종목 시그널)")
    print(f"    daily_snapshots.parquet : {len(all_snapshots):>8,}건 (일별 포트폴리오)")
    print(f"    daily_holdings.parquet  : {len(all_holdings):>8,}건 (일별 보유 종목)")
    print(f"    daily_trades.parquet    : {len(all_trades):>8,}건 (전체 매매 이력)")
    print(f"\n  경로: {OUTPUT_DIR}")
    print("=" * 70)


if __name__ == "__main__":
    main()
