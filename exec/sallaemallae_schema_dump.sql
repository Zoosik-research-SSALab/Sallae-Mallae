-- ============================================================
-- 살래말래 (Sallaemallae) 전체 스키마 덤프
-- 생성일: 2026-03-29
-- DB: PostgreSQL 16 + TimescaleDB + pgvector v0.8.2 + pg_trgm
--
-- 사전 조건:
--   CREATE EXTENSION IF NOT EXISTS timescaledb;
--   CREATE EXTENSION IF NOT EXISTS vector;
--   CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- ============================================================

SET search_path TO public;
SET timezone TO 'Asia/Seoul';

-- ============================================================
-- 1. 사용자 및 인증
-- ============================================================

CREATE TABLE users (
    id                BIGSERIAL    PRIMARY KEY,
    email             VARCHAR(255) UNIQUE NOT NULL,
    password_hash     VARCHAR(60),
    nickname          VARCHAR(20)  NOT NULL,
    profile_image_url VARCHAR(512),
    is_email_opt_in   BOOLEAN      DEFAULT false,
    is_noti_enabled   BOOLEAN      NOT NULL DEFAULT true,
    status            VARCHAR(20)  DEFAULT 'ACTIVE',
    admin             BOOLEAN      DEFAULT false,
    token_version     INT          DEFAULT 0,
    created_at        TIMESTAMPTZ  DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  DEFAULT NOW(),
    withdrawn_at      TIMESTAMPTZ,
    deleted_at        TIMESTAMPTZ
);

CREATE TABLE social_accounts (
    id                  BIGSERIAL    PRIMARY KEY,
    user_id             BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            VARCHAR(10)  NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    created_at          TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE(provider, provider_account_id)
);

