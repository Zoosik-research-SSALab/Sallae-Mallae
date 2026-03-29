# 뉴스 데이터 파이프라인

KOSPI200 종목별 뉴스 수집 → 감성 분석 → 키워드 추출 → 임베딩 → 클러스터링 → 에이전트 데이터 생성 파이프라인.

## 폴더 구조

```
news/
├── config.py              # 공통 설정 (DB, API키, 경로, 크롤링 상수)
├── db.py                  # SQLAlchemy 엔진 / 세션 팩토리
├── models.py              # ORM 모델 (StockNews, StockNewsMap, Keyword, PipelineSignal 등)
├── kospi200.py            # KOSPI200 종목 리스트 (CSV 기반 + 네이버 갱신)
├── keyword_worker.py      # 데스크탑 워커 (크롤링 → 감성분석 → 키워드 → 임베딩 → 클러스터링 → 에이전트 데이터)
├── scheduler.py           # EC2 자동 스케줄러 (크롤링 → 필터링 → DB 적재 → 신호 전송)
├── pipeline.py            # 백필 파이프라인 오케스트레이터
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
│   ├── naver_finance.py   # 네이버 금융 파싱 유틸 (목록/본문 추출, Referer 헤더 포함)
│   └── checkpoint.py      # 체크포인트 관리 (백필 중단/재개)
│
├── processors/            # 후처리 모듈
│   ├── sentiment_analyzer.py  # 감성분석 (FinBERT 단독, snunlp/KR-FinBert-SC)
│   ├── keyword_batch.py       # 키워드 추출 (vLLM/Gemini/Claude/KeyBERT)
│   ├── embed_keywords.py      # 키워드 임베딩 (e5-small, 싱글턴 모델 로딩)
│   ├── cluster_keywords.py    # K-means 클러스터링 + 증분 배정
│   ├── clean_articles.py      # 기사 중복 제거 + 광고/노이즈 필터링
│   └── nlp_processor.py       # NLP 백엔드 (vLLM/Claude/Gemini/KeyBERT)
│
├── loaders/               # DB 적재 모듈
│   ├── csv_loader.py      # CSV → DB 벌크 적재 (네이버/SSAFY 형식 자동 감지)
│   └── backfill_loader.py # GPU 백필 CSV → DB 적재 (키워드+감성 포함)
│
├── scripts/               # 유틸리티 스크립트
│   └── fix_null_published_at.py  # published_at NULL 배치 복구
│
├── utils/                 # 공통 유틸리티
│   ├── date_parser.py     # 날짜 파싱 (상대시간 포함)
│   └── url_normalizer.py  # URL 정규화
│
├── tests/                 # 테스트
│   └── test_url_normalizer.py
│
└── gpu/                   # GPU 서버용 노트북
    └── backfill_keywords.ipynb  # 키워드 추출 + 감성분석 (vLLM + FinBERT)
```

## 데스크탑 워커 (keyword_worker.py)

네이버 금융이 EC2 IP를 차단하므로, **데스크탑(국내 주거 IP)**에서 크롤링부터 에이전트 데이터 생성까지 전체 파이프라인을 실행합니다.

### 전체 흐름

```
데스크탑 (keyword_worker.py)
──────────────────────────────
[크롤링 스레드 — 백그라운드]
  0. 네이버 금융 뉴스탭 크롤링 → DB 적재

[메인 — 5분 간격 폴링]
  미처리 뉴스 감지 시 반복 실행:
    1. 감성 분석 (FinBERT)
    2. 키워드 추출 (vLLM Qwen2.5-7B-AWQ)
    3. 키워드 임베딩 (e5-small)
    4. 증분 클러스터 배정 (K-means)
    5. published_at NULL 복구

  크롤링 완료 + 미처리 0건 후 최종 1회:
    6. 종목별 뉴스 에이전트 데이터 생성 (DB 저장)

[주간]
  토요일 20시: 전체 재클러스터링
```

- 크롤링은 백그라운드 스레드에서 진행, 메인에서 키워드 파이프라인 병렬 실행
- 크롤링 완료 후 미처리 뉴스 건수가 3회 연속 동일하면 처리 불가 항목으로 판단하고 루프 탈출
- 에이전트 데이터 생성은 DB만 저장 (Redis 미사용)

### 사전 준비 (WSL2 Ubuntu)

vLLM은 Linux 전용이므로 WSL2에서 실행합니다.

```bash
# 가상환경 생성 (최초 1회)
cd /mnt/c/Users/{username}/Documents/repos/sallaemallae/dev-ai/services/ai/1_data_pipeline/news
python3 -m venv .venv-wsl
source .venv-wsl/bin/activate
pip install vllm sqlalchemy psycopg2-binary python-dotenv aiohttp numpy torch transformers pgvector scikit-learn
```

