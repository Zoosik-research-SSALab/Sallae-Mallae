"""
utils/db.py
PostgreSQL 데이터베이스 연결 공용 모듈.

모든 DB 접속은 이 모듈을 통해 수행하여 설정을 한 곳에서 관리합니다.
비밀번호 등 민감 정보는 환경변수에서만 읽으며, 하드코딩하지 않습니다.

사용 예:
    from utils.db import get_connection, load_ticker_to_stock_id

    conn = get_connection()
    try:
        ticker_map = load_ticker_to_stock_id(conn)
        ...
    finally:
        conn.close()
"""

from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# DB 접속 설정 (환경변수 필수)
# ---------------------------------------------------------------------------
DB_HOST: str = os.environ.get("DB_HOST", "localhost")
DB_PORT: int = int(os.environ.get("DB_PORT", "15432"))
DB_NAME: str = os.environ.get("DB_NAME", "app")
DB_USER: str = os.environ.get("DB_USER", "app_user")
DB_PASSWORD: str | None = os.environ.get("DB_PASSWORD")


def get_connection():
    """
    PostgreSQL 연결을 반환한다.

    DB_PASSWORD 환경변수가 설정되지 않으면 ValueError를 발생시킵니다.

    Returns:
        psycopg2 connection 객체

    Raises:
        ValueError: DB_PASSWORD 미설정 시
        psycopg2.OperationalError: 연결 실패 시
    """
    import psycopg2

    if not DB_PASSWORD:
        raise ValueError(
            "DB_PASSWORD 환경변수가 설정되지 않았습니다. "
            ".env 파일 또는 환경변수를 확인하세요."
        )

    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )


def load_ticker_to_stock_id(conn) -> dict[str, int]:
    """stocks 테이블에서 ticker → id 매핑을 가져온다."""
    cur = conn.cursor()
    cur.execute("SELECT id, ticker FROM stocks")
    mapping = {row[1]: row[0] for row in cur.fetchall()}
    cur.close()
    logger.info("ticker → stock_id 매핑 로드: %d종목", len(mapping))
    return mapping
