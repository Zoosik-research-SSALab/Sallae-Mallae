"""
utils/drive_utils.py
Google Drive 경로 유틸리티 모듈.
Parquet 저장/로드, 디렉토리 생성, 증분 업데이트 지원 함수 모음.
Python 3.10+ 호환, Google Colab 동작 지원.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd


def ensure_dir(path: Path) -> None:
    """
    디렉토리가 존재하지 않으면 생성합니다 (중간 경로 포함).

    Args:
        path: 생성할 디렉토리 경로
    """
    path.mkdir(parents=True, exist_ok=True)


def save_parquet(
    df: pd.DataFrame,
    path: Path,
    compression: str = "snappy",
) -> None:
    """
    DataFrame을 Parquet 형식으로 저장합니다.
    저장 전 부모 디렉토리를 자동으로 생성합니다.

    Args:
        df: 저장할 DataFrame
        path: 저장 경로 (.parquet 파일)
        compression: 압축 방식 (기본값 "snappy")
    """
    ensure_dir(path.parent)
    df.to_parquet(path, engine="pyarrow", compression=compression, index=True)


def load_parquet(path: Path) -> pd.DataFrame | None:
    """
    Parquet 파일을 로드합니다. 파일이 없거나 유효하지 않으면 None을 반환합니다.

    Args:
        path: 로드할 .parquet 파일 경로

    Returns:
        로드된 DataFrame, 또는 파일이 없거나 오류 발생 시 None
    """
    if not file_is_valid(path):
        return None

    try:
        return pd.read_parquet(path, engine="pyarrow")
    except Exception:
        return None


def get_last_date(path: Path) -> str | None:
    """
    저장된 Parquet 파일의 인덱스(날짜) 기준 마지막 날짜를 반환합니다.
    증분 업데이트 시 다음 수집 시작일을 결정하는 데 사용합니다.

    인덱스가 DatetimeIndex 또는 날짜 문자열 형식이어야 합니다.

    Args:
        path: 조회할 .parquet 파일 경로

    Returns:
        "YYYY-MM-DD" 형식의 마지막 날짜 문자열, 또는 조회 불가 시 None
    """
    df = load_parquet(path)
    if df is None or df.empty:
        return None

    try:
        last = df.index.max()
        # DatetimeIndex 또는 Timestamp 처리
        if hasattr(last, "strftime"):
            return last.strftime("%Y-%m-%d")
        # 문자열 인덱스 처리
        return str(last)[:10]
    except Exception:
        return None


def file_is_valid(path: Path) -> bool:
    """
    파일이 존재하고 크기가 0바이트보다 큰지 확인합니다.

    Args:
        path: 확인할 파일 경로

    Returns:
        파일이 존재하고 비어 있지 않으면 True, 그 외 False
    """
    try:
        return path.is_file() and path.stat().st_size > 0
    except OSError:
        return False
