"""
backtest/regime_backtest.py
LSTM 포트폴리오 백테스트 — 시장 국면별(bear/bull/sideways) 성과 비교 스크립트.

KOSPI200 역사적 흐름 기준 4개 국면을 정의하고 각각 PortfolioSimulator를 실행한 뒤
비교 테이블 출력 및 JSON 저장.

사용법:
    python backtest/regime_backtest.py
"""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import BACKTEST_PATH
from backtest.portfolio_simulator import PortfolioSimulator, StrategyConfig
from utils.logger import setup_logger

logger = setup_logger(__name__)

# ---------------------------------------------------------------------------
# 시장 국면 정의
# (이름) -> (train_end, bt_start, bt_end, description)
# ---------------------------------------------------------------------------
REGIMES: dict[str, tuple[str, str, str, str]] = {
    "Bear 2022": (
        "2021-12-31",
        "2022-01-01",
        "2022-12-31",
        "금리인상+인플레 하락장",
    ),
    "Recovery 2023": (
        "2022-12-31",
        "2023-01-01",
        "2023-12-31",
        "점진적 회복 국면",
    ),
    "Bull 2024-2025": (
        "2023-12-31",
        "2024-01-01",
        "2025-06-30",
        "강세장",
    ),
    "Full Period": (
        "2021-12-31",
        "2022-01-01",
        "2026-01-31",
        "전체 기간",
    ),
}


def _run_regime(name: str, train_end: str, bt_start: str, bt_end: str) -> dict:
    """단일 국면 백테스트 실행 후 결과 dict 반환."""
    logger.info(f"[{name}] 백테스트 시작: {bt_start} ~ {bt_end} (train_end={train_end})")

    cfg = StrategyConfig(
        train_end_date=train_end,
        backtest_start=bt_start,
        backtest_end=bt_end,
        initial_capital=100_000_000,
        selection_mode="top_n",
        top_n=10,
        stop_loss=-0.03,
        take_profit=0.07,
        model_exit_threshold=0.45,
        max_hold_days=5,
    )

    simulator = PortfolioSimulator(cfg)
    result = simulator.run()
    logger.info(f"[{name}] 백테스트 완료")
    return result


def _format_table(rows: list[dict]) -> str:
    """비교 결과를 고정폭 텍스트 테이블로 포맷."""
    header = (
        f"{'국면':<20} {'기간':<24} {'총수익률':>10} {'연환산':>10} "
        f"{'샤프':>7} {'MDD':>8} {'승률':>7} {'거래수':>7}"
    )
    sep = "-" * len(header)
    lines = [sep, header, sep]
    for r in rows:
        perf = r.get("performance", {})
        trades = r.get("trades", {})
        period = r.get("period", {})
        bt_start = period.get("start", period.get("backtest_start", ""))
        bt_end = period.get("end", period.get("backtest_end", ""))
        lines.append(
            f"{r['name']:<20} {bt_start} ~ {bt_end:<10} "
            f"{perf.get('total_return', 0):>9.2%} "
            f"{perf.get('annual_return', 0):>9.2%} "
            f"{perf.get('sharpe_ratio', 0):>7.2f} "
            f"{perf.get('max_drawdown', 0):>7.2%} "
            f"{trades.get('win_rate', 0):>6.2%} "
            f"{trades.get('total_trades', 0):>7d}"
        )
    lines.append(sep)
    return "\n".join(lines)


def main() -> None:
    """국면별 백테스트 실행 및 결과 비교."""
    all_rows: list[dict] = []

    for name, (train_end, bt_start, bt_end, desc) in REGIMES.items():
        logger.info(f"===== 국면: {name} - {desc} =====")
        try:
            result = _run_regime(name, train_end, bt_start, bt_end)
            result["name"] = name
            result["description"] = desc
            all_rows.append(result)
        except Exception as exc:
            logger.error(f"[{name}] 실행 실패: {exc}", exc_info=True)
            all_rows.append(
                {
                    "name": name,
                    "description": desc,
                    "error": str(exc),
                    "period": {"backtest_start": bt_start, "backtest_end": bt_end},
                    "performance": {},
                    "trades": {},
                }
            )

    # 비교 테이블 출력
    print("\n" + "=" * 80)
    print("LSTM 포트폴리오 - 시장 국면별 성과 비교")
    print("=" * 80)
    print(_format_table(all_rows))

    # JSON 저장
    BACKTEST_PATH.mkdir(parents=True, exist_ok=True)
    today = date.today().strftime("%Y%m%d")
    out_path = BACKTEST_PATH / f"regime_comparison_{today}.json"

    # daily_snapshots / trade_log 는 용량이 크므로 요약 저장에서 제외
    summary_rows = [
        {k: v for k, v in row.items() if k not in ("daily_snapshots", "trade_log")}
        for row in all_rows
    ]

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(summary_rows, f, ensure_ascii=False, indent=2, default=str)

    logger.info(f"결과 저장 완료: {out_path}")


if __name__ == "__main__":
    main()
