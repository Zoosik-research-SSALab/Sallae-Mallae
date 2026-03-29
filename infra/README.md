# Infra Runbook

## Scope

이 문서는 다음 범위를 다룹니다.

- 로컬 Docker/Compose 실행 표준
- EC2 공통 base 스택(`postgres`, `redis`, `minio`) 수동 배포
- GitLab Runner 기반 자동 배포 구조
- 브랜치별 env/secret 관리 방식
- 로컬 개발 시 FE/BE/AI 실행 모드

프로젝트 개요, 팀 협업 방식, 브랜치/리뷰 규칙은 루트 [README.md](/home/ssafy/project-infra/README.md)를 기준으로 확인합니다.

## Infra Layout

```text
infra/
  base/      # shared postgres + redis
  apps/      # frontend/backend/ai/full app stacks
  gateway/   # public gateway nginx compose
  monitoring/# prometheus + grafana + exporters
  env/       # branch-specific env examples
  nginx/     # routing configs per deployment target
  scripts/   # standard deploy commands for EC2 runner/jobs
```

로컬 실행 표준은 **단일 compose 파일**(`infra/docker-compose.yml`) 기준입니다.  
기본 실행은 `nginx + spring + postgres + redis`이며, FE/AI는 선택적으로 `fullstack` 프로파일로 올립니다.

EC2 배포용 AI 경로는 `services/ai/3_ai_server`와 `services/ai/1_data_pipeline/stock` 기준입니다.

## GitLab CI/CD

브랜치별 자동 배포는 `.gitlab-ci.yml` 과 `infra/scripts/write-env-files.sh` 기준입니다.

- `dev-frontend` : frontend 스택 자동 배포
- `dev-backend` : backend 스택 자동 배포
- `dev-ai` : ai 스택 자동 배포
- `develop` : full 스택 자동 배포
- `master` : 자동 배포 제외

공통 인프라 성격의 base/monitoring 스택은 `infra-common` 브랜치에서 수동 job으로 배포합니다.

내부 앱 포트는 아래처럼 유지합니다.

- `dev-frontend` : `8081`
- `dev-backend` : `8082`
- `dev-ai` : `8083`
- `develop` : `8084`
- `master` : `8085` (수동 운영 슬롯)

외부 공개 포트는 장기적으로 gateway nginx의 `80/443`만 사용하도록 구성합니다.

실제 비밀번호는 레포에 두지 않고 GitLab CI/CD Variables에서 주입합니다.

CI job은 GitLab Runner가 checkout한 현재 작업 디렉토리를 `/srv/sallaemallae/source/<target>`로 동기화한 뒤, 그 경로를 기준으로 compose를 실행합니다.

- EC2에 별도 `git clone`을 유지할 필요가 없습니다.
- 각 배포 타깃은 서로 다른 source 디렉토리를 사용하므로 브랜치별 배포가 서로의 bind mount를 덮어쓰지 않습니다.

## Gateway Nginx

gateway nginx는 외부에서 들어온 요청을 최신 파트별 dev 배포로 분기하는 공용 진입점입니다.

- `j14d208.p.ssafy.io` + `/` -> `127.0.0.1:8081` (`dev-frontend`)
- `j14d208.p.ssafy.io` + `/api/` -> `127.0.0.1:8082` (`dev-backend`)
- `j14d208.p.ssafy.io` + `/ai/` -> `127.0.0.1:8083` (`dev-ai`)
- `j14d208.p.ssafy.io` + `/assets/` -> `127.0.0.1:9000/assets/` (`minio`)

`develop`(`8084`)과 `master` 수동 운영 슬롯(`8085`)은 외부에 별도 도메인을 두지 않고 내부 전환 대상으로만 유지합니다. 통합 검증 시점에는 gateway의 `ROOT_WEB_TARGET`, `ROOT_API_TARGET`, `ROOT_AI_TARGET` 값을 `develop` 쪽으로 바꿔 같은 도메인에서 확인합니다.

구성 파일:

- compose: `infra/gateway/docker-compose.gateway.yml`
- env example: `infra/env/gateway.env.example`
- nginx template: `infra/nginx/nginx.gateway.conf.template`
- https template: `infra/nginx/nginx.gateway.https.conf.template`

