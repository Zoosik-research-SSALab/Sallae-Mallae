# DB 덤프 및 스키마 정보

> **프로젝트명:** 살래말래 (Sallaemallae)
> **작성일:** 2026-03-29

---

## 1. DB 접속 정보

| 항목 | 값 |
|------|-----|
| DBMS | PostgreSQL 16 |
| 확장 | TimescaleDB (시계열), pgvector v0.8.2 (벡터 검색), pg_trgm (전문 검색) |
| Host (Docker 내부) | `postgres` |
| Host (외부 접속) | `127.0.0.1` |
| Port | `5432` |
| Database | `app` (개발: `app_dev`) |
| 사용자 | `app_user` (개발: `app_dev_user`) |
| 비밀번호 | 환경 변수 `DB_PASSWORD` / `APP_DB_PASSWORD` |
| Superuser | `postgres` (초기 설정용) |
| Timezone | `Asia/Seoul` |
| JDBC URL | `jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}` |

---

## 2. DB 덤프

DB 덤프 최신본은 `exec/sallaemallae_schema_dump.sql` 파일로 제공됩니다.

이 파일에는 전체 테이블 스키마(CREATE TABLE), 인덱스, 제약조건, TimescaleDB 하이퍼테이블 설정, 시드 데이터(약관 3종)가 모두 포함되어 있습니다.

### 2.1 덤프 파일 실행 방법

```bash
# 1. Base 인프라 기동 (PostgreSQL 컨테이너)
cd infra
docker compose -f base/docker-compose.base.yml --env-file env/base.env up -d

# 2. 확장 설치 확인 (init 스크립트로 자동 설치됨)
docker exec -t <postgres-container> psql -U app_user -d app -c "\dx"
# timescaledb, vector, pg_trgm 확인

# 3. 덤프 파일 실행
docker cp exec/sallaemallae_schema_dump.sql <postgres-container>:/tmp/
docker exec -t <postgres-container> psql -U app_user -d app -f /tmp/sallaemallae_schema_dump.sql
```

### 2.2 운영 데이터 덤프 생성/복원

```bash
# 운영 DB에서 전체 덤프 생성
docker exec -t <postgres-container> pg_dump \
  -U app_user -d app --no-owner --no-privileges -F c \
  -f /tmp/sallaemallae_full.backup
docker cp <postgres-container>:/tmp/sallaemallae_full.backup ./

# 복원
docker cp sallaemallae_full.backup <postgres-container>:/tmp/
docker exec -t <postgres-container> pg_restore \
  -U app_user -d app --no-owner --no-privileges --clean --if-exists \
  /tmp/sallaemallae_full.backup
```

### 2.3 Flyway 자동 마이그레이션 (대안)

덤프 파일 대신 Backend 앱 기동만으로도 Flyway가 자동으로 스키마를 생성합니다.

```bash
java -jar sallaemallae-backend-0.0.1-SNAPSHOT.jar
# → Flyway가 V1~V22 마이그레이션 자동 실행
```

---

## 3. 전체 스키마

### 3.1 사용자 및 인증

#### users - 사용자

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| email | VARCHAR(255) UNIQUE NOT NULL | 이메일 |
| password_hash | VARCHAR(60) | BCrypt 해시 (소셜 전용은 null) |
| nickname | VARCHAR(20) NOT NULL | 닉네임 |
| profile_image_url | VARCHAR(512) | 프로필 이미지 URL (MinIO) |
| is_email_opt_in | BOOLEAN | 이메일 수신 동의 |
| is_noti_enabled | BOOLEAN NOT NULL DEFAULT TRUE | 알림 수신 전체 설정 |
| status | VARCHAR(20) | ACTIVE / WITHDRAWN / DELETED / BANNED |
| admin | BOOLEAN | 관리자 여부 |
| token_version | INT | 토큰 버전 (전체 로그아웃 시 +1) |
| created_at / updated_at | TIMESTAMPTZ | |
| withdrawn_at / deleted_at | TIMESTAMPTZ | 탈퇴/삭제 시각 |

