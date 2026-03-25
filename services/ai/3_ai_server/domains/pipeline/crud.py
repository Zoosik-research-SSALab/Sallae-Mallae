"""pipeline/crud.py — 파이프라인 시그널 DB 조회·저장 로직."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import text
from sqlalchemy.orm import Session


# 유효한 상태 전이 맵
_VALID_TRANSITIONS: dict[str, set[str]] = {
    "PENDING": {"PROCESSING"},
    "PROCESSING": {"DONE", "FAILED"},
}


def create_signal(db: Session, signal_type: str) -> dict:
    """파이프라인 시그널을 PENDING 상태로 생성하고 생성된 row를 반환."""
    row = db.execute(
        text("""
            INSERT INTO pipeline_signals (signal_type, status, retry_count)
            VALUES (:signal_type, 'PENDING', 0)
            RETURNING id, signal_type, status, retry_count, created_at, processed_at
        """),
        {"signal_type": signal_type},
    ).mappings().one()
    db.commit()
    return dict(row)


def get_signal(db: Session, signal_id: int) -> dict | None:
    """시그널 ID로 단건 조회."""
    row = db.execute(
        text("""
            SELECT id, signal_type, status, retry_count, created_at, processed_at
            FROM pipeline_signals
            WHERE id = :signal_id
        """),
        {"signal_id": signal_id},
    ).mappings().first()
    return dict(row) if row else None


def update_signal_status(
    db: Session,
    signal_id: int,
    new_status: str,
) -> dict | None:
    """시그널 상태를 전이하고 갱신된 row를 반환.

    상태 전이 규칙:
        PENDING → PROCESSING
        PROCESSING → DONE | FAILED

    규칙에 맞지 않으면 ValueError를 발생시킨다.
    """
    current = get_signal(db, signal_id)
    if current is None:
        return None

    current_status = current["status"]
    allowed = _VALID_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        raise ValueError(
            f"상태 전이 불가: {current_status} → {new_status} "
            f"(허용: {allowed or '없음'})"
        )

    processed_at = datetime.utcnow() if new_status in ("DONE", "FAILED") else None
    retry_increment = 1 if new_status == "FAILED" else 0

    row = db.execute(
        text("""
            UPDATE pipeline_signals
            SET status = :new_status,
                processed_at = COALESCE(:processed_at, processed_at),
                retry_count = retry_count + :retry_increment
            WHERE id = :signal_id
            RETURNING id, signal_type, status, retry_count, created_at, processed_at
        """),
        {
            "signal_id": signal_id,
            "new_status": new_status,
            "processed_at": processed_at,
            "retry_increment": retry_increment,
        },
    ).mappings().one()
    db.commit()
    return dict(row)


def get_latest_signal(db: Session, signal_type: str) -> dict | None:
    """특정 signal_type의 오늘자 최신 시그널을 조회."""
    row = db.execute(
        text("""
            SELECT id, signal_type, status, retry_count, created_at, processed_at
            FROM pipeline_signals
            WHERE signal_type = :signal_type
              AND created_at >= CURRENT_DATE
            ORDER BY created_at DESC
            LIMIT 1
        """),
        {"signal_type": signal_type},
    ).mappings().first()
    return dict(row) if row else None
