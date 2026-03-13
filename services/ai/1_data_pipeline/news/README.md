# 뉴스 데이터 파이프라인

KOSPI200 종목별 뉴스 수집 → 전처리 → DB 적재 → 키워드 추출 파이프라인.

## 폴더 구조

```
news/
├── config.py              # 공통 설정 (DB, API키, 경로, 크롤링 상수)
├── db.py                  # SQLAlchemy 엔진 / 세션 팩토리
├── models.py              # ORM 모델 (StockNews, StockNewsMap, Keyword, NewsKeywordMap)
├── kospi200.py            # KOSPI200 종목 리스트 (CSV 기반 + 네이버 갱신)
├── scheduler.py           # 자동 스케줄러 (매일 장마감 후 크롤링)
├── Dockerfile             # Docker 이미지 빌드
├── docker-compose.yml     # 서비스 정의 (news-daily, news-scheduler)
├── requirements.txt       # Python 의존성
├── .env.example           # 환경변수 예시
├── data/
│   └── kospi200_list.csv  # 종목 코드/이름 정적 리스트
│
├── crawlers/              # 크롤링 모듈
│   ├── daily.py           # 일일 크롤러 (네이버 금융 뉴스탭)
│   ├── backfill.py        # 백필 크롤러 (네이버 검색, 날짜 범위)
│   ├── naver_finance.py   # 네이버 금융 파싱 유틸 (목록/본문 추출)
│   └── checkpoint.py      # 체크포인트 관리 (백필 중단/재개)
│
├── processors/            # 후처리 모듈
│   ├── clean_articles.py  # 기사 중복 제거 + 광고/노이즈 필터링
│   ├── keyword_batch.py   # Gemini API 키워드 추출 + 임베딩 클러스터링
│   └── nlp_processor.py   # NLP 백엔드 (Claude/Gemini/Ollama) ※ 수정 금지
│
└── loaders/               # DB 적재 모듈
    └── csv_loader.py      # CSV → DB 벌크 적재 (네이버/SSAFY 형식 자동 감지)
```

## 크롤링

두 가지 크롤링 방식을 제공합니다. **모든 명령은 `news/` 디렉토리에서 실행합니다.**

### 1. 일일 크롤러 (Daily)

네이버 **금융**(`finance.naver.com`)의 종목별 뉴스 탭에서 최신 뉴스를 수집합니다.
매일 스케줄러로 실행하거나 수동으로 실행합니다.

```bash
# 전 종목 최신 뉴스 수집 → DB 적재
python -m crawlers.daily

# 기간 필터링 (수집 후 날짜 범위 밖 기사 제외)
python -m crawlers.daily --start-date 2026-03-01 --end-date 2026-03-12

# 특정 종목만
python -m crawlers.daily --codes 005930 000660

# 페이지 수 조절 (기본: 10)
python -m crawlers.daily --max-pages 20

# DB 적재 없이 CSV만 저장
python -m crawlers.daily --csv-only
```

**특징:**
- 네이버 금융 뉴스탭에서 종목별 최신 페이지를 수집
- `--start-date` / `--end-date`로 날짜 필터링 가능
- 동시 요청 8개, 페이지 간 0.5~1.2초 딜레이
- 25종목마다 30초 배치 쿨다운
- DB 직접 적재 (URL 중복 자동 스킵)

### 2. 백필 크롤러 (Backfill)

네이버 **검색**(`search.naver.com`)에서 날짜 범위를 월 단위로 분할하여
과거 뉴스를 체계적으로 수집합니다. 체크포인트 기반 중단/재개 지원.

```bash
# 2025년 1월부터 현재까지 전 종목 백필
python -m crawlers.backfill --start-date 2025-01-01

# 특정 기간 + 특정 종목
python -m crawlers.backfill --codes 005930 000660 --start-date 2024-01-01 --end-date 2024-12-31

# 중단 후 이어서 (자동으로 checkpoint에서 재개)
python -m crawlers.backfill --start-date 2025-01-01 --run-id backfill_20250101

# 배치 범위 (26~50번째 종목만)
python -m crawlers.backfill --start-date 2025-01-01 --start-idx 25 --end-idx 50

# 월당 최대 페이지 수 조절 (기본: 5)
python -m crawlers.backfill --start-date 2025-01-01 --max-pages 10
```

**특징:**
- 월 단위로 기간을 분할하여 검색 (4,000건 제한 우회)
- 체크포인트 기반 중단/재개 — 같은 `--run-id`로 재실행하면 이어서 진행
- 종목별 CSV 개별 저장 (`output/backfill_{run_id}/`)
- 동시 요청 6개, 페이지 간 1.2~2.5초 딜레이 (보수적)
- 25종목마다 60초 배치 쿨다운

### 일일 vs 백필 비교

