from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from sqlalchemy import create_engine, text


KST = ZoneInfo("Asia/Seoul")


@dataclass(frozen=True)
class PipelineSignalRecord:
    id: int
    signal_type: str
    status: str
    retry_count: int
    created_at: datetime | None
    processed_at: datetime | None


class PipelineSignalStore:
    def __init__(self, db_url: str):
        self.engine = create_engine(db_url, pool_pre_ping=True)

    def exists_done_for_date(self, signal_type: str, business_date: date) -> bool:
        row = self._fetch_latest(signal_type=signal_type, status="DONE", business_date=business_date)
        return row is not None

    def fetch_latest_for_date(
        self,
        *,
        signal_type: str,
        business_date: date,
        status: str | None = None,
    ) -> PipelineSignalRecord | None:
        return self._fetch_latest(signal_type=signal_type, status=status, business_date=business_date)

    def insert_done(self, signal_type: str) -> None:
        self._insert_signal(signal_type=signal_type, status="DONE", retry_count=0)

    def insert_failed(self, signal_type: str, retry_count: int = 0) -> None:
        self._insert_signal(signal_type=signal_type, status="FAILED", retry_count=retry_count)

    def get_latest_portfolio_record_date(self, portfolio_name: str) -> date | None:
        with self.engine.connect() as conn:
            portfolio_id = conn.execute(
                text(
                    """
                    SELECT id
                    FROM ai_portfolio
                    WHERE name = :portfolio_name
                    ORDER BY updated_at DESC, id DESC
                    LIMIT 1
                    """
                ),
                {"portfolio_name": portfolio_name},
            ).scalar_one_or_none()
            if portfolio_id is None:
                return None

            return conn.execute(
                text(
                    """
                    SELECT MAX(record_date)
                    FROM ai_daily_performance
                    WHERE portfolio_id = :portfolio_id
                    """
                ),
                {"portfolio_id": portfolio_id},
            ).scalar_one()

    def _fetch_latest(
        self,
        *,
        signal_type: str,
        business_date: date,
        status: str | None,
    ) -> PipelineSignalRecord | None:
        window_start = datetime.combine(business_date, time.min, tzinfo=KST)
        window_end = datetime.combine(business_date, time.max, tzinfo=KST)
        sql = """
            SELECT id, signal_type, status, retry_count, created_at, processed_at
            FROM pipeline_signals
            WHERE signal_type = :signal_type
              AND created_at >= :window_start
              AND created_at <= :window_end
        """
        params: dict[str, object] = {
            "signal_type": signal_type,
            "window_start": window_start,
            "window_end": window_end,
        }
        if status is not None:
            sql += " AND status = :status"
            params["status"] = status
        sql += " ORDER BY created_at DESC, id DESC LIMIT 1"

        with self.engine.connect() as conn:
            row = conn.execute(text(sql), params).mappings().first()

        if row is None:
            return None
        return PipelineSignalRecord(
            id=int(row["id"]),
            signal_type=str(row["signal_type"]),
            status=str(row["status"]),
            retry_count=int(row["retry_count"]),
            created_at=row["created_at"],
            processed_at=row["processed_at"],
        )

    def _insert_signal(self, *, signal_type: str, status: str, retry_count: int) -> None:
        processed_at = datetime.now(tz=KST) if status in {"DONE", "FAILED"} else None
        with self.engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT INTO pipeline_signals (signal_type, status, retry_count, processed_at)
                    VALUES (:signal_type, :status, :retry_count, :processed_at)
                    """
                ),
                {
                    "signal_type": signal_type,
                    "status": status,
                    "retry_count": retry_count,
                    "processed_at": processed_at,
                },
            )
