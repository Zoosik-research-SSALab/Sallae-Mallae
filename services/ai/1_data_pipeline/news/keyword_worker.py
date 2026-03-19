"""
키워드 추출 데스크탑 워커 — 미처리 뉴스 폴링 방식

EC2 크롤러가 종목별로 DB에 즉시 적재하면,
이 워커가 미처리 뉴스(news_keyword_map 매핑 없는 기사)를 감지하여:
  1. vLLM (Qwen2.5-7B-Instruct-AWQ)으로 키워드 추출
  2. e5-small 임베딩 생성
  3. K-means 클러스터링

16:30부터 5분 간격으로 미처리 뉴스를 폴링하고,
연속 빈 폴링이 일정 횟수 넘으면 당일 처리 완료로 판단.

실행 환경: WSL2 Ubuntu (vLLM이 Linux 전용)
GPU: RTX 5060 8GB — AWQ 양자화 모델 사용 (FP16 7B는 VRAM 초과)

사용법 (WSL2 Ubuntu 터미널에서):
  # SSH 터널 + vLLM 서버가 실행 중인 상태에서:
  python3 keyword_worker.py

  # 즉시 1회 실행 (미처리 뉴스 있으면 바로 처리)
  python3 keyword_worker.py --run-now

  # 감시 시작 시각 변경 (기본: 16:30)
  python3 keyword_worker.py --watch-from 16:30

  # 폴링 간격 변경 (기본: 300초)
  python3 keyword_worker.py --interval 120
"""

import argparse
import asyncio
import datetime
import logging
import time

from db import get_session
from models import PipelineSignal, StockNews, NewsKeywordMap

logger = logging.getLogger(__name__)

MAX_RETRIES = 5


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
# 크롤링 완료 신호 확인
# ---------------------------------------------------------------------------
def check_crawl_done_signal() -> bool:
    """오늘 날짜의 NEWS_CRAWL_DONE 신호가 있는지 확인."""
    with get_session() as session:
        today_start = datetime.datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        signal = (
            session.query(PipelineSignal)
            .filter(
                PipelineSignal.signal_type == "NEWS_CRAWL_DONE",
                PipelineSignal.created_at >= today_start,
            )
            .first()
        )
        return signal is not None


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
# 파이프라인 실행
# ---------------------------------------------------------------------------
async def run_keyword_pipeline() -> None:
    """키워드 추출 → 임베딩 → 증분 클러스터 배정."""
    from processors.keyword_batch import run_keyword_batch
    from processors.embed_keywords import run_embed_keywords
    from processors.cluster_keywords import assign_to_nearest_cluster

    # 1. 키워드 추출 (vLLM)
    logger.info("=" * 60)
    logger.info("  [1/3] 키워드 추출 시작 (vLLM)")
    logger.info("=" * 60)
    await run_keyword_batch(days=2, backend="vllm", batch_size=100, delay=0.1)

    # 2. 임베딩 생성
    logger.info("=" * 60)
    logger.info("  [2/3] 키워드 임베딩 생성 시작 (e5-small)")
    logger.info("=" * 60)
    run_embed_keywords()

    # 3. 증분 클러스터 배정 (새 키워드만 기존 클러스터에 배정, 전체 재클러스터링 안 함)
    logger.info("=" * 60)
    logger.info("  [3/3] 증분 클러스터 배정 시작")
    logger.info("=" * 60)
    assign_to_nearest_cluster()

    # 4. 종목별 뉴스 에이전트 데이터 생성 (DB + Redis 저장)
    logger.info("=" * 60)
    logger.info("  [4/4] 뉴스 에이전트 데이터 생성 시작")
    logger.info("=" * 60)
    import sys
    from pathlib import Path
    # 3_ai_server를 import 경로에 추가
    ai_server_path = str(Path(__file__).resolve().parent.parent.parent / "3_ai_server")
    if ai_server_path not in sys.path:
        sys.path.insert(0, ai_server_path)
    from domains.news.agent_data_builder import run_build_all

    STEP4_MAX_RETRIES = 5
    for attempt in range(1, STEP4_MAX_RETRIES + 1):
        try:
            result = run_build_all()
            logger.info("뉴스 에이전트 데이터: %d개 저장, %d개 건너뜀", result["processed"], result["skipped"])
            break
        except Exception as e:
            logger.error("[4/4] 시도 %d/%d 실패: %s", attempt, STEP4_MAX_RETRIES, e)
            if attempt >= STEP4_MAX_RETRIES:
                raise RuntimeError(f"뉴스 에이전트 데이터 생성 {STEP4_MAX_RETRIES}회 재시도 후 실패") from e
            import time
            time.sleep(10)

    logger.info("=" * 60)
    logger.info("  키워드 파이프라인 전체 완료")
    logger.info("=" * 60)


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
    logger.info("감시 시작 시각 %02d:%02d까지 대기 (%.0f분)", hour, minute, wait_seconds / 60)
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


