-- Baseline schema managed by Flyway.
-- Apply to the currently selected application database.

-- pgvector 확장은 base postgres init 단계에서 superuser 권한으로 생성한다.

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
    UNIQUE(provider, provider_account_id),
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

-- 분봉 (데이터량 최대, 파티셔닝 고려 필요)
CREATE TABLE stock_prices_minute (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,                   -- FK
    trade_timestamp TIMESTAMPTZ NOT NULL,       -- 거래 일시 (분 단위)
    open_price INT,                             -- 시가
    high_price INT,                             -- 고가
    low_price INT,                              -- 저가
    close_price INT NOT NULL,                   -- 종가(현재가)
    volume BIGINT,                              -- 거래량
    fluctuation_rate REAL,             -- 등락률
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, trade_timestamp),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE INDEX idx_stock_prices_minute_stock_time ON stock_prices_minute(stock_id, trade_timestamp DESC);

-- 일봉
CREATE TABLE stock_prices_daily (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,                   -- FK
    trade_date DATE NOT NULL,                   -- 거래일
    open_price INT,                             -- 시가
    high_price INT,                             -- 고가
    low_price INT,                              -- 저가
    close_price INT NOT NULL,                   -- 종가
    volume BIGINT,                              -- 거래량
    fluctuation_rate REAL,             -- 등락률
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, trade_date),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE INDEX idx_stock_prices_daily_stock_date ON stock_prices_daily(stock_id, trade_date DESC);

-- 주봉
CREATE TABLE stock_prices_weekly (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,                   -- FK
    trade_week DATE NOT NULL,                   -- 해당 주 시작일 (월요일 기준)
    open_price INT,                             -- 시가 (주 첫 거래일)
    high_price INT,                             -- 고가 (주간 최고)
    low_price INT,                              -- 저가 (주간 최저)
    close_price INT NOT NULL,                   -- 종가 (주 마지막 거래일)
    volume BIGINT,                              -- 거래량 (주간 합계)
    fluctuation_rate REAL,             -- 등락률
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, trade_week),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE INDEX idx_stock_prices_weekly_stock_week ON stock_prices_weekly(stock_id, trade_week DESC);

-- 월봉
CREATE TABLE stock_prices_monthly (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,                   -- FK
    trade_month DATE NOT NULL,                  -- 해당 월 1일 (예: 2026-03-01)
    open_price INT,                             -- 시가 (월 첫 거래일)
    high_price INT,                             -- 고가 (월간 최고)
    low_price INT,                              -- 저가 (월간 최저)
    close_price INT NOT NULL,                   -- 종가 (월 마지막 거래일)
    volume BIGINT,                              -- 거래량 (월간 합계)
    fluctuation_rate REAL,             -- 등락률
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, trade_month),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE INDEX idx_stock_prices_monthly_stock_month ON stock_prices_monthly(stock_id, trade_month DESC);

-- 년봉
CREATE TABLE stock_prices_yearly (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,                   -- FK
    trade_year INT NOT NULL,                    -- 연도 (예: 2026)
    open_price INT,                             -- 시가 (연 첫 거래일)
    high_price INT,                             -- 고가 (연간 최고)
    low_price INT,                              -- 저가 (연간 최저)
    close_price INT NOT NULL,                   -- 종가 (연 마지막 거래일)
    volume BIGINT,                              -- 거래량 (연간 합계)
    fluctuation_rate REAL,             -- 등락률
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, trade_year),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE INDEX idx_stock_prices_yearly_stock_year ON stock_prices_yearly(stock_id, trade_year DESC);

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

CREATE INDEX idx_stock_news_map_news ON stock_news_map(news_id);

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

CREATE TABLE keyword_embeddings (
    keyword_id BIGINT PRIMARY KEY,              -- FK → keywords
    embedding vector(384) NOT NULL,             -- 의미 벡터 (384차원)
    FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
);

-- =========================================================================
-- 5. AI 포트폴리오 및 매매 관련 테이블
-- =========================================================================