CREATE TABLE login_history (
    id            BIGSERIAL    PRIMARY KEY,
    user_id       BIGINT       REFERENCES users(id) ON DELETE SET NULL,
    attempt_email VARCHAR(255),
    ip_address    VARCHAR(45),
    device_info   VARCHAR(512),
    is_success    BOOLEAN      NOT NULL,
    event_type    VARCHAR(30)  DEFAULT 'LOGIN',
    created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE password_history (
    id            BIGSERIAL    PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(60)  NOT NULL,
    changed_at    TIMESTAMPTZ  DEFAULT NOW(),
    changed_by    VARCHAR(10)  NOT NULL,
    ip_address    VARCHAR(45)
);

CREATE INDEX idx_pw_history_user ON password_history(user_id, changed_at DESC);

CREATE TABLE device_sessions (
    id            BIGSERIAL    PRIMARY KEY,
    user_id       BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_id     VARCHAR(255) NOT NULL,
    device_name   VARCHAR(255) NOT NULL DEFAULT 'Unknown',
    device_info   VARCHAR(512),
    ip_address    VARCHAR(45),
    trust_level   VARCHAR(20)  NOT NULL DEFAULT 'NEW',
    login_count   INT          NOT NULL DEFAULT 1,
    last_login_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_device_sessions_user_device UNIQUE (user_id, device_id)
);

CREATE INDEX idx_device_sessions_user_id ON device_sessions(user_id);

-- ============================================================
-- 2. 약관 및 동의
-- ============================================================

CREATE TABLE terms (
    id          BIGSERIAL    PRIMARY KEY,
    term_type   VARCHAR(30)  NOT NULL,
    version     VARCHAR(20)  NOT NULL,
    title       VARCHAR(50)  NOT NULL,
    content     TEXT         NOT NULL,
    is_required BOOLEAN      DEFAULT true,
    is_active   BOOLEAN      DEFAULT true,
    enforced_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE user_agreements (
    id        BIGSERIAL   PRIMARY KEY,
    user_id   BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    terms_id  BIGINT      NOT NULL REFERENCES terms(id) ON DELETE CASCADE,
    is_agreed BOOLEAN     NOT NULL,
    agreed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. 주식 마스터 및 시세
-- ============================================================

CREATE TABLE stocks (
    id                 BIGSERIAL    PRIMARY KEY,
    ticker             VARCHAR(6)   UNIQUE NOT NULL,
    name               VARCHAR(100) NOT NULL,
    gics_sector        VARCHAR(50),
    category           VARCHAR(50),
    outstanding_shares BIGINT,
    market_type        VARCHAR(20),
    icon_url           VARCHAR(500),
    is_active          BOOLEAN      DEFAULT true,
    created_at         TIMESTAMPTZ  DEFAULT NOW(),
    updated_at         TIMESTAMPTZ  DEFAULT NOW()
);

COMMENT ON COLUMN stocks.icon_url IS '종목 아이콘 이미지 URL (MinIO)';

-- 분봉 (TimescaleDB Hypertable)
CREATE TABLE stock_prices_minute (
    id               BIGSERIAL   NOT NULL,
    stock_id         BIGINT      NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    trade_timestamp  TIMESTAMPTZ NOT NULL,
    open_price       INT,
    high_price       INT,
    low_price        INT,
    close_price      INT         NOT NULL,
    volume           BIGINT,
    fluctuation_rate REAL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, trade_timestamp),
    UNIQUE(stock_id, trade_timestamp)
);

CREATE INDEX idx_stock_prices_minute_stock_time ON stock_prices_minute(stock_id, trade_timestamp DESC);

SELECT create_hypertable('stock_prices_minute', 'trade_timestamp',
    migrate_data => true, chunk_time_interval => INTERVAL '1 day');

ALTER TABLE stock_prices_minute SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'stock_id',
    timescaledb.compress_orderby = 'trade_timestamp DESC'
);
SELECT add_compression_policy('stock_prices_minute', INTERVAL '7 days');
SELECT add_retention_policy('stock_prices_minute', INTERVAL '30 days');

-- 일봉 (TimescaleDB Hypertable)
CREATE TABLE stock_prices_daily (
    id               BIGSERIAL NOT NULL,
    stock_id         BIGINT    NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    trade_date       DATE      NOT NULL,
    open_price       INT,
    high_price       INT,
    low_price        INT,
    close_price      INT       NOT NULL,
    volume           BIGINT,
    fluctuation_rate REAL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, trade_date),
    UNIQUE(stock_id, trade_date)
);

CREATE INDEX idx_stock_prices_daily_stock_date ON stock_prices_daily(stock_id, trade_date DESC);

SELECT create_hypertable('stock_prices_daily', 'trade_date',
    migrate_data => true, chunk_time_interval => INTERVAL '1 month');

ALTER TABLE stock_prices_daily SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'stock_id',
    timescaledb.compress_orderby = 'trade_date DESC'
);
SELECT add_compression_policy('stock_prices_daily', INTERVAL '3 months');

-- 주봉 (TimescaleDB Hypertable)
CREATE TABLE stock_prices_weekly (
    id               BIGSERIAL NOT NULL,
    stock_id         BIGINT    NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    trade_week       DATE      NOT NULL,
    open_price       INT,
    high_price       INT,
    low_price        INT,
    close_price      INT       NOT NULL,
    volume           BIGINT,
    fluctuation_rate REAL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, trade_week),
    UNIQUE(stock_id, trade_week)
);

CREATE INDEX idx_stock_prices_weekly_stock_week ON stock_prices_weekly(stock_id, trade_week DESC);

SELECT create_hypertable('stock_prices_weekly', 'trade_week',
    migrate_data => true, chunk_time_interval => INTERVAL '3 months');

-- 월봉 (TimescaleDB Hypertable)
CREATE TABLE stock_prices_monthly (
    id               BIGSERIAL NOT NULL,
    stock_id         BIGINT    NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    trade_month      DATE      NOT NULL,
    open_price       INT,
    high_price       INT,
    low_price        INT,
    close_price      INT       NOT NULL,
    volume           BIGINT,
    fluctuation_rate REAL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, trade_month),
    UNIQUE(stock_id, trade_month)
);

