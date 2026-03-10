import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 환경변수 또는 core.config에서 DB URL을 가져온다
DB_URL = os.getenv("AI_DB_URL", "postgresql+psycopg2://app_user:change_me_app@localhost:5432/app")

engine = create_engine(DB_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def get_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
