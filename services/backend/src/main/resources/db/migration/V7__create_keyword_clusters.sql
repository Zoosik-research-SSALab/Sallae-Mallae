-- =========================================================================
-- 키워드 클러스터링 테이블
-- =========================================================================

-- 클러스터 마스터 테이블
CREATE TABLE keyword_clusters (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(15) NOT NULL,                    -- 클러스터 대표 키워드명
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- keywords 테이블에 cluster_id FK 추가
ALTER TABLE keywords
    ADD COLUMN cluster_id BIGINT REFERENCES keyword_clusters(id) ON DELETE SET NULL;

CREATE INDEX idx_keywords_cluster ON keywords(cluster_id);
