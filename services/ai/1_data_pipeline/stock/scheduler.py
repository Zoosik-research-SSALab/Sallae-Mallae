"""
scheduler.py
KOSPI 200 데이터 파이프라인 자동화 스케줄러.

스케줄:
- 매 거래일 16:30 이후 증분 업데이트 (주말/공휴일 제외)
- 분기 실적 시즌(1/4/7/10월) 첫 거래일 재무 데이터 수집

로컬 전용 (Colab 에서는 schedule 루프를 직접 실행할 수 없습니다).
Python 3.10+ 호환.
"""

from __future__ import annotations

import datetime
import sys
import time

import schedule

from utils.logger import setup_logger

logger = setup_logger(__name__)


# ---------------------------------------------------------------------------
# 한국 공휴일 목록 (최소 하드코딩, 연도별 고정 공휴일 기준)
# 임시 공휴일이나 대체 공휴일은 pykrx 로 보완 가능합니다.
# ---------------------------------------------------------------------------

_FIXED_HOLIDAYS_MMDD: frozenset[str] = frozenset({
    "01-01",  # 신정
    "03-01",  # 삼일절
    "05-05",  # 어린이날
    "06-06",  # 현충일
    "08-15",  # 광복절
    "10-03",  # 개천절
    "10-09",  # 한글날
    "12-25",  # 크리스마스
})


def _is_fixed_holiday(date: datetime.date) -> bool:
    """연도에 무관한 고정 공휴일 여부를 반환합니다."""
    return date.strftime("%m-%d") in _FIXED_HOLIDAYS_MMDD


def _is_lunar_holiday(date: datetime.date) -> bool:
    """
    음력 기반 공휴일(설날, 추석 연휴)을 간단히 확인합니다.
    정확한 확인이 필요하면 pykrx 의 거래일 API 를 사용하세요.
    이 구현은 pykrx 가 없을 때의 최소 폴백입니다.
    """
    try:
        from pykrx import stock
        # pykrx 로 해당 날짜의 거래일 여부 확인
        date_str = date.strftime("%Y%m%d")
        # get_market_ohlcv 로 당일 거래가 있는지 확인하는 방법 대신
        # 공휴일 목록은 별도 제공되지 않으므로 False 반환 (pykrx 미지원)
        return False
    except ImportError:
        return False


# ---------------------------------------------------------------------------
# 거래일 판별
# ---------------------------------------------------------------------------

def is_trading_day(date: datetime.date | None = None) -> bool:
    """
    주어진 날짜가 한국 주식 거래일인지 확인합니다.

    확인 순서:
    1. 주말(토/일) 제외
    2. 고정 공휴일 제외
    3. pykrx 로 실제 거래일 검증 (가능한 경우)

    Args:
        date: 확인할 날짜. None 이면 오늘 날짜를 사용합니다.

    Returns:
        거래일이면 True, 그 외 False
    """
    if date is None:
        date = datetime.date.today()

    # 주말 제외
    if date.weekday() >= 5:  # 5=토요일, 6=일요일
        return False

    # 고정 공휴일 제외
    if _is_fixed_holiday(date):
        return False

    # pykrx 로 실제 거래일 검증 (선택적)
    try:
        from pykrx import stock
        date_str = date.strftime("%Y%m%d")
        # 해당 날짜에 KOSPI 거래가 있는지 조회
        df = stock.get_index_ohlcv(date_str, date_str, "1001")
        if df is None or df.empty:
            return False
    except ImportError:
        # pykrx 없으면 주말 + 고정 공휴일 제외만 적용
        pass
    except Exception:
        # pykrx 조회 실패 시 기본 규칙으로 진행
        pass

    return True


# ---------------------------------------------------------------------------
# 분기 시즌 판별
# ---------------------------------------------------------------------------

def is_quarter_month() -> bool:
    """
    현재 월이 분기 실적 시즌(1, 4, 7, 10월)인지 확인합니다.

    Returns:
        1/4/7/10월이면 True, 그 외 False
    """
    return datetime.date.today().month in {1, 4, 7, 10}


def _is_first_trading_day_of_month() -> bool:
    """
    오늘이 이번 달의 첫 번째 거래일인지 확인합니다.

    당월 1일부터 오늘까지 순서대로 거래일을 찾아 오늘과 비교합니다.

    Returns:
        오늘이 첫 거래일이면 True, 그 외 False
    """
    today = datetime.date.today()
    first_of_month = today.replace(day=1)

    current = first_of_month
    while current <= today:
        if is_trading_day(current):
            return current == today
        current += datetime.timedelta(days=1)

    return False


# ---------------------------------------------------------------------------
# 작업 함수
# ---------------------------------------------------------------------------

