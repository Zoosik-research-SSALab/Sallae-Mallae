"""
utils/financial_check.py
재무 데이터 볼륨 상태 확인 유틸리티.

pipeline.py와 scheduler.py에서 공통으로 사용합니다.
가벼운 모듈(config, drive_utils)만 임포트하므로
scheduler 프로세스에서 안전하게 사용할 수 있습니다.
"""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def ensure_financial_volume(
    base_path: Path,
    raw_financial_path: Path,
    raw_ohlcv_path: Path,
    rclone_auto_sync: bool,
    rclone_remote: str | None,
) -> bool:
    """
    재무 데이터 볼륨 상태를 확인하고 부족하면 Drive에서 다운로드합니다.

    Args:
        base_path: 프로젝트 데이터 루트 경로
        raw_financial_path: 재무 데이터 디렉토리 경로
        raw_ohlcv_path: OHLCV 데이터 디렉토리 경로
        rclone_auto_sync: rclone 자동 동기화 활성화 여부
        rclone_remote: rclone 리모트 경로 (예: "gdrive:kospi200-project")

    Returns:
        정상이면 True, 다운로드 실패 시 False
    """
    if not (rclone_auto_sync and rclone_remote):
        return True

    from utils.drive_utils import rclone_sync_down

    # 1단계: 디렉토리가 비어있으면 전체 다운로드
    if not raw_financial_path.exists() or not any(raw_financial_path.glob("*.parquet")):
        logger.info("재무 데이터 없음 — Drive에서 초기 다운로드")
        return rclone_sync_down(rclone_remote, base_path, subdir="raw/financial")

    # 2단계: OHLCV 종목 대비 커버리지 확인
    ohlcv_tickers = {p.stem for p in raw_ohlcv_path.glob("*.parquet")}
    financial_tickers = {p.stem.split("_")[0] for p in raw_financial_path.glob("*.parquet")}
    if not ohlcv_tickers:
        return True  # OHLCV도 없으면 비교 불가, 스킵

    missing_ratio = len(ohlcv_tickers - financial_tickers) / len(ohlcv_tickers)
    if missing_ratio > 0.5:
        logger.info("재무 데이터 커버리지 부족 (%.0f%% 누락) — Drive에서 보충", missing_ratio * 100)
        return rclone_sync_down(rclone_remote, base_path, subdir="raw/financial")

    coverage = len(financial_tickers & ohlcv_tickers) / len(ohlcv_tickers)
    logger.info("재무 데이터 볼륨 정상 (커버리지 %.0f%%, %d종목)", coverage * 100, len(financial_tickers))
    return True