CREATE INDEX idx_stock_prices_monthly_stock_month ON stock_prices_monthly(stock_id, trade_month DESC);

SELECT create_hypertable('stock_prices_monthly', 'trade_month',
    migrate_data => true, chunk_time_interval => INTERVAL '1 year');

-- 년봉 (일반 테이블)
CREATE TABLE stock_prices_yearly (
    id               BIGSERIAL PRIMARY KEY,
    stock_id         BIGINT    NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    trade_year       INT       NOT NULL,
    open_price       INT,
    high_price       INT,
    low_price        INT,
    close_price      INT       NOT NULL,
    volume           BIGINT,
    fluctuation_rate REAL,
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, trade_year)
);

CREATE INDEX idx_stock_prices_yearly_stock_year ON stock_prices_yearly(stock_id, trade_year DESC);

-- 재무 데이터
CREATE TABLE stock_financials (
    id                  BIGSERIAL PRIMARY KEY,
    stock_id            BIGINT    NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    report_year         INT       NOT NULL,
    report_quarter      VARCHAR(10) NOT NULL,
    total_assets        BIGINT,
    total_liabilities   BIGINT,
    total_equity        BIGINT,
    revenue             BIGINT,
    operating_profit    BIGINT,
    net_income          BIGINT,
    operating_cash_flow BIGINT,
    per                 REAL,
    pbr                 REAL,
    roe                 REAL,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT stock_financials_unique UNIQUE (stock_id, report_year, report_quarter)
);

-- 공시
CREATE TABLE stock_announcements (
    id                   BIGSERIAL    PRIMARY KEY,
    stock_id             BIGINT       NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    announced_at         DATE         NOT NULL,
    title                VARCHAR(255) NOT NULL,
    url                  VARCHAR(512),
    content              TEXT,
    target_year          INT,
    has_financial_analysis BOOLEAN,
    has_operating_profit BOOLEAN,
    created_at           TIMESTAMPTZ  DEFAULT NOW()
);

-- 배당수익률 스냅샷
CREATE TABLE stock_dividend_yield_snapshots (
    id                   BIGSERIAL      PRIMARY KEY,
    stock_id             BIGINT         NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    as_of_date           DATE           NOT NULL,
    record_date          DATE,
    cash_dividend_yield  NUMERIC(10,4),
    stock_dividend_yield NUMERIC(10,4),
    dividend_kind        VARCHAR(30),
    source               VARCHAR(40)    NOT NULL,
    source_window_from   DATE           NOT NULL,
    source_window_to     DATE           NOT NULL,
    fetched_at           TIMESTAMPTZ    NOT NULL,
    is_latest            BOOLEAN        NOT NULL DEFAULT false,
    created_at           TIMESTAMPTZ    DEFAULT NOW(),
    updated_at           TIMESTAMPTZ    DEFAULT NOW(),
    CONSTRAINT uk_stock_dividend_yield_snapshots_stock_date_source
        UNIQUE (stock_id, as_of_date, source)
);

CREATE INDEX idx_stock_dividend_yield_snapshots_stock_latest
    ON stock_dividend_yield_snapshots(stock_id, is_latest, as_of_date DESC);
CREATE INDEX idx_stock_dividend_yield_snapshots_record_date
    ON stock_dividend_yield_snapshots(record_date DESC);

-- ============================================================
-- 4. 뉴스 및 키워드
-- ============================================================

