from __future__ import annotations

import threading
from dataclasses import dataclass
from datetime import UTC, date, datetime

from core.logger import logger
from worker.api_client import ApiClientError, DebateApiClient
from worker.checkpoint_store import CheckpointStore
from worker.debate_engine import DebateEngine
from worker.llm_client import LlmClientError
from worker.schemas import RunSummary


@dataclass
class RunnerOptions:
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


class DebateWorkerRunner:
    def __init__(
        self,
        *,
        api_client: DebateApiClient,
        debate_engine: DebateEngine,
        checkpoint_store: CheckpointStore,
        stop_event: threading.Event | None = None,
    ):
        self.api_client = api_client
        self.debate_engine = debate_engine
        self.checkpoint_store = checkpoint_store
        self.stop_event = stop_event or threading.Event()

    def request_shutdown(self) -> None:
        self.stop_event.set()

    def run(self, options: RunnerOptions) -> None:
        if options.continuous:
            while not self.stop_event.is_set():
                self.run_once(options)
                if self.stop_event.is_set():
                    break
                logger.info("다음 작업 주기까지 %s초 대기합니다.", options.loop_interval_seconds)
                self.stop_event.wait(options.loop_interval_seconds)
        else:
            self.run_once(options)

    def run_once(self, options: RunnerOptions) -> RunSummary:
        report_date = options.report_date or datetime.now(UTC).date()
        run_key = self.checkpoint_store.build_run_key(
            report_date=report_date,
            source=options.source,
            portfolio_id=options.portfolio_id,
        )
        self.checkpoint_store.ensure_run(
            run_key=run_key,
            report_date=report_date,
            source=options.source,
            portfolio_id=options.portfolio_id,
        )

        targets = self.api_client.get_targets(
            report_date=report_date,
            source=options.source,
            market_type=options.market_type,
            portfolio_id=options.portfolio_id,
            limit=options.max_targets,
        )
        new_targets = self.checkpoint_store.sync_targets(run_key=run_key, targets=targets.targets)
        logger.info("대상 동기화 완료 | run_key=%s | fetched=%s | newly_added=%s", run_key, targets.count, new_targets)

        while not self.stop_event.is_set():
            job = self.checkpoint_store.claim_next_job(run_key=run_key, lease_seconds=options.lease_seconds)
            if job is None:
                break

            try:
                payload = job.result_payload
                if payload is None:
                    logger.info("입력 조회 및 토론 실행 | stock_id=%s | ticker=%s", job.stock_id, job.ticker)
                    inputs = self.api_client.get_inputs(
                        stock_id=job.stock_id,
                        report_date=report_date,
                        debate_version=options.debate_version,
                        news_limit=options.news_limit,
                        financial_limit=options.financial_limit,
                    )
                    payload = self.debate_engine.run(inputs)
                    self.checkpoint_store.save_result_payload(run_key=run_key, stock_id=job.stock_id, payload=payload)
                else:
                    logger.info("체크포인트 결과 재사용 | stock_id=%s | ticker=%s", job.stock_id, job.ticker)

                result = self.api_client.post_result(payload)
                if result.result == "duplicated":
                    self.checkpoint_store.mark_succeeded(run_key=run_key, stock_id=job.stock_id, status="duplicated")
                    logger.info("중복 결과 처리 | stock_id=%s | ticker=%s", job.stock_id, job.ticker)
                else:
                    self.checkpoint_store.mark_succeeded(run_key=run_key, stock_id=job.stock_id, status="succeeded")
                    logger.info("토론 결과 저장 완료 | stock_id=%s | ticker=%s", job.stock_id, job.ticker)
            except ApiClientError as exc:
                retryable = exc.retryable and job.attempts < options.max_retry_attempts
                self.checkpoint_store.mark_failed(
                    run_key=run_key,
                    stock_id=job.stock_id,
                    retryable=retryable,
                    error_message=str(exc),
                    backoff_seconds=options.retry_backoff_seconds * max(job.attempts, 1),
                )
                logger.warning("API 처리 실패 | stock_id=%s | retryable=%s | error=%s", job.stock_id, retryable, exc)
            except (LlmClientError, ValueError) as exc:
                retryable = job.attempts < options.max_retry_attempts
                self.checkpoint_store.mark_failed(
                    run_key=run_key,
                    stock_id=job.stock_id,
                    retryable=retryable,
                    error_message=str(exc),
                    backoff_seconds=options.retry_backoff_seconds * max(job.attempts, 1),
                )
                logger.warning("LLM 처리 실패 | stock_id=%s | retryable=%s | error=%s", job.stock_id, retryable, exc)
            except Exception as exc:
                self.checkpoint_store.mark_failed(
                    run_key=run_key,
                    stock_id=job.stock_id,
                    retryable=False,
                    error_message=str(exc),
                    backoff_seconds=options.retry_backoff_seconds,
                )
                logger.exception("예상하지 못한 오류 | stock_id=%s", job.stock_id)

        counts = self.checkpoint_store.get_counts(run_key=run_key)
        summary = RunSummary(
            run_key=run_key,
            report_date=report_date,
            discovered=counts.discovered,
            succeeded=counts.succeeded,
            duplicated=counts.duplicated,
            failed_retryable=counts.failed_retryable,
            failed_permanent=counts.failed_permanent,
            skipped=max(counts.discovered - counts.succeeded - counts.duplicated - counts.failed_retryable - counts.failed_permanent, 0),
        )
        logger.info("배치 완료 | %s", summary.model_dump())
        return summary
