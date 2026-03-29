CREATE TABLE stock_dividend_yield_snapshots (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,
    as_of_date DATE NOT NULL,
    record_date DATE,
    cash_dividend_yield NUMERIC(10, 4),
    stock_dividend_yield NUMERIC(10, 4),
    dividend_kind VARCHAR(30),
    source VARCHAR(40) NOT NULL,
    source_window_from DATE NOT NULL,
    source_window_to DATE NOT NULL,
    fetched_at TIMESTAMPTZ NOT NULL,
    is_latest BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_stock_dividend_yield_snapshots_stock_date_source UNIQUE (stock_id, as_of_date, source),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE INDEX idx_stock_dividend_yield_snapshots_stock_latest
    ON stock_dividend_yield_snapshots(stock_id, is_latest, as_of_date DESC);

CREATE INDEX idx_stock_dividend_yield_snapshots_record_date
    ON stock_dividend_yield_snapshots(record_date DESC);