| 항목 | 일일 (daily) | 백필 (backfill) |
|------|-------------|-----------------|
| 데이터 소스 | 네이버 금융 뉴스탭 | 네이버 검색 |
| 용도 | 최근 뉴스 수집, 일별 스케줄링 | 과거 대량 수집 (기간 지정) |
| 기간 지정 | `--start-date`, `--end-date` (필터) | `--start-date` (필수), `--end-date` |
| 중단 재개 | 없음 | 체크포인트 기반 |
| 저장 방식 | DB 직접 적재 or CSV | CSV (이후 csv_loader로 DB 적재) |
| 본문 수집 | 금융 뉴스 → 리다이렉트 추적 | n.news.naver.com 직접 |

## CSV → DB 적재

Google Drive에서 다운로드한 CSV 파일이나, 백필 크롤러의 결과물을 DB에 벌크 적재합니다.

```bash
# 폴더 단위 적재 (네이버 크롤링 형식)
python -m loaders.csv_loader data/news_2024/

# 여러 폴더 순차 적재
python -m loaders.csv_loader data/news_2019/ data/news_2020/ data/news_2021/

# SSAFY 데이터 형식 (파이프 구분자)
python -m loaders.csv_loader --ssafy data/ssafy_dataset_news_2024.csv

# 이어서 적재 (체크포인트 기반)
python -m loaders.csv_loader data/news_2024/ --resume

# Google Drive에서 다운로드 후 적재
python -m loaders.csv_loader --download --year 2024
```

**지원 CSV 형식:**
1. **네이버 크롤링 형식**: `title, article_url, source, date, code, name, body, full_body`
2. **SSAFY 데이터 형식**: `company, title, link, published, category, category_str, reporter, article` (파이프 `|` 구분)

## 후처리

### 기사 정제

중복 제거 + 광고/노이즈 필터링을 수행합니다.

```bash
# 크롤링 결과 폴더 정제
python -m processors.clean_articles output/news_2024/

# 백업 생성 후 정제
python -m processors.clean_articles output/backfill_batch/ --backup

# 임베딩 없이 빠른 정리 (제목 유사도 스킵)
python -m processors.clean_articles output/news_2024/ --no-embedding
```

### 키워드 추출

DB에 저장된 뉴스 기사에서 Gemini API로 키워드를 추출하고,
임베딩 → 클러스터링으로 정규화한 뒤 `keywords` / `news_keyword_map` 테이블에 저장합니다.

```bash
# 키워드 미추출 기사 전체 처리
python -m processors.keyword_batch

# 최근 7일 기사만
python -m processors.keyword_batch --days 7

# 배치 크기/딜레이 조절 (API rate limit 대응)
python -m processors.keyword_batch --batch-size 50 --delay 1.0
```

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `AI_DB_URL` | PostgreSQL 연결 URL | `postgresql+psycopg2://app_dev_user:change_me_dev@localhost:5432/app_dev` |
| `GEMINI_API_KEY` | Gemini API 키 (키워드 추출) | - |
| `ANTHROPIC_API_KEY` | Claude API 키 (키워드 추출, 대안) | - |
| `GDRIVE_NEWS_FOLDER_ID` | Google Drive 뉴스 폴더 ID | `1XLqr6uAYkCsjYUXQfJHInmOtVILgy4mb` |

## DB 테이블 (ERD)

```
stocks (읽기 전용 참조)
  ├── id, ticker, name, ...
  │
stock_news
  ├── id, title, snippet, url, publisher, published_at
  │
stock_news_map (N:M)
  ├── stock_id, news_id, sentiment_score, sentiment_label
  │
keywords
  ├── id, name (unique, max 20자)
  │
news_keyword_map (N:M)
  └── news_id, keyword_id
```

## Docker 실행

Docker로 독립 컨테이너에서 실행할 수 있습니다.

### 초기 설정

```bash
cd 1_data_pipeline/news/
cp .env.example .env    # DB URL, API 키 입력
```

### 서비스 구성

| 서비스 | 설명 | 실행 모드 |
|--------|------|-----------|
| `news-daily` | 수동 실행 (크롤링, 적재, 키워드 추출 등) | 1회 실행 후 종료 |
| `news-scheduler` | 자동 스케줄러 데몬 | 상시 실행 (`restart: unless-stopped`) |

### 사용법

```bash
# 일일 크롤링
docker compose run news-daily

# 특정 종목만
docker compose run news-daily python -m crawlers.daily --codes 005930 000660

# 백필 크롤링
docker compose run news-daily python -m crawlers.backfill --start-date 2025-01-01

# CSV → DB 적재
docker compose run news-daily python -m loaders.csv_loader output/backfill_xxx/

# 키워드 추출
docker compose run news-daily python -m processors.keyword_batch

# 스케줄러 데몬 (장마감 후 자동 크롤링)
docker compose up -d news-scheduler
```

## 전체 실행 흐름 (권장 순서)

```
1. 백필 크롤링    →  python -m crawlers.backfill --start-date 2024-01-01
2. 기사 정제      →  python -m processors.clean_articles output/backfill_xxx/
3. CSV → DB 적재  →  python -m loaders.csv_loader output/backfill_xxx/
4. 키워드 추출    →  python -m processors.keyword_batch
5. (매일) 일일 크롤링 →  python -m crawlers.daily
```
