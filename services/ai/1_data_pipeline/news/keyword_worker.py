"""
뉴스 데스크탑 워커 — 크롤링 + 키워드 추출 + 임베딩 + 클러스터링

네이버 금융이 EC2(AWS) IP에서 뉴스 데이터를 차단하므로,
데스크탑(국내 주거 IP)에서 크롤링부터 키워드 처리까지 전체 파이프라인을 실행.

파이프라인:
  0. 뉴스 크롤링 (daily.py) → DB 적재
  1. 감성 분석 (FinBERT + Gemini)
  2. 키워드 추출 (vLLM Qwen2.5-7B-Instruct-AWQ)
  3. 키워드 임베딩 (e5-small)
  4. K-means 증분 클러스터 배정
  5. 뉴스 에이전트 데이터 생성 (DB + Redis)

실행 환경: WSL2 Ubuntu (vLLM이 Linux 전용)
GPU: RTX 5060 8GB — AWQ 양자화 모델 사용

사용법 (WSL2 Ubuntu 터미널에서):
  # SSH 터널 + vLLM 서버가 실행 중인 상태에서:
  python3 keyword_worker.py

  # 즉시 1회 실행 (크롤링 + 키워드 전체 파이프라인)
  python3 keyword_worker.py --run-now

  # 크롤링 없이 키워드만 실행 (이미 뉴스가 DB에 있을 때)
  python3 keyword_worker.py --run-now --skip-crawl

  # 시작 시각 변경 (기본: 16:00)
  python3 keyword_worker.py --start-at 16:00

  # 특정 날짜 범위 크롤링
  python3 keyword_worker.py --run-now --start-date 2026-03-18 --end-date 2026-03-20
"""

import argparse
import asyncio
import datetime
import logging
import threading
import time
from datetime import date, timedelta

from db import get_session
from models import PipelineSignal, StockNews, NewsKeywordMap

logger = logging.getLogger(__name__)

MAX_RETRIES = 5

# ---------------------------------------------------------------------------
# 한국 공휴일 + 거래일 판별
# ---------------------------------------------------------------------------
_FIXED_HOLIDAYS_MMDD: frozenset[str] = frozenset({
    "01-01", "03-01", "05-05", "06-06",
    "08-15", "10-03", "10-09", "12-25",
})


def is_trading_day(d: date | None = None) -> bool:
    """주어진 날짜가 한국 주식 거래일인지 확인."""
    if d is None:
        d = date.today()
    if d.weekday() >= 5:
        return False
    if d.strftime("%m-%d") in _FIXED_HOLIDAYS_MMDD:
        return False
    return True


# ---------------------------------------------------------------------------
# 파이프라인 완료 신호 DB 적재
# ---------------------------------------------------------------------------
def _send_pipeline_signal(signal_type: str) -> None:
    """DB에 파이프라인 완료 신호를 기록하여 다른 스케줄러에게 알림."""
    with get_session() as session:
        try:
            session.add(PipelineSignal(signal_type=signal_type, status="PENDING"))
            session.commit()
            logger.info("[신호] %s 전송 완료", signal_type)
        except Exception as e:
            session.rollback()
            logger.error("[신호] %s 전송 실패: %s", signal_type, e)


# ---------------------------------------------------------------------------
# 미처리 뉴스 감지
# ---------------------------------------------------------------------------
def count_unprocessed_news(days: int = 2) -> int:
    """키워드 매핑이 없는 최근 뉴스 건수를 반환."""
    with get_session() as session:
        cutoff = datetime.datetime.now() - datetime.timedelta(days=days)
        count = (
            session.query(StockNews)
            .outerjoin(NewsKeywordMap, StockNews.id == NewsKeywordMap.news_id)
            .filter(NewsKeywordMap.news_id.is_(None))
            .filter(StockNews.published_at >= cutoff)
            .count()
        )
    return count


# ---------------------------------------------------------------------------
# vLLM 헬스체크
# ---------------------------------------------------------------------------
def check_vllm_health(base_url: str = "http://localhost:8000") -> bool:
    """vLLM 서버가 응답하는지 확인."""
    import urllib.request
    try:
        req = urllib.request.Request(f"{base_url}/health")
        with urllib.request.urlopen(req, timeout=5) as resp:
            return resp.status == 200
    except Exception:
        return False


