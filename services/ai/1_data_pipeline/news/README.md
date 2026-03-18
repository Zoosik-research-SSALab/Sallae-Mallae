# 뉴스 데이터 파이프라인

KOSPI200 종목별 뉴스 수집 → 전처리 → DB 적재 → 키워드 추출 파이프라인.

## 폴더 구조

```
news/
├── config.py              # 공통 설정 (DB, API키, 경로, 크롤링 상수)
├── db.py                  # SQLAlchemy 엔진 / 세션 팩토리
├── models.py              # ORM 모델 (StockNews, StockNewsMap, Keyword, PipelineSignal 등)
├── kospi200.py            # KOSPI200 종목 리스트 (CSV 기반 + 네이버 갱신)
├── scheduler.py           # EC2 자동 스케줄러 (크롤링 → 필터링 → DB 적재 → 신호 전송)
├── keyword_worker.py      # 데스크탑 GPU 워커 (DB 폴링 → 키워드 추출 → 임베딩 → 클러스터링)
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
│   ├── keyword_batch.py   # 키워드 추출 + 임베딩 클러스터링 (vLLM/Gemini/Claude/KeyBERT)
│   ├── embed_keywords.py  # 미임베딩 키워드 → keyword_embeddings (e5-small)
│   ├── cluster_keywords.py # 키워드 임베딩 → K-means 클러스터링
│   ├── nlp_processor.py   # NLP 백엔드 (vLLM/Claude/Gemini/KeyBERT)
│   └── sentiment_analyzer.py # 감성분석 모듈
│
├── loaders/               # DB 적재 모듈
│   ├── csv_loader.py      # CSV → DB 벌크 적재 (네이버/SSAFY 형식 자동 감지)
│   └── backfill_loader.py # GPU 백필 CSV → DB 적재 (키워드+감성 포함)
│
├── gpu/                   # GPU 서버용 노트북
│   └── backfill_keywords.ipynb  # 키워드 추출 + 감성분석 (vLLM + FinBERT)
│
└── pipeline.py            # 백필 파이프라인 오케스트레이터
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

DB에 저장된 뉴스 기사에서 키워드를 추출하고,
임베딩 → 클러스터링으로 정규화한 뒤 `keywords` / `news_keyword_map` 테이블에 저장합니다.

```bash
# vLLM 백엔드 (로컬 GPU, Qwen2.5-7B)
python -m processors.keyword_batch --backend vllm

# Gemini 백엔드 (GMS API)
python -m processors.keyword_batch --backend gemini

# 최근 7일 기사만
python -m processors.keyword_batch --backend vllm --days 7

# 배치 크기/딜레이 조절
python -m processors.keyword_batch --backend vllm --batch-size 50 --delay 1.0
```

## 데스크탑 GPU 워커 (키워드 자동 추출)

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

EC2 스케줄러가 크롤링+DB적재를 완료하면 `pipeline_signals` 테이블에 신호를 남기고,
데스크탑 GPU 워커가 이를 감지하여 키워드 추출 → 임베딩 → 클러스터링을 자동 실행합니다.

### 전체 흐름

```
EC2 (scheduler.py)                    데스크탑 (keyword_worker.py)
──────────────────                    ─────────────────────────────
1. 크롤링 → CSV
2. 필터링
3. DB 적재
4. pipeline_signals에 신호 INSERT
                                      5. 17:30부터 5분 간격 DB 폴링
                                      6. 신호 감지 → vLLM 키워드 추출
                                      7. e5-small 임베딩 생성
                                      8. K-means 클러스터링
                                      9. 신호 DONE 처리 → 다음 날까지 대기
```

### 사전 준비 (WSL2 Ubuntu)

vLLM은 Linux 전용이므로 WSL2에서 실행합니다.

```bash
# 가상환경 생성 (최초 1회)
cd /mnt/c/Users/haaem/Documents/repos/sallaemallae/dev-ai/services/ai/1_data_pipeline/news
python3 -m venv .venv-wsl
source .venv-wsl/bin/activate
pip install vllm sqlalchemy psycopg2-binary python-dotenv aiohttp numpy torch transformers pgvector scikit-learn

