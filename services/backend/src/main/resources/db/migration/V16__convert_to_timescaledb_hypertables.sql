-- TimescaleDB 확장 활성화
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ===== 1) stock_prices_minute → 하이퍼테이블 =====
-- TimescaleDB는 파티셔닝 컬럼이 모든 UNIQUE 제약에 포함되어야 함
ALTER TABLE stock_prices_minute DROP CONSTRAINT stock_prices_minute_pkey;
ALTER TABLE stock_prices_minute ADD PRIMARY KEY (id, trade_timestamp);

SELECT create_hypertable(
  'stock_prices_minute',
  'trade_timestamp',
  migrate_data => true,
  chunk_time_interval => INTERVAL '1 day'
);

-- ===== 2) stock_prices_daily → 하이퍼테이블 =====
ALTER TABLE stock_prices_daily DROP CONSTRAINT stock_prices_daily_pkey;
ALTER TABLE stock_prices_daily ADD PRIMARY KEY (id, trade_date);

SELECT create_hypertable(
  'stock_prices_daily',
  'trade_date',
  migrate_data => true,
  chunk_time_interval => INTERVAL '1 month'
);

-- ===== 3) stock_prices_weekly → 하이퍼테이블 =====
ALTER TABLE stock_prices_weekly DROP CONSTRAINT stock_prices_weekly_pkey;
ALTER TABLE stock_prices_weekly ADD PRIMARY KEY (id, trade_week);

SELECT create_hypertable(
  'stock_prices_weekly',
  'trade_week',
  migrate_data => true,
  chunk_time_interval => INTERVAL '3 months'
);

-- ===== 4) stock_prices_monthly → 하이퍼테이블 =====
ALTER TABLE stock_prices_monthly DROP CONSTRAINT stock_prices_monthly_pkey;
ALTER TABLE stock_prices_monthly ADD PRIMARY KEY (id, trade_month);

SELECT create_hypertable(
  'stock_prices_monthly',
  'trade_month',
  migrate_data => true,
  chunk_time_interval => INTERVAL '1 year'
);

-- ===== 5) stock_prices_yearly는 trade_year가 INT이므로 하이퍼테이블 제외 =====

-- ===== 압축 정책 =====

-- 분봉: 7일 이상 된 데이터 자동 압축
ALTER TABLE stock_prices_minute SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'stock_id',
  timescaledb.compress_orderby = 'trade_timestamp DESC'
);
SELECT add_compression_policy('stock_prices_minute', INTERVAL '7 days');

-- 일봉: 3개월 이상 된 데이터 자동 압축
ALTER TABLE stock_prices_daily SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'stock_id',
  timescaledb.compress_orderby = 'trade_date DESC'
);
SELECT add_compression_policy('stock_prices_daily', INTERVAL '3 months');

-- ===== 보존 정책 =====

-- 분봉: 30일 이상 된 데이터 자동 삭제 (당일 차트용)
SELECT add_retention_policy('stock_prices_minute', INTERVAL '30 days');
