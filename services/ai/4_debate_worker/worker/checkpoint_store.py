from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

from worker.schemas import DebateResultRequest, StoredJob, TargetItem


@dataclass
class CheckpointCounts:
    discovered: int
    succeeded: int
    duplicated: int
    failed_retryable: int
    failed_permanent: int


class CheckpointStore:
    def __init__(self, db_path: Path):
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def build_run_key(self, *, report_date: date, source: str, portfolio_id: int | None) -> str:
        portfolio_key = str(portfolio_id) if portfolio_id is not None else "all"
        return f"{report_date.isoformat()}:{source}:{portfolio_key}"

    def ensure_run(self, *, run_key: str, report_date: date, source: str, portfolio_id: int | None) -> None:
        now = self._now_iso()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO runs (run_key, report_date, source, portfolio_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(run_key) DO UPDATE SET updated_at=excluded.updated_at
                """,
                (run_key, report_date.isoformat(), source, portfolio_id, now, now),
            )
            conn.commit()

    def sync_targets(self, *, run_key: str, targets: list[TargetItem]) -> int:
        now = self._now_iso()
        inserted = 0
        with self._connect() as conn:
            for target in targets:
                cursor = conn.execute(
                    """
                    INSERT INTO jobs (
                        run_key, stock_id, ticker, stock_name, status, attempts, result_payload_json,
                        last_error, next_retry_at, lease_expires_at, created_at, updated_at
                    )
                    VALUES (?, ?, ?, ?, 'pending', 0, NULL, NULL, NULL, NULL, ?, ?)
                    ON CONFLICT(run_key, stock_id) DO UPDATE SET
                        ticker=excluded.ticker,
                        stock_name=excluded.stock_name,
                        updated_at=excluded.updated_at
                    """,
                    (run_key, target.stock_id, target.ticker, target.stock_name, now, now),
                )
                if cursor.rowcount > 0:
                    inserted += 1
            conn.commit()
        return inserted

    def claim_next_job(self, *, run_key: str, lease_seconds: int) -> StoredJob | None:
        now = datetime.now(UTC)
        now_iso = now.isoformat()
        lease_expires_at = (now + timedelta(seconds=lease_seconds)).isoformat()

        with self._connect() as conn:
            row = conn.execute(
                """
                SELECT run_key, stock_id, ticker, stock_name, status, attempts, result_payload_json, last_error
                FROM jobs
                WHERE run_key = ?
                  AND (
                    status IN ('pending', 'result_ready')
                    OR (status = 'failed_retryable' AND (next_retry_at IS NULL OR next_retry_at <= ?))
                    OR (status = 'running' AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?)
                  )
                ORDER BY
                  CASE status
                    WHEN 'result_ready' THEN 0
                    WHEN 'failed_retryable' THEN 1
                    WHEN 'running' THEN 2
                    ELSE 3
                  END,
                  ticker ASC
                LIMIT 1
                """,
                (run_key, now_iso, now_iso),
            ).fetchone()
            if row is None:
                return None

            conn.execute(
                """
                UPDATE jobs
                SET status = 'running',
                    attempts = attempts + 1,
                    lease_expires_at = ?,
                    updated_at = ?
                WHERE run_key = ? AND stock_id = ?
                """,
                (lease_expires_at, now_iso, run_key, row["stock_id"]),
            )
            conn.commit()

        payload = DebateResultRequest.model_validate_json(row["result_payload_json"]) if row["result_payload_json"] else None
        return StoredJob(
            run_key=row["run_key"],
            stock_id=row["stock_id"],
            ticker=row["ticker"],
            stock_name=row["stock_name"],
            status=row["status"],
            attempts=row["attempts"] + 1,
            result_payload=payload,
            last_error=row["last_error"],
        )

    def save_result_payload(self, *, run_key: str, stock_id: int, payload: DebateResultRequest) -> None:
        now = self._now_iso()
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE jobs
                SET status = 'result_ready',
                    result_payload_json = ?,
                    last_error = NULL,
                    updated_at = ?
                WHERE run_key = ? AND stock_id = ?
                """,
                (payload.model_dump_json(), now, run_key, stock_id),
            )
            conn.commit()

    def mark_succeeded(self, *, run_key: str, stock_id: int, status: str) -> None:
        now = self._now_iso()
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE jobs
                SET status = ?,
                    last_error = NULL,
                    lease_expires_at = NULL,
                    next_retry_at = NULL,
                    completed_at = ?,
                    updated_at = ?
                WHERE run_key = ? AND stock_id = ?
                """,
                (status, now, now, run_key, stock_id),
            )
            conn.commit()

    def mark_failed(self, *, run_key: str, stock_id: int, retryable: bool, error_message: str, backoff_seconds: int) -> None:
        now = datetime.now(UTC)
        next_retry_at = (now + timedelta(seconds=backoff_seconds)).isoformat() if retryable else None
        status = "failed_retryable" if retryable else "failed_permanent"
        with self._connect() as conn:
            conn.execute(
                """
                UPDATE jobs
                SET status = ?,
                    last_error = ?,
                    next_retry_at = ?,
                    lease_expires_at = NULL,
                    updated_at = ?
                WHERE run_key = ? AND stock_id = ?
                """,
                (status, error_message[:1000], next_retry_at, now.isoformat(), run_key, stock_id),
            )
            conn.commit()

    def get_counts(self, *, run_key: str) -> CheckpointCounts:
        with self._connect() as conn:
            discovered = conn.execute("SELECT COUNT(*) FROM jobs WHERE run_key = ?", (run_key,)).fetchone()[0]
            succeeded = conn.execute(
                "SELECT COUNT(*) FROM jobs WHERE run_key = ? AND status = 'succeeded'",
                (run_key,),
            ).fetchone()[0]
            duplicated = conn.execute(
                "SELECT COUNT(*) FROM jobs WHERE run_key = ? AND status = 'duplicated'",
                (run_key,),
            ).fetchone()[0]
            failed_retryable = conn.execute(
                "SELECT COUNT(*) FROM jobs WHERE run_key = ? AND status = 'failed_retryable'",
                (run_key,),
            ).fetchone()[0]
            failed_permanent = conn.execute(
                "SELECT COUNT(*) FROM jobs WHERE run_key = ? AND status = 'failed_permanent'",
                (run_key,),
            ).fetchone()[0]
        return CheckpointCounts(
            discovered=discovered,
            succeeded=succeeded,
            duplicated=duplicated,
            failed_retryable=failed_retryable,
            failed_permanent=failed_permanent,
        )

    def _initialize(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS runs (
                    run_key TEXT PRIMARY KEY,
                    report_date TEXT NOT NULL,
                    source TEXT NOT NULL,
                    portfolio_id INTEGER NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS jobs (
                    run_key TEXT NOT NULL,
                    stock_id INTEGER NOT NULL,
                    ticker TEXT NOT NULL,
                    stock_name TEXT NOT NULL,
                    status TEXT NOT NULL,
                    attempts INTEGER NOT NULL DEFAULT 0,
                    result_payload_json TEXT NULL,
                    last_error TEXT NULL,
                    next_retry_at TEXT NULL,
                    lease_expires_at TEXT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    completed_at TEXT NULL,
                    PRIMARY KEY (run_key, stock_id)
                )
                """
            )
            conn.commit()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _now_iso(self) -> str:
        return datetime.now(UTC).isoformat()

