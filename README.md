# Local Infra Runbook

로컬 실행 표준은 **단일 compose 파일**(`infra/docker-compose.yml`) 기준입니다.
기본 실행은 `nginx + spring + postgres + redis`이며, FE/AI는 선택적으로 `fullstack` 프로파일로 올립니다.

## 1) 사전 준비

- Docker Desktop 실행
- WSL integration 활성화
- 프로젝트 루트에서 실행

```bash
cd /home/ssafy/project
```

## 2) 기본 실행 표준 (Jira 19)

### 2-1. 환경 파일 준비

```bash
cp infra/.env.example infra/.env
```

### 2-2. compose 유효성 확인

```bash
cd infra
docker compose --env-file .env -f docker-compose.yml config
```

### 2-3. 기본 스택 기동

```bash
docker compose --env-file .env -f docker-compose.yml up -d --build
```

### 2-4. 상태 확인

```bash
docker compose --env-file .env -f docker-compose.yml ps
```

## 3) 선택 실행: FE/AI 포함 전체 스택

`services/frontend`, `services/ml-server`, `services/ml-worker`가 있는 브랜치에서만 실행하세요.

```bash
cd infra
docker compose --profile fullstack --env-file .env -f docker-compose.yml up -d --build
```

또는 `.env`에 `COMPOSE_PROFILES=fullstack`을 넣고 기본 명령으로 실행할 수 있습니다.

## 4) Health Check 확인

프로젝트 루트에서 실행:

```bash
curl -i http://localhost/api/health
bash scripts/smoke.sh
```

예상 결과:
- HTTP `200`
- 본문에 `{"status":"OK"...}` 포함

## 5) PostgreSQL 논리 분리 사용 (`app_dev` / `app_prod`)

초기 기동 시 자동 생성:
- DB: `app_dev`, `app_prod`
- 계정: `app_dev_user`, `app_prod_user`

### 5-1. 기본(dev) 설정

```env
SPRING_PROFILE=dev
APP_DB_NAME=app_dev
APP_DB_USER=app_dev_user
APP_DB_PASSWORD=change_me_dev
```

### 5-2. prod DB로 전환

`.env` 수정 후 재기동:

```env
SPRING_PROFILE=prod
APP_DB_NAME=app_prod
APP_DB_USER=app_prod_user
APP_DB_PASSWORD=change_me_prod
```

```bash
cd infra
docker compose --env-file .env -f docker-compose.yml up -d --build
```

### 5-3. 권한 검증

```bash
docker exec -it postgres psql -U app_dev_user -d app_dev -c "select current_database(), current_user;"
docker exec -it postgres psql -U app_prod_user -d app_prod -c "select current_database(), current_user;"
```

교차 접근 차단(실패가 정상):

```bash
docker exec -it postgres psql -U app_dev_user -d app_prod -c "select 1;"
docker exec -it postgres psql -U app_prod_user -d app_dev -c "select 1;"
```

## 6) 중지

```bash
cd infra
docker compose --env-file .env -f docker-compose.yml down
```

## 7) 트러블슈팅 (Jira 22)

### 7-1. 포트 충돌
- 증상: `Bind for 0.0.0.0:80 failed`
- 확인: `ss -lntp | grep ':80'`
- 조치: 점유 프로세스 종료 또는 `.env`에서 `NGINX_PORT` 변경

### 7-2. DB 연결 실패
- 증상: Spring에서 DB 접속 오류
- 확인: `docker compose --env-file .env -f infra/docker-compose.yml ps`에서 `postgres` health 상태
- 조치: `.env`의 `APP_DB_*`와 `DEV_DB_* / PROD_DB_*` 값 일치 여부 확인 후 재기동

### 7-3. Docker 엔진 문제
- 증상: `Cannot connect to the Docker daemon`
- 조치: Docker Desktop 재실행, WSL integration 활성화 확인

### 7-4. 기동 직후 502
- 증상: `curl http://localhost/api/health`가 초반 502
- 원인: 초기 헬스체크 대기 구간
- 조치: `bash scripts/smoke.sh`로 재시도
