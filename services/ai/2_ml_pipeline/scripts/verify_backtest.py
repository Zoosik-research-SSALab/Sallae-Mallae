"""
scripts/verify_backtest.py
체크포인트 기반 전체 백테스트 재현 스크립트.

노트북(ensemble_backtest_v6_k200)과 동일한 결과가 나오는지 검증.
모든 모델(TFT, LightGBM, GARCH, 메타모델)을 체크포인트에서 로드하여
2025-01-01 ~ 최신 구간 백테스트 실행.

실행: python scripts/verify_backtest.py
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

# ── 피처/모델 설정 ──
CLEANED_FEATURES = [
    "vix_change", "vix", "macd_norm", "momentum_20d",
    "relative_return", "high_low_range", "kospi200_return", "volume_ratio_5d",
]
MAX_ENCODER_LENGTH = 30
BATCH_SIZE = 256

# ── v6 포트폴리오 파라미터 ──
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

# ── Walk-Forward 윈도우 ──
WF_START = "2021-01-01"
WF_END = "2026-03-31"
WF_STEP_MONTHS = 3
BT_START_WINDOW = 1
TEST_START = None  # None이면 전체 기간


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
    from sklearn.metrics import accuracy_score

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

    # ── 유틸 ──
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
    log("체크포인트 기반 전체 백테스트 검증")
    log("=" * 70)

    # 데이터 로드
    log("데이터 로드...")
    df = pd.read_parquet(str(TFT_FEATURE_PATH))
    df["date"] = pd.to_datetime(df["date"])
    df["target_5d"] = df["target_5d"].astype(int)
    feats = [c for c in CLEANED_FEATURES if c in df.columns]
    log(f"데이터: {len(df):,} rows, {len(feats)} features, {df['date'].min().date()} ~ {df['date'].max().date()}")

    # KOSPI200 필터
    with open(str(RAW_UNIVERSE_PATH / "kospi200_active.json"), encoding="utf-8") as f:
        k200_tickers = set(json.load(f)["tickers"].keys())
    log(f"KOSPI200: {len(k200_tickers)}종목")

    # 윈도우 생성
    windows = build_windows()
    log(f"Walk-Forward 윈도우: {len(windows)}개")

    # ════════════════════════════════════════
    # Step 1: 윈도우별 예측 수집 (체크포인트 로드)
    # ════════════════════════════════════════
    log("\n[Step 1] 윈도우별 예측 수집...")
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
                log(f"  [{i:2d}] {test_start}~{test_end} (마지막 ckpt 재사용)")
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
        log(f"       {len(merged):,} 예측")

    pred_df = pd.concat(all_predictions, ignore_index=True)
    log(f"  전체 예측: {len(pred_df):,} rows")

    # ════════════════════════════════════════
    # Step 2: 메타모델 체크포인트로 앙상블 확률 생성
    # ════════════════════════════════════════
    log("\n[Step 2] 메타모델 체크포인트 로드...")
    pred_df["ensemble_prob"] = np.nan

    for i in range(BT_START_WINDOW, pred_df["window"].max() + 1):
        train_end = windows[i][0]
        meta_path = META_CKPT_DIR / f"meta_window_{i:02d}_te_{train_end}.joblib"

        test_mask = pred_df["window"] == i
        if test_mask.sum() == 0:
            continue

        if meta_path.exists():
            meta = joblib.load(str(meta_path))
            source = "ckpt"
        else:
            # 체크포인트 없으면 on-the-fly 학습 (노트북과 동일)
            train_mask = pred_df["window"] < i
            if train_mask.sum() < 100:
                continue
            from sklearn.linear_model import LogisticRegression
            meta = LogisticRegression(random_state=42, class_weight="balanced")
            meta.fit(pred_df[train_mask][["tft_prob", "lgbm_prob"]].values,
                     pred_df[train_mask]["label"].values)
            source = "live"

        X_test = pred_df[test_mask][["tft_prob", "lgbm_prob"]].values
        ensemble_probs = meta.predict_proba(X_test)[:, 1]
        pred_df.loc[test_mask, "ensemble_prob"] = ensemble_probs

        da = accuracy_score(pred_df[test_mask]["label"], (ensemble_probs >= 0.5).astype(int))
        log(f"  [{i:2d}] DA={da * 100:.1f}% coef={meta.coef_[0]} ({source})")

    bt_df = pred_df.dropna(subset=["ensemble_prob"]).copy()
    log(f"  백테스트 대상: {len(bt_df):,} rows")

    # ════════════════════════════════════════
    # Step 3: predictions dict + KOSPI200 필터 + 2025 필터
    # ════════════════════════════════════════
    predictions = {}
    for _, row in bt_df.iterrows():
        d, t = row["date"], row["ticker"]
        if d not in predictions:
            predictions[d] = {}
        predictions[d][t] = float(row["ensemble_prob"])

    # KOSPI200 필터
    for date in list(predictions.keys()):
        predictions[date] = {t: p for t, p in predictions[date].items() if t in k200_tickers}
        if not predictions[date]:
            del predictions[date]

    # 기간 필터
    if TEST_START is not None:
        predictions = {d: p for d, p in predictions.items() if pd.Timestamp(d) >= TEST_START}
    log(f"\n[Step 3] {len(predictions)} 거래일 (KOSPI200)")

    # ════════════════════════════════════════
    # Step 4: 종가 + KOSPI200 벤치마크
    # ════════════════════════════════════════
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

    kospi = pd.Series(dtype=float)
    kospi_path = RAW_MACRO_PATH / "kospi200.parquet"
    if kospi_path.exists():
        kdf = pd.read_parquet(str(kospi_path))
        kdf.index = pd.to_datetime(kdf.index)
        col = "close" if "close" in kdf.columns else kdf.columns[0]
        kospi = kdf[col].sort_index()

    log(f"[Step 4] 종가: {len(close_prices)}종목, KOSPI200: {len(kospi)} rows")

    # ════════════════════════════════════════
    # Step 5: 포트폴리오 시뮬레이션 (v6 알고리즘)
    # ════════════════════════════════════════
    @dataclass
    class Position:
        ticker: str; buy_date: str; buy_price: float; shares: int
        buy_prob: float; invested: float; hold_days: int = 0
        extended: bool = False; peak_price: float = 0.0

    def get_close(ticker, date):
        if ticker not in close_prices:
            return None
        s = close_prices[ticker]; ts = pd.Timestamp(date)
        if ts in s.index:
            return float(s.loc[ts])
        mask = s.index <= ts
        return float(s.loc[mask].iloc[-1]) if mask.any() else None

    cash = INITIAL_CAPITAL
    positions = []
    trade_log = []
    snapshots = []
    extend_stats = {"extended": 0, "timeout_base": 0, "timeout_max": 0}
    cooldown = {}
    skip_count = 0

    trading_dates = sorted(predictions.keys())
    log(f"\n[Step 5] 시뮬레이션: {len(trading_dates)} 거래일")

    for i, date in enumerate(trading_dates):
        for p in positions:
            p.hold_days += 1

        date_preds = predictions.get(date, {})
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
                sells.append((pos, "stop_loss" if not pos.extended else "ext_stop_loss")); continue
            cp = date_preds.get(pos.ticker)
            if cp is not None and cp < MODEL_EXIT:
                sells.append((pos, "model_exit")); continue
            tp = EXTENDED_TAKE_PROFIT if pos.extended else TAKE_PROFIT
            if ret >= tp:
                sells.append((pos, "take_profit" if not pos.extended else "ext_take_profit")); continue
            if pos.hold_days >= MAX_HOLD_DAYS:
                extend_stats["timeout_max"] += 1
                sells.append((pos, "timeout_max")); continue
            if pos.hold_days >= BASE_HOLD_DAYS and not pos.extended:
                if cp is not None and cp >= HOLD_EXTEND_THRESHOLD and ret > 0:
                    pos.extended = True; pos.peak_price = price; extend_stats["extended"] += 1
                else:
                    extend_stats["timeout_base"] += 1
                    sells.append((pos, "timeout")); continue
            if pos.extended and pos.hold_days > BASE_HOLD_DAYS:
                if cp is not None and cp < HOLD_EXTEND_THRESHOLD:
                    sells.append((pos, "ext_signal_fade")); continue

        for pos, reason in sells:
            price = get_close(pos.ticker, date)
            if price is None:
                continue
            rev = pos.shares * price; comm = rev * SELL_COMMISSION; net = rev - comm
            cash += net; positions.remove(pos)
            pnl = net - pos.invested
            trade_log.append({"date": date, "ticker": pos.ticker, "action": "SELL",
                "price": price, "pnl": pnl, "return": pnl / pos.invested,
                "hold_days": pos.hold_days, "reason": reason, "extended": pos.extended})
            if "stop_loss" in reason:
                cooldown[pos.ticker] = i + REBUY_COOLDOWN

        preds = predictions[date]
        held = {p.ticker for p in positions}
        candidates = []
        for t, p in preds.items():
            if t in held or p <= BUY_THRESHOLD:
                continue
            if t in cooldown and i < cooldown[t]:
                skip_count += 1; continue
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
            cost = shares * price; comm = cost * BUY_COMMISSION; total = cost + comm
            if total > cash:
                continue
            cash -= total
            positions.append(Position(ticker, date, price, shares, prob, total, peak_price=price))
            trade_log.append({"date": date, "ticker": ticker, "action": "BUY",
                "price": price, "prob": prob})

        pv = cash + sum(p.shares * (get_close(p.ticker, date) or 0) for p in positions)
        snapshots.append({"date": date, "portfolio_value": pv, "cash": cash, "n_positions": len(positions)})

        if (i + 1) % 50 == 0:
            log(f"  Day {i+1}/{len(trading_dates)} | {date} | 자산: {pv:,.0f} | 수익: {(pv/INITIAL_CAPITAL-1)*100:+.2f}%")

    # 잔여 청산
    if positions:
        last = trading_dates[-1]
        for pos in list(positions):
            price = get_close(pos.ticker, last)
            if price is None:
                continue
            rev = pos.shares * price; comm = rev * SELL_COMMISSION; net = rev - comm
            cash += net; positions.remove(pos)
            trade_log.append({"date": last, "ticker": pos.ticker, "action": "SELL",
                "price": price, "pnl": net - pos.invested, "return": (net - pos.invested) / pos.invested,
                "hold_days": pos.hold_days, "reason": "backtest_end", "extended": pos.extended})

    # ════════════════════════════════════════
    # Step 6: 결과
    # ════════════════════════════════════════
    snap_df = pd.DataFrame(snapshots)
    snap_df["date"] = pd.to_datetime(snap_df["date"])
    sell_df = pd.DataFrame([t for t in trade_log if t["action"] == "SELL"])

    final_value = snap_df["portfolio_value"].iloc[-1]
    total_return = final_value / INITIAL_CAPITAL - 1
    n_days = len(snap_df)
    annual_return = (1 + total_return) ** (252 / max(n_days, 1)) - 1

    daily_ret = snap_df["portfolio_value"].pct_change().dropna()
    sharpe = float(daily_ret.mean() / daily_ret.std() * np.sqrt(252)) if daily_ret.std() > 1e-9 else 0
    mdd = float(((snap_df["portfolio_value"] - snap_df["portfolio_value"].cummax()) / snap_df["portfolio_value"].cummax()).min())

    win_rate = (sell_df["pnl"] > 0).mean() if len(sell_df) > 0 else 0
    total_comm_est = len(sell_df) * 10000  # 대략 추정

    bm_ret = None
    bt_s = pd.Timestamp(snap_df["date"].iloc[0])
    bt_e = snap_df["date"].iloc[-1]
    bm_slice = kospi[(kospi.index >= bt_s) & (kospi.index <= bt_e)]
    if len(bm_slice) >= 2:
        bm_ret = float(bm_slice.iloc[-1] / bm_slice.iloc[0] - 1)

    # 월별 수익률
    snap_df["month"] = snap_df["date"].dt.to_period("M")
    monthly = snap_df.groupby("month")["portfolio_value"].agg(["first", "last"])
    monthly["return"] = (monthly["last"] / monthly["first"] - 1) * 100

    ext_sells = sell_df[sell_df["extended"] == True] if len(sell_df) > 0 else pd.DataFrame()
    noext_sells = sell_df[sell_df["extended"] == False] if len(sell_df) > 0 else pd.DataFrame()

    print("\n" + "=" * 70)
    print("  체크포인트 기반 백테스트 결과 (v6-K200, 2025~)")
    print("=" * 70)
    print(f"  기간: {snap_df['date'].iloc[0].date()} ~ {snap_df['date'].iloc[-1].date()} ({n_days}거래일)")
    print(f"  초기 자본: {INITIAL_CAPITAL:>15,}원")
    print(f"  최종 자산: {final_value:>15,.0f}원")
    print(f"  총 수익률: {total_return*100:>+8.2f}%")
    print(f"  연환산:    {annual_return*100:>+8.2f}%")
    print(f"  Sharpe:    {sharpe:>8.3f}")
    print(f"  MDD:       {mdd*100:>8.2f}%")
    if bm_ret is not None:
        print(f"  KOSPI200:  {bm_ret*100:>+8.2f}%")
        print(f"  초과수익:  {(total_return-bm_ret)*100:>+8.2f}%")
    print(f"  총 거래:   {len(sell_df):>8}건")
    print(f"  승률:      {win_rate*100:>8.1f}%")

    print(f"\n  [월별 수익률]")
    for period, row in monthly.iterrows():
        print(f"    {period}: {row['return']:+.2f}%")

    if len(sell_df) > 0:
        reasons = sell_df["reason"].value_counts()
        print(f"\n  [매도 사유]")
        for r, c in reasons.items():
            print(f"    {r:20s}: {c:5d}건 ({c/len(sell_df)*100:.1f}%)")

    if len(noext_sells) > 0:
        print(f"\n  [보유 연장 효과]")
        print(f"    비연장: {len(noext_sells)}건, 승률={((noext_sells['pnl']>0).mean())*100:.1f}%")
    if len(ext_sells) > 0:
        print(f"    연장:   {len(ext_sells)}건, 승률={((ext_sells['pnl']>0).mean())*100:.1f}%")

    print("\n" + "=" * 70)
    print(f"\n  노트북 결과 비교:")
    print(f"  v6-K200 2025(노트북): 수익률=+21.57%, Sharpe=1.730, MDD=-6.82%")
    print(f"  v6-K200 latest(노트북): 수익률=+26.91%, Sharpe=1.953, MDD=-6.82%")


if __name__ == "__main__":
    main()
