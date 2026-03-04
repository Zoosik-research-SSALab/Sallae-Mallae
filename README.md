# Infra + Services Boilerplate (Single Stack)

이 프로젝트는 EC2/로컬에서 **서비스는 1세트만 실행**하고, PostgreSQL 1인스턴스 내부에서
`app_dev` / `app_prod`를 분리해 사용하는 구조입니다.

## 1) 실행 방법

```bash
cd infra
cp .env.example .env
docker compose --env-file .env -f docker-compose.yml up -d --build
```

상태 확인:

```bash
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

## 2) Health Check 확인

```bash
curl -i http://localhost/api/health
bash scripts/smoke.sh
```

예상 결과:
- HTTP 200
- 응답 본문에 `{"status":"OK"...}` 포함

## 3) DB 분리 사용 방법 (핵심)

초기 기동 시 PostgreSQL 내부에 아래가 자동 생성됩니다.
- DB: `app_dev`, `app_prod`
- 계정: `app_dev_user`, `app_prod_user`

기본 실행은 dev DB를 사용합니다.

```env
SPRING_PROFILE=dev
APP_DB_NAME=app_dev
APP_DB_USER=app_dev_user
APP_DB_PASSWORD=change_me_dev
```

prod DB로 전환하려면 `.env`에서 아래만 변경 후 재기동:

```env
SPRING_PROFILE=prod
APP_DB_NAME=app_prod
APP_DB_USER=app_prod_user
APP_DB_PASSWORD=change_me_prod
```

적용:

```bash
cd infra
docker compose --env-file .env -f docker-compose.yml up -d --build
```

## 4) DB 분리 검증 명령

dev 계정으로 dev DB 접속:

```bash
docker exec -it postgres psql -U app_dev_user -d app_dev -c "select current_database(), current_user;"
```

prod 계정으로 prod DB 접속:

```bash
docker exec -it postgres psql -U app_prod_user -d app_prod -c "select current_database(), current_user;"
```

교차 접근 차단 검증 (실패가 정상):

```bash
docker exec -it postgres psql -U app_dev_user -d app_prod -c "select 1;"
docker exec -it postgres psql -U app_prod_user -d app_dev -c "select 1;"
```

## 5) 중지

```bash
cd infra
docker compose --env-file .env -f docker-compose.yml down
```

## 6) 흔한 에러

### 포트 충돌
- 증상: `Bind for 0.0.0.0:80 failed`
- 해결: 포트 점유 확인 `ss -lntp | grep ':80'`

### Docker 엔진 문제
- 증상: `Cannot connect to the Docker daemon`
- 해결: Docker Desktop 실행 + WSL integration 활성화

### 초기 기동 지연/502
- 해결: `bash scripts/smoke.sh`로 재시도 확인