# ---------------------------------------------------------------------------
# 뉴스 크롤링 실행
# ---------------------------------------------------------------------------
async def run_news_crawl(start_date: date | None = None, end_date: date | None = None) -> None:
    """데스크탑에서 뉴스 크롤링 + DB 적재 실행."""
    from crawlers.daily import run_daily_crawl
    from kospi200 import get_kospi200_stocks

    if start_date is None:
        start_date = date.today() - timedelta(days=1)
    if end_date is None:
        end_date = date.today()

    stocks_df = get_kospi200_stocks()
    logger.info("뉴스 크롤링 시작 | %d종목 | %s ~ %s", len(stocks_df), start_date, end_date)

    await run_daily_crawl(
        stocks_df,
        start_date=start_date,
        end_date=end_date,
    )

    logger.info("뉴스 크롤링 완료")


# ---------------------------------------------------------------------------
# 키워드 파이프라인 실행
# ---------------------------------------------------------------------------
async def run_keyword_pipeline() -> None:
    """감성 분석 → 키워드 추출 → 임베딩 → 증분 클러스터 배정 → 에이전트 데이터 생성."""
    from processors.keyword_batch import run_keyword_batch
    from processors.sentiment_analyzer import run_sentiment_batch
    from processors.embed_keywords import run_embed_keywords
    from processors.cluster_keywords import assign_to_nearest_cluster

    # 1. 감성 분석 (FinBERT + Gemini) — DB에서 sentiment_label이 NULL인 뉴스 자동 처리
    logger.info("=" * 60)
    logger.info("  [1/5] 감성 분석 시작 (FinBERT + Gemini)")
    logger.info("=" * 60)
    await run_sentiment_batch(days=2)

    # 2. 키워드 추출 (vLLM)
    logger.info("=" * 60)
    logger.info("  [2/5] 키워드 추출 시작 (vLLM)")
    logger.info("=" * 60)
    await run_keyword_batch(days=2, backend="vllm", batch_size=100, delay=0.1)

    # 3. 임베딩 생성
    logger.info("=" * 60)
    logger.info("  [3/5] 키워드 임베딩 생성 시작 (e5-small)")
    logger.info("=" * 60)
    run_embed_keywords()

    # 4. 증분 클러스터 배정 (새 키워드만 기존 클러스터에 배정, 전체 재클러스터링 안 함)
    logger.info("=" * 60)
    logger.info("  [4/5] 증분 클러스터 배정 시작")
    logger.info("=" * 60)
    assign_to_nearest_cluster()

    # 5. 종목별 뉴스 에이전트 데이터 생성 (DB + Redis 저장)
    logger.info("=" * 60)
    logger.info("  [5/5] 뉴스 에이전트 데이터 생성 시작")
    logger.info("=" * 60)
    import sys
    from pathlib import Path
    ai_server_path = str(Path(__file__).resolve().parent.parent.parent / "3_ai_server")
    if ai_server_path not in sys.path:
        sys.path.insert(0, ai_server_path)
    from domains.news.agent_data_builder import run_build_all

    STEP5_MAX_RETRIES = 5
    for attempt in range(1, STEP5_MAX_RETRIES + 1):
        try:
            result = run_build_all()
            logger.info("뉴스 에이전트 데이터: %d개 저장, %d개 건너뜀", result["processed"], result["skipped"])
            break
        except Exception as e:
            logger.error("[5/5] 시도 %d/%d 실패: %s", attempt, STEP5_MAX_RETRIES, e)
            if attempt >= STEP5_MAX_RETRIES:
                raise RuntimeError(f"뉴스 에이전트 데이터 생성 {STEP5_MAX_RETRIES}회 재시도 후 실패") from e
            time.sleep(10)

    logger.info("=" * 60)
    logger.info("  키워드 파이프라인 전체 완료")
    logger.info("=" * 60)


# ---------------------------------------------------------------------------
# 전체 파이프라인 (크롤링 + 키워드 병렬)
# ---------------------------------------------------------------------------
def _crawl_in_thread(
    start_date: date | None,
    end_date: date | None,
    done_event: threading.Event,
    error_holder: list,
) -> None:
    """백그라운드 스레드에서 크롤링 실행. 완료 시 done_event set, 실패 시 error_holder에 예외 저장."""
    try:
        asyncio.run(run_news_crawl(start_date=start_date, end_date=end_date))
    except Exception as e:
        logger.error("크롤링 스레드 오류: %s", e)
        error_holder.append(e)
    finally:
        done_event.set()


