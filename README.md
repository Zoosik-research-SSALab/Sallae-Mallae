# S14P21D208

> 임시 README (운영 공지용)
> 
> 현재 저장소 운영 규칙은 GitLab Wiki를 단일 기준으로 사용합니다.
> 정식 프로젝트 README는 추후 서비스 구조/실행 방법 기준으로 교체 예정입니다.

## 1) 팀 작업 규칙 문서

- Git Convention: https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/wikis/Git-convention
- Jira Convention: https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/wikis/Jira-convention

## 2) 빠른 시작 (필수 최소 절차)

1. 작업 시작 전 최신 기준 브랜치 동기화
2. 컨벤션에 맞는 `feature/*` 또는 `fix/*` 브랜치 생성
3. 작업 단위를 나눠 커밋 (이슈 키 포함)
4. 대상 브랜치로 MR 생성 후 리뷰 반영

## 3) Git 규칙 핵심 요약

- 브랜치 이름 예시
  - `feature/be/...`
  - `feature/fe/...`
  - `fix/be/...`
- 커밋 메시지 형식
  - `[파트] Type: JiraKey 제목`
  - 예: `[INFRA] Build: S14P21D208-19 로컬 Docker/Compose 실행 표준 구성`
- PR/MR에는 작업 요약 + 이슈 키 연결 필수

## 4) Jira 규칙 핵심 요약

- Story와 Task를 목적에 맞게 구분해서 사용
- 스프린트에는 이번 주 확정 작업만 포함
- 스프린트 외 완료 작업은 즉시 Done 처리
- 포인트는 팀 합의 기준(1/2/3/5/8)으로 관리

## 5) 참고

- README와 Wiki 내용이 충돌하면 Wiki를 우선 기준으로 따릅니다.
