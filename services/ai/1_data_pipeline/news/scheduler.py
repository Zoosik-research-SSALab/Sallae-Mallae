"""
뉴스 데이터 파이프라인 — 자동 스케줄러

매 거래일 장 마감 후 4단계 파이프라인을 순서대로 실행한다:
  1. 크롤링 (daily.py --csv-only) → CSV
  2. 필터링 (clean_articles.py) → cleaned CSV
  3. DB 적재 (csv_loader.py) → stock_news, stock_news_map
  4. 키워드 추출 + 임베딩 (keyword_batch.py) → keywords, keyword_embeddings

복구 로직:
  - 마지막 실행 날짜를 파일에 기록
  - 프로세스 재시작 시 놓친 실행 감지 → 즉시 실행

사용법:
  python scheduler.py            # 스케줄러 데몬 시작
  python scheduler.py --run-now  # 즉시 1회 실행 후 종료
  python scheduler.py --time 18:00  # 실행 시각 변경 (기본: 17:00 KST)
"""

import argparse
import datetime
import json
import logging
import subprocess
import sys
import time
from pathlib import Path

import schedule

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 경로 설정
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).parent
OUTPUT_DIR = BASE_DIR / "output"
LAST_RUN_FILE = OUTPUT_DIR / ".last_run_date"

# 파이프라인 실행 시 생성되는 디렉토리 이름 패턴
DAILY_OUTPUT_PREFIX = "daily_"
FILTERED_OUTPUT_PREFIX = "filtered_"


# ---------------------------------------------------------------------------
# 한국 공휴일 + 거래일 판별 (stock 스케줄러와 동일 패턴)
# ---------------------------------------------------------------------------
_FIXED_HOLIDAYS_MMDD: frozenset[str] = frozenset({
    "01-01", "03-01", "05-05", "06-06",
    "08-15", "10-03", "10-09", "12-25",
})


def is_trading_day(date: datetime.date | None = None) -> bool:
    """주어진 날짜가 한국 주식 거래일인지 확인."""
    if date is None:
        date = datetime.date.today()

    # 주말 제외
    if date.weekday() >= 5:
        return False

    # 고정 공휴일 제외
    if date.strftime("%m-%d") in _FIXED_HOLIDAYS_MMDD:
        return False

    # pykrx로 실제 거래일 검증 (설치된 경우)
    try:
        from pykrx import stock
        date_str = date.strftime("%Y%m%d")
        df = stock.get_index_ohlcv(date_str, date_str, "1001")
        if df is None or df.empty:
            return False
    except ImportError:
        pass
    except Exception:
        pass

    return True


# ---------------------------------------------------------------------------
# 복구 로직: 마지막 실행 날짜 관리
# ---------------------------------------------------------------------------
def _get_last_run_date() -> datetime.date | None:
    """마지막 성공 실행 날짜를 파일에서 읽는다."""
    if not LAST_RUN_FILE.is_file():
        return None
    try:
        text = LAST_RUN_FILE.read_text(encoding="utf-8").strip()
        return datetime.date.fromisoformat(text)
    except (ValueError, OSError):
        return None


