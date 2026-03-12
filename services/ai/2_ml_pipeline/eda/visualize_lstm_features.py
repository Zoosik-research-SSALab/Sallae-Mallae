"""
eda/visualize_lstm_features.py
LSTM 피처 분포 시각화 및 예측력 분석.

S14P21D208-140: LSTM 피처 분포 시각화 및 예측력 분석

출력:
  eda/output/
    01_feature_distribution_by_cluster.png   — 클러스터별 피처 분포 (KDE)
    02_feature_distribution_by_target.png    — 타겟별 피처 분포 비교
    03_clipping_effect.png                   — 정규화 전후 비교
    04_nan_ratio.png                         — 피처별 NaN 비율
    05_ks_statistics.png                     — KS 통계량 (예측력 정량 지표)
    feature_analysis_summary.txt             — 분석 요약 텍스트
"""

from __future__ import annotations

import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")

import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import numpy as np
from scipy import stats

# 한글 폰트 설정
plt.rcParams["font.family"] = "Malgun Gothic"
plt.rcParams["axes.unicode_minus"] = False

# ---------------------------------------------------------------------------
# 경로 설정
# ---------------------------------------------------------------------------
_THIS_DIR = Path(__file__).resolve().parent
_PROJECT_DIR = _THIS_DIR.parent
sys.path.insert(0, str(_PROJECT_DIR))

from config import PROCESSED_LSTM_PATH, RAW_OHLCV_PATH, RAW_SUPPLY_PATH, RAW_MACRO_PATH

OUTPUT_DIR = _THIS_DIR / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

FEATURE_NAMES = [
    "daily_return",
    "volume_change_ratio",
    "high_low_range",
    "foreign_net_buy_change",
    "relative_return",
]

FEATURE_LABELS_KR = [
    "일별 수익률 (%)",
    "거래량 변화율",
    "고저 변동폭 (%)",
    "외인 순매수 변화율",
    "KOSPI200 대비 상대수익률",
]

CLUSTER_NAMES = ["cluster1", "cluster2", "cluster3"]
CLUSTER_LABELS = [
    "Cluster1 (Tech/Growth)",
    "Cluster2 (Finance/Credit)",
    "Cluster3 (Cyclical/etc)",
]
CLUSTER_COLORS = ["#e74c3c", "#3498db", "#2ecc71"]
TARGET_COLORS = {"up": "#e74c3c", "down": "#3498db"}


# ---------------------------------------------------------------------------
# 데이터 로드
# ---------------------------------------------------------------------------

def load_cluster_data(split: str = "train") -> dict[str, dict]:
    """클러스터별 NPZ 데이터를 로드합니다."""
    data = {}
    base_dir = PROCESSED_LSTM_PATH / split
    for cname in CLUSTER_NAMES:
        path = base_dir / f"sector_{cname}.npz"
        if not path.exists():
            print(f"[WARN] {path} 없음 — 건너뜀")
            continue
        npz = np.load(str(path), allow_pickle=True)
        data[cname] = {
            "X": npz["X"],
            "y": npz["y"],
            "tickers": npz["tickers"],
            "dates": npz["dates"],
        }
        print(f"[OK] {cname} ({split}): X={npz['X'].shape}, y={npz['y'].shape}")
    return data


def load_raw_features_sample(n_tickers: int = 10) -> dict[str, np.ndarray]:
    """정규화 전 원본 피처를 샘플링하여 로드합니다 (클리핑 효과 비교용)."""
    from features.build_lstm_sequences import compute_features, _load_kospi200

    kospi = _load_kospi200()
    import pandas as pd

    ohlcv_files = sorted(RAW_OHLCV_PATH.glob("*.parquet"))[:n_tickers]
    all_features = []

    for ohlcv_path in ohlcv_files:
        ticker = ohlcv_path.stem
        try:
            ohlcv_df = pd.read_parquet(ohlcv_path)
        except Exception:
            continue
        supply_path = RAW_SUPPLY_PATH / f"{ticker}.parquet"
        supply_df = pd.DataFrame()
        if supply_path.exists():
            try:
                supply_df = pd.read_parquet(supply_path)
            except Exception:
                pass
        feat = compute_features(ohlcv_df, supply_df, kospi)
        all_features.append(feat[FEATURE_NAMES].values)

    if not all_features:
        return {}
    combined = np.concatenate(all_features, axis=0)
    return {name: combined[:, i] for i, name in enumerate(FEATURE_NAMES)}


# ---------------------------------------------------------------------------
# 1. 클러스터별 피처 분포 (정규화 후)
# ---------------------------------------------------------------------------

