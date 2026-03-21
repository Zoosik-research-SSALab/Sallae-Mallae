from __future__ import annotations

import argparse
import json
from datetime import date
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
    parser = argparse.ArgumentParser(description="의장 토론 결과를 기간 단위로 replay하여 포트폴리오를 재생성합니다.")
    parser.add_argument("--start-date", required=True, help="백필 시작일 (YYYY-MM-DD)")
    parser.add_argument("--end-date", required=True, help="백필 종료일 (YYYY-MM-DD)")
    parser.add_argument("--debate-version", default=None, help="특정 debate_version만 replay할 때 사용")
    parser.add_argument("--stock-id", type=int, action="append", dest="stock_ids", help="특정 종목만 replay할 때 사용 (여러 번 지정 가능)")
    parser.add_argument("--portfolio-name", default="의장 포트폴리오", help="생성/갱신할 포트폴리오 이름")
    parser.add_argument("--model-version", default="chairman-v1", help="파생 포트폴리오 model_version")
    parser.add_argument("--initial-capital", type=int, default=100_000_000, help="초기 투자금")
    parser.add_argument("--reset", action="store_true", help="기존 체크포인트와 포트폴리오 결과를 초기화하고 처음부터 다시 실행")
    parser.add_argument("--status-only", action="store_true", help="현재 체크포인트 상태만 출력하고 종료")
    return parser


def _print_checkpoint(payload: dict | None) -> None:
    print(json.dumps(payload or {"status": "missing"}, ensure_ascii=False, indent=2, sort_keys=True))


def _build_backfill_checkpoint(
    *,
    run_id: str,
    portfolio_id: int,
    start_date: date,
    end_date: date,
    debate_version: str | None,
    stock_ids: tuple[int, ...] | None,
    model_version: str,
    portfolio_name: str,
    initial_capital: int,
    replay_dates: list[date],
) -> dict:
    timestamp = now_iso()
    return {
        "kind": "backfill",
        "run_id": run_id,
        "status": "running",
        "portfolio_id": portfolio_id,
        "portfolio_name": portfolio_name,
        "model_version": model_version,
        "initial_capital": initial_capital,
        "debate_version": debate_version,
        "stock_ids": list(stock_ids) if stock_ids else [],
        "requested_start_date": start_date.isoformat(),
        "requested_end_date": end_date.isoformat(),
        "replay_dates": [item.isoformat() for item in replay_dates],
        "total_dates": len(replay_dates),
        "processed_dates": 0,
        "last_completed_date": None,
        "current_date": None,
        "started_at": timestamp,
        "last_updated": timestamp,
        "finished_at": None,
        "error": None,
        "last_summary": None,
    }


def _sync_checkpoint_with_db(
    payload: dict,
    *,
    replay_dates: list[date],
    db_last_record_date: date | None,
) -> dict:
    if db_last_record_date is None:
        return payload

    checkpoint_last = payload.get("last_completed_date")
    checkpoint_last_date = date.fromisoformat(checkpoint_last) if checkpoint_last else None
    if checkpoint_last_date is not None and db_last_record_date <= checkpoint_last_date:
        return payload

    processed_dates = sum(1 for item in replay_dates if item <= db_last_record_date)
    payload["processed_dates"] = processed_dates
    payload["last_completed_date"] = db_last_record_date.isoformat()
    payload["current_date"] = None
    payload["last_updated"] = now_iso()
    payload["error"] = None
    if processed_dates == len(replay_dates):
        payload["status"] = "succeeded"
        payload["finished_at"] = payload.get("finished_at") or now_iso()
    return payload


