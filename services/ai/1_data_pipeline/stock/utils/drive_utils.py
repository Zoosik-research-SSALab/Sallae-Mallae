"""
utils/drive_utils.py
데이터 경로 유틸리티 모듈. Parquet I/O 및 rclone 동기화 지원.
Parquet 저장/로드, 디렉토리 생성, 증분 업데이트 지원 함수 모음.
Python 3.10+ 호환, Google Colab 동작 지원.
"""

from __future__ import annotations

import logging
import shutil
import subprocess
from pathlib import Path

import pandas as pd

logger = logging.getLogger(__name__)


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


def _rclone_available() -> bool:
    """rclone이 시스템 PATH에 설치되어 있는지 확인합니다."""
    return shutil.which("rclone") is not None


def _rclone_net_opts() -> list[str]:
    """rclone 네트워크 timeout 및 재시도 옵션을 반환합니다."""
    from config import RCLONE_CONTIMEOUT, RCLONE_IO_TIMEOUT, RCLONE_RETRIES

    return [
        "--contimeout", RCLONE_CONTIMEOUT,
        "--timeout", RCLONE_IO_TIMEOUT,
        "--retries", str(RCLONE_RETRIES),
        "--low-level-retries", "3",
    ]


def _run_rclone(cmd: list[str]) -> bool:
    """
    rclone 명령을 timeout 제한 하에 실행합니다.

    Args:
        cmd: rclone 명령어 리스트 (예: ["rclone", "sync", src, dst])

    Returns:
        성공 여부. timeout 또는 오류 발생 시 False.
    """
    from config import RCLONE_TIMEOUT

    full_cmd = cmd + _rclone_net_opts()
    try:
        result = subprocess.run(
            full_cmd,
            capture_output=True,
            text=True,
            timeout=RCLONE_TIMEOUT,
        )
        if result.returncode != 0:
            logger.warning("rclone 실패 (exit %d): %s", result.returncode, result.stderr[:500])
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        logger.error("rclone timeout (%d초 초과): %s", RCLONE_TIMEOUT, " ".join(cmd[:4]))
        return False


def rclone_sync_up(local_path: Path, remote: str, subdir: str = "") -> bool:
    """
    로컬 디렉토리를 rclone remote로 업로드 동기화합니다.

    Args:
        local_path: 로컬 BASE_PATH
        remote: rclone remote 경로 (예: "gdrive:kospi200-project")
        subdir: 동기화할 하위 디렉토리 (예: "raw/ohlcv"). 빈 문자열이면 전체.

    Returns:
        성공 여부
    """
    if not _rclone_available():
        return False

    src = local_path / subdir if subdir else local_path
    dst = f"{remote}/{subdir}" if subdir else remote

    if not src.exists():
        return False

    return _run_rclone(["rclone", "sync", str(src), dst])


def rclone_sync_down(remote: str, local_path: Path, subdir: str = "") -> bool:
    """
    rclone remote에서 로컬로 다운로드 동기화합니다.

    Args:
        remote: rclone remote 경로 (예: "gdrive:kospi200-project")
        local_path: 로컬 BASE_PATH
        subdir: 동기화할 하위 디렉토리. 빈 문자열이면 전체.

    Returns:
        성공 여부
    """
    if not _rclone_available():
        return False

    src = f"{remote}/{subdir}" if subdir else remote
    dst = local_path / subdir if subdir else local_path
    ensure_dir(dst)

    return _run_rclone(["rclone", "sync", str(src), str(dst)])


def rclone_copy_file(local_file: Path, remote: str) -> bool:
    """
    단일 파일을 rclone remote로 복사합니다.

    Args:
        local_file: 로컬 파일 경로
        remote: rclone remote 대상 디렉토리 (예: "gdrive:kospi200-project/raw/ohlcv")

    Returns:
        성공 여부
    """
    if not _rclone_available() or not local_file.is_file():
        return False

    return _run_rclone(["rclone", "copy", str(local_file), remote])
