# GPU 서버 백필 운영 가이드

## 목적

GPU 서버 Jupyter 환경에서 2025-01-01부터 원하는 종료일까지 토론 백필을 실행합니다.

구조:
- GPU 서버: `4_debate_worker`
- LLM: GPU 서버의 vLLM 또는 OpenAI 호환 엔드포인트
- API/DB: EC2 `3_ai_server`

워커는 DB에 직접 붙지 않고 EC2 API만 호출합니다.

## 핵심 보장

- 날짜별 체크포인트 저장
- 중단 후 같은 기간 재실행 시 이어서 진행
- 결과 payload 캐시가 있으면 LLM 재호출 없이 재저장부터 재개
- 재시도 가능한 오류 자동 재시도
- 실패 종목 수동 복구용 requeue 지원
- RAM/GPU 여유 자원 확인 후 작업 시작
- stdout + 파일 로그 동시 기록

## 권장 LLM

- 기본 권장: `Qwen/Qwen2.5-7B-Instruct`
- provider: `openai_compatible`
- base_url 예시: `http://127.0.0.1:8000`

예시:

```bash
vllm serve Qwen/Qwen2.5-7B-Instruct \
  --dtype auto \
  --max-model-len 4096 \
  --gpu-memory-utilization 0.6 \
  --disable-log-requests
```

GPU 여유가 적으면 `--gpu-memory-utilization 0.45 ~ 0.55`로 낮춥니다.

## 환경 변수

`.env` 예시:

```env
AI_SERVER_BASE_URL=https://<ec2-domain>
INTERNAL_API_KEY=<internal-api-key>

LLM_PROVIDER=openai_compatible
LLM_BASE_URL=http://127.0.0.1:8000
LLM_MODEL=Qwen/Qwen2.5-7B-Instruct
LLM_REQUEST_TIMEOUT_SECONDS=180
LLM_TEMPERATURE=0.2

WORKER_NAME=gpu-backfill-01
STATE_DIR=./state

TARGET_SOURCE=ml_reports
TARGET_MARKET_TYPE=KOSPI
TARGET_PORTFOLIO_ID=

RESOURCE_MIN_RAM_AVAILABLE_MB=4096
RESOURCE_MIN_RAM_AVAILABLE_RATIO=0.10
RESOURCE_MIN_GPU_FREE_MB=1024
BACKFILL_POLL_INTERVAL_SECONDS=60
RESOURCE_POLL_INTERVAL_SECONDS=15
```

## 실행 방법

### 1. CLI

```bash
python3 backfill_main.py run \
  --start-date 2025-01-01 \
  --end-date 2026-03-18 \
  --source ml_reports
```

진행 현황 조회:

```bash
python3 backfill_main.py report \
  --start-date 2025-01-01 \
  --end-date 2026-03-18 \
  --source ml_reports
```

특정 날짜 실패 재큐잉:

```bash
python3 backfill_main.py repair \
  --report-date 2025-02-03 \
  --source ml_reports \
  --statuses failed_permanent failed_retryable
```

### 2. 주피터 노트북

`notebooks/gpu_debate_backfill.ipynb`를 열어서 순서대로 실행합니다.

제공 셀:
- 런타임 초기화
- RAM/GPU 상태 확인
- 백필 실행
- 날짜별 진행률 표 확인
- 실패 종목 조회
- 실패 종목 재큐잉

## 운영 팁

- 과거 전체 적재는 `source=ml_reports`가 가장 넓게 커버될 가능성이 큽니다.
- 실제 매매 이력이 있는 날짜만 하고 싶으면 `source=trading_history` + `portfolio_id`를 사용합니다.
- 재실행은 같은 기간과 같은 `source/portfolio_id` 조합으로 실행해야 체크포인트를 재사용합니다.
- 로그 파일은 `state/logs/` 아래에 쌓입니다.

## 수동 복구 원칙

- API 저장만 다시 시도하고 싶으면 `clear_result_payload=False`
- LLM 추론부터 새로 다시 하고 싶으면 `clear_result_payload=True`

대부분의 저장 실패는 payload 재사용이 더 빠르고 안전합니다.
