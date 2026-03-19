-- 종목별 뉴스 에이전트 데이터 (날짜별 집계)
-- FastAPI 스케줄러가 키워드 임베딩 완료 후 종목별로 생성
-- Spring Boot에서 Redis 캐시 + DB fallback으로 조회
CREATE TABLE news_agent_stock_data (
    id          BIGSERIAL       PRIMARY KEY,
    stock_id    BIGINT          NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    report_date DATE            NOT NULL,
    top_keywords JSONB          NOT NULL DEFAULT '[]',
    sentiment   JSONB           NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    UNIQUE (stock_id, report_date)
);

CREATE INDEX idx_news_agent_stock_data_date ON news_agent_stock_data(report_date);
