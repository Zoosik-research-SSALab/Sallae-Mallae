"""
config.py
KOSPI 200 ML 모델 중앙 설정 관리 모듈.
stock_data_collecter가 Google Drive에 저장한 데이터를 읽고,
ML 모델 산출물을 별도 경로에 저장합니다.
Python 3.10+ 호환, Google Colab 동작 지원.
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# .env 파일 로드 — 이 파일 기준 디렉토리에서 탐색 (ML 모델 전용 .env)
_THIS_DIR: Path = Path(__file__).parent
load_dotenv(_THIS_DIR / ".env")

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
        _base_path_str = "G:/내 드라이브/kospi200-project"

BASE_PATH: Path = Path(_base_path_str)

# ---------------------------------------------------------------------------
# 입력 경로 — stock_data_collecter 가 저장한 원시/가공 데이터
# ---------------------------------------------------------------------------
RAW_OHLCV_PATH: Path = BASE_PATH / "raw" / "ohlcv"
RAW_SUPPLY_PATH: Path = BASE_PATH / "raw" / "supply_demand"
RAW_MACRO_PATH: Path = BASE_PATH / "raw" / "macro"
RAW_FINANCIAL_PATH: Path = BASE_PATH / "raw" / "financial"
RAW_FUNDAMENTAL_PATH: Path = BASE_PATH / "raw" / "fundamental"
RAW_UNIVERSE_PATH: Path = BASE_PATH / "raw" / "universe"
PROCESSED_BASE_PATH: Path = BASE_PATH / "processed" / "base_features"

# ---------------------------------------------------------------------------
# 출력 경로 — ML 모델이 생성하는 피처·모델·검증 산출물
# ---------------------------------------------------------------------------
PROCESSED_LGBM_PATH: Path = BASE_PATH / "processed" / "lgbm_features"
PROCESSED_LSTM_PATH: Path = BASE_PATH / "processed" / "lstm_sequences"

PROCESSED_GARCH_PATH: Path = BASE_PATH / "processed" / "garch"

PROCESSED_ENSEMBLE_PATH: Path = BASE_PATH / "processed" / "ensemble"
PROCESSED_FUNDAMENTAL_PATH: Path = BASE_PATH / "processed" / "fundamental"
PROCESSED_PACKETS_PATH: Path = BASE_PATH / "processed" / "packets"

MODELS_PATH: Path = BASE_PATH / "models"
MODELS_LGBM_PATH: Path = BASE_PATH / "models" / "lgbm"
MODELS_LSTM_PATH: Path = BASE_PATH / "models" / "lstm"
MODELS_GARCH_PATH: Path = BASE_PATH / "models" / "garch"
MODELS_ENSEMBLE_PATH: Path = BASE_PATH / "models" / "ensemble"

VALIDATION_PATH: Path = BASE_PATH / "validation"
LOGS_PATH: Path = BASE_PATH / "logs" / "ml_model"

# ---------------------------------------------------------------------------
# 출력 경로 — Phase 1 클러스터 모델 산출물
# ---------------------------------------------------------------------------
PROCESSED_CLUSTER1_PATH: Path = BASE_PATH / "processed" / "cluster1"
MODELS_CLUSTER_PATH: Path = BASE_PATH / "models" / "cluster"
BACKTEST_PATH: Path = BASE_PATH / "backtest"

# ---------------------------------------------------------------------------
# 학습 설정 상수
# ---------------------------------------------------------------------------
TRAIN_END_DATE: str = "2020-12-31"  # 학습 종료일
TEST_START_DATE: str = "2021-01-01"  # 테스트 시작일
TEST_END_DATE: str = "2021-01-31"  # 테스트 종료일

SEQ_LEN: int = 20  # LSTM 시퀀스 길이 (거래일 수)
TARGET_HORIZON: int = 5  # 예측 대상 기간 (거래일 수)

PARQUET_COMPRESSION: str = "snappy"  # Parquet 압축 방식

# ---------------------------------------------------------------------------
# Phase 1 클러스터 LightGBM 상수
# ---------------------------------------------------------------------------
TRAIN_START_DATE: str = "2014-07-01"  # Walk-Forward 학습 시작일
VALID_START_DATE: str = "2021-01-01"  # 검증(Walk-Forward 예측) 시작일
VALID_END_DATE: str = "2022-12-31"  # 검증 종료일
FINAL_TEST_START: str = "2023-01-01"  # 최종 테스트 시작일
FINAL_TEST_END: str = "2026-01-31"  # 최종 테스트 종료일

TARGET_HORIZON_LONG: int = 20  # 예측 대상 기간 (t+20 거래일)
TOP_PCT: float = 0.20  # 상위 분류 비율
BOTTOM_PCT: float = 0.20  # 하위 분류 비율
WF_STEP_MONTHS: int = 3  # Walk-Forward 스텝 (분기별)

# 클러스터1 (IT/반도체) GICS 섹터 코드
CLUSTER1_GICS: list[int] = [45, 50]  # Technology, Communication Services

# 클러스터1 핵심 매크로 지표 (파일명 접두어)
CLUSTER1_MACRO: list[str] = ["sox", "nasdaq", "usd_krw"]
