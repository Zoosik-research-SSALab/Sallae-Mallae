# Infra Deprecated

이 브랜치의 `infra/` 디렉토리는 더 이상 배포 원본이 아닙니다.

현재 기준:
- 배포용 compose / nginx / env 생성 / deploy script 원본은 `infra-common` 브랜치가 담당합니다.
- 이 브랜치의 CI도 직접 `infra/`를 쓰지 않고, `infra-common/.gitlab/infra-deploy.yml`을 include 합니다.
- 실제 배포 시에는 checkout된 앱 소스에 `infra-common`의 `infra/` 템플릿을 덮어써서 사용합니다.

의미:
- 여기 남아 있던 `infra/apps`, `infra/base`, `infra/gateway`, `infra/nginx`, `infra/scripts`, `infra/env` 사본은 중복본입니다.
- 이 사본들을 계속 들고 있으면 `infra-common`과 충돌하거나 최종 통합 시 불필요한 merge conflict를 만들 가능성이 큽니다.

앞으로의 기준:
- 공통 인프라 수정: `infra-common`
- AI 앱 코드 수정: 이 브랜치의 `services/ai`

로컬 개발 기준:
- AI 로컬 실행: `services/ai`
- 공통 인프라/배포 문서 확인: `infra-common/README.md`
- 배포 env/compose 기준 확인: `infra-common/infra`
