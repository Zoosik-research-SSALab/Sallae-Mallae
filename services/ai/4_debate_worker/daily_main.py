from __future__ import annotations

import argparse
import signal
import sys
import threading
from datetime import date

from core.config import settings
from core.logger import logger
from worker.daily_orchestrator import DailyAutomationOptions, DailyAutomationRunner, PortfolioScriptRunner
from worker.pipeline_signal_store import PipelineSignalStore
from worker.runtime import build_runtime


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="뉴스 → 토론 → 포트폴리오 일일 자동화 오케스트레이터")
    parser.add_argument("--once", action="store_true", help="한 번만 점검하고 종료합니다.")
    parser.add_argument("--report-date", type=date.fromisoformat, default=None, help="강제 실행 기준일 (YYYY-MM-DD)")
    parser.add_argument("--source", default=settings.TARGET_SOURCE, help="토론 대상 조회 source")
    parser.add_argument("--market-type", default=settings.TARGET_MARKET_TYPE, help="시장 구분")
    parser.add_argument("--portfolio-id", type=int, default=settings.TARGET_PORTFOLIO_ID, help="토론 대상용 포트폴리오 ID")
    parser.add_argument("--max-targets", type=int, default=settings.MAX_TARGETS_PER_RUN, help="회차당 최대 대상 수")
    parser.add_argument("--loop-interval-seconds", type=int, default=settings.PIPELINE_POLL_INTERVAL_SECONDS, help="신호 점검 주기")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    stop_event = threading.Event()
    runtime = build_runtime(stop_event=stop_event)

    signal_store = PipelineSignalStore(settings.ai_db_url)
    portfolio_runner = PortfolioScriptRunner(
        python_executable=sys.executable,
        working_directory=str(settings.worker_root),
    )
    orchestrator = DailyAutomationRunner(
        signal_store=signal_store,
        debate_runner=runtime.day_runner,
        portfolio_runner=portfolio_runner,
        stop_event=stop_event,
    )

    def handle_shutdown(signum: int, _frame) -> None:
        logger.info("종료 시그널 수신 | signal=%s | 현재 단계 완료 후 종료합니다.", signum)
        orchestrator.request_shutdown()

    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    options = DailyAutomationOptions(
        report_date=args.report_date,
        source=args.source,
        market_type=args.market_type,
        portfolio_id=args.portfolio_id,
        max_targets=args.max_targets,
        continuous=not args.once,
        loop_interval_seconds=args.loop_interval_seconds,
        debate_version=settings.DEBATE_VERSION,
        news_limit=settings.NEWS_LIMIT,
        financial_limit=settings.FINANCIAL_LIMIT,
        lease_seconds=settings.JOB_LEASE_SECONDS,
        max_retry_attempts=settings.MAX_RETRY_ATTEMPTS,
        retry_backoff_seconds=settings.RETRY_BACKOFF_SECONDS,
        stage_max_failures=settings.PIPELINE_STAGE_MAX_FAILURES,
        portfolio_script_path=str(settings.portfolio_script_path),
        portfolio_name=settings.PORTFOLIO_NAME,
        portfolio_model_version=settings.PORTFOLIO_MODEL_VERSION,
        portfolio_initial_capital=settings.PORTFOLIO_INITIAL_CAPITAL,
    )

    logger.info(
        "일일 자동화 시작 | worker=%s | continuous=%s | portfolio_script=%s",
        settings.WORKER_NAME,
        options.continuous,
        options.portfolio_script_path,
    )
    orchestrator.run(options)


if __name__ == "__main__":
    main()
