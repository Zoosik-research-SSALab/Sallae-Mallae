-- =========================================================================
-- stock_news URL 정규화 + 중복 제거 마이그레이션
-- 실행 방법: 단계별로 하나씩 실행하며 검증 결과 확인 후 다음 단계 진행
-- 예상 소요: 53만건 기준 5~10분
-- =========================================================================

-- =========================================================================
-- STEP 0: 사전 검증 (현재 상태 확인)
-- =========================================================================

-- 현재 테이블 건수 확인
SELECT 'stock_news' AS tbl, COUNT(*) AS cnt FROM stock_news
UNION ALL
SELECT 'stock_news_map', COUNT(*) FROM stock_news_map
UNION ALL
SELECT 'news_keyword_map', COUNT(*) FROM news_keyword_map;

-- URL 중복 현황 확인 (정규화 전)
SELECT COUNT(*) AS total_news,
       COUNT(DISTINCT url) AS distinct_url,
       COUNT(*) - COUNT(DISTINCT url) AS duplicate_count
FROM stock_news WHERE url IS NOT NULL;

-- 정규화 후 예상 중복 제거 건수 미리 확인
-- (article_id + office_id만 남긴 URL 기준)
SELECT COUNT(*) AS total_news,
       COUNT(DISTINCT
         CASE
           WHEN url LIKE '%finance.naver.com/item/news_read.naver%'
           THEN regexp_replace(url, '&(code|page|sm)=[^&]*', '', 'g')
           ELSE url
         END
       ) AS distinct_normalized_url
FROM stock_news WHERE url IS NOT NULL;


-- =========================================================================
-- STEP 1: 정규화 URL 매핑 임시 테이블 생성
-- =========================================================================

-- 각 기존 row에 대해 정규화 URL과 대표 id를 계산
CREATE TEMP TABLE url_normalize_map AS
WITH normalized AS (
  SELECT id, url,
    CASE
      WHEN url LIKE '%finance.naver.com/item/news_read.naver%'
      THEN regexp_replace(url, '&(code|page|sm)=[^&]*', '', 'g')
      ELSE url
    END AS normalized_url
  FROM stock_news
  WHERE url IS NOT NULL
),
representatives AS (
  SELECT normalized_url, MIN(id) AS representative_id
  FROM normalized
  GROUP BY normalized_url
)
SELECT n.id AS old_id, n.normalized_url, r.representative_id
FROM normalized n
JOIN representatives r ON n.normalized_url = r.normalized_url;

-- url이 NULL인 row는 각각 독립 (자기 자신이 대표)
INSERT INTO url_normalize_map (old_id, normalized_url, representative_id)
SELECT id, NULL, id FROM stock_news WHERE url IS NULL;

-- STEP 1 검증: 매핑 건수 = stock_news 전체 건수여야 함
SELECT
  (SELECT COUNT(*) FROM stock_news) AS stock_news_count,
  (SELECT COUNT(*) FROM url_normalize_map) AS mapping_count,
  (SELECT COUNT(*) FROM stock_news) = (SELECT COUNT(*) FROM url_normalize_map) AS counts_match;

-- 대표 row 건수 확인 (이게 정리 후 stock_news 건수)
SELECT COUNT(DISTINCT representative_id) AS expected_clean_count FROM url_normalize_map;


-- =========================================================================
-- STEP 2: 새 테이블 생성 + 대표 row만 적재
-- =========================================================================

-- stock_news_clean: 대표 row만 INSERT, URL은 정규화된 값으로
CREATE TABLE stock_news_clean (LIKE stock_news INCLUDING ALL);

INSERT INTO stock_news_clean (id, title, snippet, url, publisher, drive_file_id, published_at, created_at)
SELECT sn.id, sn.title, sn.snippet, m.normalized_url, sn.publisher, sn.drive_file_id, sn.published_at, sn.created_at
FROM stock_news sn
JOIN url_normalize_map m ON sn.id = m.old_id
WHERE m.old_id = m.representative_id;