#### social_accounts - 소셜 계정

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| user_id | BIGINT FK → users | |
| provider | VARCHAR(10) | GOOGLE / NAVER / KAKAO |
| provider_account_id | VARCHAR(255) | 소셜 고유 ID |

> UNIQUE(provider, provider_account_id)

#### login_history - 로그인 이력

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| user_id | BIGINT FK → users | 실패 시 null |
| attempt_email | VARCHAR(255) | 시도 이메일 |
| ip_address | VARCHAR(45) | IP (IPv6 대비) |
| device_info | VARCHAR(512) | User-Agent |
| is_success | BOOLEAN | 성공 여부 |
| event_type | VARCHAR(30) | LOGIN / SOCIAL_LOGIN / SIGNUP / LOGOUT / ACCOUNT_LOCK / PASSWORD_RESET / ACCOUNT_WITHDRAW / ACCOUNT_RECOVER / TOKEN_REUSE / STEP_UP |

#### password_history - 비밀번호 이력

> user_id, password_hash, changed_at, changed_by (USER/RESET/ADMIN), ip_address
> 최근 3개 이력과 비교하여 재사용 방지

#### device_sessions - 디바이스 세션

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| user_id | BIGINT FK → users | |
| device_id | VARCHAR(255) | 기기 식별자 |
| device_name | VARCHAR(255) | 기기명 |
| trust_level | VARCHAR(20) | NEW / RECOGNIZED / TRUSTED |
| login_count | INT | 로그인 횟수 |
| last_login_at | TIMESTAMPTZ | 최근 로그인 |

> UNIQUE(user_id, device_id)

---

### 3.2 약관 및 동의

#### terms - 약관

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| term_type | VARCHAR(30) | SERVICE / PRIVACY / INVESTMENT_DISCLAIMER |
| version | VARCHAR(20) | 버전 (예: v1.0) |
| title | VARCHAR(50) | 약관 제목 |
| content | TEXT | 약관 내용 |
| is_required | BOOLEAN | 필수 동의 여부 |
| is_active | BOOLEAN | 현재 적용 여부 |

> 시드 데이터: 서비스 이용약관, 개인정보 처리방침, 투자 면책 고지 (각 v1.0)

#### user_agreements - 사용자 동의

> user_id FK → users, terms_id FK → terms, is_agreed, agreed_at

---

### 3.3 주식 및 시세

#### stocks - 종목 마스터

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| ticker | VARCHAR(6) UNIQUE | 종목코드 (예: 005930) |
| name | VARCHAR(100) | 종목명 |
| gics_sector | VARCHAR(50) | GICS 대분류 |
| category | VARCHAR(50) | 자체 카테고리 |
| outstanding_shares | BIGINT | 상장주식수 |
| market_type | VARCHAR(20) | KOSPI / KOSDAQ |
| icon_url | VARCHAR(500) | 종목 아이콘 URL |
| is_active | BOOLEAN | 활성 여부 |

> 시드 데이터: KOSPI 200 종목

#### stock_prices_minute - 분봉 (TimescaleDB Hypertable)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL | |
| stock_id | BIGINT FK → stocks | |
| trade_timestamp | TIMESTAMPTZ | 거래 일시 |
| open/high/low/close_price | INT | OHLC |
| volume | BIGINT | 거래량 |
| fluctuation_rate | REAL | 등락률 |

> Hypertable: chunk_time_interval 1일, 7일 후 자동 압축, 30일 후 자동 삭제

#### stock_prices_daily - 일봉 (Hypertable, 1월 chunk, 3개월 후 압축)

#### stock_prices_weekly - 주봉 (Hypertable, 3개월 chunk)

#### stock_prices_monthly - 월봉 (Hypertable, 1년 chunk)

#### stock_prices_yearly - 년봉 (일반 테이블, trade_year INT)

> 모든 시세 테이블: UNIQUE(stock_id, trade_date/timestamp/week/month/year)

#### stock_financials - 재무 데이터

