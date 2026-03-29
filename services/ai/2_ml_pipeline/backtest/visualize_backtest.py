"""
backtest/visualize_backtest.py
백테스트 결과 시각화 — 에쿼티 커브, 드로다운, 거래 통계.

출력:
  backtest/ (Google Drive)
    equity_curve.png          — 에쿼티 커브 + KOSPI200 벤치마크
    drawdown.png              — 드로다운 차트
    monthly_returns.png       — 월별 수익률 히트맵
    trade_analysis.png        — 거래 분석 (매도 사유, 수익 분포)
"""

from __future__ import annotations

import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")

import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import RAW_MACRO_PATH, BACKTEST_PATH

plt.rcParams["font.family"] = "Malgun Gothic"
plt.rcParams["axes.unicode_minus"] = False

BACKTEST_DIR = BACKTEST_PATH
INITIAL_CAPITAL = 100_000_000


def load_data() -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.Series]:
    """백테스트 결과 데이터 로드."""
    # 최신 파일 자동 탐색 (날짜 하드코딩 방지)
    eq_topn_files = sorted(BACKTEST_DIR.glob("equity_curve_top_n_*.parquet"))
    eq_thresh_files = sorted(BACKTEST_DIR.glob("equity_curve_threshold_*.parquet"))
    trade_files = sorted(BACKTEST_DIR.glob("trade_log_top_n_*.parquet"))

    if not eq_topn_files or not eq_thresh_files or not trade_files:
        raise FileNotFoundError(f"백테스트 결과 파일을 찾을 수 없습니다: {BACKTEST_DIR}")

    eq_topn = pd.read_parquet(str(eq_topn_files[-1]))
    eq_thresh = pd.read_parquet(str(eq_thresh_files[-1]))
    trades = pd.read_parquet(str(trade_files[-1]))

    eq_topn["date"] = pd.to_datetime(eq_topn["date"])
    eq_thresh["date"] = pd.to_datetime(eq_thresh["date"])

    # KOSPI200 벤치마크
    kospi_path = RAW_MACRO_PATH / "kospi200.parquet"
    kospi = pd.Series(dtype=float)
    if kospi_path.exists():
        df = pd.read_parquet(kospi_path)
        df.index = pd.to_datetime(df.index)
        close_col = "close" if "close" in df.columns else df.columns[0]
        kospi = df[close_col].sort_index()

    return eq_topn, eq_thresh, trades, kospi