def start_worker(watch_from: str = "16:30", interval: int = 300, max_empty: int = 3) -> None:
    """하이브리드 워커: 미처리 뉴스 선처리 + 크롤링 완료 신호 후 종료.

    동작 방식:
      - 신호 전: 5분마다 미처리 뉴스 확인 → 있으면 처리, 없으면 계속 대기
      - 신호 후: 잔여 뉴스 처리 → 연속 max_empty회 빈 폴링이면 당일 종료
    """
    hour, minute = map(int, watch_from.split(":"))

    logger.info("키워드 워커 시작 | 감시: %s | 간격: %d초 | 신호 후 빈 폴링 종료: %d회 | 최대 재시도: %d회",
                watch_from, interval, max_empty, MAX_RETRIES)
    logger.info("주간 전체 재클러스터링: 매주 토요일 20:00")

    try:
        while True:
            # 토요일 20시 전체 재클러스터링 체크
            check_weekly_recluster()

            # 주말(토/일)에는 크롤링이 없으므로 감시 스킵
            if datetime.datetime.now().weekday() >= 5:
                time.sleep(interval)
                continue

            # 매일 감시 시작 시각까지 대기
            wait_until(hour, minute)

            logger.info("미처리 뉴스 감시 시작")
            crawl_done = False
            empty_count = 0
            retry_count = 0

            while True:
                # 크롤링 완료 신호 확인
                if not crawl_done:
                    crawl_done = check_crawl_done_signal()
                    if crawl_done:
                        logger.info("크롤링 완료 신호 수신 — 잔여 처리 후 종료 카운트다운 시작")

                # 미처리 뉴스 확인
                unprocessed = count_unprocessed_news(days=2)

                if unprocessed > 0:
                    empty_count = 0
                    logger.info("미처리 뉴스 %d건 감지 → 키워드 파이프라인 실행", unprocessed)

                    # vLLM 서버 확인
                    if not check_vllm_health():
                        logger.error("vLLM 서버 응답 없음 — 60초 후 재시도")
                        time.sleep(60)
                        continue

                    try:
                        asyncio.run(run_keyword_pipeline())
                        logger.info("키워드 파이프라인 완료 — 다음 폴링까지 대기")
                        retry_count = 0
                    except Exception as e:
                        retry_count += 1
                        logger.error("파이프라인 실패 (retry=%d/%d): %s", retry_count, MAX_RETRIES, e)
                        if retry_count >= MAX_RETRIES:
                            logger.error("최대 재시도 초과 — 당일 처리 종료")
                            break
                else:
                    if crawl_done:
                        # 신호 수신 후에만 빈 폴링 카운트다운
                        empty_count += 1
                        logger.info("미처리 뉴스 없음 (%d/%d) — %d초 후 재확인", empty_count, max_empty, interval)
                        if empty_count >= max_empty:
                            logger.info("신호 수신 + 빈 폴링 %d회 — 당일 처리 완료", max_empty)
                            break
                    else:
                        # 신호 전에는 계속 대기 (크롤링 진행 중)
                        logger.info("미처리 뉴스 없음, 크롤링 완료 신호 대기 중 — %d초 후 재확인", interval)

                time.sleep(interval)

            # 다음 날 감시를 위해 자정+1분까지 대기
            now = datetime.datetime.now()
            tomorrow = (now + datetime.timedelta(days=1)).replace(
                hour=0, minute=1, second=0, microsecond=0
            )
            sleep_seconds = (tomorrow - now).total_seconds()
            if sleep_seconds > 0:
                logger.info("다음 감시까지 %.1f시간 대기", sleep_seconds / 3600)
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

    parser = argparse.ArgumentParser(description="키워드 추출 데스크탑 워커 (미처리 뉴스 폴링)")
    parser.add_argument("--run-now", action="store_true",
                        help="즉시 1회 실행 후 종료")
    parser.add_argument("--watch-from", default="16:30",
                        help="감시 시작 시각 (기본: 16:30)")
    parser.add_argument("--interval", type=int, default=300,
                        help="폴링 간격 초 (기본: 300)")
    parser.add_argument("--max-empty", type=int, default=3,
                        help="신호 수신 후 연속 빈 폴링 종료 횟수 (기본: 3, 즉 15분간 미처리 뉴스 없으면 종료)")
    args = parser.parse_args()

    if args.run_now:
        logger.info("--run-now: 즉시 파이프라인 실행")
        if not check_vllm_health():
            logger.error("vLLM 서버 응답 없음 — 서버를 먼저 실행해주세요")
            return
        asyncio.run(run_keyword_pipeline())
        logger.info("--run-now: 실행 완료")
        return

    start_worker(watch_from=args.watch_from, interval=args.interval, max_empty=args.max_empty)


if __name__ == "__main__":
    main()
