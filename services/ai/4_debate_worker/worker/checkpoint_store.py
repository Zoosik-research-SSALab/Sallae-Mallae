from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Iterator, Sequence

from worker.schemas import DebateResultRequest, StoredJob, TargetItem


@dataclass
class CheckpointCounts:
    discovered: int
    succeeded: int
    duplicated: int
    failed_retryable: int
    failed_permanent: int


@dataclass
class RunProgress:
    run_key: str
    run_exists: bool
    total: int
    pending: int
    running: int
    result_ready: int
    succeeded: int
    duplicated: int
    failed_retryable: int
    failed_permanent: int
    earliest_next_retry_at: datetime | None

    @property
    def unfinished(self) -> int:
        return self.pending + self.running + self.result_ready + self.failed_retryable

    @property
    def retry_scheduled(self) -> bool:
        return self.failed_retryable > 0 and self.earliest_next_retry_at is not None

    @property
    def terminal(self) -> bool:
        return self.unfinished == 0


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
        with self._connection() as conn:
            conn.execute(
                """
                INSERT INTO runs (run_key, report_date, source, portfolio_id, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(run_key) DO UPDATE SET updated_at=excluded.updated_at
                """,
                (run_key, report_date.isoformat(), source, portfolio_id, now, now),
            )

    def sync_targets(self, *, run_key: str, targets: list[TargetItem]) -> int:
        now = self._now_iso()
        inserted = 0
        with self._connection() as conn:
            for target in targets:
                inserted_row = conn.execute(
                    """
                    INSERT OR IGNORE INTO jobs (
                        run_key, stock_id, ticker, stock_name, status, attempts, result_payload_json,
                        last_error, next_retry_at, lease_expires_at, created_at, updated_at
                    )
                    VALUES (?, ?, ?, ?, 'pending', 0, NULL, NULL, NULL, NULL, ?, ?)
                    """,
                    (run_key, target.stock_id, target.ticker, target.stock_name, now, now),
                )
                if inserted_row.rowcount == 1:
                    inserted += 1
                conn.execute(
                    """
                    UPDATE jobs
                    SET ticker = ?,
                        stock_name = ?,
                        updated_at = ?
                    WHERE run_key = ? AND stock_id = ?
                    """,
                    (target.ticker, target.stock_name, now, run_key, target.stock_id),
                )
        return inserted

    def claim_next_job(self, *, run_key: str, lease_seconds: int) -> StoredJob | None:
        now = datetime.now(UTC)
        now_iso = now.isoformat()
        lease_expires_at = (now + timedelta(seconds=lease_seconds)).isoformat()

        with self._connection() as conn:
            conn.execute("BEGIN IMMEDIATE")
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

            updated = conn.execute(
                """
                UPDATE jobs
                SET status = 'running',
                    attempts = attempts + 1,
                    lease_expires_at = ?,
                    updated_at = ?
                WHERE run_key = ? AND stock_id = ?
                  AND (
                    status IN ('pending', 'result_ready')
                    OR (status = 'failed_retryable' AND (next_retry_at IS NULL OR next_retry_at <= ?))
                    OR (status = 'running' AND lease_expires_at IS NOT NULL AND lease_expires_at <= ?)
                  )
                """,
                (lease_expires_at, now_iso, run_key, row["stock_id"], now_iso, now_iso),
            )
            if updated.rowcount != 1:
                return None

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
            next_retry_at=None,
        )

    def save_result_payload(self, *, run_key: str, stock_id: int, payload: DebateResultRequest) -> None:
        now = self._now_iso()
        with self._connection() as conn:
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

    def mark_succeeded(self, *, run_key: str, stock_id: int, status: str) -> None:
        now = self._now_iso()
        with self._connection() as conn:
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

    def mark_failed(self, *, run_key: str, stock_id: int, retryable: bool, error_message: str, backoff_seconds: int) -> None:
        now = datetime.now(UTC)
        next_retry_at = (now + timedelta(seconds=backoff_seconds)).isoformat() if retryable else None
        status = "failed_retryable" if retryable else "failed_permanent"
        with self._connection() as conn:
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

    def get_counts(self, *, run_key: str) -> CheckpointCounts:
        with self._connection() as conn:
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

    def get_progress(self, *, run_key: str) -> RunProgress:
        with self._connection() as conn:
            run_exists = conn.execute(
                "SELECT 1 FROM runs WHERE run_key = ? LIMIT 1",
                (run_key,),
            ).fetchone() is not None
            rows = conn.execute(
                """
                SELECT status, COUNT(*) AS count, MIN(next_retry_at) AS earliest_next_retry_at
                FROM jobs
                WHERE run_key = ?
                GROUP BY status
                """,
                (run_key,),
            ).fetchall()

        counts = {
            "pending": 0,
            "running": 0,
            "result_ready": 0,
            "succeeded": 0,
            "duplicated": 0,
            "failed_retryable": 0,
            "failed_permanent": 0,
        }
        earliest_next_retry_at: datetime | None = None
        total = 0
        for row in rows:
            status = row["status"]
            count = int(row["count"])
            counts[status] = count
            total += count
            retry_at_raw = row["earliest_next_retry_at"]
            if status == "failed_retryable" and retry_at_raw:
                retry_at = datetime.fromisoformat(retry_at_raw)
                if earliest_next_retry_at is None or retry_at < earliest_next_retry_at:
                    earliest_next_retry_at = retry_at

        return RunProgress(
            run_key=run_key,
            run_exists=run_exists,
            total=total,
            pending=counts["pending"],
            running=counts["running"],
            result_ready=counts["result_ready"],
            succeeded=counts["succeeded"],
            duplicated=counts["duplicated"],
            failed_retryable=counts["failed_retryable"],
            failed_permanent=counts["failed_permanent"],
            earliest_next_retry_at=earliest_next_retry_at,
        )

    def list_jobs(
        self,
        *,
        run_key: str,
        statuses: Sequence[str] | None = None,
        limit: int | None = None,
    ) -> list[StoredJob]:
        conditions = ["run_key = ?"]
        params: list[object] = [run_key]
        if statuses:
            placeholders = ",".join("?" for _ in statuses)
            conditions.append(f"status IN ({placeholders})")
            params.extend(statuses)

        sql = f"""
            SELECT run_key, stock_id, ticker, stock_name, status, attempts, result_payload_json, last_error, next_retry_at
            FROM jobs
            WHERE {" AND ".join(conditions)}
            ORDER BY
              CASE status
                WHEN 'failed_permanent' THEN 0
                WHEN 'failed_retryable' THEN 1
                WHEN 'running' THEN 2
                WHEN 'result_ready' THEN 3
                WHEN 'pending' THEN 4
                ELSE 5
              END,
              ticker ASC
        """
        if limit is not None:
            sql += " LIMIT ?"
            params.append(limit)

        with self._connection() as conn:
            rows = conn.execute(sql, params).fetchall()

        jobs: list[StoredJob] = []
        for row in rows:
            payload = DebateResultRequest.model_validate_json(row["result_payload_json"]) if row["result_payload_json"] else None
            next_retry_at = datetime.fromisoformat(row["next_retry_at"]) if row["next_retry_at"] else None
            jobs.append(
                StoredJob(
                    run_key=row["run_key"],
                    stock_id=row["stock_id"],
                    ticker=row["ticker"],
                    stock_name=row["stock_name"],
                    status=row["status"],
                    attempts=row["attempts"],
                    result_payload=payload,
                    last_error=row["last_error"],
                    next_retry_at=next_retry_at,
                )
            )
        return jobs

    def requeue_jobs(
        self,
        *,
        run_key: str,
        statuses: Sequence[str],
        stock_ids: Sequence[int] | None = None,
        clear_result_payload: bool = False,
    ) -> int:
        if not statuses:
            return 0

        now = self._now_iso()
        clear_flag = 1 if clear_result_payload else 0
        conditions = ["run_key = ?"]
        condition_params: list[object] = [run_key]

        status_placeholders = ",".join("?" for _ in statuses)
        conditions.append(f"status IN ({status_placeholders})")
        condition_params.extend(statuses)

        if stock_ids:
            stock_placeholders = ",".join("?" for _ in stock_ids)
            conditions.append(f"stock_id IN ({stock_placeholders})")
            condition_params.extend(stock_ids)

        sql = f"""
            UPDATE jobs
            SET status = CASE
                    WHEN result_payload_json IS NOT NULL AND ? = 0 THEN 'result_ready'
                    ELSE 'pending'
                END,
                result_payload_json = CASE
                    WHEN ? = 1 THEN NULL
                    ELSE result_payload_json
                END,
                last_error = NULL,
                next_retry_at = NULL,
                lease_expires_at = NULL,
                completed_at = NULL,
                updated_at = ?
            WHERE {" AND ".join(conditions)}
        """

        with self._connection() as conn:
            cursor = conn.execute(sql, [clear_flag, clear_flag, now, *condition_params])
            return cursor.rowcount

    def _initialize(self) -> None:
        with self._connection() as conn:
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

    @contextmanager
    def _connection(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def _now_iso(self) -> str:
        return datetime.now(UTC).isoformat()
