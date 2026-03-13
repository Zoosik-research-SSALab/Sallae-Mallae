"""
키워드 추출 배치 — KeyBERT(기본) / Gemini API 지원

DB에 저장된 뉴스 기사에서 키워드를 추출하고,
임베딩 → 클러스터링으로 정규화한 뒤 keywords / news_keyword_map 테이블에 저장.

흐름:
  1. stock_news 테이블에서 키워드 미추출 기사 조회
  2. KeyBERT 또는 Gemini로 키워드 추출
  3. 추출된 키워드를 임베딩 → 코사인 유사도 기반 클러스터링
  4. 클러스터 대표 키워드를 keywords 테이블에 저장
  5. 기사-키워드 매핑을 news_keyword_map에 저장
  6. canonical 키워드 임베딩 벡터를 keyword_embeddings에 저장

사용법:
  # KeyBERT로 키워드 추출 (기본, API 불필요)
  python keyword_batch.py

  # Gemini로 키워드 추출
  python keyword_batch.py --backend gemini

  # 최근 N일 기사만
  python keyword_batch.py --days 7

  # 배치 크기 조절 (API rate limit 대응)
  python keyword_batch.py --batch-size 50 --delay 1.0
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import argparse
import asyncio
import logging
from datetime import datetime, timedelta

import numpy as np
from sqlalchemy import text

from config import EMBEDDING_MODEL_NAME, GMS_API_KEY, GMS_API_URL, GMS_MODEL
from db import get_session
from models import Keyword, KeywordEmbedding, NewsKeywordMap, StockNews

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 키워드 미추출 기사 조회
# ---------------------------------------------------------------------------
def get_unprocessed_news(days: int | None = None, limit: int = 5000) -> list[dict]:
    """키워드가 아직 매핑되지 않은 뉴스 기사 조회."""
    with get_session() as session:
        query = (
            session.query(StockNews)
            .outerjoin(NewsKeywordMap, StockNews.id == NewsKeywordMap.news_id)
            .filter(NewsKeywordMap.news_id.is_(None))
        )
        if days:
            cutoff = datetime.now() - timedelta(days=days)
            query = query.filter(StockNews.published_at >= cutoff)

        query = query.order_by(StockNews.published_at.desc()).limit(limit)
        results = query.all()

        return [
            {
                "id": n.id,
                "title": n.title or "",
                "body": n.snippet or "",
            }
            for n in results
        ]


# ---------------------------------------------------------------------------
# 키워드 추출 (Gemini 배치)
# ---------------------------------------------------------------------------
async def extract_keywords_batch(
    articles: list[dict],
    batch_size: int = 100,
    delay: float = 0.5,
    backend: str = "keybert",
) -> dict[int, list[str]]:
    """
    기사 목록에서 키워드를 배치 추출.
    반환: {news_id: ["키워드1", "키워드2", ...]}
    backend: "keybert" (기본, 로컬) | "gemini" (GMS API)
    """
    from processors.nlp_processor import KeywordExtractor

    if backend == "gemini":
        if not GMS_API_KEY:
            raise RuntimeError("GMS_API_KEY 환경변수가 설정되지 않았습니다.")
        extractor = KeywordExtractor(
            backend="gemini", api_key=GMS_API_KEY, model=GMS_MODEL, base_url=GMS_API_URL
        )
    else:
        extractor = KeywordExtractor(backend=backend)
    results: dict[int, list[str]] = {}

    for i in range(0, len(articles), batch_size):
        batch = articles[i:i + batch_size]
        logger.info("  배치 %d~%d / %d 처리 중...", i + 1, min(i + batch_size, len(articles)), len(articles))

        tasks = [
            extractor.extract_keywords(a["title"], a["body"])
            for a in batch
        ]
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)

        for article, result in zip(batch, batch_results):
            if isinstance(result, list):
                results[article["id"]] = result
            else:
                logger.warning("  키워드 추출 실패 (news_id=%d): %s", article["id"], result)
                results[article["id"]] = []

        if delay > 0 and i + batch_size < len(articles):
            await asyncio.sleep(delay)

    return results


# ---------------------------------------------------------------------------
# 임베딩 + 클러스터링으로 키워드 정규화
# ---------------------------------------------------------------------------
def cluster_keywords(
    raw_keywords: list[str],
    threshold: float = 0.85,
) -> tuple[dict[str, str], dict[str, list[float]]]:
    """
    원시 키워드를 임베딩 유사도 기반으로 클러스터링.
    유사한 키워드끼리 그룹핑하고 가장 짧은 것을 대표(canonical)로 선택.

    반환: (canonical_map, embedding_map)
      - canonical_map: {원시 키워드: canonical 키워드}
      - embedding_map: {canonical 키워드: [384차원 벡터]}
    """
    if not raw_keywords:
        return {}, {}

    unique_keywords = list(set(raw_keywords))
    if len(unique_keywords) <= 1:
        return {k: k for k in raw_keywords}, {}

    # 임베딩
    from transformers import AutoModel, AutoTokenizer
    import torch

    logger.info("  임베딩 모델 로딩: %s", EMBEDDING_MODEL_NAME)
    tokenizer = AutoTokenizer.from_pretrained(EMBEDDING_MODEL_NAME)
    model = AutoModel.from_pretrained(EMBEDDING_MODEL_NAME)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    model.eval()

    # E5 모델은 "query: " prefix 필요
    texts = [f"query: {k}" for k in unique_keywords]

    with torch.no_grad():
        encoded = tokenizer(texts, padding=True, truncation=True, max_length=64, return_tensors="pt")
        encoded = {k: v.to(device) for k, v in encoded.items()}
        output = model(**encoded)
        embs = output.last_hidden_state[:, 0, :].cpu().numpy()

    # L2 정규화
    norms = np.linalg.norm(embs, axis=1, keepdims=True)
    embs = embs / np.maximum(norms, 1e-8)

    # 코사인 유사도 행렬
    sim_matrix = embs @ embs.T

    # 그리디 클러스터링
    n = len(unique_keywords)
    cluster_map: dict[str, str] = {}
    assigned = [False] * n

    for i in range(n):
        if assigned[i]:
            continue
        # 이 키워드를 새 클러스터의 시드로 사용
        cluster_members = [i]
        assigned[i] = True

        for j in range(i + 1, n):
            if assigned[j]:
                continue
            if sim_matrix[i][j] >= threshold:
                cluster_members.append(j)
                assigned[j] = True

        # 대표 키워드: 가장 짧은 것 (동률 시 빈도 높은 것)
        member_keywords = [unique_keywords[idx] for idx in cluster_members]
        canonical = min(member_keywords, key=len)

        for kw in member_keywords:
            cluster_map[kw] = canonical

    # canonical 키워드별 임베딩 벡터 (대표 키워드의 벡터 사용)
    embedding_map: dict[str, list[float]] = {}
    for i, kw in enumerate(unique_keywords):
        canonical = cluster_map.get(kw, kw)
        if canonical not in embedding_map:
            embedding_map[canonical] = embs[i].tolist()

    # 원시 키워드 전체에 매핑 적용
    return {k: cluster_map.get(k, k) for k in raw_keywords}, embedding_map


# ---------------------------------------------------------------------------
# DB 저장
# ---------------------------------------------------------------------------
def save_keywords_to_db(
    news_keywords: dict[int, list[str]],
    canonical_map: dict[str, str],
    embedding_map: dict[str, list[float]] | None = None,
) -> dict[str, int]:
    """
    키워드와 매핑을 DB에 저장하고, 임베딩 벡터를 keyword_embeddings에 저장.
    반환: {"keywords_created": N, "mappings_created": N, "embeddings_saved": N}
    """
    stats = {"keywords_created": 0, "mappings_created": 0, "embeddings_saved": 0}

    with get_session() as session:
        try:
            # 기존 키워드 캐시
            keyword_cache: dict[str, int] = {}
            existing = session.query(Keyword).all()
            for kw in existing:
                keyword_cache[kw.name] = kw.id

            for news_id, raw_keywords in news_keywords.items():
                for raw_kw in raw_keywords:
                    # canonical 키워드로 정규화
                    canonical = canonical_map.get(raw_kw, raw_kw)
                    if not canonical or len(canonical) > 20:
                        continue

                    # 키워드가 없으면 생성
                    if canonical not in keyword_cache:
                        kw_obj = Keyword(name=canonical)
                        session.add(kw_obj)
                        session.flush()
                        keyword_cache[canonical] = kw_obj.id
                        stats["keywords_created"] += 1

                    keyword_id = keyword_cache[canonical]

                    # 매핑 중복 체크
                    exists = (
                        session.query(NewsKeywordMap)
                        .filter(
                            NewsKeywordMap.news_id == news_id,
                            NewsKeywordMap.keyword_id == keyword_id,
                        )
                        .first()
                    )
                    if not exists:
                        session.add(NewsKeywordMap(news_id=news_id, keyword_id=keyword_id))
                        stats["mappings_created"] += 1

            # 임베딩 벡터 저장 (keyword_embeddings 테이블)
            if embedding_map:
                for kw_name, emb_vector in embedding_map.items():
                    kw_id = keyword_cache.get(kw_name)
                    if not kw_id:
                        continue
                    # 기존 임베딩이 있으면 업데이트, 없으면 생성
                    existing_emb = (
                        session.query(KeywordEmbedding)
                        .filter(KeywordEmbedding.keyword_id == kw_id)
                        .first()
                    )
                    if existing_emb:
                        existing_emb.embedding = emb_vector
                    else:
                        session.add(KeywordEmbedding(keyword_id=kw_id, embedding=emb_vector))
                        stats["embeddings_saved"] += 1

            session.commit()
        except Exception:
            session.rollback()
            raise

    return stats


# ---------------------------------------------------------------------------
# 메인 실행
# ---------------------------------------------------------------------------
async def run_keyword_batch(
    days: int | None = None,
    batch_size: int = 100,
    delay: float = 0.5,
    limit: int = 5000,
    backend: str = "keybert",
) -> None:
    """키워드 추출 배치 전체 실행."""
    # 1. 미처리 기사 조회
    articles = get_unprocessed_news(days=days, limit=limit)
    if not articles:
        logger.info("키워드 미추출 기사가 없습니다.")
        return

    logger.info("키워드 추출 대상: %d건 (backend: %s)", len(articles), backend)

    # 2. 키워드 추출 (KeyBERT 또는 Gemini)
    news_keywords = await extract_keywords_batch(articles, batch_size=batch_size, delay=delay, backend=backend)

    extracted_count = sum(1 for kws in news_keywords.values() if kws)
    logger.info("키워드 추출 완료: %d / %d건", extracted_count, len(articles))

    # 3. 클러스터링으로 정규화
    all_raw = [kw for kws in news_keywords.values() for kw in kws]
    if all_raw:
        logger.info("키워드 클러스터링: %d개 원시 키워드", len(all_raw))
        canonical_map, embedding_map = cluster_keywords(all_raw)
        unique_canonicals = set(canonical_map.values())
        logger.info("  → %d개 canonical 키워드로 정규화", len(unique_canonicals))
    else:
        canonical_map = {}
        embedding_map = {}
        logger.warning("추출된 키워드가 없습니다.")
        return

    # 4. DB 저장 (키워드 + 매핑 + 임베딩)
    stats = save_keywords_to_db(news_keywords, canonical_map, embedding_map)
    logger.info(
        "DB 저장 완료 | 신규 키워드: %d | 매핑: %d | 임베딩: %d",
        stats["keywords_created"], stats["mappings_created"], stats["embeddings_saved"],
    )


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="뉴스 키워드 추출 배치")
    parser.add_argument("--days", type=int, default=None, help="최근 N일 기사만 처리")
    parser.add_argument("--batch-size", type=int, default=100, help="배치 크기 (기본: 100)")
    parser.add_argument("--delay", type=float, default=0.5, help="배치 간 딜레이 초 (기본: 0.5)")
    parser.add_argument("--limit", type=int, default=5000, help="최대 처리 건수 (기본: 5000)")
    parser.add_argument("--backend", type=str, default="keybert",
                        choices=["keybert", "gemini", "claude", "ollama"],
                        help="키워드 추출 백엔드 (기본: keybert)")
    args = parser.parse_args()

    asyncio.run(run_keyword_batch(
        days=args.days,
        batch_size=args.batch_size,
        delay=args.delay,
        limit=args.limit,
        backend=args.backend,
    ))


if __name__ == "__main__":
    main()