# SSH 키 복사 (WSL에서 권한 설정)
cp /mnt/c/Users/haaem/.ssh/J14D208T.pem ~/.ssh/J14D208T.pem
chmod 600 ~/.ssh/J14D208T.pem
```

### 실행 (Ubuntu 터미널 3개)

```bash
# 터미널 1: SSH 터널 (EC2 DB 접근)
ssh -L 5432:localhost:5432 ubuntu@j14d208.p.ssafy.io -i ~/.ssh/J14D208T.pem -N

# 터미널 2: vLLM 서버 (Qwen2.5-7B-AWQ, GPU)
# ※ RTX 5060 8GB VRAM에서 FP16 7B 모델 로딩 불가 → AWQ 4bit 양자화로 전환
cd /mnt/c/Users/haaem/Documents/repos/sallaemallae/dev-ai/services/ai/1_data_pipeline/news
source .venv-wsl/bin/activate
vllm serve Qwen/Qwen2.5-7B-Instruct-AWQ --host 0.0.0.0 --port 8000 --max-model-len 2048 --gpu-memory-utilization 0.85 --enforce-eager --quantization awq --cpu-offload-gb 2

# 터미널 3: 키워드 워커 (자동 모드)
cd /mnt/c/Users/haaem/Documents/repos/sallaemallae/dev-ai/services/ai/1_data_pipeline/news
source .venv-wsl/bin/activate
python3 keyword_worker.py
```

### 수동 실행

```bash
# 신호 무시, 즉시 1회 실행 (최근 2일 미처리 뉴스)
python3 keyword_worker.py --run-now

# 감시 시작 시각/폴링 간격 변경
python3 keyword_worker.py --watch-from 16:00 --interval 120
```

### 복구/재시도

- 워커 재시작 시 `PROCESSING` 상태로 남은 신호를 자동 복구 (→ `PENDING`)
- 실패 시 5분 후 자동 재시도 (최대 5회)
- 키워드 추출 자체는 미처리 뉴스만 조회하므로, 중간에 끊겨도 다음 실행 시 이어서 처리

### DB 테이블

```
pipeline_signals
  ├── id, signal_type, status, retry_count, created_at, processed_at
  └── status: PENDING → PROCESSING → DONE / FAILED
```

## GPU 백필 파이프라인

외부 GPU 서버에서 키워드 추출 + 감성분석을 처리하고, EC2에서 DB에 적재하는 흐름입니다.

### 전체 흐름

```
GPU 서버 (JupyterHub)              EC2 (news-scheduler 컨테이너)
─────────────────────              ─────────────────────────────
1. zip 업로드 → 해제
2. vLLM 서버 실행
3. backfill_keywords.ipynb 실행
   → 키워드 추출 (Qwen2.5-7B)
   → 감성분석 (FinBERT + LLM)
   → 하드 샘플 추출
4. 결과 CSV zip 다운로드
                                   5. zip 업로드 → 컨테이너에 복사
                                   6. pipeline.py all 실행
                                      → DB 적재 (뉴스+감성+키워드)
                                      → 키워드 임베딩 생성 (e5-small)
```

### GPU 서버 (키워드 추출 + 감성분석)

```bash
# vLLM 서버 실행 (별도 터미널)
vllm serve Qwen/Qwen2.5-7B-Instruct \
  --dtype auto --max-model-len 4096 \
  --gpu-memory-utilization 0.5 --disable-log-requests

# JupyterHub에서 gpu/backfill_keywords.ipynb 실행
# 입력:  data/news_backfill/{연도}/{종목코드}_{종목명}.csv
# 출력:  output/backfill_processed/{연도}/{종목코드}_{종목명}.csv
# 하드샘플: output/hard_samples/hard_samples_YYYYMMDD.jsonl
```

**입력 CSV 컬럼**: `title, article_url, source, date, code, name, body, full_body`

**출력 CSV 추가 컬럼**: `keywords, sentiment_score, sentiment_label, llm_label, llm_score, finbert_label, finbert_score, is_hard_sample`

### EC2 DB 적재

```bash
# 1. PC에서 EC2로 결과 zip 전송
scp backfill_processed.zip ubuntu@EC2_IP:~/

