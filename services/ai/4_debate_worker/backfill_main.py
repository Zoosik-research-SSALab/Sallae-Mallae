from __future__ import annotations

import argparse
import json
import signal
import threading
from datetime import date, datetime
from pathlib import Path

from core.config import settings
from core.logger import add_file_handler, logger
from worker.backfill_runner import BackfillOptions
from worker.runtime import build_runtime


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="GPU 서버용 토론 백필 워커")
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="기간 백필 실행")
    _add_shared_backfill_args(run_parser)

    report_parser = subparsers.add_parser("report", help="기간 진행 현황 리포트")
    _add_shared_backfill_args(report_parser)

    repair_parser = subparsers.add_parser("repair", help="실패 작업 수동 복구 큐잉")
    repair_parser.add_argument("--report-date", type=date.fromisoformat, required=True, help="복구할 날짜")
    repair_parser.add_argument("--source", default=settings.TARGET_SOURCE, help="대상 조회 source")
    repair_parser.add_argument("--portfolio-id", type=int, default=settings.TARGET_PORTFOLIO_ID, help="포트폴리오 ID")
    repair_parser.add_argument(
        "--statuses",
        nargs="+",
        default=["failed_permanent", "failed_retryable"],
        help="재큐잉할 상태 목록",
    )
    repair_parser.add_argument("--run-stock-id", nargs="*", type=int, default=None, help="특정 종목 필터 run_key를 대상으로 할 때 사용")
    repair_parser.add_argument("--stock-ids", nargs="*", type=int, default=None, help="특정 stock_id만 복구")
    repair_parser.add_argument(
        "--clear-result-payload",
        action="store_true",
        help="캐시된 토론 결과를 비우고 처음부터 다시 생성",
    )
    repair_parser.add_argument("--log-file", default=None, help="로그 파일 경로")

    return parser.parse_args()


def _add_shared_backfill_args(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--start-date", type=date.fromisoformat, required=True, help="백필 시작일 (YYYY-MM-DD)")
    parser.add_argument("--end-date", type=date.fromisoformat, default=date.today(), help="백필 종료일 (YYYY-MM-DD)")
    parser.add_argument("--source", default=settings.TARGET_SOURCE, help="대상 조회 source")
    parser.add_argument("--market-type", default=settings.TARGET_MARKET_TYPE, help="시장 구분")
    parser.add_argument("--portfolio-id", type=int, default=settings.TARGET_PORTFOLIO_ID, help="포트폴리오 ID")
    parser.add_argument("--stock-id", type=int, action="append", dest="stock_ids", help="특정 종목만 백필할 때 사용 (여러 번 지정 가능)")
    parser.add_argument("--max-targets", type=int, default=settings.MAX_TARGETS_PER_RUN, help="일자별 최대 대상 수")
    parser.add_argument("--poll-interval-seconds", type=int, default=settings.BACKFILL_POLL_INTERVAL_SECONDS, help="백필 패스 간격")
    parser.add_argument("--log-file", default=None, help="로그 파일 경로")


def build_backfill_options(args: argparse.Namespace) -> BackfillOptions:
    return BackfillOptions(
        start_date=args.start_date,
        end_date=args.end_date,
        source=args.source,
        market_type=args.market_type,
        portfolio_id=args.portfolio_id,
        stock_ids=tuple(sorted(set(args.stock_ids or []))) or None,
        max_targets=args.max_targets,
        debate_version=settings.DEBATE_VERSION,
        news_limit=settings.NEWS_LIMIT,
        financial_limit=settings.FINANCIAL_LIMIT,
        lease_seconds=settings.JOB_LEASE_SECONDS,
        max_retry_attempts=settings.MAX_RETRY_ATTEMPTS,
        retry_backoff_seconds=settings.RETRY_BACKOFF_SECONDS,
        poll_interval_seconds=args.poll_interval_seconds,
    )


def configure_logging(log_file: str | None, command: str) -> Path:
    default_path = settings.log_dir / f"{command}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
    resolved = Path(log_file).expanduser().resolve() if log_file else default_path.resolve()
    add_file_handler(resolved)
    logger.info("파일 로그 활성화 | path=%s", resolved)
    return resolved


def main() -> None:
    args = parse_args()
    stop_event = threading.Event()
    runtime = build_runtime(stop_event=stop_event)
    configure_logging(getattr(args, "log_file", None), args.command)

    def handle_shutdown(signum: int, _frame) -> None:
        logger.info("종료 시그널 수신 | signal=%s | 현재 작업 완료 후 종료합니다.", signum)
        runtime.backfill_runner.request_shutdown()

    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    if args.command == "run":
        options = build_backfill_options(args)
        summary = runtime.backfill_runner.run(options)
        logger.info("백필 요약 | %s", json.dumps(summary.__dict__, ensure_ascii=False, default=str))
        return

    if args.command == "report":
        options = build_backfill_options(args)
        summary = runtime.backfill_runner.report(options)
        statuses = runtime.backfill_runner.get_daily_statuses(options)
        payload = {
            "summary": summary.__dict__,
            "dates": [status.__dict__ for status in statuses],
        }
        print(json.dumps(payload, ensure_ascii=False, default=str, indent=2))
        return

    if args.command == "repair":
        count = runtime.backfill_runner.requeue_failed_jobs(
            report_date=args.report_date,
            source=args.source,
            portfolio_id=args.portfolio_id,
            run_stock_ids=args.run_stock_id,
            statuses=args.statuses,
            stock_ids=args.stock_ids,
            clear_result_payload=args.clear_result_payload,
        )
        print(json.dumps({"updated_jobs": count}, ensure_ascii=False))
        return


if __name__ == "__main__":
    main()
