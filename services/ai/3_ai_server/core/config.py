from urllib.parse import quote_plus

from pydantic_settings import BaseSettings


def _normalize_db_url(raw_url: str) -> str:
    if '://' not in raw_url or '@' not in raw_url:
        return raw_url

    scheme_end = raw_url.index('://') + 3
    at_host = raw_url.rindex('@')
    user_pass = raw_url[scheme_end:at_host]
    if ':' not in user_pass:
        return raw_url

    user, password = user_pass.split(':', 1)
    return (
        f'{raw_url[:scheme_end]}{quote_plus(user)}:{quote_plus(password)}'
        f'{raw_url[at_host:]}'
    )


class Settings(BaseSettings):
    # 서버 설정
    APP_TITLE: str = 'sallaemallae AI Server'
    DEBUG: bool = False

    # 내부 API 인증
    INTERNAL_API_KEY: str = 'change_me_ai_internal_key'

    # DB 설정
    AI_DB_URL: str = 'postgresql+psycopg2://app_user:change_me_app@localhost:5432/app'

    # Redis 설정
    REDIS_URL: str = 'redis://localhost:6379/0'

    # Spring Boot 백엔드 서버 URL
    BACKEND_BASE_URL: str = 'http://localhost:8080'

    class Config:
        env_file = '.env'
        env_file_encoding = 'utf-8'


settings = Settings()
AI_DB_URL = _normalize_db_url(settings.AI_DB_URL)


# --- DB 설정 (기존 shared_resources/core/db.py + base.py) ---

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

engine = create_engine(AI_DB_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base = declarative_base()


def get_session():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
