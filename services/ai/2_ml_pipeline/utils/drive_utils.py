"""
utils/drive_utils.py — stock_ml_model
Google Drive 경로 유틸리티 모듈.
Parquet 저장/로드, 디렉토리 생성, 파일 유효성 검사 함수 모음.
stock_data_collecter/utils/drive_utils.py 와 동일한 인터페이스.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd


def ensure_dir(path: Path) -> None:
    """디렉토리가 존재하지 않으면 생성합니다 (중간 경로 포함)."""
    path.mkdir(parents=True, exist_ok=True)


def save_parquet(
    df: pd.DataFrame,
    path: Path,
    compression: str = "snappy",
) -> None:
    """DataFrame을 Parquet 형식으로 저장합니다. 부모 디렉토리 자동 생성."""
    ensure_dir(path.parent)
    df.to_parquet(path, engine="pyarrow", compression=compression, index=True)


def load_parquet(path: Path) -> pd.DataFrame | None:
    """Parquet 파일을 로드합니다. 파일 없거나 오류 시 None 반환."""
    if not file_is_valid(path):
        return None
    try:
        return pd.read_parquet(path, engine="pyarrow")
    except Exception:
        return None


def get_last_date(path: Path) -> str | None:
    """저장된 Parquet 파일의 마지막 날짜를 YYYY-MM-DD 형식으로 반환."""
    df = load_parquet(path)
    if df is None or df.empty:
        return None
    try:
        last = df.index.max()
        if hasattr(last, "strftime"):
            return last.strftime("%Y-%m-%d")
        return str(last)[:10]
    except Exception:
        return None


def file_is_valid(path: Path) -> bool:
    """파일이 존재하고 0바이트보다 큰지 확인합니다."""
    try:
        return path.is_file() and path.stat().st_size > 0
    except OSError:
        return False
