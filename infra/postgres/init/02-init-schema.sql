-- =============================================================================
-- 02-init-schema.sql
-- 실행 순서: 01-init-databases.sh 이후 자동 실행 (알파벳 순)
-- 주의: .sql 파일은 환경변수 치환이 안 되므로 DB명 직접 지정
--       DB명 변경 시 아래 \connect 구문도 함께 수정 필요
-- =============================================================================

-- =============================================================================
-- DEV DB
-- =============================================================================
\connect app_dev

SET search_path TO public;

-- =========================================================================
-- 1. 사용자 및 인증 관련 테이블
-- =========================================================================

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,         -- 이메일 (UK)
    password_hash VARCHAR(60),                  -- 비밀번호 (소셜 전용은 null)
    nickname VARCHAR(20) NOT NULL,              -- 닉네임
    profile_image_url VARCHAR(512),             -- 프로필 이미지 URL
    is_email_opt_in BOOLEAN DEFAULT false,      -- 이메일 수신 동의 (필수#3)
    status VARCHAR(20) DEFAULT 'ACTIVE',        -- ACTIVE: 정상 / WITHDRAWN: 탈퇴(30일 복구 가능) / DELETED: 영구 삭제 / BANNED: 관리자 정지
    admin BOOLEAN DEFAULT false,                -- true(ADMIN), false(USER)
    token_version INT DEFAULT 0,                -- 전체 디바이스 로그아웃, 비밀번호 재설정 시 +1 → 기존 발급된 모든 AT 무효화
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    withdrawn_at TIMESTAMPTZ,                   -- 탈퇴 요청 시각 (이 시점 + 30일 경과 시 영구 삭제 스케줄러 실행)
    deleted_at TIMESTAMPTZ                      -- 영구 삭제 처리 시각 (스케줄러에 의해 SET)
);

CREATE TABLE social_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,                    -- FK
    provider VARCHAR(10) NOT NULL,              -- GOOGLE, NAVER, KAKAO
    provider_account_id VARCHAR(255) NOT NULL,  -- 소셜 고유 ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE login_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,                             -- nullable (로그인 실패 시)
    attempt_email VARCHAR(255),                 -- 시도 이메일
    ip_address VARCHAR(45),                     -- 시도 IP (IPv6 대비)
    device_info VARCHAR(512),                   -- 기기 정보 (User-Agent)
    is_success BOOLEAN NOT NULL,                -- 성공 여부
    event_type VARCHAR(30) DEFAULT 'LOGIN',     -- LOGIN: 이메일 로그인 / SOCIAL_LOGIN: 소셜 로그인
                                                -- SIGNUP: 회원가입 / LOGOUT: 로그아웃
                                                -- ACCOUNT_LOCK: 로그인 5회 실패 잠금
                                                -- PASSWORD_RESET: 비밀번호 재설정
                                                -- ACCOUNT_WITHDRAW: 회원 탈퇴
                                                -- ACCOUNT_RECOVER: 탈퇴 복구
                                                -- TOKEN_REUSE: RT 탈취 감지
                                                -- STEP_UP: 민감 작업 전 재인증
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);


CREATE TABLE password_history (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL,            -- 비밀번호 소유 유저
    password_hash   VARCHAR(60) NOT NULL,       -- BCrypt 해시 (변경 시점의 비밀번호)
    changed_at      TIMESTAMPTZ DEFAULT NOW(),  -- 변경 시각
    changed_by      VARCHAR(10) NOT NULL,       -- USER: 본인 변경 / RESET: 비밀번호 찾기 / ADMIN: 관리자 변경
    ip_address      VARCHAR(45),                -- 변경 요청 IP
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    -- 용도: 비밀번호 변경/재설정 시 최근 3개 이력과 BCrypt 비교하여 재사용 방지
    -- 회원가입 시 최초 비밀번호도 INSERT (changed_by='USER')
);

CREATE INDEX idx_pw_history_user ON password_history(user_id, changed_at DESC); -- 비밀번호 변경 시 최근 3개 이력 조회 (재사용 금지 체크)


-- =========================================================================
-- 2. 약관 및 동의 관련 테이블
-- =========================================================================

