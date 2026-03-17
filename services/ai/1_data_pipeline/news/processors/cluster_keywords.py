"""
키워드 클러스터링 — keyword_clusters 테이블 적재

keyword_embeddings 테이블의 384차원 벡터를 K-means로 클러스터링한 뒤,
각 클러스터의 중심에 가장 가까운 키워드를 대표명으로 선정하여
keyword_clusters 테이블에 저장하고 keywords.cluster_id를 업데이트.

사용법:
  # 기본 실행 (클러스터 수 자동 결정: sqrt(N/2))
  python -m processors.cluster_keywords

  # 클러스터 수 직접 지정
  python -m processors.cluster_keywords --n-clusters 50

  # 기존 클러스터 초기화 후 재실행
  python -m processors.cluster_keywords --reset
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import argparse
import logging
import math

import numpy as np
from sklearn.cluster import KMeans

from db import get_session
from models import Keyword, KeywordCluster, KeywordEmbedding

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 임베딩 데이터 로드
# ---------------------------------------------------------------------------
def load_embeddings() -> tuple[list[int], list[str], np.ndarray]:
    """
    keyword_embeddings 테이블에서 전체 임베딩을 로드.
    반환: (keyword_ids, keyword_names, embeddings ndarray (N, 384))
    """
    with get_session() as session:
        rows = (
            session.query(Keyword.id, Keyword.name, KeywordEmbedding.embedding)
            .join(KeywordEmbedding, Keyword.id == KeywordEmbedding.keyword_id)
            .all()
        )

    if not rows:
        return [], [], np.empty((0, 384))

    kw_ids = [r[0] for r in rows]
    kw_names = [r[1] for r in rows]

    # pgvector는 list를 반환하지만, Text 컬럼이면 문자열로 반환
    def _parse_embedding(val):
        if isinstance(val, (list, np.ndarray)):
            return val
        # "[0.1,0.2,...]" 형식 문자열 파싱
        import json
        return json.loads(val)

    embeddings = np.array([_parse_embedding(r[2]) for r in rows], dtype=np.float32)

    return kw_ids, kw_names, embeddings


# ---------------------------------------------------------------------------
# K-means 클러스터링
# ---------------------------------------------------------------------------
def run_clustering(
    embeddings: np.ndarray,
    n_clusters: int | None = None,
) -> tuple[np.ndarray, np.ndarray]:
    """
    K-means 클러스터링 실행.
    n_clusters가 None이면 sqrt(N/2)로 자동 결정.
    반환: (labels, centroids)
    """
    n = len(embeddings)
    if n_clusters is None:
        n_clusters = max(10, int(math.sqrt(n / 2)))
    n_clusters = min(n_clusters, n)

    logger.info("K-means 클러스터링: N=%d, K=%d", n, n_clusters)

    kmeans = KMeans(
        n_clusters=n_clusters,
        random_state=42,
        n_init=10,
        max_iter=300,
    )
    labels = kmeans.fit_predict(embeddings)

    return labels, kmeans.cluster_centers_


# ---------------------------------------------------------------------------
# 클러스터별 대표 키워드 선정
# ---------------------------------------------------------------------------
def find_representative_keywords(
    embeddings: np.ndarray,
    labels: np.ndarray,
    centroids: np.ndarray,
    kw_names: list[str],
) -> dict[int, str]:
    """
    각 클러스터 중심에 가장 가까운 키워드를 대표명으로 선정.
    반환: {cluster_label: representative_keyword_name}
    """
    representatives = {}
    for cluster_id in range(len(centroids)):
        mask = labels == cluster_id
        if not mask.any():
            continue

        cluster_indices = np.where(mask)[0]
        cluster_embs = embeddings[cluster_indices]
        centroid = centroids[cluster_id]

        # 코사인 유사도 기반 (임베딩은 L2 정규화 완료)
        similarities = cluster_embs @ centroid
        best_idx = cluster_indices[np.argmax(similarities)]
        representatives[cluster_id] = kw_names[best_idx]

    return representatives


# ---------------------------------------------------------------------------
# DB 저장
# ---------------------------------------------------------------------------
def save_clusters_to_db(
    kw_ids: list[int],
    labels: np.ndarray,
    representatives: dict[int, str],
    reset: bool = False,
) -> dict[str, int]:
    """
    클러스터 결과를 DB에 저장.
    1. keyword_clusters 테이블에 클러스터 생성
    2. keywords.cluster_id 업데이트
    반환: {"clusters_created", "keywords_updated"}
    """
    stats = {"clusters_created": 0, "keywords_updated": 0}

    with get_session() as session:
        try:
            if reset:
                # 기존 클러스터 초기화
                session.query(Keyword).update({"cluster_id": None})
                session.query(KeywordCluster).delete()
                session.flush()
                logger.info("기존 클러스터 초기화 완료")

            # 클러스터 label → DB id 매핑
            label_to_db_id: dict[int, int] = {}

            for cluster_label, name in sorted(representatives.items()):
                cluster = KeywordCluster(name=name[:15])
                session.add(cluster)
                session.flush()
                label_to_db_id[cluster_label] = cluster.id
                stats["clusters_created"] += 1

            # keywords.cluster_id 업데이트
            for idx, kw_id in enumerate(kw_ids):
                cluster_label = int(labels[idx])
                db_cluster_id = label_to_db_id.get(cluster_label)
                if db_cluster_id:
                    session.query(Keyword).filter(Keyword.id == kw_id).update(
                        {"cluster_id": db_cluster_id}
                    )
                    stats["keywords_updated"] += 1

                if stats["keywords_updated"] % 1000 == 0 and stats["keywords_updated"] > 0:
                    session.commit()
                    logger.info("  ... %d건 업데이트 완료", stats["keywords_updated"])

            session.commit()
        except Exception:
            session.rollback()
            raise

    return stats


# ---------------------------------------------------------------------------
# 메인 실행
# ---------------------------------------------------------------------------
def run_cluster_keywords(n_clusters: int | None = None, reset: bool = False) -> None:
    """키워드 임베딩 기반 클러스터링 실행."""
    # 1. 임베딩 로드
    kw_ids, kw_names, embeddings = load_embeddings()
    if len(kw_ids) == 0:
        logger.info("임베딩 데이터가 없습니다.")
        return

    logger.info("임베딩 로드 완료: %d건", len(kw_ids))

    # 2. 클러스터링
    labels, centroids = run_clustering(embeddings, n_clusters=n_clusters)

    # 3. 대표 키워드 선정
    representatives = find_representative_keywords(embeddings, labels, centroids, kw_names)
    logger.info("클러스터 %d개 생성, 대표 키워드 예시: %s",
                len(representatives),
                list(representatives.values())[:5])

    # 4. DB 저장
    stats = save_clusters_to_db(kw_ids, labels, representatives, reset=reset)
    logger.info("저장 완료: 클러스터 %d개, 키워드 %d건 업데이트",
                stats["clusters_created"], stats["keywords_updated"])


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="키워드 클러스터링 (K-means)")
    parser.add_argument("--n-clusters", type=int, default=None,
                        help="클러스터 수 (기본: sqrt(N/2)로 자동 결정)")
    parser.add_argument("--reset", action="store_true",
                        help="기존 클러스터 초기화 후 재실행")
    args = parser.parse_args()

    run_cluster_keywords(n_clusters=args.n_clusters, reset=args.reset)


if __name__ == "__main__":
    main()