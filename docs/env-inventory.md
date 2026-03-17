# Env Inventory

현재 배포 기준 env 원본은 `infra-common`이다. 이 문서는 실제 코드가 읽는 값과 compose가 주입하는 값을 간단히 맞춰 본 결과를 정리한다.

## Frontend

배포에 남기는 값:
- `NEXT_PUBLIC_API_MOCKING=false`
- `AUTH_API_MOCKING=false`
- `AUTH_API_BASE_URL`
- `OAUTH_*`

정리 원칙:
- public 요청은 gateway가 `/api/*`를 backend로 전달하므로, 배포에서는 `NEXT_PUBLIC_API_BASE_URL` 없이 상대 경로로 동작해도 된다.
- 다만 현재 `dev-frontend` 코드 기본값이 mock 쪽으로 열려 있으므로, 배포에서는 `NEXT_PUBLIC_API_MOCKING=false`와 `AUTH_API_MOCKING=false`를 명시해서 real API를 강제한다.
- `NEXT_PUBLIC_MOCK_BASE_URL`, `NEXT_PUBLIC_USE_API_MOCK`, `AUTH_USE_MOCK`는 로컬 개발용으로만 본다.

## Backend

배포 compose에서 주입하는 값:
- `DB_*`
- `REDIS_*`
- `JWT_SECRET`
- `MAIL_*`
- `OAUTH_*`
- `AI_SERVER_BASE_URL`

추가 정리:
- GitLab 글로벌 변수 `MAIL_HOST`, `MAIL_PORT`는 `write-env-files.sh`에서 backend 계열 env 파일로 옮겨 적도록 보완했다.

## AI

배포 compose에서 주입하는 값:
- `AI_DB_URL`
- `INTERNAL_API_KEY`
- `BACKEND_BASE_URL`
- `DART_API_KEY`
- `ECOS_API_KEY`
- `FRED_API_KEY`
- `KRX_API_KEY`
- `KRX_USER_ID`
- `KRX_PASSWORD`
- `KIS_API_KEY`
- `KIS_SECRET_KEY`
- `RCLONE_*`
- `GMS_*`
- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GDRIVE_NEWS_FOLDER_ID`

호환 처리:
- 기존 GitLab 변수 `ENV_DEV_KIS_API_KEY`, `ENV_DEV_KIS_SECRET_KEY`도 당장 끊지 않도록 `write-env-files.sh`에서 `KIS_API_KEY`, `KIS_SECRET_KEY`로 alias 주입한다.
