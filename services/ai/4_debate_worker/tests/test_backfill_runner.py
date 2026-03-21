from __future__ import annotations

import threading
import unittest
from datetime import UTC, date, datetime
from pathlib import Path
from tempfile import TemporaryDirectory

from worker.backfill_runner import BackfillOptions, DebateBackfillRunner
from worker.checkpoint_store import CheckpointStore
from worker.runner import DebateWorkerRunner, RunnerOptions
from worker.schemas import (
    ChartPersona,
    DebateInputsResponse,
    DebatePersonas,
    DebateResultRequest,
    DebateResultResponse,
    DebateTargetsResponse,
    FundamentalPersona,
    NewsPersona,
    TargetItem,
)
from worker.resource_monitor import ResourceSnapshot


class FakeApiClient:
    def __init__(self):
        self.post_calls = 0

    def get_targets(self, *, report_date, source, market_type, portfolio_id, limit):
        return DebateTargetsResponse(
            report_date=report_date,
            source=source,
            count=1,
            targets=[TargetItem(stock_id=int(report_date.strftime("%d")), ticker=f"{int(report_date.strftime('%d')):06d}", stock_name="테스트")],
        )

    def get_inputs(self, *, stock_id, report_date, debate_version, news_limit, financial_limit):
        return DebateInputsResponse(
            stock_id=stock_id,
            ticker=f"{stock_id:06d}",
            stock_name="테스트",
            report_date=report_date,
            debate_version=debate_version,
            personas=DebatePersonas(
                fundamental=FundamentalPersona(),
                chart=ChartPersona(
                    ensemble_prediction={
                        "model_version": "v1.0",
                        "ensemble_result": 2,
                        "ensemble_confidence": 0.77,
                    }
                ),
                news=NewsPersona(),
            ),
        )

    def post_result(self, payload):
        self.post_calls += 1
        return DebateResultResponse(
            result="created",
            stock_id=payload.stock_id,
            report_date=payload.report_date,
            debate_version=payload.debate_version,
        )


class FakeDebateEngine:
    def run(self, inputs):
        return DebateResultRequest(
            stock_id=inputs.stock_id,
            ticker=inputs.ticker,
            report_date=inputs.report_date,
            debate_version=inputs.debate_version,
            chairman_signal="BUY",
            debate_confidence=0.81,
            debate_summary={"title": "up"},
            final_stances={"chart": {"signal": "BUY"}},
            debate_full_log={"rounds": []},
            chairman_report="report",
        )


class FakeResourceMonitor:
    def wait_until_ready(self, *, stop_event=None, context=""):
        return ResourceSnapshot(checked_at=datetime.now(UTC))


class DebateBackfillRunnerTest(unittest.TestCase):
    def test_progress_distinguishes_missing_run_and_zero_target_run(self) -> None:
        with TemporaryDirectory() as temp_dir:
            store = CheckpointStore(Path(temp_dir) / "worker.sqlite3")
            run_key = store.build_run_key(report_date=date(2026, 3, 16), source="trading_history", portfolio_id=1)

            missing = store.get_progress(run_key=run_key)
            self.assertFalse(missing.run_exists)
            self.assertEqual(missing.total, 0)

            store.ensure_run(run_key=run_key, report_date=date(2026, 3, 16), source="trading_history", portfolio_id=1)
            created = store.get_progress(run_key=run_key)
            self.assertTrue(created.run_exists)
            self.assertEqual(created.total, 0)

    def test_requeue_preserves_cached_payload_by_default(self) -> None:
        with TemporaryDirectory() as temp_dir:
            store = CheckpointStore(Path(temp_dir) / "worker.sqlite3")
            run_key = store.build_run_key(report_date=date(2026, 3, 16), source="trading_history", portfolio_id=1)
            store.ensure_run(run_key=run_key, report_date=date(2026, 3, 16), source="trading_history", portfolio_id=1)
            store.sync_targets(run_key=run_key, targets=[TargetItem(stock_id=1, ticker="005930", stock_name="삼성전자")])

            payload = DebateResultRequest(
                stock_id=1,
                ticker="005930",
                report_date=date(2026, 3, 16),
                debate_version="debate-v1",
                chairman_signal="BUY",
                debate_confidence=0.82,
            )
            store.save_result_payload(run_key=run_key, stock_id=1, payload=payload)
            store.mark_failed(
                run_key=run_key,
                stock_id=1,
                retryable=False,
                error_message="save failed",
                backoff_seconds=30,
            )

            updated = store.requeue_jobs(run_key=run_key, statuses=["failed_permanent"], clear_result_payload=False)
            self.assertEqual(updated, 1)

            claimed = store.claim_next_job(run_key=run_key, lease_seconds=300)
            self.assertIsNotNone(claimed)
            self.assertIsNotNone(claimed.result_payload)
            self.assertEqual(claimed.result_payload.chairman_signal, "BUY")

    def test_backfill_runner_processes_multiple_dates(self) -> None:
        with TemporaryDirectory() as temp_dir:
            store = CheckpointStore(Path(temp_dir) / "worker.sqlite3")
            day_runner = DebateWorkerRunner(
                api_client=FakeApiClient(),
                debate_engine=FakeDebateEngine(),
                checkpoint_store=store,
                stop_event=threading.Event(),
            )
            runner = DebateBackfillRunner(
                day_runner=day_runner,
                checkpoint_store=store,
                resource_monitor=FakeResourceMonitor(),
                stop_event=threading.Event(),
            )

            options = BackfillOptions(
                start_date=date(2026, 3, 16),
                end_date=date(2026, 3, 17),
                source="trading_history",
                market_type="KOSPI",
                portfolio_id=1,
                max_targets=10,
                debate_version="debate-v1",
                news_limit=8,
                financial_limit=4,
                lease_seconds=300,
                max_retry_attempts=3,
                retry_backoff_seconds=1,
                poll_interval_seconds=1,
            )

            summary = runner.run(options)

            self.assertEqual(summary.total_dates, 2)
            self.assertEqual(summary.unfinished_dates, 0)
            self.assertEqual(summary.succeeded, 2)


if __name__ == "__main__":
    unittest.main()
