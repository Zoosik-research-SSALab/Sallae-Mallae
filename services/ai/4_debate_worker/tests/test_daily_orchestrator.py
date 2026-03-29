from __future__ import annotations

import threading
import unittest
from dataclasses import dataclass
from datetime import date

from worker.daily_orchestrator import (
    DEBATE_PIPELINE_DONE,
    ML_PIPELINE_DONE,
    NEWS_PIPELINE_DONE,
    PORTFOLIO_PIPELINE_DONE,
    DailyAutomationOptions,
    DailyAutomationRunner,
)
from worker.schemas import RunSummary


class FakeSignalStore:
    def __init__(
        self,
        done_signals: set[tuple[str, date]] | None = None,
        latest_portfolio_record_date: date | None = None,
    ):
        self.done_signals = done_signals or set()
        self.failed_signals: list[tuple[str, int, date | None]] = []
        self.latest_portfolio_record_date = latest_portfolio_record_date
        self.status_counts: dict[tuple[str, date, str], int] = {}

    def exists_done_for_date(self, signal_type: str, business_date: date) -> bool:
        return (signal_type, business_date) in self.done_signals

    def insert_done(self, signal_type: str, business_date: date | None = None) -> None:
        self.done_signals.add((signal_type, business_date or date(2026, 3, 24)))

    def insert_failed(self, signal_type: str, retry_count: int = 0, business_date: date | None = None) -> None:
        target_date = business_date or date(2026, 3, 24)
        self.failed_signals.append((signal_type, retry_count, target_date))
        key = (signal_type, target_date, "FAILED")
        self.status_counts[key] = self.status_counts.get(key, 0) + 1

    def count_status_for_date(self, *, signal_type: str, business_date: date, status: str) -> int:
        return self.status_counts.get((signal_type, business_date, status), 0)

    def get_latest_portfolio_record_date(self, portfolio_name: str) -> date | None:
        return self.latest_portfolio_record_date


class FakeDebateRunner:
    def __init__(self, summary: RunSummary):
        self.summary = summary
        self.run_once_calls = 0
        self.shutdown_requested = False

    def request_shutdown(self) -> None:
        self.shutdown_requested = True

    def run_once(self, options):
        self.run_once_calls += 1
        return self.summary


@dataclass
class FakePortfolioRunner:
    run_calls: int = 0
    should_fail: bool = False

    def run(self, **kwargs) -> None:
        self.run_calls += 1
        if self.should_fail:
            raise RuntimeError("portfolio failed")


def build_options() -> DailyAutomationOptions:
    return DailyAutomationOptions(
        report_date=date(2026, 3, 24),
        source="trading_history",
        market_type="KOSPI",
        portfolio_id=1,
        max_targets=200,
        continuous=False,
        loop_interval_seconds=300,
        debate_version="debate-v1",
        news_limit=8,
        financial_limit=4,
        lease_seconds=900,
        max_retry_attempts=5,
        retry_backoff_seconds=30,
        stage_max_failures=3,
        portfolio_script_path="/tmp/chairman_portfolio_daily.py",
        portfolio_name="의장 포트폴리오",
        portfolio_model_version="chairman-v1",
        portfolio_initial_capital=100_000_000,
    )


