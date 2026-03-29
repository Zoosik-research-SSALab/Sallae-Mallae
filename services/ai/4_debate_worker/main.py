from __future__ import annotations

import argparse
import signal
import threading
from datetime import date

from core.config import settings
from core.logger import logger
from worker.runner import DebateWorkerRunner, RunnerOptions
from worker.runtime import build_runtime


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="로컬 토론 배치 워커")
    parser.add_argument("--once", action="store_true", help="한 번만 실행하고 종료합니다.")
    parser.add_argument("--report-date", type=date.fromisoformat, default=None, help="배치 기준일 (YYYY-MM-DD)")
    parser.add_argument("--source", default=settings.TARGET_SOURCE, help="대상 조회 source")
    parser.add_argument("--market-type", default=settings.TARGET_MARKET_TYPE, help="시장 구분")
    parser.add_argument("--portfolio-id", type=int, default=settings.TARGET_PORTFOLIO_ID, help="포트폴리오 ID")
    parser.add_argument("--max-targets", type=int, default=settings.MAX_TARGETS_PER_RUN, help="회차당 최대 대상 수")
    parser.add_argument("--loop-interval-seconds", type=int, default=settings.LOOP_INTERVAL_SECONDS, help="반복 실행 간격")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    stop_event = threading.Event()
    runtime = build_runtime(stop_event=stop_event)
    runner: DebateWorkerRunner = runtime.day_runner

    def handle_shutdown(signum: int, _frame) -> None:
        logger.info("종료 시그널 수신 | signal=%s | 현재 작업 완료 후 종료합니다.", signum)
        runner.request_shutdown()

    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    options = RunnerOptions(
        report_date=args.report_date,
        source=args.source,
        market_type=args.market_type,
        portfolio_id=args.portfolio_id,
        stock_ids=None,
        max_targets=args.max_targets,
        continuous=not args.once,
        loop_interval_seconds=args.loop_interval_seconds,
        debate_version=settings.DEBATE_VERSION,
        news_limit=settings.NEWS_LIMIT,
        financial_limit=settings.FINANCIAL_LIMIT,
        lease_seconds=settings.JOB_LEASE_SECONDS,
        max_retry_attempts=settings.MAX_RETRY_ATTEMPTS,
        retry_backoff_seconds=settings.RETRY_BACKOFF_SECONDS,
    )
    logger.info("토론 워커 시작 | worker=%s | continuous=%s", settings.WORKER_NAME, options.continuous)
    runner.run(options)


if __name__ == "__main__":
    main()
