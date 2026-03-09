# 살래말래

Zoo식연구소 쌀Lab 팀의 "살래말래 위원회" 프로젝트입니다.  
이 저장소는 FE, BE, AI, 인프라를 한 레포에서 관리하며, 브랜치별 개발과 통합 배포를 동시에 지원합니다.

## 프로젝트 목적

- 종목, 뉴스, 공시, 재무, AI 분석 결과를 한 화면에서 통합 제공
- 정량 모델과 AI 토론 결과를 함께 보여주는 종목 리포트 제공
- AI 매매신호, 관심종목, 알림, 검색 기능을 포함한 서비스 제공
- 로컬 개발 환경과 EC2 배포 환경을 동일한 구조로 운영

## 프로젝트 범위

- Frontend: Next.js 기반 사용자 화면
- Backend: Spring Boot 기반 API 서버
- AI: 데이터 파이프라인, 모델 학습, FastAPI 서빙
- Infra: Docker Compose, PostgreSQL, Redis, Nginx, GitLab Runner

## 기술 스택

### Frontend

- Next.js 16
- React 19
- TypeScript 5.9
- pnpm

### Backend

- Java 21
- Spring Boot 3.5.11
- Maven
- PostgreSQL
- Redis

### AI

- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- Redis

### Infra

- Docker / Docker Compose
- Nginx
- GitLab CI/CD
- GitLab Runner
- EC2 (Ubuntu)

## 디렉토리 구조

```text
services/
  backend/      # Spring Boot API 서버
  frontend/     # Next.js 사용자 화면
  ai/           # AI 파이프라인 및 FastAPI 서버 (AI 브랜치/통합 브랜치 기준)

infra/
  base/         # 공용 postgres + redis compose
  apps/         # frontend/backend/ai/full 앱 compose
  gateway/      # 도메인 기반 공용 gateway nginx
  env/          # 배포/실행용 env example
  nginx/        # nginx 라우팅 설정
  postgres/     # DB init 스크립트
  scripts/      # 배포/env 생성 스크립트

scripts/
  smoke.sh      # 로컬 smoke 테스트
```

## 브랜치 전략

```text
feature/fe/*  -> dev-frontend
feature/be/*  -> dev-backend
feature/ai/*  -> dev-ai

dev-frontend / dev-backend / dev-ai -> develop
develop -> master
```

원칙:

- 공통 인프라 변경은 각 파트 브랜치에 동일하게 반영
- 앱 기능 개발은 파트별 `feature/*` 브랜치에서 진행
- 통합 검증은 `develop`
- 운영 반영은 `master`

## 개발 흐름

1. 작업 브랜치 생성
2. 로컬 개발 및 검증
3. Jira 이슈 키 기준 커밋
4. 대상 `dev-*` 또는 `develop` 브랜치로 MR 생성
5. 리뷰 및 수정
6. 머지 후 자동 배포 또는 통합 반영

## 커밋 규칙

형식:

```text
[FE/BE/AI/INFRA] Type: JiraKey 제목
```

예시:

```text
[BE] Feat: S14P21D208-108 Search API 5종 구현
[INFRA] Build: S14P21D208-29 EC2 공통 인프라 compose 구조 및 배포 스크립트 정리
```

## MR 규칙

MR 본문은 최소 아래 3개를 포함합니다.

```text
## 📄 MR 한 줄 요약
## 🧑‍💻 MR 세부 내용
## 📎 Issue 번호
```

MR 작성 원칙:

- 한 MR에는 하나의 목적만 담기
- 빌드/기동/문서 반영 여부를 본문에 명시
- 비밀값, `.env`, 개인 설정 파일 포함 금지

## 리뷰 기준

리뷰 시 최소 아래를 확인합니다.

- 브랜치 대상이 맞는지
- Jira 이슈 키와 MR 내용이 일치하는지
- 불필요한 파일 변경이 없는지
- 빌드/실행/compose 검증이 되었는지
- 문서/API 계약 변경 시 README 또는 명세가 갱신되었는지
- secret, `.env`, 키 파일이 커밋되지 않았는지

## 머지 전략

- `feature/*` -> `dev-*` : squash merge 권장
- `dev-*` -> `develop` : 통합 확인 후 merge
- `develop` -> `master` : 운영 반영 기준 merge

원칙:

- 머지된 브랜치와 중단된 브랜치는 즉시 삭제
- force-push는 개인 feature 브랜치에서만 제한적으로 사용
- 공유 브랜치(`dev-*`, `develop`, `master`)에는 force-push 금지

## 로컬 시작 가이드

### FE

```bash
cd services/frontend
corepack enable
pnpm install
pnpm dev
```

### BE

```bash
cd services/backend
./mvnw spring-boot:run
```

### Infra

인프라 실행, EC2 배포, GitLab Variables, base 수동 배포는 아래 문서를 기준으로 합니다.

- [infra/README.md](/home/ssafy/project-infra/infra/README.md)

EC2 배포는 GitLab Runner가 checkout한 현재 소스를 `/srv/sallaemallae/source/<target>`로 동기화한 뒤 실행합니다. 별도 서버-side `git clone`은 필수가 아닙니다.

브랜치별 내부 포트는 `8081(dev-frontend)`, `8082(dev-backend)`, `8083(dev-ai)`, `8084(develop)`, `8085(master 수동 운영 슬롯)`를 사용합니다. 공용 gateway nginx는 `j14d208.p.ssafy.io`로 들어온 요청을 `/`, `/api`, `/ai` 기준으로 최신 dev 배포에 분기합니다. 나중에 통합 검증이나 최종 전환이 필요하면 gateway 타깃만 `develop` 또는 운영 슬롯으로 교체합니다.

## 문서 원칙

- 루트 `README.md`는 프로젝트 개요와 협업 규칙을 다룸
- 인프라/배포 절차는 `infra/README.md`에 작성
- 상세한 Jira/Git 규칙은 Wiki를 참고하되, 핵심 운영 규칙은 README에 남김
