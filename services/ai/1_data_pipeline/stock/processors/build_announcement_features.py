"""
processors/build_announcement_features.py
공시 데이터에서 파생 컬럼(요약, 감성, 카테고리)을 계산하는 프로세서 (스텁).

stock_announcements DB 테이블에 들어갈 파생 컬럼을 생성한다.

입력:
  공시 원문 데이터 (현재 이 파이프라인에서 수집하지 않음)

출력:
  PROCESSED_FUNDAMENTAL_PATH/announcement_features.parquet

파생 지표:
  - summary: 공시 제목 + 내용 기반 1~2문장 요약
  - sentiment: positive / negative / neutral 분류
  - category: earnings / dividend / governance / capital_change 등 분류

NOTE: 공시 수집이 추가되면 로직을 채울 예정. 현재는 인터페이스만 정의.

Python 3.10+ 호환.
"""

from __future__ import annotations

import pandas as pd

from config import (
    PARQUET_COMPRESSION,
    PROCESSED_FUNDAMENTAL_PATH,
)
from utils.drive_utils import ensure_dir, save_parquet
from utils.logger import setup_logger

logger = setup_logger(__name__)

# ---------------------------------------------------------------------------
# 출력 스키마 정의
# ---------------------------------------------------------------------------
ANNOUNCEMENT_COLUMNS: list[str] = [
    "ticker",           # 종목 코드
    "announcement_date",  # 공시일 (YYYY-MM-DD)
    "title",            # 공시 제목
    "summary",          # 1~2문장 요약 (파생)
    "sentiment",        # positive / negative / neutral (파생)
    "category",         # earnings / dividend / governance / capital_change 등 (파생)
]


# ---------------------------------------------------------------------------
# 공시 데이터 로드 (스텁)
# ---------------------------------------------------------------------------

def load_announcements() -> pd.DataFrame:
    """
    공시 원문 데이터를 로드한다.

    현재 이 파이프라인에서 공시 데이터를 수집하지 않으므로 빈 DataFrame을 반환.
    공시 수집기가 추가되면 이 함수에서 로드 로직을 구현한다.

    Returns:
        공시 DataFrame. 현재는 빈 DataFrame.
    """
    logger.info("공시 데이터 로드 — 수집기 미구현, 빈 DataFrame 반환")
    return pd.DataFrame(columns=ANNOUNCEMENT_COLUMNS)


# ---------------------------------------------------------------------------
# 요약 생성 (스텁)
# ---------------------------------------------------------------------------

def compute_summary(df: pd.DataFrame) -> pd.DataFrame:
    """
    공시 제목 + 내용 기반 1~2문장 요약을 생성한다.

    규칙 기반 또는 LLM 활용 예정. 현재는 스텁.

    Args:
        df: 공시 DataFrame (title 컬럼 필수)

    Returns:
        summary 컬럼이 추가된 DataFrame.
    """
    df = df.copy()
    if "summary" not in df.columns:
        df["summary"] = None
    return df


# ---------------------------------------------------------------------------
# 감성 분류 (스텁)
# ---------------------------------------------------------------------------

def compute_sentiment(df: pd.DataFrame) -> pd.DataFrame:
    """
    공시 내용에 대한 감성을 분류한다 (positive / negative / neutral).

    Args:
        df: 공시 DataFrame

    Returns:
        sentiment 컬럼이 추가된 DataFrame.
    """
    df = df.copy()
    if "sentiment" not in df.columns:
        df["sentiment"] = None
    return df


# ---------------------------------------------------------------------------
# 카테고리 분류 (스텁)
# ---------------------------------------------------------------------------

def compute_category(df: pd.DataFrame) -> pd.DataFrame:
    """
    공시를 카테고리로 분류한다.
    (earnings / dividend / governance / capital_change 등)

    Args:
        df: 공시 DataFrame

    Returns:
        category 컬럼이 추가된 DataFrame.
    """
    df = df.copy()
    if "category" not in df.columns:
        df["category"] = None
    return df


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def main() -> None:
    """공시 파생 피처를 계산하여 processed/fundamental/에 저장한다."""
    logger.info("=== 공시 파생 피처 생성 시작 ===")

    df = load_announcements()
    if df.empty:
        logger.info("공시 데이터 없음 — 빈 스키마 파일만 저장")

    df = compute_summary(df)
    df = compute_sentiment(df)
    df = compute_category(df)

    ensure_dir(PROCESSED_FUNDAMENTAL_PATH)
    dest = PROCESSED_FUNDAMENTAL_PATH / "announcement_features.parquet"
    save_parquet(df, dest, compression=PARQUET_COMPRESSION)

    logger.info(
        "=== 공시 파생 피처 생성 완료: %d행 → %s ===",
        len(df), dest,
    )


if __name__ == "__main__":
    main()