초기 적용은 수동으로 진행합니다.

1. `cp infra/env/gateway.env.example /srv/sallaemallae/env/gateway.env`
2. 필요하면 `ROOT_WEB_TARGET`, `ROOT_API_TARGET`, `ROOT_AI_TARGET`, `ROOT_ASSETS_TARGET`, `ROOT_ASSETS_BUCKET`을 현재 운영 대상에 맞게 수정
3. `bash infra/scripts/deploy-gateway.sh`

gateway를 쓰기 시작하면 EC2 보안그룹/UFW는 외부 기준으로 `80/443`만 열고, `8081~8085`, `9000`, `9001`은 외부에서 닫는 방향이 맞습니다.
나중에 `develop` 검증이 필요하면 gateway env에서 `ROOT_WEB_TARGET`, `ROOT_API_TARGET`, `ROOT_AI_TARGET`을 `develop` 대상에 맞게 바꿔 같은 도메인에서 확인합니다. 최종 운영도 같은 방식으로 전환할 수 있습니다.

## MinIO

MinIO는 공용 `base` 스택의 오브젝트 스토리지입니다.

- API: `127.0.0.1:9000`
- Console: `127.0.0.1:9001`
- public bucket 기본값: `assets`
- private bucket 기본값: `private`

운영 원칙:

- 앱 컨테이너는 내부 네트워크에서 `http://minio:9000`으로 접근
- 외부 공개는 MinIO 포트를 직접 열지 않고 gateway의 `/assets/` 경로만 사용
- `assets` 버킷은 공개 읽기, `private` 버킷은 비공개 유지

기본 생성 base env 값:

- `MINIO_ROOT_USER=minioadmin`
- `MINIO_ROOT_PASSWORD=${APP_DB_PASSWORD}`
- `MINIO_PUBLIC_BUCKET=assets`
- `MINIO_PRIVATE_BUCKET=private`

MinIO 비밀번호를 DB 비밀번호와 분리하고 싶으면 GitLab Variable `ENV_BASE_MINIO_ROOT_PASSWORD`만 추가로 주입하면 됩니다.

base 배포 시 `minio-init` 컨테이너가 public/private 버킷을 자동 생성합니다.

### Gateway HTTPS

gateway HTTPS는 `certbot + Let's Encrypt + webroot` 방식으로 적용합니다.

- 최초 발급 전 gateway는 HTTP 템플릿(`infra/nginx/nginx.gateway.conf.template`)으로 올라갑니다.
- 인증서 발급이 끝나면 gateway env의 템플릿 경로를 HTTPS 템플릿으로 바꾸고, `80 -> 443` 리다이렉트를 활성화합니다.

준비 조건:

- DNS에서 `ROOT_HOST`가 현재 EC2 공인 IP를 가리켜야 함
- EC2 보안그룹에서 `80`, `443` 허용
- EC2에 `certbot` 설치 완료

권장 순서:

1. `cp infra/env/gateway.env.example /srv/sallaemallae/env/gateway.env`
2. `ROOT_HOST`, `ROOT_WEB_TARGET`, `ROOT_API_TARGET`, `ROOT_AI_TARGET`, `ROOT_ASSETS_TARGET`, `ROOT_ASSETS_BUCKET` 수정
3. 필요하면 `CERTBOT_EMAIL` 입력
4. `bash infra/scripts/issue-gateway-cert.sh`

위 스크립트는 아래를 자동으로 수행합니다.

- ACME challenge가 가능한 HTTP gateway 배포
- `certbot certonly --webroot` 실행
- HTTPS 템플릿으로 전환
- `80 -> 443` 리다이렉트가 포함된 gateway 재배포

수동 갱신 테스트:

```bash
bash infra/scripts/renew-gateway-cert.sh
```

자동 갱신은 cron 또는 systemd timer에서 위 스크립트를 호출하면 됩니다.

필수 GitLab Variables:

- `POSTGRES_SUPERPASSWORD`
- `APP_DB_PASSWORD`

선택 GitLab Variables:

