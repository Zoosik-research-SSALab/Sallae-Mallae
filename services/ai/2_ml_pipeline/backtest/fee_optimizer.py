"""
backtest/fee_optimizer.py
수수료 최적화 실험 스크립트.

보유 기간, 포트폴리오 집중도, 증권사 수수료 구조를 변화시켜
거래 비용이 수익률에 미치는 영향을 분석합니다.

실험 그룹:
    1. 보유 기간 스윕 (max_hold_days): 긴 보유 → 거래 횟수 감소 → 수수료 절감
    2. Top-N 스윕 (top_n): 집중 투자 vs 분산 투자 비교
    3. 증권사 수수료 비교: 토스증권 vs 저수수료 브로커 가상 시나리오

사용법:
    python backtest/fee_optimizer.py
"""

from __future__ import annotations

import json
import sys
from dataclasses import asdict
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import BACKTEST_PATH
from backtest.portfolio_simulator import PortfolioSimulator, StrategyConfig
from utils.logger import setup_logger

logger = setup_logger(__name__)

# ---------------------------------------------------------------------------
# 공통 백테스트 기간
# ---------------------------------------------------------------------------
_COMMON = dict(
    train_end_date="2024-12-31",
    backtest_start="2025-01-01",
    backtest_end="2026-01-31",
)


# ---------------------------------------------------------------------------
# 실험 그룹 정의
# ---------------------------------------------------------------------------

def _hold_period_experiments() -> list[tuple[str, StrategyConfig]]:
    """보유 기간 스윕 실험 (max_hold_days 변화)."""
    configs = []
    for days in [3, 5, 7, 10, 15, 20]:
        label = f"hold_{days}d"
        cfg = StrategyConfig(max_hold_days=days, **_COMMON)
        configs.append((label, cfg))
    return configs


def _top_n_experiments() -> list[tuple[str, StrategyConfig]]:
    """Top-N 스윕 실험 (포트폴리오 집중도 변화)."""
    configs = []
    for n in [3, 5, 10, 15]:
        label = f"top_{n}"
        cfg = StrategyConfig(top_n=n, **_COMMON)
        configs.append((label, cfg))
    return configs


def _commission_experiments() -> list[tuple[str, StrategyConfig]]:
    """증권사 수수료 비교 실험."""
    scenarios = [
        # (설명, 매수수수료, 매도수수료)
        ("토스증권 (현행)",     0.00015, 0.00215),
        ("저수수료 브로커 A",   0.0001,  0.0015),
        ("저수수료 브로커 B",   0.0,     0.001),
    ]
    configs = []
    for label, buy_fee, sell_fee in scenarios:
        cfg = StrategyConfig(
            buy_commission=buy_fee,
            sell_commission=sell_fee,
            **_COMMON,
        )
        configs.append((label, cfg))
    return configs


# ---------------------------------------------------------------------------
# 실험 실행 및 결과 수집
# ---------------------------------------------------------------------------

def _run_experiment(label: str, cfg: StrategyConfig) -> dict:
    """단일 설정으로 백테스트를 실행하고 핵심 지표를 반환합니다."""
    logger.info("실험 실행: %s", label)
    simulator = PortfolioSimulator(cfg)
    result = simulator.run()

    perf = result.get("performance", {})
    trades = result.get("trades", {})

    total_return = perf.get("total_return", 0.0)
    total_commission = trades.get("total_commission", 0.0)
    initial_capital = cfg.initial_capital

    # 수수료 영향 계산: 수수료가 없었다면의 총 자산 추정
    final_value = perf.get("final_value", initial_capital)
    gross_value = final_value + total_commission
    gross_return = (gross_value - initial_capital) / initial_capital
    fee_impact = gross_return - total_return  # 수수료로 인한 수익률 손실

    return {
        "label": label,
        "config": {
            "max_hold_days": cfg.max_hold_days,
            "top_n": cfg.top_n,
            "buy_commission": cfg.buy_commission,
            "sell_commission": cfg.sell_commission,
        },
        "total_return": round(total_return, 6),
        "annual_return": round(perf.get("annual_return", 0.0), 6),
        "sharpe": round(perf.get("sharpe_ratio", 0.0), 4),
        "mdd": round(perf.get("max_drawdown", 0.0), 6),
        "total_trades": trades.get("total_trades", 0),
        "win_rate": round(trades.get("win_rate", 0.0), 4),
        "total_commission": round(total_commission, 0),
        "gross_return": round(gross_return, 6),
        "net_return": round(total_return, 6),
        "fee_impact": round(fee_impact, 6),
    }