| 컬럼 | 타입 | 설명 |
|------|------|------|
| stock_id | BIGINT FK | |
| report_year / report_quarter | INT / VARCHAR(10) | 회계연도 / 분기 |
| total_assets / liabilities / equity | BIGINT | 자산/부채/자본 |
| revenue / operating_profit / net_income | BIGINT | 매출/영업이익/순이익 |
| per / pbr / roe | REAL | 투자 지표 |

> UNIQUE(stock_id, report_year, report_quarter)

#### stock_announcements - 공시

> stock_id, announced_at, title, url, content, target_year

#### stock_dividend_yield_snapshots - 배당수익률 스냅샷

> stock_id, as_of_date, cash_dividend_yield, stock_dividend_yield, source, is_latest

---

### 3.4 뉴스 및 키워드

#### stock_news - 뉴스

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| title | VARCHAR(255) | 뉴스 제목 (trgm 인덱스) |
| snippet | TEXT | FinBERT 스니펫 |
| url | VARCHAR(512) | 원문 링크 |
| publisher | VARCHAR(20) | 언론사 |
| drive_file_id | VARCHAR(100) | Google Drive File ID |
| published_at | TIMESTAMPTZ | 발행 일시 |

#### stock_news_map - 종목-뉴스 매핑

> stock_id + news_id (복합 PK), sentiment_score (-1.0~1.0), sentiment_label

#### keywords - 키워드

> id, name (UNIQUE), cluster_id FK → keyword_clusters

#### keyword_clusters - 키워드 클러스터

> id, name (클러스터 대표 키워드)

#### news_keyword_map - 뉴스-키워드 매핑

> news_id + keyword_id (복합 PK)

#### keyword_embeddings - 키워드 임베딩

> keyword_id PK, embedding vector(384) (pgvector, 384차원)

#### news_agent_stock_data - 종목별 뉴스 에이전트 데이터

| 컬럼 | 타입 | 설명 |
|------|------|------|
| stock_id | BIGINT FK | |
| report_date | DATE | |
| top_keywords | JSONB | 상위 키워드 배열 |
| sentiment | JSONB | 감성 분석 결과 |

> UNIQUE(stock_id, report_date)

---

### 3.5 AI 포트폴리오 및 예측

#### ai_portfolio - AI 포트폴리오

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| name | VARCHAR(50) | 포트폴리오명 (예: 의장 포트폴리오) |
| model_version | VARCHAR(20) | ML 모델 버전 |
| initial_capital | BIGINT | 초기 자본금 |
| cash_balance | BIGINT | 현금 잔고 |
| cumulative_return | REAL | 누적 수익률(%) |
| total_asset_value | BIGINT | 총 자산 가치 |
| latest_record_date | DATE | 최근 기록일 |

#### ai_portfolio_holdings - 보유 종목

> portfolio_id, stock_id, portfolio_weight, return_rate, buy_date, avg_buy_price, current_price, holding_quantity, market_value, evaluation_profit

#### ai_daily_performance - 일별 성과

> portfolio_id, record_date, daily_return, cumulative_return, mdd, cash_balance, market_value, total_asset_value, holding_count

#### ai_ml_reports - ML 분석 리포트

| 컬럼 | 타입 | 설명 |
|------|------|------|
| stock_id | BIGINT FK | |
| report_date | DATE | 분석 기준일 |
| ml_signal | VARCHAR(4) | BUY / HOLD / SELL / STAY |
| ml_confidence | REAL | 신뢰도 |
| report_data | JSONB | 상세 모델 결과 |

> UNIQUE(stock_id, report_date, model_version)

#### ml_lgbm_predictions - LightGBM 예측

> predicted_class (0=하락, 1=횡보, 2=상승), prob_down/sideways/up, confidence

#### ml_tft_predictions - TFT 예측 (구 LSTM 대체)

> group_id, prob (상승확률), pred (0/1), model_version='tft-v2'

#### ml_garch_predictions - GARCH 변동성

> vol_1d/3d/5d, volatility_level (낮음/보통/높음/매우높음), risk_flag, percentile_vs_1y

