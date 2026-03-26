-- pg_trgm extension is managed by infra-common/base deployment.
CREATE INDEX IF NOT EXISTS idx_stock_news_title_trgm
    ON stock_news USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_stock_news_snippet_trgm
    ON stock_news USING gin (snippet gin_trgm_ops);