def _run_group(
    group_name: str,
    experiments: list[tuple[str, StrategyConfig]],
) -> list[dict]:
    """실험 그룹 전체를 실행하고 결과 목록을 반환합니다."""
    results = []
    for label, cfg in experiments:
        try:
            row = _run_experiment(label, cfg)
        except Exception as exc:
            logger.warning("실험 실패 [%s]: %s", label, exc)
            row = {"label": label, "error": str(exc)}
        results.append(row)
    return results


# ---------------------------------------------------------------------------
# 결과 출력
# ---------------------------------------------------------------------------

def _print_table(group_name: str, rows: list[dict]) -> None:
    """실험 그룹 결과를 포맷된 테이블로 출력합니다."""
    print(f"\n{'=' * 70}")
    print(f"  {group_name}")
    print(f"{'=' * 70}")

    header = (
        f"{'설명':<22} {'순수익률':>9} {'총수익률':>9} "
        f"{'샤프':>6} {'MDD':>8} {'거래수':>6} "
        f"{'수수료(원)':>12} {'수수료손실':>10}"
    )
    print(header)
    print("-" * 70)

    for r in rows:
        if "error" in r:
            print(f"  {r['label']:<20} ERROR: {r['error']}")
            continue
        print(
            f"  {r['label']:<20} "
            f"{r['net_return']:>8.2%} "
            f"{r['gross_return']:>8.2%} "
            f"{r['sharpe']:>6.2f} "
            f"{r['mdd']:>7.2%} "
            f"{r['total_trades']:>6d} "
            f"{r['total_commission']:>12,.0f} "
            f"{r['fee_impact']:>9.2%}"
        )

    # 최적 설정 강조
    valid = [r for r in rows if "error" not in r]
    if valid:
        best = max(valid, key=lambda x: x["net_return"])
        print(f"\n  ★ 최적 설정: {best['label']}  (순수익률 {best['net_return']:.2%})")


# ---------------------------------------------------------------------------
# 결과 저장
# ---------------------------------------------------------------------------

def _save_results(all_results: dict) -> None:
    """실험 결과를 JSON 파일로 저장합니다."""
    BACKTEST_PATH.mkdir(parents=True, exist_ok=True)
    today = date.today().strftime("%Y%m%d")
    output_path = BACKTEST_PATH / f"fee_optimization_{today}.json"

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(all_results, f, ensure_ascii=False, indent=2)

    logger.info("결과 저장 완료: %s", output_path)
    print(f"\n결과 저장: {output_path}")


# ---------------------------------------------------------------------------
# 진입점
# ---------------------------------------------------------------------------

def main() -> None:
    """수수료 최적화 실험 전체를 실행합니다."""
    print("=" * 70)
    print("  수수료 최적화 실험 시작")
    print("=" * 70)

    all_results: dict[str, list[dict]] = {}

    # 1. 보유 기간 스윕
    print("\n[1/3] 보유 기간 스윕 실험...")
    hold_results = _run_group("보유 기간 스윕", _hold_period_experiments())
    _print_table("보유 기간 스윕 (max_hold_days)", hold_results)
    all_results["hold_period_sweep"] = hold_results

    # 2. Top-N 스윕
    print("\n[2/3] Top-N 스윕 실험...")
    topn_results = _run_group("Top-N 스윕", _top_n_experiments())
    _print_table("Top-N 스윕 (포트폴리오 집중도)", topn_results)
    all_results["top_n_sweep"] = topn_results

    # 3. 증권사 수수료 비교
    print("\n[3/3] 증권사 수수료 비교 실험...")
    fee_results = _run_group("증권사 수수료 비교", _commission_experiments())
    _print_table("증권사 수수료 비교", fee_results)
    all_results["commission_comparison"] = fee_results

    # 결과 저장
    _save_results(all_results)

    print("\n수수료 최적화 실험 완료.")


if __name__ == "__main__":
    main()
