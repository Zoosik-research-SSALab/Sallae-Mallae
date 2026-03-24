from __future__ import annotations

from pathlib import Path
from urllib.parse import quote_plus

from pydantic import Field
from pydantic_settings import BaseSettings


def _normalize_db_url(raw_url: str) -> str:
    if "://" not in raw_url or "@" not in raw_url:
        return raw_url

    scheme_end = raw_url.index("://") + 3
    at_host = raw_url.rindex("@")
    user_pass = raw_url[scheme_end:at_host]
    if ":" not in user_pass:
        return raw_url

    user, password = user_pass.split(":", 1)
    return (
        f"{raw_url[:scheme_end]}{quote_plus(user)}:{quote_plus(password)}"
        f"{raw_url[at_host:]}"
    )


class Settings(BaseSettings):
    DEBUG: bool = False

    AI_SERVER_BASE_URL: str = "http://localhost:8000"
    INTERNAL_API_KEY: str = "change_me_ai_internal_key"
    AI_SERVER_TIMEOUT_SECONDS: int = 30
    AI_DB_URL: str = "postgresql+psycopg2://app_user:change_me_app@localhost:5432/app"

    LLM_PROVIDER: str = "ollama"
    LLM_BASE_URL: str = "http://localhost:11434"
    LLM_MODEL: str = "qwen2.5:7b-instruct"
    LLM_REQUEST_TIMEOUT_SECONDS: int = 180
    LLM_TEMPERATURE: float = 0.2

    DEBATE_VERSION: str = "debate-v1"
    MAX_DEBATE_ROUNDS: int = Field(default=3, ge=1, le=3)
    NEWS_LIMIT: int = Field(default=8, ge=1, le=20)
    FINANCIAL_LIMIT: int = Field(default=4, ge=1, le=8)
    MAX_TARGETS_PER_RUN: int = Field(default=200, ge=1, le=500)

    TARGET_SOURCE: str = "trading_history"
    TARGET_MARKET_TYPE: str = "KOSPI"
    TARGET_PORTFOLIO_ID: int | None = None

    LOOP_INTERVAL_SECONDS: int = Field(default=300, ge=30)
    PIPELINE_POLL_INTERVAL_SECONDS: int = Field(default=300, ge=30)
    MAX_RETRY_ATTEMPTS: int = Field(default=5, ge=1, le=20)
    RETRY_BACKOFF_SECONDS: int = Field(default=30, ge=5)
    JOB_LEASE_SECONDS: int = Field(default=900, ge=60)
    BACKFILL_POLL_INTERVAL_SECONDS: int = Field(default=60, ge=5, le=3600)
    RESOURCE_POLL_INTERVAL_SECONDS: int = Field(default=15, ge=5, le=300)
    RESOURCE_MIN_RAM_AVAILABLE_MB: int = Field(default=2048, ge=256)
    RESOURCE_MIN_RAM_AVAILABLE_RATIO: float = Field(default=0.12, ge=0.01, le=0.95)
    RESOURCE_MIN_GPU_FREE_MB: int = Field(default=1024, ge=0)

    WORKER_NAME: str = "desktop-worker-01"
    STATE_DIR: str = "./state"
    PORTFOLIO_SCRIPT_PATH: str = "../3_ai_server/scripts/chairman_portfolio_daily.py"
    PORTFOLIO_NAME: str = "의장 포트폴리오"
    PORTFOLIO_MODEL_VERSION: str = "chairman-v1"
    PORTFOLIO_INITIAL_CAPITAL: int = 100_000_000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def state_dir(self) -> Path:
        return Path(self.STATE_DIR).resolve()

    @property
    def checkpoint_db_path(self) -> Path:
        return self.state_dir / "worker_checkpoints.sqlite3"

    @property
    def log_dir(self) -> Path:
        return self.state_dir / "logs"

    @property
    def worker_root(self) -> Path:
        return Path(__file__).resolve().parents[1]

    @property
    def portfolio_script_path(self) -> Path:
        return (self.worker_root / self.PORTFOLIO_SCRIPT_PATH).resolve()

    @property
    def ai_db_url(self) -> str:
        return _normalize_db_url(self.AI_DB_URL)


settings = Settings()
