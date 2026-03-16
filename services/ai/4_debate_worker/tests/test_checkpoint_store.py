from __future__ import annotations

import unittest
from datetime import date
from tempfile import TemporaryDirectory
from pathlib import Path

from worker.checkpoint_store import CheckpointStore
from worker.schemas import DebateResultRequest, TargetItem


class CheckpointStoreTest(unittest.TestCase):
    def test_sync_targets_returns_only_new_rows(self) -> None:
        with TemporaryDirectory() as temp_dir:
            store = CheckpointStore(Path(temp_dir) / "worker.sqlite3")
            run_key = store.build_run_key(report_date=date(2026, 3, 16), source="trading_history", portfolio_id=1)
            store.ensure_run(run_key=run_key, report_date=date(2026, 3, 16), source="trading_history", portfolio_id=1)

            first_count = store.sync_targets(
                run_key=run_key,
                targets=[TargetItem(stock_id=1, ticker="005930", stock_name="삼성전자")],
            )
            second_count = store.sync_targets(
                run_key=run_key,
                targets=[TargetItem(stock_id=1, ticker="005930", stock_name="삼성전자")],
            )

            self.assertEqual(first_count, 1)
            self.assertEqual(second_count, 0)

    def test_store_can_resume_cached_result_payload(self) -> None:
        with TemporaryDirectory() as temp_dir:
            store = CheckpointStore(Path(temp_dir) / "worker.sqlite3")
            run_key = store.build_run_key(report_date=date(2026, 3, 16), source="trading_history", portfolio_id=1)
            store.ensure_run(run_key=run_key, report_date=date(2026, 3, 16), source="trading_history", portfolio_id=1)
            store.sync_targets(
                run_key=run_key,
                targets=[TargetItem(stock_id=1, ticker="005930", stock_name="삼성전자")],
            )

            first_claim = store.claim_next_job(run_key=run_key, lease_seconds=300)
            self.assertIsNotNone(first_claim)
            self.assertIsNone(first_claim.result_payload)

            payload = DebateResultRequest(
                stock_id=1,
                ticker="005930",
                report_date=date(2026, 3, 16),
                debate_version="debate-v1",
                chairman_signal="BUY",
                debate_confidence=0.82,
            )
            store.save_result_payload(run_key=run_key, stock_id=1, payload=payload)

            second_claim = store.claim_next_job(run_key=run_key, lease_seconds=300)
            self.assertIsNotNone(second_claim)
            self.assertIsNotNone(second_claim.result_payload)
            self.assertEqual(second_claim.result_payload.chairman_signal, "BUY")


if __name__ == "__main__":
    unittest.main()
