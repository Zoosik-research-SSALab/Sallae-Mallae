"""
utils/logger.py
ML 모델 로그 유틸리티 모듈.
콘솔 핸들러를 기본으로 제공하고, LOGS_PATH 접근 가능 시 일별 파일 핸들러를 추가합니다.
90일 이상 오래된 로그 파일 자동 삭제 지원.
Python 3.10+ 호환, Google Colab 동작 지원.
"""

import logging
import sys
from datetime import datetime, timedelta
from pathlib import Path


def setup_logger(name: str) -> logging.Logger:
    """
    지정한 이름의 Logger를 생성하고 반환합니다.

    - 콘솔 핸들러: 항상 등록 (INFO 이상)
    - 파일 핸들러: LOGS_PATH / "{today}_ml_model.log" (일별, 접근 가능할 때만)
    - 이미 핸들러가 등록된 경우 중복 추가를 방지합니다.

    Args:
        name: 로거 이름 (일반적으로 __name__ 전달)

    Returns:
        설정된 logging.Logger 인스턴스
    """
    # config 임포트는 순환 참조 방지를 위해 함수 내부에서 수행
    from config import LOGS_PATH

    logger = logging.getLogger(name)

    # 이미 핸들러가 등록된 경우 중복 추가 방지
    if logger.handlers:
        return logger

    logger.setLevel(logging.DEBUG)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    # 파일 핸들러 (일별) — LOGS_PATH 마운트 실패 시 콘솔 전용으로 폴백
    try:
        LOGS_PATH.mkdir(parents=True, exist_ok=True)
        today: str = datetime.now().strftime("%Y-%m-%d")
        log_file: Path = LOGS_PATH / f"{today}_ml_model.log"
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except OSError:
        pass  # Drive 미마운트 등으로 파일 로그 불가 시 콘솔만 사용

    # 콘솔 핸들러 (UTF-8 강제 — Windows cp949 환경 대응, Jupyter 호환)
    if hasattr(sys.stdout, 'buffer'):
        import io as _io
        _stream = _io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    else:
        _stream = sys.stdout
    console_handler = logging.StreamHandler(_stream)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    return logger


def cleanup_old_logs(retention_days: int = 90) -> None:
    """
    LOGS_PATH 내에서 retention_days일보다 오래된 로그 파일을 삭제합니다.

    Args:
        retention_days: 보관 기간 (기본값 90일)
    """
    from config import LOGS_PATH

    if not LOGS_PATH.exists():
        return

    cutoff: datetime = datetime.now() - timedelta(days=retention_days)

    for log_file in LOGS_PATH.glob("*.log"):
        try:
            mtime: datetime = datetime.fromtimestamp(log_file.stat().st_mtime)
            if mtime < cutoff:
                log_file.unlink()
        except OSError:
            # 삭제 실패 시 조용히 넘어감
            pass