class DailyAutomationRunnerTest(unittest.TestCase):
    def test_runs_debate_and_portfolio_when_news_and_ml_done_exist(self) -> None:
        store = FakeSignalStore(
            done_signals={
                (NEWS_PIPELINE_DONE, date(2026, 3, 24)),
                (ML_PIPELINE_DONE, date(2026, 3, 24)),
            }
        )
        debate_runner = FakeDebateRunner(
            RunSummary(
                run_key="k",
                report_date=date(2026, 3, 24),
                discovered=3,
                succeeded=2,
                duplicated=1,
                failed_retryable=0,
                failed_permanent=0,
                skipped=0,
            )
        )
        portfolio_runner = FakePortfolioRunner()

        runner = DailyAutomationRunner(
            signal_store=store,
            debate_runner=debate_runner,
            portfolio_runner=portfolio_runner,
            stop_event=threading.Event(),
        )

        runner.run_once(build_options())

        self.assertEqual(debate_runner.run_once_calls, 2)
        self.assertEqual(portfolio_runner.run_calls, 1)
        self.assertIn((DEBATE_PIPELINE_DONE, date(2026, 3, 24)), store.done_signals)
        self.assertIn((PORTFOLIO_PIPELINE_DONE, date(2026, 3, 24)), store.done_signals)

    def test_runs_portfolio_only_when_debate_done_exists(self) -> None:
        store = FakeSignalStore(
            done_signals={
                (NEWS_PIPELINE_DONE, date(2026, 3, 24)),
                (ML_PIPELINE_DONE, date(2026, 3, 24)),
                (DEBATE_PIPELINE_DONE, date(2026, 3, 24)),
            }
        )
        debate_runner = FakeDebateRunner(
            RunSummary(
                run_key="k",
                report_date=date(2026, 3, 24),
                discovered=0,
                succeeded=0,
                duplicated=0,
                failed_retryable=0,
                failed_permanent=0,
                skipped=0,
            )
        )
        portfolio_runner = FakePortfolioRunner()

        runner = DailyAutomationRunner(
            signal_store=store,
            debate_runner=debate_runner,
            portfolio_runner=portfolio_runner,
            stop_event=threading.Event(),
        )

        runner.run_once(build_options())

        self.assertEqual(debate_runner.run_once_calls, 0)
        self.assertEqual(portfolio_runner.run_calls, 1)
        self.assertIn((PORTFOLIO_PIPELINE_DONE, date(2026, 3, 24)), store.done_signals)

    def test_backfills_missing_debate_dates_before_target_date(self) -> None:
        store = FakeSignalStore(
            done_signals={
                (NEWS_PIPELINE_DONE, date(2026, 3, 24)),
                (ML_PIPELINE_DONE, date(2026, 3, 24)),
            },
            latest_portfolio_record_date=date(2026, 3, 22),
        )
        debate_runner = FakeDebateRunner(
            RunSummary(
                run_key="k",
                report_date=date(2026, 3, 24),
                discovered=1,
                succeeded=1,
                duplicated=0,
                failed_retryable=0,
                failed_permanent=0,
                skipped=0,
            )
        )
        portfolio_runner = FakePortfolioRunner()

        runner = DailyAutomationRunner(
            signal_store=store,
            debate_runner=debate_runner,
            portfolio_runner=portfolio_runner,
            stop_event=threading.Event(),
        )

        runner.run_once(build_options())

        self.assertEqual(debate_runner.run_once_calls, 1)
        self.assertEqual(portfolio_runner.run_calls, 1)

    def test_skips_when_ml_done_signal_is_missing(self) -> None:
        store = FakeSignalStore(done_signals={(NEWS_PIPELINE_DONE, date(2026, 3, 24))})
        debate_runner = FakeDebateRunner(
            RunSummary(
                run_key="k",
                report_date=date(2026, 3, 24),
                discovered=1,
                succeeded=1,
                duplicated=0,
                failed_retryable=0,
                failed_permanent=0,
                skipped=0,
            )
        )
        portfolio_runner = FakePortfolioRunner()

        runner = DailyAutomationRunner(
            signal_store=store,
            debate_runner=debate_runner,
            portfolio_runner=portfolio_runner,
            stop_event=threading.Event(),
        )

        runner.run_once(build_options())

        self.assertEqual(debate_runner.run_once_calls, 0)
        self.assertEqual(portfolio_runner.run_calls, 0)
        self.assertNotIn((DEBATE_PIPELINE_DONE, date(2026, 3, 24)), store.done_signals)
        self.assertNotIn((PORTFOLIO_PIPELINE_DONE, date(2026, 3, 24)), store.done_signals)

    def test_stops_after_debate_failure_before_threshold(self) -> None:
        store = FakeSignalStore(
            done_signals={
                (NEWS_PIPELINE_DONE, date(2026, 3, 24)),
                (ML_PIPELINE_DONE, date(2026, 3, 24)),
            }
        )
        debate_runner = FakeDebateRunner(
            RunSummary(
                run_key="k",
                report_date=date(2026, 3, 24),
                discovered=3,
                succeeded=1,
                duplicated=0,
                failed_retryable=1,
                failed_permanent=0,
                skipped=1,
            )
        )
        portfolio_runner = FakePortfolioRunner()

        runner = DailyAutomationRunner(
            signal_store=store,
            debate_runner=debate_runner,
            portfolio_runner=portfolio_runner,
            stop_event=threading.Event(),
        )

        runner.run_once(build_options())

        self.assertEqual(portfolio_runner.run_calls, 0)
        self.assertIn((DEBATE_PIPELINE_DONE, 1, date(2026, 3, 24)), store.failed_signals)
        self.assertNotIn((DEBATE_PIPELINE_DONE, date(2026, 3, 24)), store.done_signals)

    def test_marks_done_after_debate_failure_threshold(self) -> None:
        store = FakeSignalStore(
            done_signals={
                (NEWS_PIPELINE_DONE, date(2026, 3, 24)),
                (ML_PIPELINE_DONE, date(2026, 3, 24)),
            }
        )
        store.status_counts[(DEBATE_PIPELINE_DONE, date(2026, 3, 24), "FAILED")] = 2
        debate_runner = FakeDebateRunner(
            RunSummary(
                run_key="k",
                report_date=date(2026, 3, 24),
                discovered=1,
                succeeded=0,
                duplicated=0,
                failed_retryable=1,
                failed_permanent=0,
                skipped=0,
            )
        )
        portfolio_runner = FakePortfolioRunner()

        runner = DailyAutomationRunner(
            signal_store=store,
            debate_runner=debate_runner,
            portfolio_runner=portfolio_runner,
            stop_event=threading.Event(),
        )

        runner.run_once(build_options())

        self.assertEqual(portfolio_runner.run_calls, 1)
        self.assertIn((DEBATE_PIPELINE_DONE, 3, date(2026, 3, 24)), store.failed_signals)
        self.assertIn((DEBATE_PIPELINE_DONE, date(2026, 3, 24)), store.done_signals)

    def test_stops_after_portfolio_failure_before_threshold(self) -> None:
        store = FakeSignalStore(
            done_signals={
                (NEWS_PIPELINE_DONE, date(2026, 3, 24)),
                (ML_PIPELINE_DONE, date(2026, 3, 24)),
                (DEBATE_PIPELINE_DONE, date(2026, 3, 24)),
            }
        )
        debate_runner = FakeDebateRunner(
            RunSummary(
                run_key="k",
                report_date=date(2026, 3, 24),
                discovered=0,
                succeeded=0,
                duplicated=0,
                failed_retryable=0,
                failed_permanent=0,
                skipped=0,
            )
        )
        portfolio_runner = FakePortfolioRunner(should_fail=True)

        runner = DailyAutomationRunner(
            signal_store=store,
            debate_runner=debate_runner,
            portfolio_runner=portfolio_runner,
            stop_event=threading.Event(),
        )

        runner.run_once(build_options())

        self.assertEqual(portfolio_runner.run_calls, 1)
        self.assertIn((PORTFOLIO_PIPELINE_DONE, 1, date(2026, 3, 24)), store.failed_signals)
        self.assertNotIn((PORTFOLIO_PIPELINE_DONE, date(2026, 3, 24)), store.done_signals)

    def test_marks_done_after_portfolio_failure_threshold(self) -> None:
        store = FakeSignalStore(
            done_signals={
                (NEWS_PIPELINE_DONE, date(2026, 3, 24)),
                (ML_PIPELINE_DONE, date(2026, 3, 24)),
                (DEBATE_PIPELINE_DONE, date(2026, 3, 24)),
            }
        )
        store.status_counts[(PORTFOLIO_PIPELINE_DONE, date(2026, 3, 24), "FAILED")] = 2
        debate_runner = FakeDebateRunner(
            RunSummary(
                run_key="k",
                report_date=date(2026, 3, 24),
                discovered=0,
                succeeded=0,
                duplicated=0,
                failed_retryable=0,
                failed_permanent=0,
                skipped=0,
            )
        )
        portfolio_runner = FakePortfolioRunner(should_fail=True)

        runner = DailyAutomationRunner(
            signal_store=store,
            debate_runner=debate_runner,
            portfolio_runner=portfolio_runner,
            stop_event=threading.Event(),
        )

        runner.run_once(build_options())

        self.assertEqual(portfolio_runner.run_calls, 1)
        self.assertIn((PORTFOLIO_PIPELINE_DONE, 3, date(2026, 3, 24)), store.failed_signals)
        self.assertIn((PORTFOLIO_PIPELINE_DONE, date(2026, 3, 24)), store.done_signals)


if __name__ == "__main__":
    unittest.main()
