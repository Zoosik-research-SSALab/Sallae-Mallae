from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 서버 설정
    APP_TITLE: str = "sallaemallae AI Server"
    DEBUG: bool = False

    # 내부 API 인증
    INTERNAL_API_KEY: str = "change_me_ai_internal_key"

    # DB 설정
    AI_DB_URL: str = "postgresql+psycopg2://app_user:change_me_app@localhost:5432/app"

    # Spring Boot 백엔드 서버 URL
    BACKEND_BASE_URL: str = "http://localhost:8080"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()


# --- DB 설정 (기존 shared_resources/core/db.py + base.py) ---

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

engine = create_engine(settings.AI_DB_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()


def get_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
