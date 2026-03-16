"""
키워드 임베딩 생성 — keyword_embeddings 테이블 적재

keywords 테이블에 있지만 keyword_embeddings에 아직 없는 키워드를 찾아
intfloat/multilingual-e5-small (384차원) 임베딩을 생성하고 DB에 저장.

사용법:
  # 미임베딩 키워드 전체 처리
  python -m processors.embed_keywords

  # 배치 크기 조절
  python -m processors.embed_keywords --batch-size 256
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import argparse
import logging

import numpy as np
import torch
from transformers import AutoModel, AutoTokenizer

from config import EMBEDDING_MODEL_NAME
from db import get_session
from models import Keyword, KeywordEmbedding

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 임베딩 미생성 키워드 조회
# ---------------------------------------------------------------------------
def get_keywords_without_embedding() -> list[dict]:
    """keyword_embeddings에 아직 없는 키워드 목록 반환."""
    with get_session() as session:
        results = (
            session.query(Keyword)
            .outerjoin(KeywordEmbedding, Keyword.id == KeywordEmbedding.keyword_id)
            .filter(KeywordEmbedding.keyword_id.is_(None))
            .all()
        )
        return [{"id": kw.id, "name": kw.name} for kw in results]


# ---------------------------------------------------------------------------
# e5-small 임베딩 생성
# ---------------------------------------------------------------------------
def generate_embeddings(keywords: list[str], batch_size: int = 128) -> np.ndarray:
    """
    키워드 목록을 e5-small로 임베딩.
    반환: (N, 384) numpy 배열 (L2 정규화 완료)
    """
    logger.info("임베딩 모델 로딩: %s", EMBEDDING_MODEL_NAME)
    tokenizer = AutoTokenizer.from_pretrained(EMBEDDING_MODEL_NAME)
    model = AutoModel.from_pretrained(EMBEDDING_MODEL_NAME)
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    model.eval()
    logger.info("임베딩 모델 로딩 완료 (device=%s)", device)

    all_embs = []

    for i in range(0, len(keywords), batch_size):
        batch = keywords[i:i + batch_size]
        # E5 모델은 "query: " prefix 필요
        texts = [f"query: {kw}" for kw in batch]

        with torch.no_grad():
            encoded = tokenizer(
                texts, padding=True, truncation=True,
                max_length=64, return_tensors="pt",
            )
            encoded = {k: v.to(device) for k, v in encoded.items()}
            output = model(**encoded)
            embs = output.last_hidden_state[:, 0, :].cpu().numpy()

        all_embs.append(embs)

        if (i + batch_size) % 1000 == 0:
            logger.info("  임베딩 진행: %d / %d", min(i + batch_size, len(keywords)), len(keywords))

    result = np.vstack(all_embs)

    # L2 정규화
    norms = np.linalg.norm(result, axis=1, keepdims=True)
    result = result / np.maximum(norms, 1e-8)

    return result


# ---------------------------------------------------------------------------
# DB 저장
# ---------------------------------------------------------------------------
def save_embeddings_to_db(keyword_ids: list[int], embeddings: np.ndarray) -> int:
    """키워드 임베딩을 keyword_embeddings 테이블에 저장. 저장된 건수 반환."""
    saved = 0

    with get_session() as session:
        try:
            for kw_id, emb in zip(keyword_ids, embeddings):
                existing = (
                    session.query(KeywordEmbedding)
                    .filter(KeywordEmbedding.keyword_id == kw_id)
                    .first()
                )
                if existing:
                    existing.embedding = emb.tolist()
                else:
                    session.add(KeywordEmbedding(
                        keyword_id=kw_id,
                        embedding=emb.tolist(),
                    ))
                    saved += 1

                # 500건마다 중간 커밋
                if saved % 500 == 0 and saved > 0:
                    session.commit()
                    logger.info("  ... %d건 저장 완료", saved)

            session.commit()
        except Exception:
            session.rollback()
            raise

    return saved


# ---------------------------------------------------------------------------
# 메인 실행
# ---------------------------------------------------------------------------
def run_embed_keywords(batch_size: int = 128) -> None:
    """미임베딩 키워드를 조회하고 임베딩 생성 후 DB에 저장."""
    # 1. 미임베딩 키워드 조회
    keywords = get_keywords_without_embedding()
    if not keywords:
        logger.info("임베딩 미생성 키워드가 없습니다.")
        return

    logger.info("임베딩 대상 키워드: %d건", len(keywords))

    # 2. 임베딩 생성
    kw_names = [kw["name"] for kw in keywords]
    kw_ids = [kw["id"] for kw in keywords]
    embeddings = generate_embeddings(kw_names, batch_size=batch_size)

    # 3. DB 저장
    saved = save_embeddings_to_db(kw_ids, embeddings)
    logger.info("임베딩 저장 완료: %d건 (신규 %d / 업데이트 %d)", len(keywords), saved, len(keywords) - saved)


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="키워드 임베딩 생성 (e5-small)")
    parser.add_argument("--batch-size", type=int, default=128, help="임베딩 배치 크기 (기본: 128)")
    args = parser.parse_args()

    run_embed_keywords(batch_size=args.batch_size)


if __name__ == "__main__":
    main()
