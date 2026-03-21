from __future__ import annotations

import threading
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Sequence

from core.logger import logger
from worker.checkpoint_store import CheckpointStore, RunProgress
from worker.resource_monitor import ResourceMonitor, ResourceSnapshot
from worker.runner import DebateWorkerRunner, RunnerOptions
from worker.schemas import StoredJob


@dataclass
class BackfillOptions:
    start_date: date
    end_date: date
    source: str
    market_type: str
    portfolio_id: int | None
    stock_ids: tuple[int, ...] | None
    max_targets: int | None
    debate_version: str
    news_limit: int
    financial_limit: int
    lease_seconds: int
    max_retry_attempts: int
    retry_backoff_seconds: int
    poll_interval_seconds: int


@dataclass
class DailyBackfillStatus:
    report_date: date
    run_key: str
    run_exists: bool
    total: int
    succeeded: int
    duplicated: int
    pending: int
    running: int
    result_ready: int
    failed_retryable: int
    failed_permanent: int
    earliest_next_retry_at: str | None


@dataclass
class BackfillSummary:
    start_date: date
    end_date: date
    total_dates: int
    completed_dates: int
    terminal_failure_dates: int
    unfinished_dates: int
    total_jobs: int
    succeeded: int
    duplicated: int
    failed_retryable: int
    failed_permanent: int


