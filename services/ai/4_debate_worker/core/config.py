from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DEBUG: bool = False

    AI_SERVER_BASE_URL: str = "http://localhost:8000"
    INTERNAL_API_KEY: str = "change_me_ai_internal_key"
    AI_SERVER_TIMEOUT_SECONDS: int = 30

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


settings = Settings()