- `ENV_BASE_MINIO_ROOT_PASSWORD`
- `ENV_BASE_MINIO_ROOT_USER`
- `ENV_BASE_MINIO_PUBLIC_BUCKET`
- `ENV_BASE_MINIO_PRIVATE_BUCKET`
- `ENV_BASE_MINIO_API_PORT`
- `ENV_BASE_MINIO_CONSOLE_PORT`

CI job은 위 세 값을 이용해 `/srv/sallaemallae/env/base.env`, `/srv/sallaemallae/env/<branch>.env`를 생성한 뒤 배포 스크립트를 실행합니다.

공용 `base` 스택(`postgres`, `redis`, `minio`)은 앱 브랜치 배포 시 자동 재배포하지 않습니다.

- 초기 1회 수동 실행:
  - GitLab `infra-common` 파이프라인의 `deploy_base_manual` job 수동 실행
- 이후에는 인프라 변경이 필요한 경우에만 별도 반영

## Monitoring

1차 모니터링 스택은 아래 4개로 구성합니다.

- `prometheus` : 메트릭 수집/저장
- `grafana` : 대시보드 시각화
- `node-exporter` : EC2 호스트 메트릭
- `cadvisor` : Docker 컨테이너 메트릭

구성 파일:

- compose: `infra/monitoring/docker-compose.monitoring.yml`
- prometheus config: `infra/monitoring/prometheus/prometheus.yml`
- grafana provisioning: `infra/monitoring/grafana/provisioning/*`
- env example: `infra/env/monitoring.env.example`
- deploy script: `infra/scripts/deploy-monitoring.sh`

기본 포트는 외부 공개 없이 localhost bind 기준입니다.

- Prometheus: `127.0.0.1:9090`
- Grafana: `127.0.0.1:3001`
- node-exporter: `127.0.0.1:9100`
- cAdvisor: `127.0.0.1:8088`

배포 방법은 2가지입니다.

1. 권장: GitLab `infra-common` 파이프라인의 `deploy_monitoring_manual` job 실행
2. 수동: EC2에서 `bash infra/scripts/deploy-monitoring.sh`

최초 실행 시 job은 `/srv/sallaemallae/env/monitoring.env`가 없으면 `infra/env/monitoring.env.example`를 복사해 기본값으로 생성합니다.

SSH 터널 예시:

```bash
ssh -L 3001:127.0.0.1:3001 -L 9090:127.0.0.1:9090 sallae-ec2
```

이후 로컬 브라우저에서 아래 주소로 접속합니다.

- Grafana: `http://localhost:3001`
- Prometheus: `http://localhost:9090`

1차 범위는 서버/컨테이너 모니터링입니다. 앱 메트릭은 2차로 확장합니다.

## Local Development Modes

개발 중에는 아래 2가지 모드 중 하나를 선택하면 됩니다.

### Mode A. 배포된 공용 환경 + 내 로컬 앱

가장 가벼운 개발 방식입니다. 이미 배포된 dev 스택을 기준으로, 내가 수정 중인 파트만 로컬에서 띄웁니다.

- FE 작업:
  - frontend만 로컬에서 실행
  - backend는 배포된 `dev-backend` 또는 `develop` 사용
- BE 작업:
  - backend만 로컬에서 실행
  - DB/Redis는 로컬 base 또는 EC2 공용 base 사용
- AI 작업:
  - ai server/pipeline만 로컬에서 실행
  - DB/Redis는 로컬 base 또는 EC2 공용 base 사용

권장:
- FE는 `Mode A`가 가장 편합니다.
- BE/AI는 DB/Redis 연결이 필요하므로 `Mode B`가 더 단순할 수 있습니다.

### Mode B. 로컬 base + 내 로컬 앱

DB/Redis까지 포함해서 로컬에서 직접 재현하는 방식입니다.

- 공통 base: `postgres`, `redis`, `minio`
- 앱은 FE/BE/AI 중 필요한 것만 로컬 실행

이 방식은 배포된 공용 환경과 분리되어 있어, 다른 팀원 작업에 영향 없이 독립 검증하기 좋습니다.

## Local Service Commands

### FE only

```bash
cd services/frontend
corepack enable
pnpm install
pnpm dev
```

### BE only

```bash
cd services/backend
./mvnw spring-boot:run
```

### AI server only