CREATE TABLE ai_portfolio (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,                  -- 포트폴리오 이름 (예: 의장 포트폴리오)
    model_version VARCHAR(20) NOT NULL DEFAULT 'v1.0', -- ML 모델 버전
    debate_version VARCHAR(20),                 -- 토론 AI 버전
    cumulative_return REAL DEFAULT 0,  -- 누적 수익률 (%)
    total_trades INT DEFAULT 0,                 -- 총 매매 횟수 (매도 기준)
    winning_trades INT DEFAULT 0,               -- 성공(익절) 횟수
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ai_portfolio_holdings (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL,               -- FK
    stock_id BIGINT NOT NULL,                   -- FK
    model_version VARCHAR(20) NOT NULL DEFAULT 'v1.0', -- 모델 버전
    portfolio_weight REAL,                      -- 포트폴리오 내 비중 (%)
    return_rate REAL,                           -- 현재 종목 수익률 (%)
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (portfolio_id) REFERENCES ai_portfolio(id) ON DELETE CASCADE,
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE ai_daily_performance (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL,               -- FK
    model_version VARCHAR(20) NOT NULL DEFAULT 'v1.0', -- 모델 버전
    record_date DATE NOT NULL,                  -- 기록 일자
    daily_return REAL,                          -- 일일 수익률 (%)
    cumulative_return REAL,                     -- 해당 일자 기준 누적 수익률 (%)
    mdd REAL,                                   -- 최대 낙폭 (MDD, %)
    FOREIGN KEY (portfolio_id) REFERENCES ai_portfolio(id) ON DELETE CASCADE
);

CREATE TABLE ai_ml_reports (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,                   -- FK
    report_date DATE NOT NULL,                  -- 분석 기준일
    model_version VARCHAR(20) NOT NULL DEFAULT 'v1.0', -- 모델 버전
    ml_signal VARCHAR(4),                       -- ML 최종 신호 (BUY, HOLD, SELL, STAY)
    ml_confidence REAL,                         -- ML 신호 신뢰도
    signal_agreement BOOLEAN,                   -- 모델 신호 일치 여부
    confidence_gap REAL,                        -- 확신도 차이 (0.0~1.0)
    scenario_type VARCHAR(30),                  -- 시나리오 타입 (full_agreement_bullish, garch_warning 등)
    risk_flag BOOLEAN,                          -- 리스크 경고 플래그
    report_data JSONB,                          -- AI 서버 패킷 전체 JSON (상세 모델 결과)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, report_date, model_version),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_ml_reports_stock_date ON ai_ml_reports(stock_id, report_date DESC);

CREATE TABLE ml_lgbm_predictions (
    id              BIGSERIAL PRIMARY KEY,
    stock_id        BIGINT NOT NULL,              -- FK
    report_date     DATE NOT NULL,                -- 예측 기준일
    model_version   VARCHAR(20) NOT NULL DEFAULT 'v1.0', -- 모델 버전
    predicted_class INT NOT NULL,                 -- 0=하락, 1=횡보, 2=상승
    confidence      REAL NOT NULL,                -- 최대 확률값 (0.33~1.0)
    prob_down       REAL NOT NULL,                -- 하락 확률 (0.0~1.0)
    prob_sideways   REAL NOT NULL,                -- 횡보 확률 (0.0~1.0)
    prob_up         REAL NOT NULL,                -- 상승 확률 (0.0~1.0)
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, report_date, model_version),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE ml_lstm_predictions (
    id              BIGSERIAL PRIMARY KEY,
    stock_id        BIGINT NOT NULL,              -- FK
    report_date     DATE NOT NULL,                -- 예측 기준일
    model_version   VARCHAR(20) NOT NULL DEFAULT 'v1.0', -- 모델 버전
    group_id        VARCHAR(50),                  -- cluster 또는 GICS 섹터명
    prob            REAL NOT NULL,                -- 상승 확률 (0.0~1.0)
    pred            INT NOT NULL,                 -- 0=비상승, 1=상승
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, report_date, model_version),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE ml_garch_predictions (
    id                BIGSERIAL PRIMARY KEY,
    stock_id          BIGINT NOT NULL,              -- FK
    report_date       DATE NOT NULL,                -- 피팅 기준일
    model_version     VARCHAR(20) NOT NULL DEFAULT 'v1.0', -- 모델 버전
    vol_1d            REAL,                         -- 1일 변동성 (연환산 %)
    vol_3d            REAL,                         -- 3일 변동성 (연환산 %)
    vol_5d            REAL,                         -- 5일 변동성 (연환산 %)
    volatility_level  VARCHAR(10),                  -- '낮음','보통','높음','매우높음'
    risk_flag         BOOLEAN DEFAULT FALSE,        -- 고위험 플래그
    percentile_vs_1y  REAL,                         -- 1년 대비 백분위 (0.0~100.0)
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, report_date, model_version),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE ml_ensemble_predictions (
    id                    BIGSERIAL PRIMARY KEY,
    stock_id              BIGINT NOT NULL,              -- FK
    report_date           DATE NOT NULL,                -- 예측 기준일
    model_version         VARCHAR(20) NOT NULL DEFAULT 'v1.0', -- 모델 버전
    ensemble_result       INT NOT NULL,                 -- 0=하락, 1=상승
    ensemble_confidence   REAL NOT NULL,                -- 앙상블 확신도 (0.0~1.0)
    signal_agreement      BOOLEAN,                      -- 신호 일치 여부
    confidence_gap        REAL,                         -- 확신도 차이 (0.0~1.0)
    risk_flag             BOOLEAN DEFAULT FALSE,        -- GARCH 리스크 플래그
    scenario_type         VARCHAR(30),                  -- 시나리오 타입
    scenario_label        VARCHAR(20),                  -- 시나리오 한글 라벨
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(stock_id, report_date, model_version),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE TABLE ai_debate_reports (
    id BIGSERIAL PRIMARY KEY,
    stock_id BIGINT NOT NULL,                   -- FK
    report_date DATE NOT NULL,                  -- 토론 기준일
    debate_version VARCHAR(20),                  -- 토론 AI 버전
    chairman_signal VARCHAR(4),                 -- 의장 최종 신호 (BUY, HOLD, SELL, STAY)
    debate_confidence REAL,                     -- 토론 신호 신뢰도
    debate_summary JSONB,                       -- 라운드 & 에이전트별 토론 요약
    final_stances JSONB,                        -- 리포트 요약 매수, 매도 보여주는
    debate_full_log JSONB,                      -- 전체 토론 스크립트
    chairman_report TEXT,                       -- 의장 AI 최종 리포트
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (stock_id) REFERENCES stocks(id) ON DELETE CASCADE
);

CREATE INDEX idx_ai_debate_reports_stock_date ON ai_debate_reports(stock_id, report_date DESC);

CREATE TABLE ai_trading_history (
    id BIGSERIAL PRIMARY KEY,
    portfolio_id BIGINT NOT NULL,               -- FK
    stock_id BIGINT NOT NULL,                   -- FK
    ml_report_id BIGINT,                        -- FK (nullable)
    model_version VARCHAR(20),                  -- ML 모델 버전 (ml_report 기준)
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