CREATE TABLE stock_news (
    id            BIGSERIAL    PRIMARY KEY,
    title         VARCHAR(255) NOT NULL,
    snippet       TEXT,
    url           VARCHAR(512),
    publisher     VARCHAR(20),
    drive_file_id VARCHAR(100),
    published_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_news_url_id
    ON stock_news(url, id) WHERE url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_news_title_trgm
    ON stock_news USING gin (title gin_trgm_ops);

CREATE TABLE stock_news_map (
    stock_id        BIGINT      NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    news_id         BIGINT      NOT NULL REFERENCES stock_news(id) ON DELETE CASCADE,
    sentiment_score REAL,
    sentiment_label VARCHAR(20),
    PRIMARY KEY (stock_id, news_id)
);

CREATE INDEX idx_stock_news_map_news ON stock_news_map(news_id);

CREATE TABLE keywords (
    id         BIGSERIAL    PRIMARY KEY,
    name       VARCHAR(20)  UNIQUE NOT NULL,
    cluster_id BIGINT,
    created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE keyword_clusters (
    id         BIGSERIAL    PRIMARY KEY,
    name       VARCHAR(15)  NOT NULL,
    created_at TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE keywords
    ADD CONSTRAINT fk_keywords_cluster
    FOREIGN KEY (cluster_id) REFERENCES keyword_clusters(id) ON DELETE SET NULL;

CREATE INDEX idx_keywords_cluster ON keywords(cluster_id);

CREATE TABLE news_keyword_map (
    news_id    BIGINT NOT NULL REFERENCES stock_news(id) ON DELETE CASCADE,
    keyword_id BIGINT NOT NULL REFERENCES keywords(id) ON DELETE CASCADE,
    PRIMARY KEY (news_id, keyword_id)
);

CREATE TABLE keyword_embeddings (
    keyword_id BIGINT      PRIMARY KEY REFERENCES keywords(id) ON DELETE CASCADE,
    embedding  vector(384) NOT NULL
);

CREATE TABLE news_agent_stock_data (
    id           BIGSERIAL   PRIMARY KEY,
    stock_id     BIGINT      NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    report_date  DATE        NOT NULL,
    top_keywords JSONB       NOT NULL DEFAULT '[]',
    sentiment    JSONB       NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (stock_id, report_date)
);

CREATE INDEX idx_news_agent_stock_data_date ON news_agent_stock_data(report_date);

-- ============================================================
-- 5. AI 포트폴리오 및 ML 예측
-- ============================================================

CREATE TABLE ai_portfolio (
    id                 BIGSERIAL    PRIMARY KEY,
    name               VARCHAR(50)  NOT NULL,
    model_version      VARCHAR(20)  NOT NULL DEFAULT 'v1.0',
    debate_version     VARCHAR(20),
    cumulative_return  REAL         DEFAULT 0,
    total_trades       INT          DEFAULT 0,
    winning_trades     INT          DEFAULT 0,
    initial_capital    BIGINT       NOT NULL DEFAULT 0,
    cash_balance       BIGINT       NOT NULL DEFAULT 0,
    realized_profit    BIGINT       NOT NULL DEFAULT 0,
    unrealized_profit  BIGINT       NOT NULL DEFAULT 0,
    total_asset_value  BIGINT       NOT NULL DEFAULT 0,
    latest_record_date DATE,
    updated_at         TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE ai_portfolio_holdings (
    id               BIGSERIAL    PRIMARY KEY,
    portfolio_id     BIGINT       NOT NULL REFERENCES ai_portfolio(id) ON DELETE CASCADE,
    stock_id         BIGINT       NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    model_version    VARCHAR(20)  NOT NULL DEFAULT 'v1.0',
    portfolio_weight REAL,
    return_rate      REAL,
    buy_date         TIMESTAMPTZ,
    avg_buy_price    INTEGER,
    current_price    INTEGER,
    holding_quantity BIGINT,
    investment_amount BIGINT,
    market_value     BIGINT,
    evaluation_profit BIGINT,
    updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE ai_daily_performance (
    id                BIGSERIAL    PRIMARY KEY,
    portfolio_id      BIGINT       NOT NULL REFERENCES ai_portfolio(id) ON DELETE CASCADE,
    model_version     VARCHAR(20)  NOT NULL DEFAULT 'v1.0',
    record_date       DATE         NOT NULL,
    daily_return      REAL,
    cumulative_return REAL,
    mdd               REAL,
    cash_balance      BIGINT       NOT NULL DEFAULT 0,
    invested_amount   BIGINT       NOT NULL DEFAULT 0,
    market_value      BIGINT       NOT NULL DEFAULT 0,
    realized_profit   BIGINT       NOT NULL DEFAULT 0,
    unrealized_profit BIGINT       NOT NULL DEFAULT 0,
    total_asset_value BIGINT       NOT NULL DEFAULT 0,
    holding_count     INTEGER      NOT NULL DEFAULT 0
);

CREATE TABLE ai_ml_reports (
    id               BIGSERIAL    PRIMARY KEY,
    stock_id         BIGINT       NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    report_date      DATE         NOT NULL,
    model_version    VARCHAR(20)  NOT NULL DEFAULT 'v1.0',
    ml_signal        VARCHAR(4),
    ml_confidence    REAL,
    signal_agreement BOOLEAN,
    confidence_gap   REAL,
    scenario_type    VARCHAR(30),
    risk_flag        BOOLEAN,
    report_data      JSONB,
    created_at       TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE(stock_id, report_date, model_version)
);

CREATE INDEX idx_ai_ml_reports_stock_date ON ai_ml_reports(stock_id, report_date DESC);

CREATE TABLE ml_lgbm_predictions (
    id              BIGSERIAL    PRIMARY KEY,
    stock_id        BIGINT       NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    report_date     DATE         NOT NULL,
    model_version   VARCHAR(20)  NOT NULL DEFAULT 'v1.0',
    predicted_class INT          NOT NULL,
    confidence      REAL         NOT NULL,
    prob_down       REAL         NOT NULL,
    prob_sideways   REAL         NOT NULL,
    prob_up         REAL         NOT NULL,
    created_at      TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE(stock_id, report_date, model_version)
);

CREATE TABLE ml_tft_predictions (
    id            BIGSERIAL    PRIMARY KEY,
    stock_id      BIGINT       NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    report_date   DATE         NOT NULL,
    model_version VARCHAR(20)  NOT NULL DEFAULT 'tft-v2',
    group_id      VARCHAR(50),
    prob          REAL         NOT NULL,
    pred          INT          NOT NULL,
    created_at    TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE(stock_id, report_date, model_version)
);

CREATE INDEX idx_ml_tft_predictions_stock_date ON ml_tft_predictions(stock_id, report_date DESC);

CREATE TABLE ml_garch_predictions (
    id               BIGSERIAL    PRIMARY KEY,
    stock_id         BIGINT       NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    report_date      DATE         NOT NULL,
    model_version    VARCHAR(20)  NOT NULL DEFAULT 'v1.0',
    vol_1d           REAL,
    vol_3d           REAL,
    vol_5d           REAL,
    volatility_level VARCHAR(10),
    risk_flag        BOOLEAN      DEFAULT FALSE,
    percentile_vs_1y REAL,
    created_at       TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE(stock_id, report_date, model_version)
);

CREATE TABLE ml_ensemble_predictions (
    id                  BIGSERIAL    PRIMARY KEY,
    stock_id            BIGINT       NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    report_date         DATE         NOT NULL,
    model_version       VARCHAR(20)  NOT NULL DEFAULT 'v1.0',
    ensemble_result     INT          NOT NULL,
    ensemble_confidence REAL         NOT NULL,
    signal_agreement    BOOLEAN,
    confidence_gap      REAL,
    risk_flag           BOOLEAN      DEFAULT FALSE,
    scenario_type       VARCHAR(30),
    scenario_label      VARCHAR(20),
    created_at          TIMESTAMPTZ  DEFAULT NOW(),
    UNIQUE(stock_id, report_date, model_version)
);

-- ============================================================
-- 6. AI 토론 및 거래
-- ============================================================

CREATE TABLE ai_debate_reports (
    id                BIGSERIAL    PRIMARY KEY,
    stock_id          BIGINT       NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    report_date       DATE         NOT NULL,
    debate_version    VARCHAR(20),
    chairman_signal   VARCHAR(4),
    debate_confidence REAL,
    debate_summary    JSONB,
    final_stances     JSONB,
    debate_full_log   JSONB,
    chairman_report   TEXT,
    created_at        TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_ai_debate_reports_stock_date ON ai_debate_reports(stock_id, report_date DESC);

CREATE TABLE ai_trading_history (
    id                     BIGSERIAL    PRIMARY KEY,
    portfolio_id           BIGINT       NOT NULL REFERENCES ai_portfolio(id) ON DELETE CASCADE,
    stock_id               BIGINT       NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    ml_report_id           BIGINT       REFERENCES ai_ml_reports(id) ON DELETE SET NULL,
    debate_report_id       BIGINT       REFERENCES ai_debate_reports(id) ON DELETE SET NULL,
    model_version          VARCHAR(20),
    trade_type             VARCHAR(4)   NOT NULL,
    trade_weight           REAL,
    trade_price_rate       REAL,
    trade_price            INTEGER,
    trade_quantity         BIGINT,
    trade_amount           BIGINT,
    return_rate            REAL,
    realized_profit        BIGINT       NOT NULL DEFAULT 0,
    holding_quantity_after BIGINT,
    cash_balance_after     BIGINT,
    avg_buy_price_after    INTEGER,
    trade_time             TIMESTAMPTZ  NOT NULL,
    created_at             TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_ai_trading_history_debate_report_id ON ai_trading_history(debate_report_id);

-- ============================================================
-- 7. 앙상블 포트폴리오
-- ============================================================

CREATE TABLE ensemble_portfolio (
    id              BIGSERIAL    PRIMARY KEY,
    strategy_name   VARCHAR(50)  NOT NULL,
    model_version   VARCHAR(20)  NOT NULL,
    initial_capital BIGINT       NOT NULL,
    params          JSONB,
    created_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE ensemble_portfolio_snapshots (
    id                BIGSERIAL PRIMARY KEY,
    portfolio_id      BIGINT    NOT NULL REFERENCES ensemble_portfolio(id) ON DELETE CASCADE,
    snapshot_date     DATE      NOT NULL,
    portfolio_value   BIGINT    NOT NULL,
    cash              BIGINT    NOT NULL,
    n_positions       INT       NOT NULL,
    daily_return      REAL,
    cumulative_return REAL,
    mdd               REAL,
    sharpe_30d        REAL,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(portfolio_id, snapshot_date)
);

CREATE INDEX idx_ens_snapshots_date ON ensemble_portfolio_snapshots(portfolio_id, snapshot_date DESC);

CREATE TABLE ensemble_portfolio_holdings (
    id            BIGSERIAL PRIMARY KEY,
    portfolio_id  BIGINT    NOT NULL REFERENCES ensemble_portfolio(id) ON DELETE CASCADE,
    snapshot_date DATE      NOT NULL,
    stock_id      BIGINT    NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    buy_date      DATE      NOT NULL,
    buy_price     INT       NOT NULL,
    current_price INT,
    shares        INT       NOT NULL,
    invested      BIGINT    NOT NULL,
    unrealized_pnl BIGINT,
    hold_days     INT       NOT NULL,
    is_extended   BOOLEAN   DEFAULT FALSE,
    ensemble_prob REAL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ens_holdings_date ON ensemble_portfolio_holdings(portfolio_id, snapshot_date DESC);

CREATE TABLE ensemble_portfolio_trades (
    id            BIGSERIAL    PRIMARY KEY,
    portfolio_id  BIGINT       NOT NULL REFERENCES ensemble_portfolio(id) ON DELETE CASCADE,
    trade_date    DATE         NOT NULL,
    stock_id      BIGINT       NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    trade_type    VARCHAR(4)   NOT NULL,
    price         INT          NOT NULL,
    shares        INT          NOT NULL,
    amount        BIGINT       NOT NULL,
    commission    BIGINT,
    pnl           BIGINT,
    return_rate   REAL,
    hold_days     INT,
    trade_reason  VARCHAR(30),
    is_extended   BOOLEAN      DEFAULT FALSE,
    ensemble_prob REAL,
    created_at    TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_ens_trades_date ON ensemble_portfolio_trades(portfolio_id, trade_date DESC);

-- ============================================================
-- 8. 관심종목 및 알림
-- ============================================================

CREATE TABLE user_watchlist (
    user_id        BIGINT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stock_id       BIGINT  NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    is_noti_enabled BOOLEAN DEFAULT true,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, stock_id)
);

CREATE TABLE stock_notifications (
    id           BIGSERIAL    PRIMARY KEY,
    stock_id     BIGINT       NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
    noti_type    VARCHAR(30)  NOT NULL,
    title        VARCHAR(100) NOT NULL,
    message      VARCHAR(512),
    related_link VARCHAR(255),
    created_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE user_notifications (
    id              BIGSERIAL   PRIMARY KEY,
    user_id         BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id BIGINT      NOT NULL REFERENCES stock_notifications(id) ON DELETE CASCADE,
    is_read         BOOLEAN     DEFAULT false,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. 파이프라인 시그널
-- ============================================================

CREATE TABLE pipeline_signals (
    id           BIGSERIAL    PRIMARY KEY,
    signal_type  VARCHAR(50)  NOT NULL,
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    retry_count  BIGINT       NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ  DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- ============================================================
-- 10. 시드 데이터: 약관
-- ============================================================

INSERT INTO terms (term_type, version, title, content, is_required, is_active, enforced_at, created_at)
VALUES
('SERVICE', 'v1.0', '서비스 이용약관',
'살래말래 서비스 이용약관

제1조 (목적)
본 약관은 살래말래(이하 "회사")가 제공하는 주식 정보 서비스(이하 "서비스")의 이용과 관련하여 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
1. "서비스"란 회사가 제공하는 AI 기반 주식 분석, 종목 정보, 뉴스, 포트폴리오 정보 등 관련 서비스를 의미합니다.
2. "회원"이란 본 약관에 동의하고 회원가입을 완료한 자를 의미합니다.

부칙: 본 약관은 2026년 3월 11일부터 시행합니다.',
true, true, NOW(), NOW()),

('PRIVACY', 'v1.0', '개인정보 처리방침',
'살래말래 개인정보 처리방침

제1조 (개인정보의 처리 목적)
회사는 다음의 목적을 위하여 개인정보를 처리합니다.
1. 회원 가입 및 관리
2. 서비스 제공: 관심종목 관리, 맞춤형 정보 제공, 알림 서비스
3. 서비스 개선

제2조 (처리하는 개인정보 항목)
[필수] 이메일, 비밀번호(암호화), 닉네임
[선택] 프로필 이미지, 이메일 수신 동의
[자동 수집] IP 주소, 접속 기기 정보

부칙: 본 방침은 2026년 3월 11일부터 시행합니다.',
true, true, NOW(), NOW()),

('INVESTMENT_DISCLAIMER', 'v1.0', '투자 면책 고지',
'살래말래 투자 면책 고지

제1조 (투자 권유가 아님)
회사가 제공하는 모든 정보는 정보 제공을 목적으로 하며, 투자 권유가 아닙니다.

제2조 (투자 책임)
모든 투자 판단과 의사결정은 투자자 본인의 책임입니다.

제3조 (정보의 정확성)
AI 분석 결과는 과거 데이터 기반 통계 분석이며, 미래 수익을 보장하지 않습니다.

부칙: 본 고지는 2026년 3월 11일부터 적용됩니다.',
true, true, NOW(), NOW());

-- ============================================================
-- 끝
-- ============================================================