-- STEP 2 검증: 새 테이블 건수 = 대표 row 건수
SELECT
  (SELECT COUNT(DISTINCT representative_id) FROM url_normalize_map) AS expected,
  (SELECT COUNT(*) FROM stock_news_clean) AS actual,
  (SELECT COUNT(DISTINCT representative_id) FROM url_normalize_map) = (SELECT COUNT(*) FROM stock_news_clean) AS counts_match;

-- URL 중복 없는지 확인
SELECT COUNT(*) AS duplicate_urls
FROM (
  SELECT url FROM stock_news_clean WHERE url IS NOT NULL GROUP BY url HAVING COUNT(*) > 1
) dup;
-- 결과가 0이어야 함


-- =========================================================================
-- STEP 3: stock_news_map 재매핑
-- =========================================================================

-- 중복 row들의 종목 매핑을 대표 id로 합침 (DISTINCT로 중복 제거)
CREATE TABLE stock_news_map_clean (LIKE stock_news_map INCLUDING ALL);

INSERT INTO stock_news_map_clean (stock_id, news_id, sentiment_score, sentiment_label)
SELECT DISTINCT ON (snm.stock_id, m.representative_id)
  snm.stock_id,
  m.representative_id,
  snm.sentiment_score,
  snm.sentiment_label
FROM stock_news_map snm
JOIN url_normalize_map m ON snm.news_id = m.old_id
ORDER BY snm.stock_id, m.representative_id, snm.news_id;

-- STEP 3 검증: 종목 매핑 누락 없는지 확인
-- 기존에 매핑된 (stock_id, normalized_url) 조합 수 = 새 테이블 건수
SELECT
  (SELECT COUNT(*) FROM (
    SELECT DISTINCT snm.stock_id, m.representative_id
    FROM stock_news_map snm
    JOIN url_normalize_map m ON snm.news_id = m.old_id
  ) t) AS expected_mappings,
  (SELECT COUNT(*) FROM stock_news_map_clean) AS actual_mappings,
  (SELECT COUNT(*) FROM (
    SELECT DISTINCT snm.stock_id, m.representative_id
    FROM stock_news_map snm
    JOIN url_normalize_map m ON snm.news_id = m.old_id
  ) t) = (SELECT COUNT(*) FROM stock_news_map_clean) AS counts_match;

-- 기존에 없던 stock_id가 새로 생기지 않았는지
SELECT COUNT(*) AS unexpected_stocks
FROM stock_news_map_clean c
WHERE NOT EXISTS (SELECT 1 FROM stock_news_map o WHERE o.stock_id = c.stock_id);
-- 결과가 0이어야 함


-- =========================================================================
-- STEP 4: news_keyword_map 재매핑
-- =========================================================================

CREATE TABLE news_keyword_map_clean (LIKE news_keyword_map INCLUDING ALL);

INSERT INTO news_keyword_map_clean (news_id, keyword_id)
SELECT DISTINCT m.representative_id, nkm.keyword_id
FROM news_keyword_map nkm
JOIN url_normalize_map m ON nkm.news_id = m.old_id;

-- STEP 4 검증: 키워드 매핑 누락 없는지 확인
SELECT
  (SELECT COUNT(*) FROM (
    SELECT DISTINCT m.representative_id, nkm.keyword_id
    FROM news_keyword_map nkm
    JOIN url_normalize_map m ON nkm.news_id = m.old_id
  ) t) AS expected_mappings,
  (SELECT COUNT(*) FROM news_keyword_map_clean) AS actual_mappings,
  (SELECT COUNT(*) FROM (
    SELECT DISTINCT m.representative_id, nkm.keyword_id
    FROM news_keyword_map nkm
    JOIN url_normalize_map m ON nkm.news_id = m.old_id
  ) t) = (SELECT COUNT(*) FROM news_keyword_map_clean) AS counts_match;


-- =========================================================================
-- STEP 5: 최종 검증 (교체 전 마지막 확인)
-- =========================================================================

-- 전체 요약
SELECT 'stock_news' AS tbl,
       (SELECT COUNT(*) FROM stock_news) AS before,
       (SELECT COUNT(*) FROM stock_news_clean) AS after
UNION ALL
SELECT 'stock_news_map',
       (SELECT COUNT(*) FROM stock_news_map),
       (SELECT COUNT(*) FROM stock_news_map_clean)
