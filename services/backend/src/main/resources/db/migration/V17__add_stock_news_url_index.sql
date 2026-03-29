-- 뉴스 목록 조회 시 URL 기준 중복 제거 서브쿼리 성능 개선
CREATE INDEX IF NOT EXISTS idx_stock_news_url_id ON stock_news(url, id) WHERE url IS NOT NULL;