AI 브랜치 또는 AI 코드가 포함된 브랜치에서만 실행합니다.

```bash
cd services/ai/3_ai_server
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### AI pipeline only

```bash
cd services/ai/1_data_pipeline/stock
pip install -r requirements.txt
python pipeline.py --mode incremental
```

## 1) 사전 준비

- Docker Desktop 실행
- WSL integration 활성화
- 프로젝트 루트에서 실행

```bash
cd /home/ssafy/project
```

## 2) 기본 실행 표준

### 2-1. 환경 파일 준비

```bash
cp infra/base.env.example infra/base.env
```

### 2-2. compose 유효성 확인

```bash
cd infra
docker compose --env-file base.env -f docker-compose.yml config
```

### 2-3. 기본 스택 기동

```bash
docker compose --env-file base.env -f docker-compose.yml up -d --build
```

### 2-4. 상태 확인

```bash
docker compose --env-file base.env -f docker-compose.yml ps
```

## 3) 선택 실행: FE/AI 포함 전체 스택

`services/frontend`, `services/ai/3_ai_server`, `services/ai/1_data_pipeline/stock`가 있는 브랜치에서만 실행하세요.

```bash
cd infra
docker compose --profile fullstack --env-file base.env -f docker-compose.yml up -d --build
```

또는 `.env`에 `COMPOSE_PROFILES=fullstack`을 넣고 기본 명령으로 실행할 수 있습니다.

## 3-1) 로컬 base만 실행

BE/AI를 로컬에서 직접 띄우고 DB/Redis만 로컬로 쓰려면 아래만 실행하면 됩니다.

```bash
docker compose --env-file infra/env/base.env.example -f infra/base/docker-compose.base.yml up -d
```

중지:

```bash
docker compose --env-file infra/env/base.env.example -f infra/base/docker-compose.base.yml down
```

## 4) Health Check 확인

프로젝트 루트에서 실행:

```bash
curl -i http://localhost/api/health
bash scripts/smoke.sh
```

예상 결과:

- HTTP `200`
- 본문에 `{"status":"OK"...}` 포함

## 5) PostgreSQL 단일 DB 사용

초기 기동 시 자동 생성:

- DB: `app`
- 계정: `app_user`

### 5-1. 공통 설정

```env
SPRING_PROFILE=dev
APP_DB_NAME=app
APP_DB_USER=app_user
APP_DB_PASSWORD=change_me_app
```

`dev`, `develop`, `master` 모두 같은 DB를 사용하고, 앱 동작 차이는 `SPRING_PROFILE`로만 분리합니다.

### 5-2. profile만 전환

운영 동작으로 검증할 때는 DB를 바꾸지 않고 profile만 변경합니다.

```env
SPRING_PROFILE=prod
APP_DB_NAME=app
APP_DB_USER=app_user
APP_DB_PASSWORD=change_me_app
```

```bash
cd infra
docker compose --env-file base.env -f docker-compose.yml up -d --build
```

### 5-3. 권한 검증

```bash
docker exec -it postgres psql -U app_user -d app -c "select current_database(), current_user;"
```

## 6) 중지

```bash
cd infra
docker compose --env-file base.env -f docker-compose.yml down
```

## 7) Troubleshooting

### 7-1. 포트 충돌

- 증상: `Bind for 0.0.0.0:80 failed`
- 확인: `ss -lntp | grep ':80'`
- 조치: 점유 프로세스 종료 또는 `.env`에서 `NGINX_PORT` 변경

### 7-2. DB 연결 실패

- 증상: Spring에서 DB 접속 오류
- 확인: `docker compose --env-file .env -f infra/docker-compose.yml ps`에서 `postgres` health 상태
- 조치: `.env`의 `APP_DB_*` 값과 실제 PostgreSQL 초기화 값이 일치하는지 확인 후 재기동

### 7-3. Docker 엔진 문제

- 증상: `Cannot connect to the Docker daemon`
- 조치: Docker Desktop 재실행, WSL integration 활성화 확인

### 7-4. 기동 직후 502

- 증상: `curl http://localhost/api/health`가 초반 502
- 원인: 초기 헬스체크 대기 구간
- 조치: `bash scripts/smoke.sh`로 재시도
