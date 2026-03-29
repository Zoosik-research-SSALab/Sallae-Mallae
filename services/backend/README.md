# sallaemallae-backend boilerplate

## Goal
- 팀원들이 바로 개발 시작할 수 있는 **보일러플레이트** 기준 구조
- 동작 구현보다 **도메인/레이어 정렬** 우선

## Architecture
- 3-layered + domain package
- 기본 흐름: `controller -> service -> repository`
- Controller에서 Repository 직접 호출 금지
- 공통 응답: `global/response/ApiResponse`
- 공통 예외: `global/exception/*`

## Domain packages (11, including `health`)
- `auth`: 로그인/회원가입/소셜/로그인 상태
- `user`: 프로필/관심종목/개별 알림 설정
- `policy`: 약관/개인정보/면책 문서 조회
- `main`: 메인 요약 (추천/시장/포인트)
- `stock`: 전체 종목/종목 상세
- `report`: 종목 리포트 (ML + 토론)
- `signal`: AI 매매신호 리스트
- `news`: 뉴스/키워드
- `notification`: 알림함(원본/유저수신 분리)
- `search`: 자동완성/인기검색/검색기록
- `health`: 헬스체크

## Common packages
- `global`: config, exception, response, base entity
- `infra`: 외부 연동 클라이언트

## Notes
- 현재 서비스 로직은 placeholder 응답이 포함된 scaffold 상태입니다.
- API 계약/세부 비즈니스 로직/보안은 각 도메인 개발 단계에서 구현합니다.
- 각 도메인에 `exception/*ErrorCode`를 분리해 두었고, `BusinessException`으로 전파합니다.
