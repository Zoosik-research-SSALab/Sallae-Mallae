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
import subprocess
import sys
import time
from pathlib import Path

import schedule

from utils.logger import setup_logger

logger = setup_logger(__name__)

# 이 파일의 디렉토리 (subprocess cwd 용)
_SCHEDULER_DIR: Path = Path(__file__).resolve().parent


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
# subprocess 실행 헬퍼
# ---------------------------------------------------------------------------

_SUBPROCESS_TIMEOUT: int = 14400  # subprocess 기본 타임아웃 (4시간)


def _run_subprocess(
    cmd: list[str],
    description: str,
    timeout: int = _SUBPROCESS_TIMEOUT,
) -> bool:
    """
    자식 프로세스로 명령을 실행합니다.

    자식 프로세스 종료 시 OS가 메모리를 완전 회수하므로,
    pandas/pykrx 등 무거운 라이브러리가 스케줄러 프로세스에 잔류하지 않습니다.
    stdout/stderr는 Popen을 통해 실시간으로 부모 프로세스의 로거에 전달됩니다.
    타이머 스레드로 타임아웃을 감시하여 행(hang) 상태를 방지합니다.

    Args:
        cmd: 실행할 명령어 리스트 (예: [sys.executable, "pipeline.py", ...])
        description: 로그에 사용할 작업 설명
        timeout: 타임아웃 (초). 기본값 4시간. 초과 시 프로세스를 종료합니다.

    Returns:
        성공 여부 (exit code == 0)
    """
    import threading

    logger.info("[subprocess] %s 시작 (args=%d, timeout=%ds)", description, len(cmd), timeout)
    timed_out = False

    try:
        proc = subprocess.Popen(
            cmd,
            cwd=_SCHEDULER_DIR,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

        # 타이머 스레드로 타임아웃 감시 (stdout 블로킹 루프와 독립적으로 작동)
        def _kill_on_timeout() -> None:
            nonlocal timed_out
            timed_out = True
            proc.kill()
            logger.error("[subprocess] %s 타임아웃 (%d초 초과) — 프로세스 강제 종료", description, timeout)

        timer = threading.Timer(timeout, _kill_on_timeout)
        timer.start()

        try:
            # stdout+stderr 실시간 로그 전달
            for line in proc.stdout:  # type: ignore[union-attr]
                logger.info("[subprocess:%s] %s", description, line.rstrip())
            proc.wait()
        finally:
            timer.cancel()

        if timed_out:
            return False

        if proc.returncode != 0:
            logger.error(
                "[subprocess] %s 실패 (exit code %d)", description, proc.returncode,
            )
            return False

        logger.info("[subprocess] %s 완료", description)
        return True

    except Exception as exc:
        logger.error("[subprocess] %s 실행 중 예외: %s", description, exc)
        return False


# ---------------------------------------------------------------------------
# 작업 함수
# ---------------------------------------------------------------------------

def run_daily_update() -> None:
    """
    일일 증분 업데이트를 실행합니다.

    거래일 여부를 확인한 후:
    - 거래일: pipeline.py --mode incremental 을 subprocess 로 실행
      (rclone 다운로드 → 수집 → 피처 → 품질검증 → rclone 업로드)
    - 비거래일: 스킵 로그 후 종료

    분기 시즌 첫 거래일에는 재무 데이터 수집도 추가 실행합니다.

    파이프라인은 별도 프로세스에서 실행되므로, 완료 후 pandas/pykrx 등
    무거운 라이브러리의 메모리가 OS에 의해 완전히 회수됩니다.
    """
    today = datetime.date.today()
    logger.info("일일 업데이트 체크 시작 | 날짜: %s", today.isoformat())

    if not is_trading_day(today):
        logger.info("비거래일 (%s) - 업데이트 건너뜀", today.isoformat())
        return

    logger.info("거래일 확인 - 증분 업데이트 시작")

    _run_subprocess(
        [sys.executable, "pipeline.py", "--mode", "incremental"],
        "증분 파이프라인",
    )

    # 분기 시즌 첫 거래일이면 재무 데이터 추가 수집 + Drive 업로드
    if is_quarter_month() and _is_first_trading_day_of_month():
        logger.info("분기 시즌 첫 거래일 감지 - 재무 데이터 추가 수집")
        run_quarterly_financial()
        # 분기 재무 데이터를 Drive에 업로드 (subprocess로 메모리 격리)
        _run_rclone_financial_upload()

    logger.info("일일 업데이트 완료 | 날짜: %s", today.isoformat())


def run_quarterly_financial() -> None:
    """
    분기 재무 데이터를 수집합니다.

    1/4/7/10월 첫 거래일에 호출되어
    collectors/collect_financial.py --recent 8 을 subprocess 로 실행합니다.
    종목 목록은 RAW_OHLCV_PATH 의 parquet 파일 이름에서 자동 전달합니다.
    """
    logger.info("분기 재무 데이터 수집 시작")
    try:
        from config import RAW_OHLCV_PATH

        tickers: list[str] = []
        if RAW_OHLCV_PATH.exists():
            tickers = [p.stem for p in sorted(RAW_OHLCV_PATH.glob("*.parquet"))]

        if not tickers:
            logger.warning("OHLCV parquet 파일 없음 - 분기 재무 수집 건너뜀")
            return

        _run_subprocess(
            [
                sys.executable, "-m", "collectors.collect_financial",
                "--recent", "8",
                "--tickers", *tickers,
            ],
            "분기 재무 수집",
        )
        logger.info("분기 재무 데이터 수집 완료 | 종목 수: %d", len(tickers))
    except Exception as exc:
        logger.error("분기 재무 데이터 수집 실패: %s", exc)


def _run_rclone_financial_upload() -> None:
    """
    분기 재무 데이터를 Drive에 업로드합니다.

    raw/financial은 파일 수가 많아 RCLONE_SYNC_DIRS에서 제외되어 있으므로,
    분기 재무 수집 후 별도로 rclone sync를 실행합니다.
    subprocess로 실행하여 메모리를 격리합니다.
    """
    try:
        from config import RCLONE_AUTO_SYNC, RCLONE_REMOTE
        if not (RCLONE_AUTO_SYNC and RCLONE_REMOTE):
            return

        _run_subprocess(
            [
                sys.executable, "-c",
                "import sys; "
                "from config import BASE_PATH, RCLONE_REMOTE; "
                "from utils.drive_utils import rclone_sync_up; "
                "ok = rclone_sync_up(BASE_PATH, RCLONE_REMOTE, subdir='raw/financial'); "
                "sys.exit(0 if ok else 1)",
            ],
            "분기 재무 Drive 업로드",
            timeout=600,
        )
    except Exception as exc:
        logger.error("분기 재무 데이터 Drive 업로드 실패: %s", exc)


# ---------------------------------------------------------------------------
# 스케줄러
# ---------------------------------------------------------------------------

def _ensure_financial_volume() -> bool:
    """재무 데이터 볼륨 상태를 확인하고 부족하면 Drive에서 다운로드합니다."""
    from config import (
        BASE_PATH, RAW_FINANCIAL_PATH, RAW_OHLCV_PATH,
        RCLONE_AUTO_SYNC, RCLONE_REMOTE,
    )
    from utils.financial_check import ensure_financial_volume
    return ensure_financial_volume(
        BASE_PATH, RAW_FINANCIAL_PATH, RAW_OHLCV_PATH,
        RCLONE_AUTO_SYNC, RCLONE_REMOTE,
    )


def _startup_sync_down() -> None:
    """
    컨테이너 기동 시 Drive에서 데이터를 무조건 다운로드합니다.

    거래일 여부와 무관하게 실행됩니다.
    EC2는 영속 볼륨이 없으므로, 기동 시 항상 Drive에서 데이터를 받아야
    get_last_date() 등이 정상 동작합니다.
    """
    try:
        from config import BASE_PATH, RCLONE_AUTO_SYNC, RCLONE_REMOTE, RCLONE_SYNC_DIRS
        if not (RCLONE_AUTO_SYNC and RCLONE_REMOTE):
            logger.info("rclone 미설정 - 초기 동기화 건너뜀")
            return

        from utils.drive_utils import rclone_sync_down
        for subdir in RCLONE_SYNC_DIRS:
            logger.info("초기 동기화 다운로드: %s/%s", RCLONE_REMOTE, subdir)
            rclone_sync_down(RCLONE_REMOTE, BASE_PATH, subdir=subdir)
        logger.info("초기 동기화 다운로드 완료")

        # 재무 데이터 볼륨 상태 자동 확인
        # pipeline 모듈을 임포트하지 않고 직접 확인 (메모리 격리)
        _ensure_financial_volume()
    except Exception as exc:
        logger.error("초기 동기화 실패: %s", exc)


def start_scheduler() -> None:
    """
    스케줄 작업을 등록하고 무한 루프를 시작합니다.

    실행 흐름:
    1. 기동 시 Drive에서 데이터 다운로드 (거래일 무관)
    2. 매일 16:30 일일 증분 업데이트 (run_daily_update)
       - 내부에서 거래일/비거래일 판별 후 실행 여부 결정
       - 분기 시즌 첫 거래일이면 재무 데이터 추가 수집

    루프는 1분마다 pending 작업을 확인합니다.
    KeyboardInterrupt(Ctrl+C) 또는 SystemExit 시 정상 종료합니다.
    """
    # 기동 시 Drive 데이터 동기화 (거래일 무관)
    logger.info("스케줄러 시작 - 초기 데이터 동기화")
    _startup_sync_down()

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