def run_daily_update() -> None:
    """
    일일 증분 업데이트를 실행합니다.

    거래일 여부를 확인한 후:
    - 거래일: 데이터 수집 + 피처 엔지니어링 실행
    - 비거래일: 스킵 로그 후 종료

    분기 시즌 첫 거래일에는 재무 데이터 수집도 추가 실행합니다.
    """
    today = datetime.date.today()
    logger.info("일일 업데이트 체크 시작 | 날짜: %s", today.isoformat())

    if not is_trading_day(today):
        logger.info("비거래일 (%s) - 업데이트 건너뜀", today.isoformat())
        return

    logger.info("거래일 확인 - 증분 업데이트 시작")

    try:
        import pipeline
        pipeline.run_collection(mode="incremental")
    except Exception as exc:
        logger.error("증분 수집 실패: %s", exc)

    try:
        import pipeline
        pipeline.run_feature_engineering()
    except Exception as exc:
        logger.error("피처 엔지니어링 실패: %s", exc)

    # 분기 시즌 첫 거래일이면 재무 데이터 추가 수집
    if is_quarter_month() and _is_first_trading_day_of_month():
        logger.info("분기 시즌 첫 거래일 감지 - 재무 데이터 추가 수집")
        run_quarterly_financial()

    logger.info("일일 업데이트 완료 | 날짜: %s", today.isoformat())


def run_quarterly_financial() -> None:
    """
    분기 재무 데이터를 수집합니다.

    1/4/7/10월 첫 거래일에 호출되어
    collectors.collect_financial.collect_recent_quarters 를 실행합니다.
    종목 목록은 RAW_OHLCV_PATH 의 parquet 파일 이름에서 자동 수집합니다.
    """
    logger.info("분기 재무 데이터 수집 시작")
    try:
        from config import RAW_OHLCV_PATH
        from collectors.collect_financial import collect_recent_quarters

        tickers: list[str] = []
        if RAW_OHLCV_PATH.exists():
            tickers = [p.stem for p in sorted(RAW_OHLCV_PATH.glob("*.parquet"))]

        if not tickers:
            logger.warning("OHLCV parquet 파일 없음 - 분기 재무 수집 건너뜀")
            return

        collect_recent_quarters(tickers)
        logger.info("분기 재무 데이터 수집 완료 | 종목 수: %d", len(tickers))
    except ImportError:
        logger.warning("collectors.collect_financial 모듈 없음 - 건너뜀")
    except Exception as exc:
        logger.error("분기 재무 데이터 수집 실패: %s", exc)


# ---------------------------------------------------------------------------
# 스케줄러
# ---------------------------------------------------------------------------

def start_scheduler() -> None:
    """
    스케줄 작업을 등록하고 무한 루프를 시작합니다.

    등록 작업:
    - 매일 16:30 일일 증분 업데이트 (run_daily_update)
      - 내부에서 거래일/비거래일 판별 후 실행 여부 결정
      - 분기 시즌 첫 거래일이면 재무 데이터 추가 수집

    루프는 1분마다 pending 작업을 확인합니다.
    KeyboardInterrupt(Ctrl+C) 또는 SystemExit 시 정상 종료합니다.
    """
    logger.info("스케줄러 등록 시작")

    # 매일 16:30 일일 업데이트
    schedule.every().day.at("16:30").do(run_daily_update)
    logger.info("스케줄 등록: 매일 16:30 -> run_daily_update")

    logger.info("스케줄러 시작 | 종료하려면 Ctrl+C 를 누르세요")
    logger.info("등록된 작업 목록:")
    for job in schedule.get_jobs():
        logger.info("  %s", job)

    try:
        while True:
            schedule.run_pending()
            time.sleep(60)  # 1분마다 체크
    except (KeyboardInterrupt, SystemExit):
        logger.info("스케줄러 종료 요청 수신")
    finally:
        schedule.clear()
        logger.info("스케줄러 정상 종료")


# ---------------------------------------------------------------------------
# CLI 엔트리포인트
# ---------------------------------------------------------------------------

def main() -> None:
    """
    스케줄러 데몬을 시작합니다.

    --run-now 플래그를 전달하면 스케줄을 기다리지 않고
    즉시 일일 업데이트를 한 번 실행합니다 (테스트 용도).

    사용 예:
        python scheduler.py            # 스케줄러 데몬 시작
        python scheduler.py --run-now  # 즉시 1회 실행 후 종료
    """
    import argparse

    parser = argparse.ArgumentParser(
        description="KOSPI 200 데이터 파이프라인 자동화 스케줄러",
    )
    parser.add_argument(
        "--run-now",
        action="store_true",
        help="스케줄 없이 즉시 일일 업데이트를 1회 실행합니다 (테스트 용도)",
    )
    args = parser.parse_args()

    if args.run_now:
        logger.info("--run-now: 즉시 일일 업데이트 실행")
        run_daily_update()
        logger.info("--run-now: 실행 완료")
        return

    start_scheduler()


if __name__ == "__main__":
    main()
