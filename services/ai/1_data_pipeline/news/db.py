"""
뉴스 데이터 파이프라인 — DB 연결 및 세션 관리
"""
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from config import AI_DB_URL

engine = create_engine(AI_DB_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


@contextmanager
def get_session() -> Session:
    """DB 세션을 context manager로 반환. with 블록 종료 시 자동 close."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()