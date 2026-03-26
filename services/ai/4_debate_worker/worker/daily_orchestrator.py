from __future__ import annotations

import subprocess
import sys
import threading
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from core.logger import logger
from worker.pipeline_signal_store import PipelineSignalStore
from worker.runner import DebateWorkerRunner, RunnerOptions


KST = ZoneInfo("Asia/Seoul")
FIXED_HOLIDAYS_MMDD: frozenset[str] = frozenset({
    "01-01",
    "03-01",
    "05-05",
    "06-06",
    "08-15",
    "10-03",
    "10-09",
    "12-25",
})
NEWS_PIPELINE_DONE = "NEWS_PIPELINE_DONE"
ML_PIPELINE_DONE = "ML_PIPELINE_DONE"
DEBATE_PIPELINE_DONE = "DEBATE_PIPELINE_DONE"
PORTFOLIO_PIPELINE_DONE = "PORTFOLIO_PIPELINE_DONE"


@dataclass(frozen=True)
class DailyAutomationOptions:
    report_date: date | None
    source: str
    market_type: str
    portfolio_id: int | None
    max_targets: int | None
    continuous: bool
    loop_interval_seconds: int
    debate_version: str
    news_limit: int
    financial_limit: int
    lease_seconds: int
    max_retry_attempts: int
    retry_backoff_seconds: int
    stage_max_failures: int
    portfolio_script_path: str
    portfolio_name: str
    portfolio_model_version: str
    portfolio_initial_capital: int


class PortfolioScriptRunner:
    def __init__(self, *, python_executable: str, working_directory: str):
        self.python_executable = python_executable
        self.working_directory = working_directory

    def run(
        self,
        *,
        script_path: str,
        report_date: date,
        debate_version: str,
        portfolio_name: str,
        portfolio_model_version: str,
        portfolio_initial_capital: int,
    ) -> None:
        command = [
            self.python_executable,
            script_path,
            "--report-date",
            report_date.isoformat(),
            "--portfolio-name",
            portfolio_name,
            "--model-version",
            portfolio_model_version,
            "--initial-capital",
            str(portfolio_initial_capital),
        ]
        if debate_version:
            command.extend(["--debate-version", debate_version])

        logger.info("포트폴리오 일일 반영 실행 | command=%s", " ".join(command))
        completed = subprocess.run(
            command,
            cwd=self.working_directory,
            check=False,
            text=True,
            capture_output=True,
        )
        if completed.stdout:
            logger.info("포트폴리오 일일 반영 stdout\n%s", completed.stdout.strip())
        if completed.stderr:
            logger.warning("포트폴리오 일일 반영 stderr\n%s", completed.stderr.strip())
        if completed.returncode != 0:
            stderr = completed.stderr.strip()
            stdout = completed.stdout.strip()
            details = stderr or stdout or "출력 없음"
            raise RuntimeError(
                f"포트폴리오 일일 반영 실패 | returncode={completed.returncode} | details={details}"
            )