### 실행 (Ubuntu 터미널 3개)

```bash
# 터미널 1: SSH 터널 (EC2 DB 접근)
ssh -L 5432:localhost:5432 ubuntu@{EC2_HOST} -i ~/.ssh/{KEY}.pem -N

# 터미널 2: vLLM 서버 (Qwen2.5-7B-AWQ, GPU)
cd /mnt/c/Users/{username}/Documents/repos/sallaemallae/dev-ai/services/ai/1_data_pipeline/news
source .venv-wsl/bin/activate
vllm serve Qwen/Qwen2.5-7B-Instruct-AWQ \
  --host 0.0.0.0 --port 8000 --max-model-len 2048 \
  --gpu-memory-utilization 0.85 --enforce-eager \
  --quantization awq --cpu-offload-gb 2

# 터미널 3: 워커 실행
cd /mnt/c/Users/{username}/Documents/repos/sallaemallae/dev-ai/services/ai/1_data_pipeline/news
source .venv-wsl/bin/activate

# 매일 자동 실행 (기본 16:00 시작, 평일만)
python3 keyword_worker.py

# 시작 시각 변경
python3 keyword_worker.py --start-at 18:00

# 즉시 1회 실행 (크롤링 + 전체 파이프라인)
python3 keyword_worker.py --run-now

# 크롤링 없이 키워드 파이프라인만
python3 keyword_worker.py --run-now --skip-crawl

# 특정 날짜 범위 크롤링
python3 keyword_worker.py --run-now --start-date 2026-03-18 --end-date 2026-03-20
```

### 모델 선택 경위

| 시도 | 모델 | 결과 |
|------|------|------|
| 1차 | Qwen2.5-7B-Instruct (FP16) | RTX 5060 8GB VRAM 부족 — 모델 ~14GB, 로딩 불가 |
| 2차 | 동일 모델 + `--gpu-memory-utilization 0.8` | 모델 로딩 성공하나 KV 캐시 메모리 0으로 추론 불가 |
| 3차 | Qwen2.5-7B-Instruct-AWQ (gpu-mem 0.7) | 모델 로딩 성공하나 KV 캐시 메모리 부족 |
| 4차 | Qwen2.5-3B-Instruct (FP16) | 로딩 성공, 추론 가능하나 키워드 품질 부족 |
| **최종** | **Qwen2.5-7B-Instruct-AWQ + cpu-offload** | 가중치 일부를 CPU RAM으로 오프로드, 8GB VRAM에서 안정 실행 |

- AWQ 4bit 양자화는 모델 크기를 ~1/3로 줄임
- `--cpu-offload-gb 2`로 가중치 2GB를 CPU RAM으로 오프로드하여 GPU KV 캐시 공간 확보
- `--gpu-memory-utilization 0.85`로 설정하여 디스플레이 출력(~700MB)과 공존
- vLLM은 Linux 전용이라 WSL2 Ubuntu 22.04에서 실행
- 3B 모델은 키워드 품질이 부족하여 7B-AWQ로 최종 결정

### 감성 분석

FinBERT 단독 모드로 동작합니다 (Gemini 비사용).

- 모델: `snunlp/KR-FinBert-SC` (한국어 금융 감성 분류)
- 3-class: POSITIVE / NEUTRAL / NEGATIVE
- `sentiment_label`이 NULL인 뉴스를 자동으로 감지하여 처리
- 100건 단위 배치 처리

### 임베딩 모델

- 모델: `intfloat/multilingual-e5-small` (384차원)
- CPU에서 실행 (33M 파라미터, GPU 불필요)
- 싱글턴 패턴 — 프로세스 내 1회만 로딩, 파이프라인 반복 시 재사용

## 크롤링

### 1. 일일 크롤러 (Daily)

네이버 **금융**(`finance.naver.com`)의 종목별 뉴스 탭에서 최신 뉴스를 수집합니다.
`Referer: https://finance.naver.com/` 헤더가 필수입니다 (없으면 빈 결과 반환).