CREATE TABLE terms (
    id BIGSERIAL PRIMARY KEY,
    term_type VARCHAR(20) NOT NULL,             -- 유형 (SERVICE, PRIVACY, DISCLAIMER 등)
    version VARCHAR(20) NOT NULL,               -- 버전 (예: v1.0, 2026-02-26)
    title VARCHAR(50) NOT NULL,                 -- 약관 제목
    content TEXT NOT NULL,                      -- 약관 상세 내용 (무제한)
    is_required BOOLEAN DEFAULT true,           -- 필수 동의 여부
    is_active BOOLEAN DEFAULT true,             -- 현재 적용 중인 약관인지 여부
    enforced_at TIMESTAMPTZ,                    -- 시행 일자
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_agreements (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,                    -- FK
    terms_id BIGINT NOT NULL,                   -- 동의한 약관의 특정 버전 ID
    is_agreed BOOLEAN NOT NULL,                 -- 동의 여부 (true/false)
    agreed_at TIMESTAMPTZ DEFAULT NOW(),        -- 동의 일시
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (terms_id) REFERENCES terms(id) ON DELETE CASCADE
);

-- =========================================================================
-- 3. 주식, 재무, 공시 관련 테이블
-- =========================================================================

CREATE TABLE stocks (
    id BIGSERIAL PRIMARY KEY,
    ticker VARCHAR(6) UNIQUE NOT NULL,          -- 종목코드 (예: 005930)
    name VARCHAR(100) NOT NULL,                 -- 종목명
    gics_sector VARCHAR(50),                    -- GICS 대분류 (예: IT)
    category VARCHAR(50),                       -- 자체 설정 카테고리 (예: HBM, 밸류업 등)
    outstanding_shares BIGINT,                  -- 상장주식수 (정적 데이터)
    market_type VARCHAR(20),                    -- 시장 구분 (KOSPI, KOSDAQ)
    is_active BOOLEAN DEFAULT true,             -- 거래 정지 여부 등
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_prices (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,                   -- FK
    trade_timestamp TIMESTAMPTZ NOT NULL,       -- 거래 일시 (1분 단위)
    open_price INT,                             -- 시가
    high_price INT,                             -- 고가
    low_price INT,                              -- 저가
    close_price INT NOT NULL,                   -- 종가(현재가)
    volume BIGINT,                              -- 거래량
    fluctuation_rate REAL,                       -- 등락률 (예: 2.54)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE INDEX idx_stock_prices_stock_time ON stock_prices(stock_id, trade_timestamp DESC);

-- 💡 [중요] TimescaleDB를 사용하신다면 위 stock_prices 생성 후 아래 명령어를 실행하세요.
-- SELECT create_hypertable('stock_prices', 'trade_timestamp');

CREATE TABLE stock_financials (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,                   -- FK
    report_year INT NOT NULL,                   -- 회계연도 (예: 2025)
    report_quarter VARCHAR(10) NOT NULL,        -- 분기 (1Q, 2Q, 3Q, 4Q, YEARLY)
    total_assets BIGINT,                        -- 자산 총계
    total_liabilities BIGINT,                   -- 부채 총계
    total_equity BIGINT,                        -- 자본 총계
    revenue BIGINT,                             -- 매출액
    operating_profit BIGINT,                    -- 영업이익
    net_income BIGINT,                          -- 당기순이익
    operating_cash_flow BIGINT,                 -- 영업활동 현금흐름
    per REAL,                                    -- PER (주가수익비율)
    pbr REAL,                                    -- PBR (주가순자산비율)
    roe REAL,                                    -- ROE (자기자본이익률)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE stock_announcements (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,                   -- FK
    announced_at DATE NOT NULL,                 -- 공시 일자
    title VARCHAR(255) NOT NULL,                -- 공시 제목
    url VARCHAR(512),                           -- 공시 상세 링크
    content TEXT,                               -- 공시 원문 데이터 (Full Text)
    target_year INT,                            -- 대상 연도 (예: 2026)
    has_financial_analysis BOOLEAN,             -- 실적 분석 포함 여부
    has_operating_profit BOOLEAN,               -- 영업이익 언급 여부
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- =========================================================================
-- 4. 뉴스 및 키워드 매핑 테이블
-- =========================================================================

CREATE TABLE stock_news (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,                -- 뉴스 제목
    snippet TEXT,                               -- FinBERT 스니펫
    url VARCHAR(512),                           -- 원문 링크
    publisher VARCHAR(20),                      -- 언론사
    drive_file_id VARCHAR(100),                 -- 구글 드라이브 File ID
    published_at TIMESTAMPTZ,                   -- 기사 발행 일시
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_news_map (
    stock_id BIGINT NOT NULL,                   -- PK, FK
    news_id BIGINT NOT NULL,                    -- PK, FK
    sentiment_score REAL,                       -- 감성 점수 (-1.0 ~ 1.0)
    sentiment_label VARCHAR(20),                -- POSITIVE, NEGATIVE, NEUTRAL
    PRIMARY KEY (stock_id, news_id),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
    FOREIGN KEY (news_id) REFERENCES stock_news(id) ON DELETE CASCADE
);

CREATE TABLE keywords (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL,           -- 키워드명
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE news_keyword_map (
    news_id BIGINT NOT NULL,                    -- PK, FK
    keyword_id BIGINT NOT NULL,                 -- PK, FK
    PRIMARY KEY (news_id, keyword_id),
    FOREIGN KEY (news_id) REFERENCES stock_news(id) ON DELETE CASCADE,
    FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
);

-- =========================================================================
-- 5. AI 포트폴리오 및 매매 관련 테이블
-- =========================================================================

CREATE TABLE ai_portfolio (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,                  -- 포트폴리오 이름 (예: 의장 포트폴리오)
    cumulative_return REAL DEFAULT 0,  -- 누적 수익률 (%)
    total_trades INT DEFAULT 0,                 -- 총 매매 횟수 (매도 기준)
    winning_trades INT DEFAULT 0,               -- 성공(익절) 횟수
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_portfolio_holdings (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL,               -- FK
    stock_id BIGINT NOT NULL,                   -- FK
    portfolio_weight REAL,                      -- 포트폴리오 내 비중 (%)
    return_rate REAL,                           -- 현재 종목 수익률 (%)
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (portfolio_id) REFERENCES ai_portfolio(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE ai_daily_performance (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL,               -- FK
    record_date DATE NOT NULL,                  -- 기록 일자
    daily_return REAL,                          -- 일일 수익률 (%)
    cumulative_return REAL,                     -- 해당 일자 기준 누적 수익률 (%)
    mdd REAL,                                   -- 최대 낙폭 (MDD, %)
    FOREIGN KEY (portfolio_id) REFERENCES ai_portfolio(id) ON DELETE CASCADE
);

CREATE TABLE ai_ml_reports (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,                   -- FK
    report_time TIMESTAMPTZ NOT NULL,           -- 분석 일시
    ml_signal VARCHAR(4),                       -- ML 최종 신호 (BUY, HOLD, SELL, STAY)
    ml_confidence REAL,                         -- ML 신호 신뢰도
    model_versions JSONB,                       -- 모델 버전 정보 (PostgreSQL 최적화 JSONB)
    lgbm_up_prob REAL,                          -- 상승 확률 (FLOAT 최적화 REAL)
    lgbm_sideways_prob REAL,                    -- 횡보 확률
    lgbm_down_prob REAL,                        -- 하락 확률
    lgbm_predicted_class VARCHAR(10),           -- 예측 클래스
    lgbm_confidence REAL,                       -- LGBM 신뢰도
    lgbm_key_features JSONB,                    -- 주요 판단 근거
    lstm_pattern_score REAL,                    -- 패턴 점수
    lstm_detected_pattern VARCHAR(100),         -- 감지된 패턴
    lstm_sequence_confidence REAL,              -- 시퀀스 매칭 신뢰도
    lstm_history_match JSONB,                   -- 과거 유사 패턴 매칭
    garch_vol_1d REAL,                          -- 1일 변동성 예측
    garch_vol_3d REAL,                          -- 3일 변동성 예측
    garch_vol_5d REAL,                          -- 5일 변동성 예측
    garch_vol_level VARCHAR(20),                -- 변동성 레벨
    garch_risk_flag BOOLEAN,                    -- 리스크 경고 플래그
    garch_percentile INT,                       -- 1년 분포 내 위치 (%)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_ml_reports_stock_time ON ai_ml_reports(stock_id, report_time DESC);

CREATE TABLE ai_debate_reports (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,                   -- FK
    report_date DATE NOT NULL,                  -- 토론 기준일
    chairman_signal VARCHAR(4),                 -- 의장 최종 신호 (BUY, HOLD, SELL, STAY)
    debate_confidence REAL,                     -- 토론 신호 신뢰도
    debate_summary JSONB,                       -- 라운드 & 에이전트별 토론 요약
    final_stances JSONB,                        -- 리포트 요약 매수, 매도 보여주는
    debate_full_log JSONB,                      -- 전체 토론 스크립트
    chairman_report TEXT,                       -- 의장 AI 최종 리포트
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE ai_trading_history (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL,               -- FK
    stock_id BIGINT NOT NULL,                   -- FK
    ml_report_id BIGINT,                        -- FK (nullable)
    trade_type VARCHAR(4) NOT NULL,             -- BUY, SELL
    trade_weight REAL,                          -- 매매 비중 (%)
    trade_price_rate REAL,                      -- 체결가 (퍼센트/비율)
    return_rate REAL,                           -- 수익률 (SELL 일 때만 기록, %)
    trade_time TIMESTAMPTZ NOT NULL,            -- 매매 시간
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (portfolio_id) REFERENCES ai_portfolio(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
    FOREIGN KEY (ml_report_id) REFERENCES ai_ml_reports(id) ON DELETE SET NULL
);

-- =========================================================================
-- 6. 사용자 와치리스트 및 알림 테이블
-- =========================================================================

CREATE TABLE user_watchlist (
    user_id BIGINT NOT NULL,                    -- PK, FK
    stock_id BIGINT NOT NULL,                   -- PK, FK
    is_noti_enabled BOOLEAN DEFAULT true,       -- 해당 종목 개별 알림 ON/OFF
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, stock_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE stock_notifications (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,                   -- FK
    noti_type VARCHAR(30) NOT NULL,             -- 알림 종류 (TRADE_SIGNAL 등)
    title VARCHAR(100) NOT NULL,                -- 알림 제목
    message VARCHAR(512),                       -- 알림 상세 내용
    related_link VARCHAR(255),                  -- 클릭 시 이동할 URL
    created_at TIMESTAMPTZ DEFAULT NOW(),       -- 이벤트 발생 일시
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE user_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,                    -- FK
    notification_id BIGINT NOT NULL,            -- 원본 알림 ID 참조
    is_read BOOLEAN DEFAULT false,              -- 읽음 여부 (기본 false)
    created_at TIMESTAMPTZ DEFAULT NOW(),       -- 수신 일시
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (notification_id) REFERENCES stock_notifications(id) ON DELETE CASCADE
);


-- =============================================================================
-- PROD DB (동일 스키마)
-- =============================================================================
\connect app_prod

SET search_path TO public;

-- =========================================================================
-- 1. 사용자 및 인증 관련 테이블
-- =========================================================================

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(60),
    nickname VARCHAR(20) NOT NULL,
    profile_image_url VARCHAR(512),
    is_email_opt_in BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    admin BOOLEAN DEFAULT false,
    token_version INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    withdrawn_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE social_accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    provider VARCHAR(10) NOT NULL,
    provider_account_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE login_history (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    attempt_email VARCHAR(255),
    ip_address VARCHAR(45),
    device_info VARCHAR(512),
    is_success BOOLEAN NOT NULL,
    event_type VARCHAR(30) DEFAULT 'LOGIN',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE password_history (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL,
    password_hash   VARCHAR(60) NOT NULL,
    changed_at      TIMESTAMPTZ DEFAULT NOW(),
    changed_by      VARCHAR(10) NOT NULL,
    ip_address      VARCHAR(45),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_pw_history_user ON password_history(user_id, changed_at DESC);

-- =========================================================================
-- 2. 약관 및 동의 관련 테이블
-- =========================================================================

CREATE TABLE terms (
    id BIGSERIAL PRIMARY KEY,
    term_type VARCHAR(20) NOT NULL,
    version VARCHAR(20) NOT NULL,
    title VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    is_required BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    enforced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_agreements (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    terms_id BIGINT NOT NULL,
    is_agreed BOOLEAN NOT NULL,
    agreed_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (terms_id) REFERENCES terms(id) ON DELETE CASCADE
);

-- =========================================================================
-- 3. 주식, 재무, 공시 관련 테이블
-- =========================================================================

CREATE TABLE stocks (
    id BIGSERIAL PRIMARY KEY,
    ticker VARCHAR(6) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    gics_sector VARCHAR(50),
    category VARCHAR(50),
    outstanding_shares BIGINT,
    market_type VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_prices (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,
    trade_timestamp TIMESTAMPTZ NOT NULL,
    open_price INT,
    high_price INT,
    low_price INT,
    close_price INT NOT NULL,
    volume BIGINT,
    fluctuation_rate REAL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE INDEX idx_stock_prices_stock_time ON stock_prices(stock_id, trade_timestamp DESC);

CREATE TABLE stock_financials (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,
    report_year INT NOT NULL,
    report_quarter VARCHAR(10) NOT NULL,
    total_assets BIGINT,
    total_liabilities BIGINT,
    total_equity BIGINT,
    revenue BIGINT,
    operating_profit BIGINT,
    net_income BIGINT,
    operating_cash_flow BIGINT,
    per REAL,
    pbr REAL,
    roe REAL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE stock_announcements (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,
    announced_at DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(512),
    content TEXT,
    target_year INT,
    has_financial_analysis BOOLEAN,
    has_operating_profit BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

-- =========================================================================
-- 4. 뉴스 및 키워드 매핑 테이블
-- =========================================================================

CREATE TABLE stock_news (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    snippet TEXT,
    url VARCHAR(512),
    publisher VARCHAR(20),
    drive_file_id VARCHAR(100),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_news_map (
    stock_id BIGINT NOT NULL,
    news_id BIGINT NOT NULL,
    sentiment_score REAL,
    sentiment_label VARCHAR(20),
    PRIMARY KEY (stock_id, news_id),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
    FOREIGN KEY (news_id) REFERENCES stock_news(id) ON DELETE CASCADE
);

CREATE TABLE keywords (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(20) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE news_keyword_map (
    news_id BIGINT NOT NULL,
    keyword_id BIGINT NOT NULL,
    PRIMARY KEY (news_id, keyword_id),
    FOREIGN KEY (news_id) REFERENCES stock_news(id) ON DELETE CASCADE,
    FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
);

-- =========================================================================
-- 5. AI 포트폴리오 및 매매 관련 테이블
-- =========================================================================

CREATE TABLE ai_portfolio (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    cumulative_return REAL DEFAULT 0,
    total_trades INT DEFAULT 0,
    winning_trades INT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_portfolio_holdings (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL,
    stock_id BIGINT NOT NULL,
    portfolio_weight REAL,
    return_rate REAL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (portfolio_id) REFERENCES ai_portfolio(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE ai_daily_performance (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL,
    record_date DATE NOT NULL,
    daily_return REAL,
    cumulative_return REAL,
    mdd REAL,
    FOREIGN KEY (portfolio_id) REFERENCES ai_portfolio(id) ON DELETE CASCADE
);

CREATE TABLE ai_ml_reports (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,
    report_time TIMESTAMPTZ NOT NULL,
    ml_signal VARCHAR(4),
    ml_confidence REAL,
    model_versions JSONB,
    lgbm_up_prob REAL,
    lgbm_sideways_prob REAL,
    lgbm_down_prob REAL,
    lgbm_predicted_class VARCHAR(10),
    lgbm_confidence REAL,
    lgbm_key_features JSONB,
    lstm_pattern_score REAL,
    lstm_detected_pattern VARCHAR(100),
    lstm_sequence_confidence REAL,
    lstm_history_match JSONB,
    garch_vol_1d REAL,
    garch_vol_3d REAL,
    garch_vol_5d REAL,
    garch_vol_level VARCHAR(20),
    garch_risk_flag BOOLEAN,
    garch_percentile INT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_ml_reports_stock_time ON ai_ml_reports(stock_id, report_time DESC);

CREATE TABLE ai_debate_reports (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,
    report_date DATE NOT NULL,
    chairman_signal VARCHAR(4),
    debate_confidence REAL,
    debate_summary JSONB,
    final_stances JSONB,
    debate_full_log JSONB,
    chairman_report TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE ai_trading_history (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL,
    stock_id BIGINT NOT NULL,
    ml_report_id BIGINT,
    trade_type VARCHAR(4) NOT NULL,
    trade_weight REAL,
    trade_price_rate REAL,
    return_rate REAL,
    trade_time TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (portfolio_id) REFERENCES ai_portfolio(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE,
    FOREIGN KEY (ml_report_id) REFERENCES ai_ml_reports(id) ON DELETE SET NULL
);

-- =========================================================================
-- 6. 사용자 와치리스트 및 알림 테이블
-- =========================================================================

CREATE TABLE user_watchlist (
    user_id BIGINT NOT NULL,
    stock_id BIGINT NOT NULL,
    is_noti_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, stock_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE stock_notifications (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,
    noti_type VARCHAR(30) NOT NULL,
    title VARCHAR(100) NOT NULL,
    message VARCHAR(512),
    related_link VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE user_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    notification_id BIGINT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (notification_id) REFERENCES stock_notifications(id) ON DELETE CASCADE
);
