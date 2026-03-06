# Frontend Convention

## 1. 목적
- 이 문서는 `services/frontend`의 현재 구조를 기준으로 협업 규칙을 통일하기 위한 기준이다.
- 신규 기능 추가, 리팩터링, 코드 리뷰 시 본 문서를 기본 규칙으로 사용한다.

## 2. 기술 스택 기준
- Framework: `Next.js (App Router)`
- Language: `TypeScript (strict: true)`
- Styling: `Tailwind CSS v4` + CSS variables (`src/styles/theme.css`)
- Data Fetching: `fetch` + `@tanstack/react-query` (점진 전환 중)
- Package Manager: `pnpm`

## 3. 프로젝트 구조 규칙
```text
frontend/
  public/
  src/
    app/
      <route>/
        page.tsx
        api/
        components/
        hooks/
        types/
        utils/
      <route>/[param]/
        page.tsx
        api/
        components/
        hooks/
        types/
        utils/
    shared/
      components/
      hooks/
      lib/
      types/
      ui/
      utils/
    styles/
      theme.css
```
- 라우트 폴더는 `src/app` 아래에 두고, 기능별로 `api/components/hooks/types/utils`를 유지한다.
- 빈 디렉터리는 `.gitkeep`으로 유지한다.
- 공용 로직/컴포넌트는 `src/shared/*`에 둔다.
- 전역 테마 토큰은 `src/styles/theme.css`, 전역 프리미티브/리셋은 `src/app/globals.css`에서 관리한다.

## 4. 파일/이름 규칙
- 컴포넌트 파일: `PascalCase.tsx` (예: `StockList.tsx`)
- 훅 파일: `camelCase.ts` + `use` 접두사 (예: `useStocks.ts`)
- API 파일: `camelCase.ts` + 동사 시작 (예: `getStocks.ts`)
- 유틸 파일: `camelCase.ts` (예: `cn.ts`)
- 페이지 파일: 각 세그먼트의 `page.tsx` 고정
- 동적 라우트: Next.js 표준 `[ticker]`, `[symbol]` 사용

## 5. import 규칙
- `src` 기준 절대 경로 별칭 `@/*`를 기본 사용한다.
- 같은 기능 폴더 내부 참조는 상대 경로 허용 (`./`, `../`).
- 권장 순서:
1. 외부 라이브러리
2. 같은 도메인 내부 import
3. `@/shared/*` 또는 `@/*` import

## 6. 컴포넌트 규칙
- 상태/이펙트/브라우저 API 사용 시에만 `"use client"`를 선언한다.
- UI 기본 요소는 `src/shared/ui`의 `Button`, `Input`, `Badge`를 우선 사용한다.
- Props 타입은 파일 내부 `type Props = { ... }` 형태로 선언한다.
- 컴포넌트는 기본적으로 한 파일당 하나의 주 컴포넌트를 둔다.

## 7. 데이터 패칭 규칙
- API 호출 함수는 `api/`에 두고, 네트워크 호출과 응답 파싱만 담당한다.
- 훅은 `hooks/`에서 API 함수를 조합하고 UI 상태(`isLoading`, `error`)를 반환한다.
- 에러는 `throw new Error(...)`로 표준화한다.
- 서버 응답 래퍼(`ApiResponse<T>`) 타입은 API 파일에 명시한다.
- React Query 사용 시 이름을 `useXxxQuery`, `useXxxMutation` 패턴으로 맞춘다.
- 기존 `useEffect` 기반 훅은 기능 수정 시 React Query로 점진 전환한다.

## 8. 스타일 규칙
- 색상은 하드코딩보다 CSS 변수 토큰(`--color-*`)을 우선 사용한다.
- 레이아웃 프리미티브(`stack`, `row`, `card`, `list`)를 재사용한다.
- 인라인 스타일은 정말 작은 보조 속성(`flexWrap`, `gap`)에서만 제한적으로 사용한다.
- 다크모드는 `data-theme` + 토큰 방식(`useTheme`)을 따른다.

## 9. shared 레이어 규칙
- `shared/components`: 도메인 비종속 컴포넌트 (`AppNav`, `AppProviders` 등)
- `shared/ui`: 디자인 프리미티브 컴포넌트
- `shared/hooks`: 여러 도메인에서 재사용 가능한 훅
- `shared/lib`: 상수/설정/순수 로직
- `shared/utils`: 범용 유틸 함수
- `shared/types`: 전역 공통 타입

## 10. 협업/리뷰 체크리스트
- 새 페이지 추가 시:
1. `src/app/<route>/page.tsx` 생성
2. `api/components/hooks/types/utils` 디렉터리 구성
3. 빈 디렉터리는 `.gitkeep` 추가
- 코드 제출 전:
1. `pnpm lint`
2. `pnpm build` (배포 영향 변경 시 필수)
- 구조/규칙 변경 시:
1. `PROGRESS.md`에 변경 로그 추가
2. 본 컨벤션 문서 동기화

## 11. 인코딩 규칙
- 모든 텍스트 파일은 `UTF-8` 인코딩으로 저장한다.
- PowerShell/에디터에서 인코딩을 명시하지 않은 대량 치환 작업은 지양한다.
