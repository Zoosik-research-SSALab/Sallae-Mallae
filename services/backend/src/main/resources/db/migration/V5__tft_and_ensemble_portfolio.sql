-- V5__tft_and_ensemble_portfolio.sql
-- 1) LSTM -> TFT 모델 교체
-- 2) 앙상블 포트폴리오 독립 테이블 생성

SET search_path TO public;

-- =========================================================================
-- Part 1: 모델 변경 (LSTM -> TFT)
-- ml_lstm_predictions에 저장된 데이터 없음, DROP 후 교체
-- =========================================================================

DROP TABLE IF EXISTS ml_lstm_predictions;

CREATE TABLE ml_tft_predictions (
    id              BIGSERIAL PRIMARY KEY,
    stock_id        BIGINT NOT NULL,
    report_date     DATE NOT NULL,
    model_version   VARCHAR(20) NOT NULL DEFAULT 'tft-v2',
    group_id        VARCHAR(50),
    prob            REAL NOT NULL,
    pred            INT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, report_date, model_version),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE INDEX idx_ml_tft_predictions_stock_date
    ON ml_tft_predictions(stock_id, report_date DESC);

-- =========================================================================
-- Part 2: 앙상블 포트폴리오 독립 테이블
-- =========================================================================

CREATE TABLE ensemble_portfolio (
    id BIGSERIAL PRIMARY KEY,
    strategy_name VARCHAR(50) NOT NULL,
    model_version VARCHAR(20) NOT NULL,
    initial_capital BIGINT NOT NULL,
    params JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ensemble_portfolio_snapshots (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL,
    snapshot_date DATE NOT NULL,
    portfolio_value BIGINT NOT NULL,
    cash BIGINT NOT NULL,
    n_positions INT NOT NULL,
    daily_return REAL,
    cumulative_return REAL,
    mdd REAL,
    sharpe_30d REAL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(portfolio_id, snapshot_date),
    FOREIGN KEY (portfolio_id) REFERENCES ensemble_portfolio(id) ON DELETE CASCADE
);

CREATE INDEX idx_ens_snapshots_date
    ON ensemble_portfolio_snapshots(portfolio_id, snapshot_date DESC);

CREATE TABLE ensemble_portfolio_holdings (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL,
    snapshot_date DATE NOT NULL,
    stock_id BIGINT NOT NULL,
    buy_date DATE NOT NULL,
    buy_price INT NOT NULL,
    current_price INT,
    shares INT NOT NULL,
    invested BIGINT NOT NULL,
    unrealized_pnl BIGINT,
    hold_days INT NOT NULL,
    is_extended BOOLEAN DEFAULT FALSE,
    ensemble_prob REAL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (portfolio_id) REFERENCES ensemble_portfolio(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE INDEX idx_ens_holdings_date
    ON ensemble_portfolio_holdings(portfolio_id, snapshot_date DESC);

CREATE TABLE ensemble_portfolio_trades (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL,
    trade_date DATE NOT NULL,
    stock_id BIGINT NOT NULL,
    trade_type VARCHAR(4) NOT NULL,
    price INT NOT NULL,
    shares INT NOT NULL,
    amount BIGINT NOT NULL,
    commission BIGINT,
    pnl BIGINT,
    return_rate REAL,
    hold_days INT,
    trade_reason VARCHAR(30),
    is_extended BOOLEAN DEFAULT FALSE,
    ensemble_prob REAL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (portfolio_id) REFERENCES ensemble_portfolio(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE INDEX idx_ens_trades_date
    ON ensemble_portfolio_trades(portfolio_id, trade_date DESC);
