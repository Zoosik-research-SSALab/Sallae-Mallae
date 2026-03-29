"""
백필 크롤러 — 체크포인트(진행상황 저장/복원) 유틸리티

크롤링 도중 중단되더라도 마지막 진행 위치부터 자동으로 재개할 수 있도록
종목별 진행 상태를 JSON 파일에 기록한다.
"""
import json
import logging
import os
from datetime import datetime

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import OUTPUT_DIR

logger = logging.getLogger(__name__)

CHECKPOINT_DIR = os.path.join(OUTPUT_DIR, "checkpoints")
os.makedirs(CHECKPOINT_DIR, exist_ok=True)


def _checkpoint_path(run_id: str) -> str:
    return os.path.join(CHECKPOINT_DIR, f"backfill_{run_id}.json")


def _save(path: str, data: dict) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# 체크포인트 생성 / 로드
# ---------------------------------------------------------------------------
def create_checkpoint(run_id: str, stock_codes: list[str]) -> dict:
    """새 백필 세션을 위한 체크포인트 초기화.
    이미 파일이 존재하면 기존 것을 로드하여 이어받기(Resume).
    """
    path = _checkpoint_path(run_id)
    if os.path.exists(path):
        logger.info("기존 체크포인트 발견 — 이어서 진행: %s", path)
        return load_checkpoint(run_id)

    checkpoint = {
        "run_id": run_id,
        "created_at": datetime.now().isoformat(),
        "last_updated": datetime.now().isoformat(),
        "total_stocks": len(stock_codes),
        "progress": {},
        "stats": {
            "stocks_done": 0,
            "stocks_failed": 0,
            "total_articles": 0,
        },
    }
    for code in stock_codes:
        checkpoint["progress"][code] = {
            "status": "pending",
            "last_page": 0,
            "articles_collected": 0,
            "error": None,
        }

    _save(path, checkpoint)
    logger.info("새 체크포인트 생성: %s", path)
    return checkpoint


def load_checkpoint(run_id: str) -> dict:
    """저장된 체크포인트를 로드한다."""
    path = _checkpoint_path(run_id)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# 진행 상태 갱신
# ---------------------------------------------------------------------------
def update_stock_progress(
    checkpoint: dict,
    code: str,
    *,
    status: str | None = None,
    last_page: int | None = None,
    articles_delta: int = 0,
    error: str | None = None,
) -> None:
    """특정 종목의 진행 상황을 갱신하고 디스크에 저장한다."""
    prog = checkpoint["progress"].get(code, {})

    if status is not None:
        prog["status"] = status
    if last_page is not None:
        prog["last_page"] = last_page
    if articles_delta:
        prog["articles_collected"] = prog.get("articles_collected", 0) + articles_delta
        checkpoint["stats"]["total_articles"] += articles_delta
    if error is not None:
        prog["error"] = error

    checkpoint["progress"][code] = prog
    checkpoint["last_updated"] = datetime.now().isoformat()

    # 완료/실패 카운트 재계산
    all_progress = checkpoint["progress"].values()
    checkpoint["stats"]["stocks_done"] = sum(1 for p in all_progress if p["status"] == "done")
    checkpoint["stats"]["stocks_failed"] = sum(1 for p in all_progress if p["status"] == "failed")

    _save(_checkpoint_path(checkpoint["run_id"]), checkpoint)


# ---------------------------------------------------------------------------
# 조회 헬퍼
# ---------------------------------------------------------------------------
def get_pending_stocks(checkpoint: dict) -> list[str]:
    """아직 완료되지 않은 종목 코드 목록 반환 (pending + in_progress + failed)."""
    return [
        code for code, prog in checkpoint["progress"].items()
        if prog["status"] in ("pending", "in_progress", "failed")
    ]


def get_resume_page(checkpoint: dict, code: str) -> int:
    """해당 종목의 재시작 페이지 번호 반환 (last_page + 1)."""
    prog = checkpoint["progress"].get(code, {})
    return prog.get("last_page", 0) + 1


def print_summary(checkpoint: dict) -> None:
    """체크포인트 요약을 로거로 출력한다."""
    stats = checkpoint["stats"]
    total = checkpoint["total_stocks"]
    done = stats["stocks_done"]
    failed = stats["stocks_failed"]
    remaining = total - done - failed
    articles = stats["total_articles"]

    logger.info(
        "백필 진행 현황 [%s] | 완료: %d/%d | 실패: %d | 남은: %d | 총 기사: %d건",
        checkpoint["run_id"], done, total, failed, remaining, articles,
    )
