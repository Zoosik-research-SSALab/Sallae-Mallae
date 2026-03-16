"""
뉴스 데이터 파이프라인 — DB 연결 및 세션 관리
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from config import AI_DB_URL

engine = create_engine(AI_DB_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def get_session() -> Session:
    """DB 세션을 반환합니다. 호출 측에서 close() 또는 context manager로 관리하세요."""
    return SessionLocal()