class DailyAutomationRunner:
    def __init__(
        self,
        *,
        signal_store: PipelineSignalStore,
        debate_runner: DebateWorkerRunner,
        portfolio_runner: PortfolioScriptRunner,
        stop_event: threading.Event | None = None,
    ) -> None:
        self.signal_store = signal_store
        self.debate_runner = debate_runner
        self.portfolio_runner = portfolio_runner
        self.stop_event = stop_event or threading.Event()

    def request_shutdown(self) -> None:
        self.stop_event.set()
        self.debate_runner.request_shutdown()

    def run(self, options: DailyAutomationOptions) -> None:
        if options.continuous:
            while not self.stop_event.is_set():
                self.run_once(options)
                if self.stop_event.is_set():
                    break
                logger.info("다음 파이프라인 점검까지 %s초 대기합니다.", options.loop_interval_seconds)
                self.stop_event.wait(options.loop_interval_seconds)
        else:
            self.run_once(options)

    def run_once(self, options: DailyAutomationOptions) -> None:
        report_date = options.report_date or datetime.now(KST).date()

        if not self.signal_store.exists_done_for_date(NEWS_PIPELINE_DONE, report_date):
            logger.info("당일 %s 신호 없음 | report_date=%s | 스킵", NEWS_PIPELINE_DONE, report_date)
            return
        if not self.signal_store.exists_done_for_date(ML_PIPELINE_DONE, report_date):
            logger.info("당일 %s 신호 없음 | report_date=%s | 스킵", ML_PIPELINE_DONE, report_date)
            return

        if not self.signal_store.exists_done_for_date(DEBATE_PIPELINE_DONE, report_date):
            replay_dates = self._build_debate_replay_dates(
                target_date=report_date,
                portfolio_name=options.portfolio_name,
            )
            logger.info(
                "당일 토론 완료 신호 없음 | target_date=%s | replay_dates=%s",
                report_date,
                [item.isoformat() for item in replay_dates],
            )
            for replay_date in replay_dates:
                summary = self.debate_runner.run_once(
                    RunnerOptions(
                        report_date=replay_date,
                        source=options.source,
                        market_type=options.market_type,
                        portfolio_id=options.portfolio_id,
                        stock_ids=None,
                        max_targets=options.max_targets,
                        continuous=False,
                        loop_interval_seconds=options.loop_interval_seconds,
                        debate_version=options.debate_version,
                        news_limit=options.news_limit,
                        financial_limit=options.financial_limit,
                        lease_seconds=options.lease_seconds,
                        max_retry_attempts=options.max_retry_attempts,
                        retry_backoff_seconds=options.retry_backoff_seconds,
                    )
                )
                if not self._is_debate_success(summary):
                    failure_count = (
                        self.signal_store.count_status_for_date(
                            signal_type=DEBATE_PIPELINE_DONE,
                            business_date=report_date,
                            status="FAILED",
                        )
                        + 1
                    )
                    self.signal_store.insert_failed(
                        DEBATE_PIPELINE_DONE,
                        retry_count=failure_count,
                        business_date=report_date,
                    )
                    logger.warning(
                        "토론 배치가 완전 성공하지 못했습니다 | report_date=%s | failure_count=%s/%s | "
                        "discovered=%s | succeeded=%s | duplicated=%s | retryable=%s | permanent=%s | skipped=%s",
                        replay_date,
                        failure_count,
                        options.stage_max_failures,
                        summary.discovered,
                        summary.succeeded,
                        summary.duplicated,
                        summary.failed_retryable,
                        summary.failed_permanent,
                        summary.skipped,
                    )
                    if failure_count < options.stage_max_failures:
                        logger.info(
                            "토론 단계는 다음 실행에서 재시도합니다 | report_date=%s | remaining_attempts=%s",
                            report_date,
                            options.stage_max_failures - failure_count,
                        )
                        return
                    logger.warning(
                        "토론 단계 최대 실패 횟수 도달로 DONE 처리 후 다음 단계로 진행합니다 | report_date=%s",
                        report_date,
                    )
                    break
            self.signal_store.insert_done(DEBATE_PIPELINE_DONE, business_date=report_date)
            logger.info("당일 토론 완료 신호 기록 | report_date=%s", report_date)
        else:
            logger.info("당일 토론 완료 신호 이미 존재 | report_date=%s", report_date)

        if self.signal_store.exists_done_for_date(PORTFOLIO_PIPELINE_DONE, report_date):
            logger.info("당일 포트폴리오 완료 신호 이미 존재 | report_date=%s", report_date)
            return

        logger.info("당일 포트폴리오 완료 신호 없음 | report_date=%s | 포트폴리오 일일 반영 실행", report_date)
        try:
            self.portfolio_runner.run(
                script_path=options.portfolio_script_path,
                report_date=report_date,
                debate_version=options.debate_version,
                portfolio_name=options.portfolio_name,
                portfolio_model_version=options.portfolio_model_version,
                portfolio_initial_capital=options.portfolio_initial_capital,
            )
        except Exception as exc:
            failure_count = (
                self.signal_store.count_status_for_date(
                    signal_type=PORTFOLIO_PIPELINE_DONE,
                    business_date=report_date,
                    status="FAILED",
                )
                + 1
            )
            self.signal_store.insert_failed(
                PORTFOLIO_PIPELINE_DONE,
                retry_count=failure_count,
                business_date=report_date,
            )
            logger.warning(
                "포트폴리오 일일 반영 실패 | report_date=%s | failure_count=%s/%s | error=%s",
                report_date,
                failure_count,
                options.stage_max_failures,
                exc,
            )
            if failure_count < options.stage_max_failures:
                logger.info(
                    "포트폴리오 단계는 다음 실행에서 재시도합니다 | report_date=%s | remaining_attempts=%s",
                    report_date,
                    options.stage_max_failures - failure_count,
                )
                return
            logger.warning(
                "포트폴리오 단계 최대 실패 횟수 도달로 DONE 처리합니다 | report_date=%s",
                report_date,
            )

        self.signal_store.insert_done(PORTFOLIO_PIPELINE_DONE, business_date=report_date)
        logger.info("당일 포트폴리오 완료 신호 기록 | report_date=%s", report_date)

    @staticmethod
    def _is_debate_success(summary) -> bool:
        processed = summary.succeeded + summary.duplicated
        return (
            summary.failed_retryable == 0
            and summary.failed_permanent == 0
            and summary.skipped == 0
            and processed == summary.discovered
        )

    def _build_debate_replay_dates(self, *, target_date: date, portfolio_name: str) -> list[date]:
        last_record_date = self.signal_store.get_latest_portfolio_record_date(portfolio_name)
        start_date = target_date if last_record_date is None else (last_record_date + timedelta(days=1))
        if start_date > target_date:
            return [target_date]

        replay_dates: list[date] = []
        cursor = start_date
        while cursor <= target_date:
            if self._is_trading_day(cursor):
                replay_dates.append(cursor)
            cursor += timedelta(days=1)
        return replay_dates or [target_date]

    @staticmethod
    def _is_trading_day(candidate: date) -> bool:
        if candidate.weekday() >= 5:
            return False
        return candidate.strftime("%m-%d") not in FIXED_HOLIDAYS_MMDD
