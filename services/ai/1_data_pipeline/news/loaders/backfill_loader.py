"""
GPU 서버에서 처리 완료된 백필 CSV → DB 벌크 적재

CSV 컬럼 (GPU 서버 출력):
  title, article_url, source, date, code, name, body, full_body,
  keywords, sentiment_score, sentiment_label,
  llm_label, llm_score, finbert_label, finbert_score,
  is_hard_sample, ...

적재 대상:
  1. stock_news          — 뉴스 원본
  2. stock_news_map      — 종목-뉴스 매핑 + 감성 점수
  3. keywords            — 키워드 마스터
  4. news_keyword_map    — 뉴스-키워드 매핑

사용법:
  # 폴더 단위 (연도별)
  python -m loaders.backfill_loader output/backfill_processed/2025-20260316/

  # 여러 폴더 순차 적재 (최신부터)
  python -m loaders.backfill_loader output/backfill_processed/2025-20260316/ output/backfill_processed/2024/

  # 이어서 적재 (체크포인트 기반)
  python -m loaders.backfill_loader --resume output/backfill_processed/
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import argparse
import json
import logging
import os
from datetime import datetime

import pandas as pd

from config import OUTPUT_DIR
from db import get_session
from models import Keyword, NewsKeywordMap, Stock, StockNews, StockNewsMap

logger = logging.getLogger(__name__)

CHECKPOINT_PATH = OUTPUT_DIR / "backfill_checkpoint.json"


# ---------------------------------------------------------------------------
# 체크포인트 관리
# ---------------------------------------------------------------------------
def _load_checkpoint() -> set[str]:
    """이미 적재 완료된 CSV 파일 경로 set 반환."""
    if CHECKPOINT_PATH.is_file():
        with open(CHECKPOINT_PATH, "r", encoding="utf-8") as f:
            return set(json.load(f))
    return set()


def _save_checkpoint(done: set[str]) -> None:
    """적재 완료된 파일 목록 저장."""
    with open(CHECKPOINT_PATH, "w", encoding="utf-8") as f:
        json.dump(sorted(done), f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# 날짜 파싱 (공통 유틸 사용, 상대시간 비활성화 — 적재 시각 기준 오계산 방지)
# ---------------------------------------------------------------------------
from functools import partial
from utils.date_parser import parse_date
_parse_date = partial(parse_date, allow_relative=False)


# ---------------------------------------------------------------------------
# 단일 CSV → DB 벌크 적재
# ---------------------------------------------------------------------------
def bulk_load_backfill(csv_path: str) -> dict[str, int]:
    """
    GPU 처리 완료된 CSV를 DB에 벌크 적재 (메모리 최적화).

    처리 흐름:
      1. CSV를 청크 단위로 읽기 (500행씩)
      2. URL 중복 검사 → 신규만 stock_news INSERT
      3. stock_news_map INSERT (sentiment_score, sentiment_label 포함)
      4. keywords + news_keyword_map INSERT
      5. 청크마다 commit + session 초기화로 메모리 해제

    반환: {"news_inserted", "news_skipped", "maps_created", "keywords_created", "keyword_maps_created"}
    """
    stats = {
        "news_inserted": 0,
        "news_skipped": 0,
        "maps_created": 0,
        "keywords_created": 0,
        "keyword_maps_created": 0,
    }

    CHUNK_SIZE = 500

    # CSV 청크 리더 생성
    try:
        reader = pd.read_csv(
            csv_path, encoding="utf-8-sig", dtype={"code": str},
            engine="python", on_bad_lines="skip", chunksize=CHUNK_SIZE,
        )
    except Exception:
        reader = pd.read_csv(
            csv_path, encoding="utf-8", dtype={"code": str},
            engine="python", on_bad_lines="skip", chunksize=CHUNK_SIZE,
        )

    # 종목코드 → stock_id 캐시 (가벼운 dict만 유지)
    stock_id_cache: dict[str, int] = {}
    # 키워드명 → keyword_id 캐시 (가벼운 dict만 유지)
    keyword_cache: dict[str, int] = {}

    for chunk_idx, df in enumerate(reader):
        if df.empty:
            continue

        # 종목코드 6자리 패딩
        if "code" in df.columns:
            df["code"] = df["code"].astype(str).str.zfill(6)

        with get_session() as session:
            try:
                # 이 청크에 필요한 종목만 캐시 보충
                codes = df["code"].dropna().unique().tolist() if "code" in df.columns else []
                for code in codes:
                    if code not in stock_id_cache:
                        stock = session.query(Stock.id).filter(Stock.ticker == code).first()
                        if stock:
                            stock_id_cache[code] = stock[0]

                # 이 청크의 URL로만 중복 검사
                urls_in_chunk = df["article_url"].dropna().unique().tolist() if "article_url" in df.columns else []
                existing_urls: set[str] = set()
                for i in range(0, len(urls_in_chunk), 500):
                    batch = urls_in_chunk[i:i + 500]
                    rows = session.query(StockNews.url).filter(StockNews.url.in_(batch)).all()
                    existing_urls.update(r[0] for r in rows)

                for _, row in df.iterrows():
                    url = row.get("article_url", "")
                    code = str(row.get("code", "")).zfill(6) if row.get("code") else None
                    stock_id = stock_id_cache.get(code) if code else None

                    if not url or not stock_id:
                        stats["news_skipped"] += 1
                        continue

                    # --- 1. stock_news INSERT (URL 중복 시 기존 뉴스에 매핑만 추가) ---
                    if url in existing_urls:
                        existing_news = session.query(StockNews.id).filter(StockNews.url == url).first()
                        if existing_news:
                            news_id = existing_news[0]
                            exists_map = (
                                session.query(StockNewsMap.news_id)
                                .filter(StockNewsMap.stock_id == stock_id, StockNewsMap.news_id == news_id)
                                .first()
                            )
                            if not exists_map:
                                session.add(StockNewsMap(
                                    stock_id=stock_id,
                                    news_id=news_id,
                                    sentiment_score=_safe_float(row.get("sentiment_score")),
                                    sentiment_label=_safe_label(row.get("sentiment_label")),
                                ))
                                stats["maps_created"] += 1
                        stats["news_skipped"] += 1
                        continue

                    # 신규 뉴스 삽입
                    news = StockNews(
                        title=str(row.get("title", ""))[:255],
                        snippet=str(row.get("body", ""))[:500] if row.get("body") else None,
                        url=url,
                        publisher=str(row.get("source", ""))[:20] if row.get("source") else None,
                        published_at=_parse_date(str(row.get("date", ""))),
                    )
                    session.add(news)
                    session.flush()  # news.id 확보

                    # --- 2. stock_news_map INSERT (감성 점수 포함) ---
                    session.add(StockNewsMap(
                        stock_id=stock_id,
                        news_id=news.id,
                        sentiment_score=_safe_float(row.get("sentiment_score")),
                        sentiment_label=_safe_label(row.get("sentiment_label")),
                    ))
                    stats["maps_created"] += 1

                    # --- 3. keywords + news_keyword_map INSERT ---
                    raw_keywords = str(row.get("keywords", "")).strip()
                    if raw_keywords:
                        seen_kw = set()  # 같은 뉴스 내 키워드 중복 방지
                        for kw_name in raw_keywords.split(","):
                            kw_name = kw_name.strip()
                            if not kw_name or len(kw_name) > 20 or kw_name in seen_kw:
                                continue
                            seen_kw.add(kw_name)

                            # 키워드 생성 또는 캐시에서 조회
                            if kw_name not in keyword_cache:
                                existing_kw = session.query(Keyword.id).filter(Keyword.name == kw_name).first()
                                if existing_kw:
                                    keyword_cache[kw_name] = existing_kw[0]
                                else:
                                    kw_obj = Keyword(name=kw_name)
                                    session.add(kw_obj)
                                    session.flush()
                                    keyword_cache[kw_name] = kw_obj.id
                                    stats["keywords_created"] += 1

                            # 뉴스-키워드 매핑
                            session.add(NewsKeywordMap(
                                news_id=news.id,
                                keyword_id=keyword_cache[kw_name],
                            ))
                            stats["keyword_maps_created"] += 1

                    existing_urls.add(url)
                    stats["news_inserted"] += 1

                # 청크 끝: 커밋 + 세션 메모리 해제
                session.commit()
                session.expunge_all()
                logger.info(
                    "  청크 %d 완료 (누적 뉴스 %d건, 스킵 %d건)",
                    chunk_idx + 1, stats["news_inserted"], stats["news_skipped"],
                )

            except Exception:
                session.rollback()
                raise

    return stats


def _safe_float(val) -> float | None:
    """안전하게 float 변환. 실패 시 None."""
    if val is None or (isinstance(val, float) and pd.isna(val)):
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _safe_label(val) -> str | None:
    """감성 라벨 검증. POSITIVE/NEGATIVE/NEUTRAL만 허용."""
    if not val or (isinstance(val, float) and pd.isna(val)):
        return None
    label = str(val).strip().upper()
    if label in ("POSITIVE", "NEGATIVE", "NEUTRAL"):
        return label
    return None


# ---------------------------------------------------------------------------
# 폴더 단위 적재
# ---------------------------------------------------------------------------
def process_backfill_folder(folder_path: str, resume: bool = False) -> dict[str, int]:
    """폴더 내 모든 CSV를 순차 적재 (체크포인트 지원)."""
    csv_files = sorted(Path(folder_path).glob("*.csv"))
    if not csv_files:
        logger.warning("CSV 파일 없음: %s", folder_path)
        return {"news_inserted": 0, "news_skipped": 0, "maps_created": 0,
                "keywords_created": 0, "keyword_maps_created": 0}

    done_files = _load_checkpoint() if resume else set()
    pending = [f for f in csv_files if f.name not in done_files]

    if resume and len(pending) < len(csv_files):
        logger.info("체크포인트: %d개 완료, %d개 남음", len(csv_files) - len(pending), len(pending))

    total = {"news_inserted": 0, "news_skipped": 0, "maps_created": 0,
             "keywords_created": 0, "keyword_maps_created": 0}

    for idx, csv_path in enumerate(pending, 1):
        logger.info("[%d/%d] %s 적재 중...", idx, len(pending), csv_path.name)

        try:
            stats = bulk_load_backfill(str(csv_path))
            for k in total:
                total[k] += stats[k]

            logger.info(
                "  완료: 뉴스 +%d (스킵 %d) | 매핑 %d | 키워드 +%d | 키워드매핑 %d",
                stats["news_inserted"], stats["news_skipped"],
                stats["maps_created"], stats["keywords_created"],
                stats["keyword_maps_created"],
            )

            done_files.add(csv_path.name)
            if resume:
                _save_checkpoint(done_files)

        except Exception as e:
            logger.error("  [%s] 오류: %s", csv_path.name, e)

    return total


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="GPU 백필 CSV → DB 벌크 적재")
    parser.add_argument("paths", nargs="+", help="CSV 파일 또는 폴더 경로")
    parser.add_argument("--resume", action="store_true", help="체크포인트 기반 이어서 적재")
    args = parser.parse_args()

    grand_total = {"news_inserted": 0, "news_skipped": 0, "maps_created": 0,
                   "keywords_created": 0, "keyword_maps_created": 0}

    for path in args.paths:
        if os.path.isdir(path):
            stats = process_backfill_folder(path, resume=args.resume)
        elif os.path.isfile(path):
            logger.info("단일 파일 적재: %s", path)
            stats = bulk_load_backfill(path)
        else:
            logger.warning("경로 없음: %s", path)
            continue

        for k in grand_total:
            grand_total[k] += stats[k]

    logger.info("=" * 60)
    logger.info("전체 완료")
    logger.info("  뉴스 삽입: %d건", grand_total["news_inserted"])
    logger.info("  뉴스 스킵: %d건 (중복)", grand_total["news_skipped"])
    logger.info("  종목매핑: %d건", grand_total["maps_created"])
    logger.info("  신규 키워드: %d건", grand_total["keywords_created"])
    logger.info("  키워드매핑: %d건", grand_total["keyword_maps_created"])
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