def plot_equity_curve(eq_topn: pd.DataFrame, eq_thresh: pd.DataFrame, kospi: pd.Series) -> None:
    """에쿼티 커브 + KOSPI200 벤치마크."""
    fig, ax = plt.subplots(figsize=(14, 7))

    # 포트폴리오
    ax.plot(eq_topn["date"], eq_topn["portfolio_value"] / 1e8, linewidth=2,
            color="#e74c3c", label="LSTM Top-10")
    ax.plot(eq_thresh["date"], eq_thresh["portfolio_value"] / 1e8, linewidth=1.5,
            color="#3498db", alpha=0.7, label="LSTM Threshold>=0.55")

    # KOSPI200 (동일 자본금 기준 정규화)
    bt_start = eq_topn["date"].iloc[0]
    bt_end = eq_topn["date"].iloc[-1]
    kospi_slice = kospi[(kospi.index >= bt_start) & (kospi.index <= bt_end)]
    if len(kospi_slice) >= 2:
        kospi_normalized = kospi_slice / kospi_slice.iloc[0] * INITIAL_CAPITAL / 1e8
        ax.plot(kospi_slice.index, kospi_normalized, linewidth=1.5,
                color="#95a5a6", linestyle="--", label="KOSPI200 (Buy&Hold)")

    ax.set_xlabel("날짜", fontsize=12)
    ax.set_ylabel("자산 (억원)", fontsize=12)
    ax.set_title("LSTM 포트폴리오 에쿼티 커브 (2025-01 ~ 2026-01)", fontsize=15, fontweight="bold")
    ax.legend(fontsize=11)
    ax.grid(alpha=0.3)
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))
    ax.xaxis.set_major_locator(mdates.MonthLocator(interval=2))
    fig.autofmt_xdate()

    # 초기 자본금 기준선
    ax.axhline(y=1.0, color="gray", linestyle=":", alpha=0.5)

    plt.tight_layout()
    out = BACKTEST_DIR / "equity_curve.png"
    fig.savefig(str(out), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[SAVED] {out}")


def plot_drawdown(eq_topn: pd.DataFrame) -> None:
    """드로다운 차트."""
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 8), height_ratios=[2, 1])

    dates = eq_topn["date"]
    values = eq_topn["portfolio_value"]

    # 에쿼티 커브
    ax1.fill_between(dates, values / 1e8, alpha=0.3, color="#e74c3c")
    ax1.plot(dates, values / 1e8, linewidth=1.5, color="#e74c3c")
    ax1.set_ylabel("자산 (억원)", fontsize=11)
    ax1.set_title("Top-10 전략 에쿼티 커브 및 드로다운", fontsize=14, fontweight="bold")
    ax1.grid(alpha=0.3)

    # 드로다운
    cummax = values.cummax()
    drawdown = (values - cummax) / cummax * 100
    ax2.fill_between(dates, drawdown, alpha=0.4, color="#e74c3c")
    ax2.plot(dates, drawdown, linewidth=1, color="#c0392b")
    ax2.set_ylabel("드로다운 (%)", fontsize=11)
    ax2.set_xlabel("날짜", fontsize=11)
    ax2.grid(alpha=0.3)
    mdd = drawdown.min()
    ax2.axhline(y=mdd, color="red", linestyle="--", alpha=0.5, label=f"MDD {mdd:.2f}%")
    ax2.legend(fontsize=9)

    for ax in [ax1, ax2]:
        ax.xaxis.set_major_formatter(mdates.DateFormatter("%Y-%m"))
        ax.xaxis.set_major_locator(mdates.MonthLocator(interval=2))

    fig.autofmt_xdate()
    plt.tight_layout()
    out = BACKTEST_DIR / "drawdown.png"
    fig.savefig(str(out), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[SAVED] {out}")


def plot_monthly_returns(eq_topn: pd.DataFrame) -> None:
    """월별 수익률 바 차트."""
    df = eq_topn.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date")

    # 월말 값으로 리샘플링
    monthly = df["portfolio_value"].resample("ME").last()
    monthly_returns = monthly.pct_change().dropna() * 100

    fig, ax = plt.subplots(figsize=(12, 5))
    colors = ["#2ecc71" if r >= 0 else "#e74c3c" for r in monthly_returns]
    labels = [d.strftime("%Y-%m") for d in monthly_returns.index]

    bars = ax.bar(range(len(monthly_returns)), monthly_returns.values, color=colors, alpha=0.8)
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, rotation=45, ha="right", fontsize=10)
    ax.set_ylabel("수익률 (%)", fontsize=12)
    ax.set_title("월별 수익률 (Top-10 전략)", fontsize=14, fontweight="bold")
    ax.axhline(y=0, color="gray", linestyle="-", alpha=0.3)
    ax.grid(axis="y", alpha=0.3)

    for bar, val in zip(bars, monthly_returns.values):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.2,
                f"{val:.1f}%", ha="center", va="bottom", fontsize=9, fontweight="bold")

    plt.tight_layout()
    out = BACKTEST_DIR / "monthly_returns.png"
    fig.savefig(str(out), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[SAVED] {out}")


def plot_trade_analysis(trades: pd.DataFrame) -> None:
    """거래 분석 (매도 사유, 수익 분포)."""
    sell_trades = trades[trades["action"] == "SELL"].copy()
    if sell_trades.empty:
        return

    fig, axes = plt.subplots(1, 3, figsize=(18, 5))

    # 1. 매도 사유 파이차트
    ax = axes[0]
    reasons = sell_trades["reason"].apply(lambda x: x.split(" ")[0])
    reason_counts = reasons.value_counts()
    colors_pie = ["#3498db", "#e74c3c", "#f39c12", "#2ecc71", "#95a5a6"]
    ax.pie(reason_counts.values, labels=reason_counts.index, autopct="%1.1f%%",
           colors=colors_pie[:len(reason_counts)], startangle=90)
    ax.set_title("매도 사유 분포", fontsize=13, fontweight="bold")

    # 2. 거래당 수익률 분포
    ax = axes[1]
    returns = sell_trades["return"] * 100
    ax.hist(returns, bins=50, alpha=0.7, color="#3498db", edgecolor="white")
    ax.axvline(x=0, color="red", linestyle="--", alpha=0.7)
    ax.axvline(x=returns.mean(), color="green", linestyle="--", alpha=0.7,
               label=f"평균: {returns.mean():.2f}%")
    ax.set_xlabel("수익률 (%)", fontsize=11)
    ax.set_ylabel("빈도", fontsize=11)
    ax.set_title("거래당 수익률 분포", fontsize=13, fontweight="bold")
    ax.legend()
    ax.grid(alpha=0.3)

    # 3. 매도 사유별 평균 수익률
    ax = axes[2]
    sell_trades["reason_key"] = sell_trades["reason"].apply(lambda x: x.split(" ")[0])
    reason_returns = sell_trades.groupby("reason_key")["return"].mean() * 100
    reason_returns = reason_returns.sort_values()
    colors_bar = ["#e74c3c" if v < 0 else "#2ecc71" for v in reason_returns.values]
    bars = ax.barh(range(len(reason_returns)), reason_returns.values, color=colors_bar, alpha=0.8)
    ax.set_yticks(range(len(reason_returns)))
    ax.set_yticklabels(reason_returns.index, fontsize=11)
    ax.set_xlabel("평균 수익률 (%)", fontsize=11)
    ax.set_title("매도 사유별 평균 수익률", fontsize=13, fontweight="bold")
    ax.axvline(x=0, color="gray", linestyle="-", alpha=0.3)
    ax.grid(axis="x", alpha=0.3)

    for bar, val in zip(bars, reason_returns.values):
        ax.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height() / 2,
                f"{val:.2f}%", va="center", fontsize=10, fontweight="bold")

    plt.tight_layout()
    out = BACKTEST_DIR / "trade_analysis.png"
    fig.savefig(str(out), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[SAVED] {out}")


def main() -> None:
    print("=" * 50)
    print("  백테스트 결과 시각화")
    print("=" * 50)

    eq_topn, eq_thresh, trades, kospi = load_data()

    plot_equity_curve(eq_topn, eq_thresh, kospi)
    plot_drawdown(eq_topn)
    plot_monthly_returns(eq_topn)
    plot_trade_analysis(trades)

    print(f"\n[완료] 모든 차트가 {BACKTEST_DIR} 에 저장되었습니다.")


if __name__ == "__main__":
    main()
