"""pipeline/crud.py — 파이프라인 시그널 DB 조회·저장 로직."""

from __future__ import annotations

from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlalchemy.orm import Session


KST = ZoneInfo("Asia/Seoul")

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
    """시그널 상태를 원자적으로 전이하고 갱신된 row를 반환.

    상태 전이 규칙:
        PENDING → PROCESSING
        PROCESSING → DONE | FAILED

    허용되지 않는 전이이면 ValueError를 발생시킨다.
    시그널이 존재하지 않으면 None을 반환한다.
    """
    allowed = set()
    for from_status, to_statuses in _VALID_TRANSITIONS.items():
        if new_status in to_statuses:
            allowed.add(from_status)

    if not allowed:
        raise ValueError(f"유효하지 않은 대상 상태: {new_status}")

    processed_at = datetime.now(tz=KST) if new_status in ("DONE", "FAILED") else None
    retry_increment = 1 if new_status == "FAILED" else 0

    # 원자적 업데이트: WHERE에서 현재 상태를 검증하여 race condition 방지
    result = db.execute(
        text("""
            UPDATE pipeline_signals
            SET status = :new_status,
                processed_at = COALESCE(:processed_at, processed_at),
                retry_count = retry_count + :retry_increment
            WHERE id = :signal_id
              AND status = ANY(:allowed_statuses)
            RETURNING id, signal_type, status, retry_count, created_at, processed_at
        """),
        {
            "signal_id": signal_id,
            "new_status": new_status,
            "processed_at": processed_at,
            "retry_increment": retry_increment,
            "allowed_statuses": list(allowed),
        },
    )
    row = result.mappings().first()

    if row is not None:
        return dict(row)

    # 업데이트 실패: not found vs invalid transition 구분
    current = get_signal(db, signal_id)
    if current is None:
        return None

    raise ValueError(
        f"상태 전이 불가: {current['status']} → {new_status} "
        f"(허용 원본 상태: {allowed})"
    )


def get_latest_signal(db: Session, signal_type: str) -> dict | None:
    """특정 signal_type의 오늘(KST) 최신 시그널을 조회."""
    today = datetime.now(tz=KST).date()
    window_start = datetime.combine(today, time.min, tzinfo=KST)
    window_end = datetime.combine(today, time.max, tzinfo=KST)

    row = db.execute(
        text("""
            SELECT id, signal_type, status, retry_count, created_at, processed_at
            FROM pipeline_signals
            WHERE signal_type = :signal_type
              AND created_at >= :window_start
              AND created_at <= :window_end
            ORDER BY created_at DESC
            LIMIT 1
        """),
        {
            "signal_type": signal_type,
            "window_start": window_start,
            "window_end": window_end,
        },
    ).mappings().first()
    return dict(row) if row else None
