from __future__ import annotations

import argparse
import json
from datetime import date, timedelta
from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from core.config import SessionLocal
from domains.signal.chairman_portfolio_builder import ChairmanPortfolioBuilder
from domains.signal.chairman_portfolio_checkpoint import (
    build_run_id,
    checkpoint_path,
    load_checkpoint,
    now_iso,
    save_checkpoint,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="하루치 의장 토론 결과를 현재 포트폴리오 상태에 반영합니다.")
    parser.add_argument("--report-date", required=True, help="반영할 기준일 (YYYY-MM-DD)")
    parser.add_argument("--debate-version", default=None, help="특정 debate_version만 반영할 때 사용")
    parser.add_argument("--stock-id", type=int, action="append", dest="stock_ids", help="특정 종목만 반영할 때 사용 (여러 번 지정 가능)")
    parser.add_argument("--portfolio-name", default="의장 포트폴리오", help="생성/갱신할 포트폴리오 이름")
    parser.add_argument("--model-version", default="chairman-v1", help="파생 포트폴리오 model_version")
    parser.add_argument("--initial-capital", type=int, default=100_000_000, help="초기 투자금")
    parser.add_argument("--status-only", action="store_true", help="현재 체크포인트 상태만 출력하고 종료")
    return parser


def _print_checkpoint(payload: dict | None) -> None:
    print(json.dumps(payload or {"status": "missing"}, ensure_ascii=False, indent=2, sort_keys=True))


def main() -> int:
    args = build_parser().parse_args()
    report_date = date.fromisoformat(args.report_date)
    stock_ids = tuple(sorted(set(args.stock_ids or []))) or None
    run_id = build_run_id(
        args.portfolio_name,
        args.model_version,
        args.debate_version or "latest",
        "all" if not stock_ids else "-".join(str(item) for item in stock_ids),
    )
    progress_path = checkpoint_path(kind="daily", run_id=run_id)

    if args.status_only:
        _print_checkpoint(load_checkpoint(progress_path))
        return 0

    session = SessionLocal()
    try:
        builder = ChairmanPortfolioBuilder(
            session,
            portfolio_name=args.portfolio_name,
            model_version=args.model_version,
            initial_capital=args.initial_capital,
        )
        portfolio_id = builder.ensure_portfolio_row()
        checkpoint = load_checkpoint(progress_path) or {
            "kind": "daily",
            "run_id": run_id,
            "portfolio_id": portfolio_id,
            "portfolio_name": args.portfolio_name,
            "model_version": args.model_version,
            "initial_capital": args.initial_capital,
            "debate_version": args.debate_version,
            "stock_ids": list(stock_ids) if stock_ids else [],
            "last_completed_date": None,
            "last_requested_date": None,
            "status": "idle",
            "started_at": None,
            "last_updated": now_iso(),
            "finished_at": None,
            "error": None,
            "last_summary": None,
        }

        checkpoint["status"] = "running"
        checkpoint["last_requested_date"] = report_date.isoformat()
        checkpoint["started_at"] = checkpoint.get("started_at") or now_iso()
        checkpoint["last_updated"] = now_iso()
        checkpoint["finished_at"] = None
        checkpoint["error"] = None
        save_checkpoint(progress_path, checkpoint)

        last_record_date = builder.get_last_record_date(portfolio_id)
        if last_record_date is not None and last_record_date > report_date:
            checkpoint["status"] = "failed"
            checkpoint["error"] = (
                f"마지막 반영일({last_record_date})보다 이전 날짜({report_date})는 daily update로 처리할 수 없습니다. "
                "backfill 스크립트를 사용하세요."
            )
            checkpoint["last_updated"] = now_iso()
            save_checkpoint(progress_path, checkpoint)
            raise ValueError(checkpoint["error"])

        if last_record_date == report_date:
            checkpoint["status"] = "succeeded"
            checkpoint["last_completed_date"] = report_date.isoformat()
            checkpoint["finished_at"] = now_iso()
            checkpoint["last_updated"] = checkpoint["finished_at"]
            checkpoint["error"] = None
            checkpoint["last_summary"] = {
                "portfolio_id": portfolio_id,
                "report_date": report_date.isoformat(),
                "status": "already_applied",
            }
            save_checkpoint(progress_path, checkpoint)
            _print_checkpoint(checkpoint)
            return 0

        start_date = report_date if last_record_date is None else (last_record_date + timedelta(days=1))
        replay_dates = builder.list_replay_dates(
            start_date=start_date,
            end_date=report_date,
            debate_version=args.debate_version,
            stock_ids=stock_ids,
        )
        if not replay_dates:
            checkpoint["status"] = "failed"
            checkpoint["error"] = (
                f"{start_date} ~ {report_date} 구간에 replay 가능한 의장 토론 결과가 없습니다."
            )
            checkpoint["last_updated"] = now_iso()
            save_checkpoint(progress_path, checkpoint)
            raise ValueError(checkpoint["error"])

        if replay_dates[-1] != report_date:
            checkpoint["status"] = "failed"
            checkpoint["error"] = (
                f"목표 날짜({report_date})의 의장 토론 결과가 없어 daily update를 완료할 수 없습니다. "
                f"현재 마지막 replay 가능 날짜는 {replay_dates[-1]} 입니다."
            )
            checkpoint["last_updated"] = now_iso()
            save_checkpoint(progress_path, checkpoint)
            raise ValueError(checkpoint["error"])

        summary = None
        inserted_trades_total = 0
        for replay_date in replay_dates:
            summary = builder.append_daily(
                report_date=replay_date,
                debate_version=args.debate_version,
                stock_ids=stock_ids,
            )
            inserted_trades_total += summary.inserted_trades

        assert summary is not None
        checkpoint["status"] = "succeeded"
        checkpoint["last_completed_date"] = report_date.isoformat()
        checkpoint["finished_at"] = now_iso()
        checkpoint["last_updated"] = checkpoint["finished_at"]
        checkpoint["error"] = None
        checkpoint["last_summary"] = {
            "portfolio_id": summary.portfolio_id,
            "report_date": report_date.isoformat(),
            "processed_dates": len(replay_dates),
            "replayed_dates": [item.isoformat() for item in replay_dates],
            "inserted_trades": inserted_trades_total,
            "final_holdings": summary.final_holdings,
            "cumulative_return": round(summary.cumulative_return, 6),
            "total_trades": summary.total_trades,
            "winning_trades": summary.winning_trades,
        }
        save_checkpoint(progress_path, checkpoint)
        _print_checkpoint(checkpoint)
        return 0
    except Exception as exc:
        session.rollback()
        checkpoint = load_checkpoint(progress_path) or {
            "kind": "daily",
            "run_id": run_id,
            "status": "failed",
        }
        checkpoint["status"] = "failed"
        checkpoint["error"] = str(exc)
        checkpoint["last_updated"] = now_iso()
        save_checkpoint(progress_path, checkpoint)
        raise
    finally:
        session.close()


if __name__ == "__main__":
    raise SystemExit(main())
