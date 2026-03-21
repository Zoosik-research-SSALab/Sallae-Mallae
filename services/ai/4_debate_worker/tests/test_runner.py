from __future__ import annotations

import unittest
from datetime import date
from pathlib import Path
from tempfile import TemporaryDirectory

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


class FakeApiClient:
    def __init__(self):
        self.post_calls = 0

    def get_targets(self, *, report_date, source, market_type, portfolio_id, limit):
        return DebateTargetsResponse(
            report_date=report_date,
            source=source,
            count=1,
            targets=[TargetItem(stock_id=1, ticker="005930", stock_name="삼성전자")],
        )

    def get_inputs(self, *, stock_id, report_date, debate_version, news_limit, financial_limit):
        return DebateInputsResponse(
            stock_id=stock_id,
            ticker="005930",
            stock_name="삼성전자",
            report_date=report_date,
            debate_version=debate_version,
            personas=DebatePersonas(
                fundamental=FundamentalPersona(),
                chart=ChartPersona(
                    ensemble_prediction={
                        "model_version": "v1.0",
                        "ensemble_result": 2,
                        "ensemble_confidence": 0.81,
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
    def __init__(self):
        self.run_calls = 0

    def run(self, inputs):
        self.run_calls += 1
        return DebateResultRequest(
            stock_id=inputs.stock_id,
            ticker=inputs.ticker,
            report_date=inputs.report_date,
            debate_version=inputs.debate_version,
            chairman_signal="BUY",
            debate_confidence=0.88,
            debate_summary={"title": "up"},
            final_stances={"chart": {"signal": "BUY"}},
            debate_full_log={"rounds": []},
            chairman_report="test report",
        )


class DebateWorkerRunnerTest(unittest.TestCase):
    def test_runner_reuses_cached_result_payload_after_restart(self) -> None:
        with TemporaryDirectory() as temp_dir:
            store = CheckpointStore(Path(temp_dir) / "worker.sqlite3")
            api_client = FakeApiClient()
            engine = FakeDebateEngine()
            runner = DebateWorkerRunner(
                api_client=api_client,
                debate_engine=engine,
                checkpoint_store=store,
            )

            options = RunnerOptions(
                report_date=date(2026, 3, 16),
                source="trading_history",
                market_type="KOSPI",
                portfolio_id=1,
                max_targets=10,
                continuous=False,
                loop_interval_seconds=60,
                debate_version="debate-v1",
                news_limit=8,
                financial_limit=4,
                lease_seconds=300,
                max_retry_attempts=3,
                retry_backoff_seconds=30,
            )

            run_key = store.build_run_key(report_date=date(2026, 3, 16), source="trading_history", portfolio_id=1)
            store.ensure_run(run_key=run_key, report_date=date(2026, 3, 16), source="trading_history", portfolio_id=1)
            store.sync_targets(run_key=run_key, targets=[TargetItem(stock_id=1, ticker="005930", stock_name="삼성전자")])
            payload = DebateResultRequest(
                stock_id=1,
                ticker="005930",
                report_date=date(2026, 3, 16),
                debate_version="debate-v1",
                chairman_signal="BUY",
                debate_confidence=0.8,
            )
            store.save_result_payload(run_key=run_key, stock_id=1, payload=payload)

            summary = runner.run_once(options)

            self.assertEqual(engine.run_calls, 0)
            self.assertEqual(api_client.post_calls, 1)
            self.assertEqual(summary.succeeded, 1)


if __name__ == "__main__":
    unittest.main()
