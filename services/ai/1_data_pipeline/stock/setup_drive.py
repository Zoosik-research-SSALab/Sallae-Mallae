"""
setup_drive.py
Google Drive 폴더 구조 초기화 스크립트.
BASE_PATH 아래에 프로젝트에 필요한 모든 디렉토리를 생성하고
각 폴더에 README.txt를 기록합니다.
Python 3.10+ 호환, Google Colab 동작 지원.
"""

import sys
from pathlib import Path

from config import BASE_PATH
from utils.logger import setup_logger

logger = setup_logger(__name__)

# ---------------------------------------------------------------------------
# 폴더 구조 정의: (상대경로, README 설명)
# ---------------------------------------------------------------------------
FOLDER_SPECS: list[tuple[str, str]] = [
    (
        "raw/ohlcv",
        "원시 OHLCV 데이터 저장 폴더.\n"
        "파일 형식: {ticker}.parquet\n"
        "컬럼: open, high, low, close, volume\n"
        "인덱스: date (DatetimeIndex)\n"
        "수집 범위: 2008-01-01 ~ 현재 (코스피 200 전 종목)\n",
    ),
    (
        "raw/supply_demand",
        "원시 수급 데이터 저장 폴더.\n"
        "파일 형식: {ticker}.parquet\n"
        "컬럼: foreign_net_buy, institution_net_buy, individual_net_buy,\n"
        "       foreign_cum_buy, institution_cum_buy\n"
        "인덱스: date (DatetimeIndex)\n"
        "수집 범위: 2008-01-01 ~ 현재 (코스피 200 전 종목)\n",
    ),
    (
        "raw/macro",
        "원시 거시경제 데이터 저장 폴더.\n"
        "yfinance, pykrx, ECOS API로 수집한 금리, 환율, 지수 데이터를 보관합니다.\n",
    ),
    (
        "raw/financial",
        "원시 재무 데이터 저장 폴더.\n"
        "DART API에서 수집한 종목별 재무제표 데이터를 보관합니다.\n",
    ),
    (
        "processed/base_features",
        "범용 베이스 피처 저장 폴더.\n"
        "OHLCV + 수급 + 매크로 + 메타 피처를 결합한 base_features.parquet.\n"
        "인덱스: MultiIndex (date, ticker)\n",
    ),
    (
        "logs/collection",
        "데이터 수집 로그 저장 폴더.\n"
        "파일 형식: YYYY-MM-DD_collection.log (일별)\n"
        "보관 기간: 90일 (자동 삭제)\n",
    ),
]


def setup_drive() -> None:
    """
    BASE_PATH 아래에 프로젝트 폴더 구조를 생성합니다.

    - BASE_PATH 가 존재하지 않으면 에러 메시지를 출력하고 종료합니다.
    - 각 하위 폴더를 생성하고 README.txt 를 기록합니다.
    """
    if not BASE_PATH.exists():
        msg = (
            f"[ERROR] BASE_PATH 가 존재하지 않습니다: {BASE_PATH}\n"
            "Google Drive 가 마운트되어 있는지 확인하거나,\n"
            ".env 파일에 BASE_PATH 환경 변수를 올바르게 설정하세요.\n"
            "예) BASE_PATH=/content/drive/MyDrive/kospi200-project"
        )
        logger.error(msg)
        print(msg, file=sys.stderr)
        sys.exit(1)

    logger.info("폴더 구조 초기화 시작: %s", BASE_PATH)

    for rel_path, description in FOLDER_SPECS:
        folder: Path = BASE_PATH / rel_path
        folder.mkdir(parents=True, exist_ok=True)

        readme: Path = folder / "README.txt"
        if not readme.exists():
            readme.write_text(description, encoding="utf-8")
            logger.debug("README.txt 생성: %s", readme)

        logger.info("폴더 확인/생성 완료: %s", folder)

    logger.info("폴더 구조 초기화 완료.")


if __name__ == "__main__":
    setup_drive()
    print(f"Drive 초기화 완료: {BASE_PATH}")
    print("생성된 폴더 목록:")
    for rel_path, _ in FOLDER_SPECS:
        print(f"  {BASE_PATH / rel_path}")