```bash
# 전 종목 최신 뉴스 수집 → DB 적재
python -m crawlers.daily

# 기간 필터링
python -m crawlers.daily --start-date 2026-03-01 --end-date 2026-03-12

# 특정 종목만
python -m crawlers.daily --codes 005930 000660

# 페이지 수 조절 (기본: 10)
python -m crawlers.daily --max-pages 20

# DB 적재 없이 CSV만 저장
python -m crawlers.daily --csv-only
```

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
```

### 일일 vs 백필 비교

| 항목 | 일일 (daily) | 백필 (backfill) |
|------|-------------|-----------------|
| 데이터 소스 | 네이버 금융 뉴스탭 | 네이버 검색 |
| 용도 | 최근 뉴스 수집, 워커에서 자동 실행 | 과거 대량 수집 (기간 지정) |
| 기간 지정 | `--start-date`, `--end-date` (필터) | `--start-date` (필수), `--end-date` |
| 중단 재개 | 없음 | 체크포인트 기반 |
| 저장 방식 | DB 직접 적재 or CSV | CSV (이후 backfill_loader로 DB 적재) |
| 본문 수집 | 금융 뉴스 → 리다이렉트 추적 | n.news.naver.com 직접 |

## CSV → DB 적재

### csv_loader (일반 CSV)

```bash
# 폴더 단위 적재
python -m loaders.csv_loader data/news_2024/

# SSAFY 데이터 형식 (파이프 구분자)
python -m loaders.csv_loader --ssafy data/ssafy_dataset_news_2024.csv

# 이어서 적재 (체크포인트 기반)
python -m loaders.csv_loader data/news_2024/ --resume
```

### backfill_loader (키워드+감성 포함 CSV)

GPU 서버에서 처리 완료된 백필 CSV를 DB에 적재합니다.
뉴스 + 종목매핑 + 감성점수 + 키워드 + 키워드매핑을 한번에 적재합니다.

```bash
# 폴더 단위 적재
python -m loaders.backfill_loader output/backfill_processed/

# 이어서 적재 (체크포인트 기반)
python -m loaders.backfill_loader output/backfill_processed/ --resume
```

## 에이전트 데이터 생성 (agent_data_builder)

종목별 뉴스 에이전트 데이터를 집계하여 `news_agent_stock_data` 테이블에 저장합니다.
워커 파이프라인에서 최종 1회 자동 실행되며, CLI로 수동 실행도 가능합니다.

```bash
# 3_ai_server 디렉토리에서 실행
cd services/ai/3_ai_server

# 오늘 날짜 (단일 실행)
python -m domains.news.agent_data_builder

# 특정 날짜
python -m domains.news.agent_data_builder --date 2026-03-19

# 과거 날짜 범위 배치
python -m domains.news.agent_data_builder --start 2025-06-01 --end 2026-03-20 --save-db

# 특정 종목만 (ticker 코드)
python -m domains.news.agent_data_builder --start 2025-06-01 --end 2026-03-20 --save-db \
  --tickers 005930 000660

# 파일 내보내기
python -m domains.news.agent_data_builder --start 2025-01-01 --end 2026-03-19 \
  --export ./output/agent_data
```

## 후처리 (개별 실행)

### 감성 분석

```bash
# FinBERT로 sentiment_label NULL인 뉴스 자동 처리
python -m processors.sentiment_analyzer
```

### 키워드 추출

```bash
# vLLM 백엔드 (로컬 GPU, Qwen2.5-7B-AWQ)
python -m processors.keyword_batch --backend vllm

# 최근 7일 기사만
python -m processors.keyword_batch --backend vllm --days 7
```

### 키워드 임베딩

```bash
# 미임베딩 키워드 전체 처리 (e5-small)
python -m processors.embed_keywords
```

### 클러스터링

```bash
# 전체 재클러스터링 (K-means)
python -m processors.cluster_keywords --reset

# 증분 배정만 (새 키워드를 기존 클러스터에 배정)
python -m processors.cluster_keywords --assign-only
```

### published_at NULL 복구

```bash
python -m scripts.fix_null_published_at
```

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `AI_DB_URL` | PostgreSQL 연결 URL | `postgresql+psycopg2://app_dev_user:change_me_dev@localhost:5432/app_dev` |
| `GEMINI_API_KEY` | Gemini API 키 (키워드 추출) | - |
| `ANTHROPIC_API_KEY` | Claude API 키 (키워드 추출, 대안) | - |
| `GMS_API_URL` | GMS 프록시 URL (SSAFY Gemini) | `https://gms.ssafy.io/...` |
| `GMS_API_KEY` | GMS API 키 | - |

## DB 테이블

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
  ├── id, name (unique, max 20자), cluster_id
  │
news_keyword_map (N:M)
  ├── news_id, keyword_id
  │
keyword_embeddings
  ├── keyword_id, embedding (vector 384)
  │
keyword_clusters
  ├── id, name
  │
news_agent_stock_data
  ├── stock_id, report_date, top_keywords (jsonb), sentiment (jsonb)
  │
pipeline_signals
  └── id, signal_type, status, retry_count, created_at, processed_at
```
