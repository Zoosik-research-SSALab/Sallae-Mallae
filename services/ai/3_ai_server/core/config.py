from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # 서버 설정
    APP_TITLE: str = "sallaemallae AI Server"
    DEBUG: bool = False

    # DB 설정
    AI_DB_URL: str = "postgresql+psycopg2://app_dev_user:change_me_dev@localhost:5432/app_dev"

    # Spring Boot 백엔드 서버 URL
    BACKEND_BASE_URL: str = "http://localhost:8080"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