def _save_last_run_date(date: datetime.date) -> None:
    """실행 성공 날짜를 파일에 기록."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    LAST_RUN_FILE.write_text(date.isoformat(), encoding="utf-8")


def _check_missed_run(scheduled_hour: int, scheduled_minute: int) -> bool:
    """
    프로세스 시작 시 놓친 실행이 있는지 확인.
    오늘이 거래일이고, 예정 시간이 지났고, 오늘 아직 실행하지 않았으면 True.
    """
    today = datetime.date.today()
    now = datetime.datetime.now().time()
    scheduled_time = datetime.time(scheduled_hour, scheduled_minute)

    if not is_trading_day(today):
        return False

    if now < scheduled_time:
        return False

    last_run = _get_last_run_date()
    if last_run and last_run >= today:
        return False

    return True


# ---------------------------------------------------------------------------
# 파이프라인 단계 실행
# ---------------------------------------------------------------------------
def _run_step(step_name: str, cmd: list[str]) -> bool:
    """서브프로세스로 파이프라인 단계를 실행. 성공 시 True 반환."""
    logger.info("[%s] 시작: %s", step_name, " ".join(cmd))
    try:
        result = subprocess.run(
            cmd,
            cwd=str(BASE_DIR),
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=3600,  # 1시간 타임아웃
        )
        if result.stdout:
            for line in result.stdout.strip().split("\n")[-10:]:
                logger.info("[%s] %s", step_name, line)
        if result.returncode != 0:
            logger.error("[%s] 실패 (exit=%d)", step_name, result.returncode)
            if result.stderr:
                for line in result.stderr.strip().split("\n")[-5:]:
                    logger.error("[%s] %s", step_name, line)
            return False
        logger.info("[%s] 완료", step_name)
        return True
    except subprocess.TimeoutExpired:
        logger.error("[%s] 타임아웃 (1시간 초과)", step_name)
        return False
    except Exception as exc:
        logger.error("[%s] 실행 오류: %s", step_name, exc)
        return False


def _find_latest_dir(prefix: str) -> str | None:
    """output/ 아래에서 가장 최근에 생성된 prefix 디렉토리를 찾는다."""
    candidates = sorted(
        [d for d in OUTPUT_DIR.iterdir() if d.is_dir() and d.name.startswith(prefix)],
        key=lambda d: d.stat().st_mtime,
        reverse=True,
    )
    return str(candidates[0]) if candidates else None


def run_daily_pipeline() -> None:
    """4단계 뉴스 파이프라인을 순서대로 실행."""
    today = datetime.date.today()
    logger.info("=" * 60)
    logger.info("뉴스 파이프라인 시작 | %s", today.isoformat())
    logger.info("=" * 60)

    if not is_trading_day(today):
        logger.info("비거래일 (%s) — 파이프라인 건너뜀", today.isoformat())
        return

    python = sys.executable

    # 1단계: 크롤링 → CSV
    ok = _run_step("크롤링", [python, "-m", "crawlers.daily", "--csv-only"])
    if not ok:
        logger.error("크롤링 실패 — 파이프라인 중단")
        return

    # 크롤링 결과 디렉토리 찾기
    daily_dir = _find_latest_dir(DAILY_OUTPUT_PREFIX)
    if not daily_dir:
        logger.error("크롤링 출력 디렉토리를 찾을 수 없음 — 파이프라인 중단")
        return

    # 2단계: 필터링
    ok = _run_step("필터링", [python, "-m", "processors.clean_articles", daily_dir])
    if not ok:
        logger.error("필터링 실패 — 파이프라인 중단")
        return

    # 필터링 결과 디렉토리 찾기
    filtered_dir = _find_latest_dir(FILTERED_OUTPUT_PREFIX)
    if not filtered_dir:
        logger.error("필터링 출력 디렉토리를 찾을 수 없음 — 파이프라인 중단")
        return

    # 3단계: DB 적재
    ok = _run_step("DB적재", [python, "-m", "loaders.csv_loader", filtered_dir])
    if not ok:
        logger.error("DB 적재 실패 — 파이프라인 중단")
        return

    # 4단계: 키워드 추출 + 임베딩은 GPU 서버에서 별도 실행
    # (Gemini API 토큰 제한 + 임베딩 모델 GPU 필요)
    logger.info("[키워드] GPU 서버에서 별도 실행 필요: python -m processors.keyword_batch --days 1")

    # 성공 기록
    _save_last_run_date(today)
    logger.info("=" * 60)
    logger.info("뉴스 파이프라인 완료 | %s", today.isoformat())
    logger.info("=" * 60)


# ---------------------------------------------------------------------------
# 스케줄러
# ---------------------------------------------------------------------------
def start_scheduler(run_time: str = "16:30") -> None:
    """스케줄 작업을 등록하고 무한 루프를 시작."""
    hour, minute = map(int, run_time.split(":"))

    # 복구 체크: 놓친 실행이 있으면 즉시 실행
    if _check_missed_run(hour, minute):
        logger.info("놓친 실행 감지 — 즉시 파이프라인 실행")
        run_daily_pipeline()

    # 스케줄 등록
    schedule.every().day.at(run_time).do(run_daily_pipeline)
    logger.info("스케줄 등록: 매일 %s → run_daily_pipeline", run_time)
    logger.info("스케줄러 시작 | 종료하려면 Ctrl+C")

    try:
        while True:
            schedule.run_pending()
            time.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        logger.info("스케줄러 종료 요청 수신")
    finally:
        schedule.clear()
        logger.info("스케줄러 정상 종료")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="뉴스 파이프라인 자동 스케줄러")
    parser.add_argument("--run-now", action="store_true", help="즉시 1회 실행 후 종료")
    parser.add_argument("--time", default="17:00", help="실행 시각 (기본: 17:00, KST)")
    args = parser.parse_args()

    if args.run_now:
        logger.info("--run-now: 즉시 파이프라인 실행")
        run_daily_pipeline()
        logger.info("--run-now: 실행 완료")
        return

    start_scheduler(run_time=args.time)


if __name__ == "__main__":
    main()