class DebateBackfillRunner:
    def __init__(
        self,
        *,
        day_runner: DebateWorkerRunner,
        checkpoint_store: CheckpointStore,
        resource_monitor: ResourceMonitor,
        stop_event: threading.Event | None = None,
    ):
        self.day_runner = day_runner
        self.checkpoint_store = checkpoint_store
        self.resource_monitor = resource_monitor
        self.stop_event = stop_event or threading.Event()

    def request_shutdown(self) -> None:
        self.stop_event.set()

    def run(self, options: BackfillOptions) -> BackfillSummary:
        self._validate_dates(options)
        dates = self._iter_dates(options.start_date, options.end_date)
        logger.info(
            "백필 시작 | start=%s | end=%s | total_dates=%s | source=%s | portfolio_id=%s",
            options.start_date,
            options.end_date,
            len(dates),
            options.source,
            options.portfolio_id,
        )

        cycle = 0
        while not self.stop_event.is_set():
            cycle += 1
            work_dates = [
                report_date
                for report_date in dates
                if self._needs_processing(report_date, options)
            ]

            if not work_dates:
                summary = self.report(options)
                logger.info(
                    "백필 종료 | completed_dates=%s | unfinished_dates=%s | failed_permanent=%s",
                    summary.completed_dates,
                    summary.unfinished_dates,
                    summary.failed_permanent,
                )
                return summary

            logger.info(
                "백필 패스 시작 | cycle=%s | remaining_dates=%s | first_date=%s | last_date=%s",
                cycle,
                len(work_dates),
                work_dates[0],
                work_dates[-1],
            )

            for index, report_date in enumerate(work_dates, start=1):
                if self.stop_event.is_set():
                    break

                snapshot = self.resource_monitor.wait_until_ready(
                    stop_event=self.stop_event,
                    context=f"{report_date.isoformat()} ({index}/{len(work_dates)})",
                )
                self._log_snapshot(snapshot=snapshot, report_date=report_date)

                day_options = RunnerOptions(
                    report_date=report_date,
                    source=options.source,
                    market_type=options.market_type,
                    portfolio_id=options.portfolio_id,
                    stock_ids=options.stock_ids,
                    max_targets=options.max_targets,
                    continuous=False,
                    loop_interval_seconds=options.poll_interval_seconds,
                    debate_version=options.debate_version,
                    news_limit=options.news_limit,
                    financial_limit=options.financial_limit,
                    lease_seconds=options.lease_seconds,
                    max_retry_attempts=options.max_retry_attempts,
                    retry_backoff_seconds=options.retry_backoff_seconds,
                )
                self.day_runner.run_once(day_options)
                self._log_daily_progress(report_date=report_date, options=options)

            if self.stop_event.is_set():
                break

            summary = self.report(options)
            if summary.unfinished_dates == 0:
                logger.info("백필 패스 종료 후 모든 날짜가 terminal 상태입니다.")
                return summary

            logger.info(
                "미완료 날짜가 남아 다음 패스를 대기합니다. | unfinished_dates=%s | retryable_jobs=%s | sleep=%ss",
                summary.unfinished_dates,
                summary.failed_retryable,
                options.poll_interval_seconds,
            )
            self.stop_event.wait(options.poll_interval_seconds)

        return self.report(options)

    def report(self, options: BackfillOptions) -> BackfillSummary:
        self._validate_dates(options)
        statuses = self.get_daily_statuses(options)
        completed_dates = sum(1 for status in statuses if status.run_exists and status.pending == 0 and status.running == 0 and status.result_ready == 0 and status.failed_retryable == 0)
        terminal_failure_dates = sum(1 for status in statuses if status.failed_permanent > 0)
        unfinished_dates = sum(
            1
            for status in statuses
            if (not status.run_exists) or status.pending > 0 or status.running > 0 or status.result_ready > 0 or status.failed_retryable > 0
        )

        return BackfillSummary(
            start_date=options.start_date,
            end_date=options.end_date,
            total_dates=len(statuses),
            completed_dates=completed_dates,
            terminal_failure_dates=terminal_failure_dates,
            unfinished_dates=unfinished_dates,
            total_jobs=sum(status.total for status in statuses),
            succeeded=sum(status.succeeded for status in statuses),
            duplicated=sum(status.duplicated for status in statuses),
            failed_retryable=sum(status.failed_retryable for status in statuses),
            failed_permanent=sum(status.failed_permanent for status in statuses),
        )

    def get_daily_statuses(self, options: BackfillOptions) -> list[DailyBackfillStatus]:
        self._validate_dates(options)
        rows: list[DailyBackfillStatus] = []
        for report_date in self._iter_dates(options.start_date, options.end_date):
            run_key = self.checkpoint_store.build_run_key(
                report_date=report_date,
                source=options.source,
                portfolio_id=options.portfolio_id,
                stock_ids=options.stock_ids,
            )
            progress = self.checkpoint_store.get_progress(run_key=run_key)
            rows.append(self._to_daily_status(report_date=report_date, progress=progress))
        return rows

    def list_failed_jobs(
        self,
        *,
        report_date: date,
        source: str,
        portfolio_id: int | None,
        statuses: Sequence[str] = ("failed_permanent", "failed_retryable"),
        limit: int | None = 100,
    ) -> list[StoredJob]:
        run_key = self.checkpoint_store.build_run_key(
            report_date=report_date,
            source=source,
            portfolio_id=portfolio_id,
            stock_ids=None,
        )
        return self.checkpoint_store.list_jobs(run_key=run_key, statuses=statuses, limit=limit)

    def requeue_failed_jobs(
        self,
        *,
        report_date: date,
        source: str,
        portfolio_id: int | None,
        run_stock_ids: Sequence[int] | None = None,
        statuses: Sequence[str] = ("failed_permanent", "failed_retryable"),
        stock_ids: Sequence[int] | None = None,
        clear_result_payload: bool = False,
    ) -> int:
        run_key = self.checkpoint_store.build_run_key(
            report_date=report_date,
            source=source,
            portfolio_id=portfolio_id,
            stock_ids=run_stock_ids,
        )
        count = self.checkpoint_store.requeue_jobs(
            run_key=run_key,
            statuses=statuses,
            stock_ids=stock_ids,
            clear_result_payload=clear_result_payload,
        )
        logger.info(
            "수동 복구 requeue 완료 | date=%s | run_stock_ids=%s | statuses=%s | stock_ids=%s | clear_result_payload=%s | updated=%s",
            report_date,
            ",".join(str(stock_id) for stock_id in run_stock_ids) if run_stock_ids else "-",
            ",".join(statuses),
            ",".join(str(stock_id) for stock_id in stock_ids) if stock_ids else "-",
            clear_result_payload,
            count,
        )
        return count

    def _needs_processing(self, report_date: date, options: BackfillOptions) -> bool:
        run_key = self.checkpoint_store.build_run_key(
            report_date=report_date,
            source=options.source,
            portfolio_id=options.portfolio_id,
            stock_ids=options.stock_ids,
        )
        progress = self.checkpoint_store.get_progress(run_key=run_key)
        return (not progress.run_exists) or progress.unfinished > 0

    def _log_daily_progress(self, *, report_date: date, options: BackfillOptions) -> None:
        run_key = self.checkpoint_store.build_run_key(
            report_date=report_date,
            source=options.source,
            portfolio_id=options.portfolio_id,
            stock_ids=options.stock_ids,
        )
        progress = self.checkpoint_store.get_progress(run_key=run_key)
        logger.info(
            "일자 처리 상태 | date=%s | total=%s | succeeded=%s | duplicated=%s | pending=%s | running=%s | result_ready=%s | retryable=%s | permanent=%s | next_retry=%s",
            report_date,
            progress.total,
            progress.succeeded,
            progress.duplicated,
            progress.pending,
            progress.running,
            progress.result_ready,
            progress.failed_retryable,
            progress.failed_permanent,
            progress.earliest_next_retry_at.isoformat() if progress.earliest_next_retry_at else None,
        )

    def _log_snapshot(self, *, snapshot: ResourceSnapshot, report_date: date) -> None:
        logger.info(
            "자원 스냅샷 | date=%s | ram_available_mb=%s | ram_ratio=%s | gpu=%s | gpu_free_mb=%s | gpu_util=%s",
            report_date,
            snapshot.ram_available_mb,
            f"{snapshot.ram_available_ratio:.2f}" if snapshot.ram_available_ratio is not None else None,
            snapshot.gpu_name,
            snapshot.gpu_free_mb,
            snapshot.gpu_utilization,
        )

    def _to_daily_status(self, *, report_date: date, progress: RunProgress) -> DailyBackfillStatus:
        return DailyBackfillStatus(
            report_date=report_date,
            run_key=progress.run_key,
            run_exists=progress.run_exists,
            total=progress.total,
            succeeded=progress.succeeded,
            duplicated=progress.duplicated,
            pending=progress.pending,
            running=progress.running,
            result_ready=progress.result_ready,
            failed_retryable=progress.failed_retryable,
            failed_permanent=progress.failed_permanent,
            earliest_next_retry_at=progress.earliest_next_retry_at.isoformat() if progress.earliest_next_retry_at else None,
        )

    def _validate_dates(self, options: BackfillOptions) -> None:
        if options.start_date > options.end_date:
            raise ValueError("start_date는 end_date보다 늦을 수 없습니다.")

    def _iter_dates(self, start_date: date, end_date: date) -> list[date]:
        days = (end_date - start_date).days + 1
        return [start_date + timedelta(days=offset) for offset in range(days)]