#### ml_ensemble_predictions - 앙상블 예측

> ensemble_result (0/1), ensemble_confidence, scenario_type/label, risk_flag

---

### 3.6 AI 토론 및 거래

#### ai_debate_reports - AI 토론 리포트

| 컬럼 | 타입 | 설명 |
|------|------|------|
| stock_id | BIGINT FK | |
| report_date | DATE | 토론 기준일 |
| chairman_signal | VARCHAR(4) | BUY / HOLD / SELL / STAY |
| debate_confidence | REAL | 신뢰도 |
| debate_summary | JSONB | 라운드별 요약 |
| final_stances | JSONB | 매수/매도 스탠스 |
| debate_full_log | JSONB | 전체 토론 로그 |
| chairman_report | TEXT | 의장 최종 리포트 |

#### ai_trading_history - AI 매매 이력

> portfolio_id, stock_id, ml_report_id, debate_report_id, trade_type (BUY/SELL), trade_price, trade_quantity, trade_amount, return_rate, realized_profit

---

### 3.7 앙상블 포트폴리오

#### ensemble_portfolio - 앙상블 포트폴리오

> strategy_name, model_version, initial_capital, params (JSONB)

#### ensemble_portfolio_snapshots - 일별 스냅샷

> portfolio_id, snapshot_date, portfolio_value, cash, n_positions, daily_return, cumulative_return, mdd, sharpe_30d

#### ensemble_portfolio_holdings - 보유 종목

> portfolio_id, snapshot_date, stock_id, buy_date, buy_price, shares, unrealized_pnl, ensemble_prob

#### ensemble_portfolio_trades - 매매 내역

> portfolio_id, trade_date, stock_id, trade_type, price, shares, amount, pnl, return_rate, trade_reason

---

### 3.8 관심종목 및 알림

#### user_watchlist - 관심종목

> user_id + stock_id (복합 PK), is_noti_enabled

#### stock_notifications - 원본 알림

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| stock_id | BIGINT FK | |
| noti_type | VARCHAR(30) | SURGE / PLUNGE / SIGNAL_BUY / SIGNAL_SELL |
| title | VARCHAR(100) | 알림 제목 |
| message | VARCHAR(512) | 알림 내용 |
| related_link | VARCHAR(255) | 이동 URL |

#### user_notifications - 사용자별 알림

> user_id, notification_id FK → stock_notifications, is_read

---

### 3.9 파이프라인 시그널

#### pipeline_signals - 파이프라인 신호

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGSERIAL PK | |
| signal_type | VARCHAR(50) | NEWS_PIPELINE_DONE / ML_PIPELINE_DONE / DEBATE_PIPELINE_DONE 등 |
| status | VARCHAR(20) | PENDING / DONE |
| retry_count | BIGINT | 재시도 횟수 |
| created_at | TIMESTAMPTZ | |
| processed_at | TIMESTAMPTZ | |

---

## 4. Redis 사용 현황

| 용도 | TTL |
|------|-----|
| Refresh Token 저장 | 14일 |
| Refresh Token / Access Token Blacklist | - |
| 이메일 인증 코드 | 5분 |
| 비밀번호 재설정 코드 | 5분 |
| 로그인 실패 추적 (5회 시 계정 잠금) | - |
| 시장 휴장일 캐시 | - |
| 주가 데이터 캐시 | - |
| 검색 키워드/인기 종목 | - |
| 뉴스 에이전트 데이터 캐시 | - |

> 연결: `spring.data.redis.host=${REDIS_HOST}:${REDIS_PORT}`, Lettuce 커넥션 풀

---

## 5. DB 초기화 스크립트

| 파일 | 설명 |
|------|------|
| `infra/postgres/Dockerfile` | TimescaleDB(PG16) + pgvector v0.8.2 이미지 빌드 |
| `infra/postgres/init/01-init-databases.sh` | DB 사용자/데이터베이스 생성, 권한 설정 |
| `infra/postgres/init/02-init-extensions.sh` | timescaledb, vector, pg_trgm 확장 설치 |