# 2. EC2에서 컨테이너에 복사
unzip backfill_processed.zip -d ~/backfill_data
docker cp ~/backfill_data/. news-scheduler:/app/output/backfill_processed/

# 3. DB 적재 + 키워드 임베딩 생성
docker exec -it news-scheduler python pipeline.py all \
  --data-dir output/backfill_processed/ --resume
```

### pipeline.py 서브커맨드

| 커맨드 | 설명 |
|--------|------|
| `backfill --data-dir PATH` | CSV → DB 적재만 (stock_news, stock_news_map, keywords, news_keyword_map) |
| `embed` | 미임베딩 키워드 → keyword_embeddings 생성 (e5-small 384차원) |
| `all --data-dir PATH` | 적재 + 임베딩 한번에 실행 |

모든 커맨드에 `--resume` 추가 시 체크포인트 기반 이어서 적재 가능.

### 하드 샘플 (파인튜닝용)

GPU 노트북에서 FinBERT vs LLM 감성 불일치 기사를 자동 추출합니다.
- **라벨 불일치**: finbert_label ≠ llm_label
- **저신뢰**: finbert_score 또는 llm_score < 0.7
- 출력: `output/hard_samples/hard_samples_YYYYMMDD.jsonl`

## 환경 변수

| 변수 | 설명 | 기본값 |
|------|------|--------|
| `AI_DB_URL` | PostgreSQL 연결 URL | `postgresql+psycopg2://app_dev_user:change_me_dev@localhost:5432/app_dev` |
| `GEMINI_API_KEY` | Gemini API 키 (키워드 추출) | - |
| `ANTHROPIC_API_KEY` | Claude API 키 (키워드 추출, 대안) | - |
| `GDRIVE_NEWS_FOLDER_ID` | Google Drive 뉴스 폴더 ID | - |
| `GMS_API_URL` | GMS 프록시 URL (SSAFY Gemini) | `https://gms.ssafy.io/...` |
| `GMS_API_KEY` | GMS API 키 | - |

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
pipeline_signals
  └── id, signal_type, status, retry_count, created_at, processed_at
```

## Docker 실행

Docker로 독립 컨테이너에서 실행할 수 있습니다.

### 초기 설정

```bash
cd 1_data_pipeline/news/
cp base.env.example base.env    # DB URL, API 키 입력
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

### A. 백필 (과거 데이터 일괄 적재)

```
1. [GPU] 뉴스 CSV를 Google Drive에서 다운로드
2. [GPU] backfill_keywords.ipynb 실행 (키워드 + 감성분석)
3. [GPU] 결과 CSV zip 다운로드
4. [EC2] zip 업로드 → news-scheduler 컨테이너에 복사
5. [EC2] python pipeline.py all --data-dir output/backfill_processed/ --resume
```

### B. 일일 (매일 신규 기사)

```
[EC2 — scheduler.py 자동 실행]
1. 일일 크롤링    →  crawlers.daily --csv-only
2. 기사 정제      →  processors.clean_articles
3. CSV → DB 적재  →  loaders.csv_loader
4. 신호 전송      →  pipeline_signals에 NEWS_CRAWL_DONE INSERT

[데스크탑 — keyword_worker.py 자동 실행]
5. 신호 감지      →  17:30부터 5분 간격 DB 폴링
6. 키워드 추출    →  vLLM (Qwen2.5-7B-AWQ) + 최근 2일 미처리 뉴스
7. 임베딩 생성    →  e5-small (384차원)
8. 클러스터링     →  K-means
```

EC2 스케줄러:
```bash
docker exec -d news-scheduler python scheduler.py --time 16:30
```

데스크탑 워커 (WSL2 Ubuntu):
```bash
python3 keyword_worker.py
```
