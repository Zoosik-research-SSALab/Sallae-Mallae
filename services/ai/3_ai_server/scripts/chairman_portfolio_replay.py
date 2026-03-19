from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from core.config import SessionLocal
from domains.signal.chairman_portfolio_builder import ChairmanPortfolioBuilder


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="ai_debate_reports를 replay해서 의장 포트폴리오를 재생성합니다.")
    parser.add_argument("--start-date", required=True, help="백필 시작일 (YYYY-MM-DD)")
    parser.add_argument("--end-date", required=True, help="백필 종료일 (YYYY-MM-DD)")
    parser.add_argument("--debate-version", default=None, help="특정 debate_version만 replay할 때 사용")
    parser.add_argument("--portfolio-name", default="의장 포트폴리오", help="생성/갱신할 포트폴리오 이름")
    parser.add_argument("--model-version", default="chairman-v1", help="파생 포트폴리오 model_version")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    start_date = date.fromisoformat(args.start_date)
    end_date = date.fromisoformat(args.end_date)
    if start_date > end_date:
        raise ValueError("start-date는 end-date보다 이후일 수 없습니다.")

    session = SessionLocal()
    try:
        builder = ChairmanPortfolioBuilder(
            session,
            portfolio_name=args.portfolio_name,
            model_version=args.model_version,
        )
        summary = builder.rebuild(
            start_date=start_date,
            end_date=end_date,
            debate_version=args.debate_version,
        )
        print(
            "chairman portfolio replay complete | "
            f"portfolio_id={summary.portfolio_id} "
            f"processed_dates={summary.processed_dates} "
            f"inserted_trades={summary.inserted_trades} "
            f"final_holdings={summary.final_holdings} "
            f"cumulative_return={summary.cumulative_return:.2f} "
            f"total_trades={summary.total_trades} "
            f"winning_trades={summary.winning_trades}"
        )
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    raise SystemExit(main())