async def run_full_pipeline(
    skip_crawl: bool = False,
    start_date: date | None = None,
    end_date: date | None = None,
    poll_interval: int = 300,
) -> None:
    """크롤링(백그라운드) + 키워드/임베딩(메인) 병렬 실행.

    크롤링은 순차(종목별 20초 쿨다운)로 진행하되 별도 스레드에서 실행.
    메인에서는 poll_interval(기본 5분) 간격으로 미처리 뉴스를 확인하여
    감성 분석 + 키워드 추출 + 임베딩 + 클러스터링을 즉시 실행.
    크롤링 완료 후 최종 1회 키워드 처리.

    주의: --start-date/--end-date로 2일 이전 백필 시, 감성/키워드는 days=2 기준이라
    과거 뉴스가 후처리 대상에서 빠질 수 있음. 대량 백필은 backfill_loader.py 사용 권장.
    """
    crawl_done = threading.Event()
    crawl_errors: list[Exception] = []

    if skip_crawl:
        crawl_done.set()
    else:
        logger.info("=" * 60)
        logger.info("  크롤링 시작 (백그라운드 스레드)")
        logger.info("=" * 60)
        crawl_thread = threading.Thread(
            target=_crawl_in_thread,
            args=(start_date, end_date, crawl_done, crawl_errors),
            daemon=True,
        )
        crawl_thread.start()

    # 키워드 파이프라인 폴링 루프
    keyword_runs = 0
    crawl_error_logged = False
    while True:
        # 크롤링 스레드 실패 확인 (1회만 로그)
        if crawl_errors and not crawl_error_logged:
            logger.error("크롤링 스레드가 실패했습니다 — 적재된 데이터까지만 후처리 진행")
            crawl_error_logged = True

        unprocessed = count_unprocessed_news(days=2)

        if unprocessed > 0:
            logger.info("미처리 뉴스 %d건 감지 → 키워드 파이프라인 실행", unprocessed)
            await run_keyword_pipeline()
            keyword_runs += 1
            logger.info("키워드 파이프라인 %d회차 완료", keyword_runs)
        else:
            if crawl_done.is_set():
                logger.info("크롤링 완료 + 미처리 뉴스 없음 — 전체 파이프라인 완료")
                break
            else:
                logger.info("미처리 뉴스 없음, 크롤링 진행 중 — %d초 후 재확인", poll_interval)

        if crawl_done.is_set() and unprocessed == 0:
            break

        time.sleep(poll_interval)

    # published_at NULL 복구 (키워드 루프와 독립적으로 실행)
    # count_unprocessed_news는 published_at IS NULL 행을 세지 않으므로 여기서 직접 호출
    logger.info("=" * 60)
    logger.info("  published_at NULL 복구 시작")
    logger.info("=" * 60)
    try:
        from scripts.fix_null_published_at import fix_null_dates
        await fix_null_dates(limit=5000, dry_run=False)
        logger.info("published_at NULL 복구 완료")
    except Exception as e:
        logger.error("published_at NULL 복구 실패: %s", e)

    # 크롤링 실패 시 경고 (적재된 데이터는 이미 처리됨)
    if crawl_errors:
        raise RuntimeError(f"크롤링 중 오류 발생: {crawl_errors[0]}") from crawl_errors[0]

    # 전체 파이프라인 완료 신호 DB 적재 (다른 스케줄러가 조회 가능)
    _send_pipeline_signal("NEWS_PIPELINE_DONE")


# ---------------------------------------------------------------------------
# 워커 메인 루프
# ---------------------------------------------------------------------------
def wait_until(hour: int, minute: int) -> None:
    """지정 시각까지 대기. 이미 지났으면 즉시 반환."""
    now = datetime.datetime.now()
    target = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
    if now >= target:
        return
    wait_seconds = (target - now).total_seconds()
    logger.info("시작 시각 %02d:%02d까지 대기 (%.0f분)", hour, minute, wait_seconds / 60)
    time.sleep(wait_seconds)


