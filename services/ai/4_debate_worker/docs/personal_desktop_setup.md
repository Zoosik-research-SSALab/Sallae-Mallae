# 개인 데스크탑 세팅 가이드

## 목적

개인 데스크탑에서 로컬 LLM 기반 토론 워커를 실행해 EC2 AI 서버와 연동합니다.

구조:
- 개인 데스크탑: `4_debate_worker`
- EC2: `3_ai_server`
- DB: EC2 PostgreSQL

토론 워커는 EC2 FastAPI를 호출하고, 일일 자동화 오케스트레이터는 `pipeline_signals` 조회와
포트폴리오 일일 반영을 위해 EC2 PostgreSQL에도 직접 접근합니다.

## 권장 환경

- OS
  - Windows 11 또는 Ubuntu 22.04 이상
- GPU
  - RTX 3070 이상 권장
  - VRAM 여유가 부족하면 7B 양자화 모델 사용
- Python
  - 3.11 이상 권장

## 1. 기본 설치

### 공통

```bash
git clone <dev-ai-repo-url>
cd dev-ai/services/ai/4_debate_worker
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
pip install -r requirements.txt
```

Linux/macOS:

```bash
source .venv/bin/activate
pip install -r requirements.txt
```

## 2. 로컬 LLM 설치

초기 권장안은 Ollama입니다.

### Ollama 설치

- Windows: 공식 설치 파일 사용
- Linux:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 모델 다운로드 예시

```bash
ollama pull qwen2.5:7b-instruct
```

모델명은 팀에서 합의한 7B 모델로 바꿔도 됩니다.

## 3. 환경 변수 설정

`.env.example`을 복사해 `.env`를 만듭니다.

```bash
cp .env.example .env
```

필수 항목:

```env
AI_SERVER_BASE_URL=https://<ec2-domain>
INTERNAL_API_KEY=<ec2-ai-server-internal-key>
AI_SERVER_TIMEOUT_SECONDS=30
AI_DB_URL=postgresql+psycopg2://app_user:<password>@<host>:5432/app
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434
LLM_MODEL=qwen2.5:7b-instruct
WORKER_NAME=desktop-seoul-01
TARGET_SOURCE=trading_history
TARGET_PORTFOLIO_ID=1
PORTFOLIO_SCRIPT_PATH=../3_ai_server/scripts/chairman_portfolio_daily.py
PORTFOLIO_NAME=의장 포트폴리오
PORTFOLIO_MODEL_VERSION=chairman-v1
```

## 4. 워커 실행

한 번만 실행:

```bash
python main.py --once --report-date 2026-03-16 --source trading_history --portfolio-id 1
```

계속 실행:

```bash
python main.py
```

기본값은 continuous 모드입니다.
- 주기적으로 대상 조회
- 체크포인트 확인
- 미완료/실패 재시도

## 4-1. 뉴스 → 토론 → 포트폴리오 자동화 실행

지금 기준 일일 자동화는 아래 순서로 동작합니다.

- `pipeline_signals`에서 당일 `NEWS_PIPELINE_DONE(status=DONE)` 확인
- 포트폴리오 마지막 반영일 다음날부터 목표 날짜까지 토론 워커 순차 실행
- 성공 시 `DEBATE_PIPELINE_DONE(status=DONE)` 기록
- 포트폴리오 일일 반영 스크립트가 누락 날짜 포함 순차 반영
- 성공 시 `PORTFOLIO_PIPELINE_DONE(status=DONE)` 기록

계속 실행:

```bash
python daily_main.py
```

한 번만 점검:

```bash
python daily_main.py --once --report-date 2026-03-24
```

주의:
- `daily_main.py`는 `AI_DB_URL`이 반드시 필요합니다.
- 포트폴리오 반영은 `../3_ai_server/scripts/chairman_portfolio_daily.py`를 호출하므로,
  개인 PC에도 `dev-ai/services/ai/3_ai_server` 디렉토리가 함께 있어야 합니다.

## 5. 개인 데스크탑 자동 실행 권장

### Windows

- 작업 스케줄러에 아래 명령 등록

```bash
cmd /c "cd C:\path\to\dev-ai\services\ai\4_debate_worker && .venv\Scripts\python.exe main.py"
```

### Linux

- `systemd` 또는 `cron` 사용
- 장기 실행은 `systemd` 권장

예시:

```ini
[Unit]
Description=Debate Worker
After=network-online.target

[Service]
WorkingDirectory=/home/user/dev-ai/services/ai/4_debate_worker
ExecStart=/home/user/dev-ai/services/ai/4_debate_worker/.venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## 6. 체크포인트 파일

워커는 아래 파일에 진행 상태를 저장합니다.

- `state/worker_checkpoints.sqlite3`

저장 내용:
- 실행 기준일
- 배치 대상 종목
- 성공/중복/실패 상태
- 재시도 횟수
- 마지막 에러
- 결과 payload 캐시

## 7. 복구 방식

PC가 꺼지거나 워커가 죽어도 재실행 시 아래 순서로 복구됩니다.

- 기존 run key 확인
- 완료된 종목은 건너뜀
- `result_ready` 상태는 재추론 없이 결과 POST만 재시도
- `failed_retryable`은 backoff 후 자동 재시도
- lease 만료된 `running` 작업은 다시 집어서 이어서 처리

## 8. 초기 운영 권장값

- `TARGET_SOURCE=trading_history`
- `MAX_DEBATE_ROUNDS=3`
- `NEWS_LIMIT=8`
- `FINANCIAL_LIMIT=4`
- `LOOP_INTERVAL_SECONDS=300`

초기에는 모의투자에 실제 사용된 종목만 대상으로 돌리는 것이 가장 효율적입니다.