def plot_feature_by_cluster(data: dict[str, dict]) -> None:
    fig, axes = plt.subplots(2, 3, figsize=(18, 10))
    axes = axes.flatten()

    for fi in range(5):
        ax = axes[fi]
        for ci, cname in enumerate(CLUSTER_NAMES):
            if cname not in data:
                continue
            X = data[cname]["X"]
            # 마지막 타임스텝의 피처값 사용 (NaN 제거)
            values = X[:, -1, fi].flatten()
            values = values[~np.isnan(values)]
            if len(values) == 0:
                continue
            ax.hist(
                values, bins=80, density=True, alpha=0.4,
                color=CLUSTER_COLORS[ci], label=CLUSTER_LABELS[ci],
            )
        ax.set_title(FEATURE_LABELS_KR[fi], fontsize=13, fontweight="bold")
        ax.set_ylabel("Density")
        ax.legend(fontsize=9)
        ax.grid(alpha=0.3)

    axes[5].axis("off")
    fig.suptitle("클러스터별 피처 분포 (정규화 후, 마지막 타임스텝)", fontsize=16, fontweight="bold")
    plt.tight_layout()
    out = OUTPUT_DIR / "01_feature_distribution_by_cluster.png"
    fig.savefig(str(out), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[SAVED] {out}")


# ---------------------------------------------------------------------------
# 2. 타겟별 피처 분포 비교
# ---------------------------------------------------------------------------

def plot_feature_by_target(data: dict[str, dict]) -> dict[str, dict]:
    """타겟별 분포를 그리고 KS 통계량을 반환합니다."""
    # 전체 데이터 합산
    all_X = np.concatenate([d["X"] for d in data.values()], axis=0)
    all_y = np.concatenate([d["y"] for d in data.values()], axis=0)

    ks_results = {}
    fig, axes = plt.subplots(2, 3, figsize=(18, 10))
    axes = axes.flatten()

    for fi in range(5):
        ax = axes[fi]
        values = all_X[:, -1, fi].flatten()
        up_mask = all_y == 1
        down_mask = all_y == 0

        up_vals = values[up_mask]
        down_vals = values[down_mask]
        up_vals = up_vals[~np.isnan(up_vals)]
        down_vals = down_vals[~np.isnan(down_vals)]

        if len(up_vals) == 0 or len(down_vals) == 0:
            ax.text(0.5, 0.5, "데이터 없음", transform=ax.transAxes, ha="center")
            continue

        ax.hist(up_vals, bins=80, density=True, alpha=0.5,
                color=TARGET_COLORS["up"], label=f"상승 (y=1, n={up_mask.sum():,})")
        ax.hist(down_vals, bins=80, density=True, alpha=0.5,
                color=TARGET_COLORS["down"], label=f"하락/횡보 (y=0, n={down_mask.sum():,})")

        # KS 통계량
        ks_stat, ks_pval = stats.ks_2samp(up_vals, down_vals)
        ks_results[FEATURE_NAMES[fi]] = {"ks_stat": ks_stat, "p_value": ks_pval}

        ax.set_title(f"{FEATURE_LABELS_KR[fi]}\nKS={ks_stat:.4f}, p={ks_pval:.2e}",
                      fontsize=12, fontweight="bold")
        ax.set_ylabel("Density")
        ax.legend(fontsize=9)
        ax.grid(alpha=0.3)

    axes[5].axis("off")
    fig.suptitle("타겟별 피처 분포 비교 (상승 vs 하락/횡보)", fontsize=16, fontweight="bold")
    plt.tight_layout()
    out = OUTPUT_DIR / "02_feature_distribution_by_target.png"
    fig.savefig(str(out), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[SAVED] {out}")

    return ks_results


# ---------------------------------------------------------------------------
# 3. 정규화 전후 비교 (클리핑 효과)
# ---------------------------------------------------------------------------

def plot_clipping_effect(raw_features: dict[str, np.ndarray], data: dict[str, dict]) -> None:
    if not raw_features:
        print("[SKIP] 원본 피처 로드 실패 — 클리핑 효과 차트 생략")
        return

    all_X = np.concatenate([d["X"] for d in data.values()], axis=0)

    fig, axes = plt.subplots(2, 5, figsize=(25, 8))

    for fi, fname in enumerate(FEATURE_NAMES):
        # 정규화 전
        ax_raw = axes[0, fi]
        raw_vals = raw_features[fname]
        raw_vals = raw_vals[np.isfinite(raw_vals)]
        if len(raw_vals) == 0:
            ax_raw.text(0.5, 0.5, "데이터 없음", transform=ax_raw.transAxes, ha="center")
            ax_raw.set_title(f"{FEATURE_LABELS_KR[fi]}\n(정규화 전)", fontsize=10, fontweight="bold")
            continue
        # 극단값 제거 (1~99 퍼센타일)
        p1, p99 = np.percentile(raw_vals, [1, 99])
        raw_vals = raw_vals[(raw_vals >= p1) & (raw_vals <= p99)]
        ax_raw.hist(raw_vals, bins=100, density=True, alpha=0.7, color="#95a5a6")
        ax_raw.set_title(f"{FEATURE_LABELS_KR[fi]}\n(정규화 전)", fontsize=10, fontweight="bold")
        if fi == 0:
            ax_raw.set_ylabel("Density")
        ax_raw.grid(alpha=0.3)

        # 정규화 후
        ax_norm = axes[1, fi]
        norm_vals = all_X[:, -1, fi].flatten()
        ax_norm.hist(norm_vals, bins=100, density=True, alpha=0.7, color="#2ecc71")
        ax_norm.set_title(f"(3σ 클리핑 + MinMax 후)", fontsize=10, fontweight="bold")
        if fi == 0:
            ax_norm.set_ylabel("Density")
        ax_norm.grid(alpha=0.3)

    fig.suptitle("정규화 전후 피처 분포 비교", fontsize=16, fontweight="bold")
    plt.tight_layout()
    out = OUTPUT_DIR / "03_clipping_effect.png"
    fig.savefig(str(out), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[SAVED] {out}")


# ---------------------------------------------------------------------------
# 4. NaN 비율 (정규화 전 원본 기준)
# ---------------------------------------------------------------------------

def plot_nan_ratio(raw_features: dict[str, np.ndarray]) -> dict[str, float]:
    if not raw_features:
        print("[SKIP] 원본 피처 로드 실패 — NaN 비율 차트 생략")
        return {}

    nan_ratios = {}
    for fname in FEATURE_NAMES:
        vals = raw_features[fname]
        ratio = np.isnan(vals).sum() / len(vals) if len(vals) > 0 else 0
        nan_ratios[fname] = ratio

    fig, ax = plt.subplots(figsize=(10, 5))
    x_pos = range(len(FEATURE_NAMES))
    colors = ["#e74c3c" if r > 0.1 else "#2ecc71" for r in nan_ratios.values()]
    bars = ax.bar(x_pos, [nan_ratios[f] * 100 for f in FEATURE_NAMES], color=colors, alpha=0.8)

    ax.set_xticks(x_pos)
    ax.set_xticklabels(FEATURE_LABELS_KR, rotation=20, ha="right", fontsize=11)
    ax.set_ylabel("NaN 비율 (%)", fontsize=12)
    ax.set_title("피처별 NaN 비율 (정규화 전 원본 기준)", fontsize=14, fontweight="bold")
    ax.axhline(y=10, color="red", linestyle="--", alpha=0.5, label="10% 기준선")
    ax.legend()
    ax.grid(axis="y", alpha=0.3)

    for bar, ratio in zip(bars, nan_ratios.values()):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.3,
                f"{ratio * 100:.1f}%", ha="center", va="bottom", fontsize=11, fontweight="bold")

    plt.tight_layout()
    out = OUTPUT_DIR / "04_nan_ratio.png"
    fig.savefig(str(out), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[SAVED] {out}")
    return nan_ratios


# ---------------------------------------------------------------------------
# 5. KS 통계량 요약 바 차트
# ---------------------------------------------------------------------------

def plot_ks_summary(ks_results: dict[str, dict]) -> None:
    fig, ax = plt.subplots(figsize=(10, 5))

    names = list(ks_results.keys())
    ks_vals = [ks_results[n]["ks_stat"] for n in names]
    p_vals = [ks_results[n]["p_value"] for n in names]

    colors = []
    for ks in ks_vals:
        if ks >= 0.05:
            colors.append("#e74c3c")   # 강한 신호
        elif ks >= 0.02:
            colors.append("#f39c12")   # 약한 신호
        else:
            colors.append("#95a5a6")   # 신호 없음

    bars = ax.barh(range(len(names)), ks_vals, color=colors, alpha=0.85)
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels(FEATURE_LABELS_KR, fontsize=11)
    ax.set_xlabel("KS Statistic", fontsize=12)
    ax.set_title("피처별 예측력 (KS Statistic: 상승 vs 하락/횡보)", fontsize=14, fontweight="bold")
    ax.axvline(x=0.05, color="red", linestyle="--", alpha=0.5, label="강한 신호 기준 (0.05)")
    ax.axvline(x=0.02, color="orange", linestyle="--", alpha=0.5, label="약한 신호 기준 (0.02)")
    ax.legend(fontsize=9)
    ax.grid(axis="x", alpha=0.3)

    for i, (bar, ks, pv) in enumerate(zip(bars, ks_vals, p_vals)):
        sig = "***" if pv < 0.001 else "**" if pv < 0.01 else "*" if pv < 0.05 else "ns"
        ax.text(bar.get_width() + 0.002, bar.get_y() + bar.get_height() / 2,
                f"{ks:.4f} ({sig})", va="center", fontsize=10, fontweight="bold")

    plt.tight_layout()
    out = OUTPUT_DIR / "05_ks_statistics.png"
    fig.savefig(str(out), dpi=150, bbox_inches="tight")
    plt.close(fig)
    print(f"[SAVED] {out}")


# ---------------------------------------------------------------------------
# 분석 요약
# ---------------------------------------------------------------------------

def write_summary(
    data: dict[str, dict],
    ks_results: dict[str, dict],
    nan_ratios: dict[str, float],
) -> None:
    lines = []
    lines.append("=" * 70)
    lines.append("  LSTM 피처 분포 시각화 및 예측력 분석 요약")
    lines.append("  S14P21D208-140")
    lines.append("=" * 70)

    # 데이터 규모
    lines.append("\n[1] 데이터 규모 (train)")
    total = 0
    for cname in CLUSTER_NAMES:
        if cname in data:
            n = data[cname]["X"].shape[0]
            total += n
            lines.append(f"  {cname}: {n:>8,} samples")
    lines.append(f"  {'합계':>10}: {total:>8,} samples")

    # 타겟 분포
    lines.append("\n[2] 타겟 분포 (train)")
    all_y = np.concatenate([d["y"] for d in data.values()])
    up_ratio = (all_y == 1).sum() / len(all_y)
    lines.append(f"  상승(y=1): {(all_y == 1).sum():>8,} ({up_ratio * 100:.1f}%)")
    lines.append(f"  하락(y=0): {(all_y == 0).sum():>8,} ({(1 - up_ratio) * 100:.1f}%)")

    # KS 통계량
    lines.append("\n[3] 피처별 예측력 (KS Statistic)")
    lines.append(f"  {'피처':<30} {'KS':>8} {'p-value':>12} {'판정':>8}")
    lines.append("  " + "-" * 62)
    for fname in FEATURE_NAMES:
        if fname in ks_results:
            ks = ks_results[fname]["ks_stat"]
            pv = ks_results[fname]["p_value"]
            if ks >= 0.05:
                verdict = "강함"
            elif ks >= 0.02:
                verdict = "약함"
            else:
                verdict = "없음"
            lines.append(f"  {fname:<30} {ks:>8.4f} {pv:>12.2e} {verdict:>8}")

    # NaN 비율
    if nan_ratios:
        lines.append("\n[4] 피처별 NaN 비율 (정규화 전)")
        for fname in FEATURE_NAMES:
            ratio = nan_ratios.get(fname, 0)
            flag = " *** 주의" if ratio > 0.1 else ""
            lines.append(f"  {fname:<30} {ratio * 100:>6.1f}%{flag}")

    # 결론
    lines.append("\n[5] 결론 및 권장사항")
    if ks_results:
        sorted_ks = sorted(ks_results.items(), key=lambda x: x[1]["ks_stat"], reverse=True)
        best = sorted_ks[0]
        worst = sorted_ks[-1]
        lines.append(f"  - 가장 예측력 높은 피처: {best[0]} (KS={best[1]['ks_stat']:.4f})")
        lines.append(f"  - 가장 예측력 낮은 피처: {worst[0]} (KS={worst[1]['ks_stat']:.4f})")
        if worst[1]["ks_stat"] < 0.01:
            lines.append(f"    -> {worst[0]} 피처 제거 또는 대체 검토 권장")

    lines.append("\n" + "=" * 70)

    summary_text = "\n".join(lines)
    out = OUTPUT_DIR / "feature_analysis_summary.txt"
    with open(str(out), "w", encoding="utf-8") as f:
        f.write(summary_text)
    print(f"\n[SAVED] {out}")
    print(summary_text)


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 50)
    print("  LSTM 피처 시각화 시작")
    print("=" * 50)

    # 1. 데이터 로드
    print("\n--- 학습 데이터 로드 ---")
    data = load_cluster_data("train")
    if not data:
        print("[ERROR] 데이터 로드 실패")
        return

    # 2. 원본 피처 로드 (클리핑 효과 비교용)
    print("\n--- 원본 피처 샘플 로드 ---")
    raw_features = load_raw_features_sample(n_tickers=30)

    # 3. 시각화 생성
    print("\n--- 차트 생성 ---")
    plot_feature_by_cluster(data)
    ks_results = plot_feature_by_target(data)
    plot_clipping_effect(raw_features, data)
    nan_ratios = plot_nan_ratio(raw_features)
    plot_ks_summary(ks_results)

    # 4. 요약 저장
    write_summary(data, ks_results, nan_ratios)

    print(f"\n[완료] 모든 차트가 {OUTPUT_DIR} 에 저장되었습니다.")


if __name__ == "__main__":
    main()