def check_weekly_recluster() -> None:
    """토요일 20시에 전체 재클러스터링 실행. 주 1회."""
    now = datetime.datetime.now()
    if now.weekday() == 5 and now.hour == 20 and now.minute < 5:
        from processors.cluster_keywords import run_cluster_keywords
        logger.info("=" * 60)
        logger.info("  [주간] 전체 재클러스터링 시작 (토요일 20시)")
        logger.info("=" * 60)
        try:
            run_cluster_keywords(reset=True)
            logger.info("전체 재클러스터링 완료")
        except Exception as e:
            logger.error("전체 재클러스터링 실패: %s", e)


def start_worker(start_at: str = "16:00") -> None:
    """매일 지정 시각에 전체 파이프라인(크롤링+키워드) 실행.

    동작 방식:
      - 평일 start_at 시각에 크롤링 → 키워드 파이프라인 순차 실행
      - 크롤링 완료 후 키워드 처리 → 전부 끝나면 다음 날 대기
      - 토요일 20시 전체 재클러스터링
    """
    hour, minute = map(int, start_at.split(":"))

    logger.info("데스크탑 워커 시작 | 매일 %s 크롤링+키워드 실행 | 최대 재시도: %d회", start_at, MAX_RETRIES)
    logger.info("주간 전체 재클러스터링: 매주 토요일 20:00")

    try:
        while True:
            # 토요일 20시 전체 재클러스터링 체크
            check_weekly_recluster()

            # 주말(토/일)에는 크롤링 없음
            if datetime.datetime.now().weekday() >= 5:
                time.sleep(300)
                continue

            # 매일 시작 시각까지 대기
            wait_until(hour, minute)

            if not is_trading_day():
                logger.info("비거래일 — 스킵")
                now = datetime.datetime.now()
                tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=1, second=0, microsecond=0)
                time.sleep((tomorrow - now).total_seconds())
                continue

            # vLLM 서버 확인
            if not check_vllm_health():
                logger.error("vLLM 서버 응답 없음 — 60초 후 재시도")
                time.sleep(60)
                continue

            # 전체 파이프라인 실행 (실패 시 재시도)
            for retry_count in range(1, MAX_RETRIES + 1):
                try:
                    asyncio.run(run_full_pipeline())
                    logger.info("당일 파이프라인 완료")
                    break
                except Exception as e:
                    logger.error("파이프라인 실패 (retry=%d/%d): %s", retry_count, MAX_RETRIES, e)
                    if retry_count >= MAX_RETRIES:
                        logger.error("최대 재시도 초과 — 당일 처리 포기")
                    else:
                        logger.info("60초 후 재시도...")
                        time.sleep(60)

            # 다음 날 대기
            now = datetime.datetime.now()
            tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=1, second=0, microsecond=0)
            sleep_seconds = (tomorrow - now).total_seconds()
            if sleep_seconds > 0:
                logger.info("다음 실행까지 %.1f시간 대기", sleep_seconds / 3600)
                time.sleep(sleep_seconds)

    except KeyboardInterrupt:
        logger.info("워커 종료 요청 (Ctrl+C)")


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="뉴스 데스크탑 워커 (크롤링 + 키워드 전체 파이프라인)")
    parser.add_argument("--run-now", action="store_true",
                        help="즉시 1회 실행 후 종료")
    parser.add_argument("--skip-crawl", action="store_true",
                        help="크롤링 스킵 (키워드 파이프라인만 실행)")
    parser.add_argument("--start-at", default="16:00",
                        help="일일 시작 시각 (기본: 16:00)")
    parser.add_argument("--start-date", type=str, default=None,
                        help="크롤링 시작일 (예: 2026-03-18)")
    parser.add_argument("--end-date", type=str, default=None,
                        help="크롤링 종료일 (예: 2026-03-20)")
    args = parser.parse_args()

    start_date = date.fromisoformat(args.start_date) if args.start_date else None
    end_date = date.fromisoformat(args.end_date) if args.end_date else None

    if args.run_now:
        logger.info("--run-now: 즉시 파이프라인 실행")
        if not args.skip_crawl:
            logger.info("크롤링 포함")
        if not check_vllm_health():
            logger.error("vLLM 서버 응답 없음 — 서버를 먼저 실행해주세요")
            return
        asyncio.run(run_full_pipeline(
            skip_crawl=args.skip_crawl,
            start_date=start_date,
            end_date=end_date,
        ))
        logger.info("--run-now: 실행 완료")
        return

    start_worker(start_at=args.start_at)


if __name__ == "__main__":
    main()