def main() -> int:
    args = build_parser().parse_args()
    start_date = date.fromisoformat(args.start_date)
    end_date = date.fromisoformat(args.end_date)
    stock_ids = tuple(sorted(set(args.stock_ids or []))) or None
    if start_date > end_date:
        raise ValueError("start-date는 end-date보다 이후일 수 없습니다.")

    run_id = build_run_id(
        args.portfolio_name,
        args.model_version,
        args.debate_version or "latest",
        "all" if not stock_ids else "-".join(str(item) for item in stock_ids),
        start_date.isoformat(),
        end_date.isoformat(),
    )
    progress_path = checkpoint_path(kind="backfill", run_id=run_id)

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
        replay_dates = builder.list_replay_dates(
            start_date=start_date,
            end_date=end_date,
            debate_version=args.debate_version,
            stock_ids=stock_ids,
        )

        if args.reset and progress_path.exists():
            progress_path.unlink()

        checkpoint = load_checkpoint(progress_path)
        if checkpoint is None or args.reset:
            builder.reset_portfolio_state(portfolio_id)
            session.commit()
            checkpoint = _build_backfill_checkpoint(
                run_id=run_id,
                portfolio_id=portfolio_id,
                start_date=start_date,
                end_date=end_date,
                debate_version=args.debate_version,
                stock_ids=stock_ids,
                model_version=args.model_version,
                portfolio_name=args.portfolio_name,
                initial_capital=args.initial_capital,
                replay_dates=replay_dates,
            )
            save_checkpoint(progress_path, checkpoint)

        checkpoint = _sync_checkpoint_with_db(
            checkpoint,
            replay_dates=replay_dates,
            db_last_record_date=builder.get_last_record_date(portfolio_id),
        )
        save_checkpoint(progress_path, checkpoint)

        if not replay_dates:
            checkpoint["status"] = "succeeded"
            checkpoint["finished_at"] = now_iso()
            checkpoint["last_updated"] = checkpoint["finished_at"]
            checkpoint["last_summary"] = {
                "portfolio_id": portfolio_id,
                "processed_dates": 0,
                "inserted_trades": 0,
                "final_holdings": 0,
                "cumulative_return": 0.0,
                "total_trades": 0,
                "winning_trades": 0,
            }
            save_checkpoint(progress_path, checkpoint)
            _print_checkpoint(checkpoint)
            return 0

        completed_cutoff = checkpoint.get("last_completed_date")
        pending_dates = replay_dates
        if completed_cutoff:
            cutoff_date = date.fromisoformat(completed_cutoff)
            pending_dates = [item for item in replay_dates if item > cutoff_date]

        total_dates = len(replay_dates)
        for offset, report_date in enumerate(pending_dates, start=int(checkpoint["processed_dates"]) + 1):
            checkpoint["status"] = "running"
            checkpoint["current_date"] = report_date.isoformat()
            checkpoint["last_updated"] = now_iso()
            checkpoint["error"] = None
            save_checkpoint(progress_path, checkpoint)
            print(f"[backfill] {offset}/{total_dates} {report_date} 처리 시작")

            try:
                summary = builder.append_daily(
                    report_date=report_date,
                    debate_version=args.debate_version,
                    stock_ids=stock_ids,
                )
            except Exception as exc:
                session.rollback()
                checkpoint["status"] = "failed"
                checkpoint["error"] = str(exc)
                checkpoint["last_updated"] = now_iso()
                save_checkpoint(progress_path, checkpoint)
                raise

            checkpoint["processed_dates"] = offset
            checkpoint["last_completed_date"] = report_date.isoformat()
            checkpoint["current_date"] = None
            checkpoint["last_updated"] = now_iso()
            checkpoint["last_summary"] = {
                "portfolio_id": summary.portfolio_id,
                "processed_dates": summary.processed_dates,
                "inserted_trades": summary.inserted_trades,
                "final_holdings": summary.final_holdings,
                "cumulative_return": round(summary.cumulative_return, 6),
                "total_trades": summary.total_trades,
                "winning_trades": summary.winning_trades,
            }
            save_checkpoint(progress_path, checkpoint)
            print(
                "[backfill] 완료 | "
                f"date={report_date} cumulative_return={summary.cumulative_return:.2f} "
                f"total_trades={summary.total_trades} holdings={summary.final_holdings}"
            )

        checkpoint["status"] = "succeeded"
        checkpoint["finished_at"] = now_iso()
        checkpoint["last_updated"] = checkpoint["finished_at"]
        save_checkpoint(progress_path, checkpoint)
        _print_checkpoint(checkpoint)
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    raise SystemExit(main())
