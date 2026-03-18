"""
config.py
KOSPI 200 데이터 수집 프로젝트 중앙 설정 관리 모듈.
로컬 디스크 기반, rclone으로 Google Drive 동기화 지원.
Python 3.10+ 호환, Google Colab 동작 지원.
"""

import sys
from pathlib import Path
from dotenv import load_dotenv
import os

# .env 파일 로드 (파일이 없어도 오류 없이 진행)
load_dotenv()

# ---------------------------------------------------------------------------
# Colab 감지
# ---------------------------------------------------------------------------
IS_COLAB: bool = "google.colab" in sys.modules

# ---------------------------------------------------------------------------
# Base Path
# ---------------------------------------------------------------------------
_base_path_str: str | None = os.environ.get("BASE_PATH")

if _base_path_str is None:
    if IS_COLAB:
        _base_path_str = "/content/drive/MyDrive/kospi200-project"
    else:
        _base_path_str = "./data"

BASE_PATH: Path = Path(_base_path_str)

# ---------------------------------------------------------------------------
# 원시 데이터 경로
# ---------------------------------------------------------------------------
RAW_OHLCV_PATH: Path = BASE_PATH / "raw" / "ohlcv"
RAW_SUPPLY_PATH: Path = BASE_PATH / "raw" / "supply_demand"
RAW_MACRO_PATH: Path = BASE_PATH / "raw" / "macro"
RAW_FINANCIAL_PATH: Path = BASE_PATH / "raw" / "financial"
RAW_UNIVERSE_PATH: Path = BASE_PATH / "raw" / "universe"
RAW_FUNDAMENTAL_PATH: Path = BASE_PATH / "raw" / "fundamental"

# ---------------------------------------------------------------------------
# 가공 데이터 경로
# ---------------------------------------------------------------------------
PROCESSED_BASE_PATH: Path = BASE_PATH / "processed" / "base_features"

# ---------------------------------------------------------------------------
# 로그 경로
# ---------------------------------------------------------------------------
LOGS_PATH: Path = BASE_PATH / "logs" / "collection"

# ---------------------------------------------------------------------------
# API 키
# ---------------------------------------------------------------------------
DART_API_KEY: str | None = os.environ.get("DART_API_KEY")
FRED_API_KEY: str | None = os.environ.get("FRED_API_KEY")
ECOS_API_KEY: str | None = os.environ.get("ECOS_API_KEY")
KRX_API_KEY: str | None = os.environ.get("KRX_API_KEY")
KRX_USER_ID: str | None = os.environ.get("KRX_USER_ID")
KRX_PASSWORD: str | None = os.environ.get("KRX_PASSWORD")
KIS_API_KEY: str | None = os.environ.get("KIS_API_KEY")
KIS_API_SECRET: str | None = os.environ.get("KIS_SECRET_KEY")

# ---------------------------------------------------------------------------
# 수집 설정
# ---------------------------------------------------------------------------
OHLCV_START_DATE: str = "2008-01-01"   # OHLCV 수집 시작일 (GFC 포함, 약 17년치)
SUPPLY_START_DATE: str = "2020-01-01"  # 수급 데이터 수집 시작일 (약 5년치)
PYKRX_DELAY: float = 0.5              # pykrx API 호출 간격 (초)
KIS_DELAY: float = 0.3               # KIS API 호출 간격 (초) — 초당 2~3건 권장
KIS_CHUNK_DAYS: int = 100            # KIS 수급 조회 1회 요청 날짜 범위 (달력일 기준)
PARQUET_COMPRESSION: str = "snappy"   # Parquet 압축 방식

# ---------------------------------------------------------------------------
# rclone 동기화 설정
# ---------------------------------------------------------------------------
RCLONE_REMOTE: str | None = os.environ.get("RCLONE_REMOTE")  # 예: "gdrive:kospi200-project"
RCLONE_AUTO_SYNC: bool = os.environ.get("RCLONE_AUTO_SYNC", "false").lower() == "true"
RCLONE_SYNC_DIRS: list[str] = [
    "raw/ohlcv", "raw/supply_demand", "raw/macro",
    "raw/universe", "raw/fundamental",
    "processed/base_features",
]  # rclone 동기화 대상 (subdir 단위, 다운로드·업로드 대칭)
# raw/financial은 파일 수(13,000+)가 많아 rclone sync timeout 발생.
# 대신 수집 시 신규 파일만 rclone copy로 개별 업로드한다 (pipeline.py 참조).