UNION ALL
SELECT 'news_keyword_map',
       (SELECT COUNT(*) FROM news_keyword_map),
       (SELECT COUNT(*) FROM news_keyword_map_clean);

-- 새 테이블에서 샘플 확인 (같은 기사에 여러 종목 매핑된 경우)
SELECT sn.id, sn.title, sn.url, COUNT(snm.stock_id) AS stock_count
FROM stock_news_clean sn
JOIN stock_news_map_clean snm ON sn.id = snm.news_id
GROUP BY sn.id, sn.title, sn.url
HAVING COUNT(snm.stock_id) > 1
ORDER BY stock_count DESC
LIMIT 10;

-- 새 테이블의 URL에 code= 파라미터가 남아있지 않은지
SELECT COUNT(*) AS remaining_code_params
FROM stock_news_clean
WHERE url LIKE '%&code=%';
-- 결과가 0이어야 함


-- =========================================================================
-- STEP 6: 테이블 교체 (한 트랜잭션 안에서 실행)
-- =========================================================================
-- !!! 여기서부터는 되돌리기 어렵습니다. STEP 5까지 모든 검증이 통과한 후 실행하세요 !!!

BEGIN;

-- FK 제약 임시 해제 (CASCADE로 인한 의도치 않은 삭제 방지)
ALTER TABLE stock_news_map DROP CONSTRAINT IF EXISTS stock_news_map_news_id_fkey;
ALTER TABLE news_keyword_map DROP CONSTRAINT IF EXISTS news_keyword_map_news_id_fkey;

-- 기존 테이블 이름 변경
ALTER TABLE stock_news RENAME TO stock_news_old;
ALTER TABLE stock_news_map RENAME TO stock_news_map_old;
ALTER TABLE news_keyword_map RENAME TO news_keyword_map_old;

-- 새 테이블 이름 변경
ALTER TABLE stock_news_clean RENAME TO stock_news;
ALTER TABLE stock_news_map_clean RENAME TO stock_news_map;
ALTER TABLE news_keyword_map_clean RENAME TO news_keyword_map;

-- FK 재설정
ALTER TABLE stock_news_map
  ADD CONSTRAINT stock_news_map_news_id_fkey
  FOREIGN KEY (news_id) REFERENCES stock_news(id) ON DELETE CASCADE;

ALTER TABLE news_keyword_map
  ADD CONSTRAINT news_keyword_map_news_id_fkey
  FOREIGN KEY (news_id) REFERENCES stock_news(id) ON DELETE CASCADE;

-- 인덱스 재확인 (LIKE INCLUDING ALL로 복사되었지만 이름 충돌 가능)
CREATE INDEX IF NOT EXISTS idx_stock_news_map_news ON stock_news_map(news_id);
CREATE INDEX IF NOT EXISTS idx_stock_news_url_id ON stock_news(url, id) WHERE url IS NOT NULL;

COMMIT;


-- =========================================================================
-- STEP 7: 교체 후 검증
-- =========================================================================

-- 기본 API 동작 확인용 쿼리 (뉴스 목록 조회와 동일)
SELECT sn.id, sn.title, sn.publisher, sn.published_at
FROM stock_news sn
WHERE sn.published_at IS NOT NULL
ORDER BY sn.published_at DESC
LIMIT 6;

-- 관련 종목 조회 확인
SELECT sn.id, sn.title, s.name
FROM stock_news sn
JOIN stock_news_map snm ON sn.id = snm.news_id
JOIN stocks s ON snm.stock_id = s.id
WHERE sn.published_at IS NOT NULL
ORDER BY sn.published_at DESC
LIMIT 20;

-- URL 중복 없는지 최종 확인
SELECT url, COUNT(*) FROM stock_news
WHERE url IS NOT NULL
GROUP BY url HAVING COUNT(*) > 1;
-- 결과가 0건이어야 함


-- =========================================================================
-- STEP 8: old 테이블은 당분간 유지 (필요 시 수동 삭제)
-- =========================================================================
-- stock_news_old, stock_news_map_old, news_keyword_map_old 테이블이 남아있습니다.
-- 서비스 정상 동작 충분히 확인 후 별도로 삭제하세요.
