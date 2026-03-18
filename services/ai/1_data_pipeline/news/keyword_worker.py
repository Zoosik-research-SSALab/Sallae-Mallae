"""
키워드 추출 데스크탑 워커 — DB 폴링 방식

EC2 스케줄러(scheduler.py)가 크롤링+DB적재 완료 후
pipeline_signals 테이블에 신호를 남기면, 이 워커가 감지하여:
  1. vLLM (Qwen2.5-7B-Instruct-AWQ)으로 키워드 추출
  2. e5-small 임베딩 생성
  3. K-means 클러스터링

17:30부터 5분 간격으로 DB를 폴링하고, 신호를 처리하면 다음 날까지 대기.
실패 시 최대 5회 재시도. 워커 재시작 시 중단된 신호 자동 복구.

실행 환경: WSL2 Ubuntu (vLLM이 Linux 전용)
GPU: RTX 5060 8GB — AWQ 양자화 모델 사용 (FP16 7B는 VRAM 초과)

사용법 (WSL2 Ubuntu 터미널에서):
  # SSH 터널 + vLLM 서버가 실행 중인 상태에서:
  python3 keyword_worker.py

  # 즉시 1회 실행 (신호 무시, 미처리 뉴스 있으면 바로 처리)
  python3 keyword_worker.py --run-now

  # 감시 시작 시각 변경 (기본: 17:30)
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
from models import PipelineSignal

logger = logging.getLogger(__name__)

MAX_RETRIES = 5


# ---------------------------------------------------------------------------
# 신호 감지 + 복구
# ---------------------------------------------------------------------------
def recover_stale_signals() -> int:
    """워커 재시작 시 PROCESSING 상태로 남은 신호를 PENDING으로 복구. 복구 건수 반환."""
    with get_session() as session:
        try:
            stale = (
                session.query(PipelineSignal)
                .filter(
                    PipelineSignal.signal_type == "NEWS_CRAWL_DONE",
                    PipelineSignal.status == "PROCESSING",
                )
                .all()
            )
            for signal in stale:
                signal.status = "PENDING"
            session.commit()
            return len(stale)
        except Exception:
            session.rollback()
            raise


def check_pending_signal() -> PipelineSignal | None:
    """PENDING 또는 재시도 가능한 FAILED 신호를 반환."""
    with get_session() as session:
        signal = (
            session.query(PipelineSignal)
            .filter(
                PipelineSignal.signal_type == "NEWS_CRAWL_DONE",
                PipelineSignal.status.in_(["PENDING", "FAILED"]),
                PipelineSignal.retry_count < MAX_RETRIES,
            )
            .order_by(PipelineSignal.created_at.desc())
            .first()
        )
        if signal:
            session.expunge(signal)
            return signal
    return None


def update_signal_status(signal_id: int, status: str) -> None:
    """신호 상태를 업데이트. FAILED 시 retry_count 증가."""
    with get_session() as session:
        try:
            signal = session.query(PipelineSignal).filter(PipelineSignal.id == signal_id).first()
            if signal:
                signal.status = status
                if status == "DONE":
                    signal.processed_at = datetime.datetime.now()
                elif status == "FAILED":
                    signal.retry_count += 1
                    if signal.retry_count >= MAX_RETRIES:
                        logger.error("최대 재시도 횟수(%d) 초과 — 더 이상 재시도하지 않음", MAX_RETRIES)
                session.commit()
        except Exception:
            session.rollback()
            raise


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


def start_worker(watch_from: str = "17:00", interval: int = 60) -> None:
    """DB 폴링 워커를 시작."""
    hour, minute = map(int, watch_from.split(":"))

    logger.info("키워드 워커 시작 | 감시 시작: %s | 폴링 간격: %d초 | 최대 재시도: %d회",
                watch_from, interval, MAX_RETRIES)
    logger.info("주간 전체 재클러스터링: 매주 토요일 20:00")

    # 워커 재시작 시 PROCESSING 상태로 남은 신호 복구
    recovered = recover_stale_signals()
    if recovered:
        logger.info("중단된 신호 %d건 복구 (PROCESSING → PENDING)", recovered)

    try:
        while True:
            # 토요일 20시 전체 재클러스터링 체크
            check_weekly_recluster()

            # 주말(토/일)에는 크롤링이 없으므로 신호 감시 스킵
            if datetime.datetime.now().weekday() >= 5:
                time.sleep(interval)
                continue

            # 매일 감시 시작 시각까지 대기
            wait_until(hour, minute)

            logger.info("신호 감시 시작")
            processed_today = False

            while not processed_today:
                signal = check_pending_signal()

                if signal:
                    logger.info("신호 감지! (id=%d, retry=%d/%d, created_at=%s)",
                                signal.id, signal.retry_count, MAX_RETRIES, signal.created_at)

                    # vLLM 서버 확인
                    if not check_vllm_health():
                        logger.error("vLLM 서버 응답 없음 — 60초 후 재시도")
                        time.sleep(60)
                        continue

                    # 신호 상태 → PROCESSING
                    update_signal_status(signal.id, "PROCESSING")

                    try:
                        asyncio.run(run_keyword_pipeline())
                        update_signal_status(signal.id, "DONE")
                        logger.info("처리 완료 — 내일까지 대기")
                        processed_today = True
                    except Exception as e:
                        logger.error("파이프라인 실행 실패 (retry=%d/%d): %s",
                                     signal.retry_count + 1, MAX_RETRIES, e)
                        update_signal_status(signal.id, "FAILED")
                        # 재시도 횟수 남아있으면 다음 폴링에서 재시도
                        if signal.retry_count + 1 >= MAX_RETRIES:
                            logger.error("최대 재시도 초과 — 내일까지 대기")
                            processed_today = True
                        else:
                            logger.info("다음 폴링에서 재시도 예정")
                            time.sleep(interval)
                else:
                    # 자정이 지나면 다음 날 감시 시작 시각으로 넘어감
                    if datetime.datetime.now().hour >= 23 and datetime.datetime.now().minute >= 59:
                        logger.info("자정 도래 — 신호 없이 하루 종료")
                        processed_today = True
                    else:
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

    parser = argparse.ArgumentParser(description="키워드 추출 데스크탑 워커 (DB 폴링)")
    parser.add_argument("--run-now", action="store_true",
                        help="신호 무시, 즉시 1회 실행 후 종료")
    parser.add_argument("--watch-from", default="17:30",
                        help="감시 시작 시각 (기본: 17:30)")
    parser.add_argument("--interval", type=int, default=300,
                        help="폴링 간격 초 (기본: 300)")
    args = parser.parse_args()

    if args.run_now:
        logger.info("--run-now: 즉시 파이프라인 실행")
        if not check_vllm_health():
            logger.error("vLLM 서버 응답 없음 — 서버를 먼저 실행해주세요")
            return
        asyncio.run(run_keyword_pipeline())
        logger.info("--run-now: 실행 완료")
        return

    start_worker(watch_from=args.watch_from, interval=args.interval)


if __name__ == "__main__":
    main()
