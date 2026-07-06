# GitLab Merge Request 코드리뷰 기록

> 원본 GitLab 저장소(`lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208`)의 Merge Request 코드리뷰 토론을 보존용으로 정리한 문서입니다.
> GitHub 이관 시 MR의 리뷰 코멘트/토론은 git 히스토리에 포함되지 않으므로, GitLab API로 추출하여 이 문서에 기록해 둡니다.
> 추출 기준일: 2026-07-06

## 요약

- 전체 MR: **433개**
- 코드리뷰(코멘트)가 있었던 MR: **114개**
- 총 리뷰 코멘트(비시스템): **191개**

---

## 코드리뷰가 있었던 MR

### !26 · [FE] Feat: S14P21D208-59 메인 페이지 및 헤더 토큰/구조 정리

- 작성자: **정준용** · 상태: `merged`
- 브랜치: `feature/fe/main-ui` → `dev-frontend`
- 생성: 2026-03-09 · 머지: 2026-03-09
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/26](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/26)

<details><summary>MR 설명</summary>

> 메인 페이지 홈 구현 구조를 app/home 기준으로 정리하고 HomePageClient 위치를 재배치
> - 메인 대시보드 UI와 헤더를 semantic theme token 기반으로 정리
> - TOP10, 신호 포착, 카테고리별 주가, watchlist 하트 동작 및 mock API 흐름 반영

</details>

**리뷰 토론**

- 💬 **정준용** (2026-03-09)
  > 메인 페이지와 헤더 구조를 프론트 컨벤션에 맞춰 정리했습니다.
  > app/home 기준으로 홈 전용 구현 파일을 재배치하고, HomePageClient를 루트 컴포넌트로 정리했습니다.
  > 헤더 및 메인 페이지에 semantic theme token을 적용했고, TOP10/신호 포착/카테고리별 주가 UI를 조정했습니다.
  > 관심종목 하트 토글 공통 로직과 mock API를 연결하고, SSE 기반 메인 데이터 흐름까지 반영했습니다.
  > lint/build 검증까지 완료했습니다.

---

### !39 · [BE] Feat: S14P21D208-95 이메일 회원가입 구현

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `feature/be/email-signup` → `dev-backend`
- 생성: 2026-03-09 · 머지: 2026-03-09
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/39](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/39)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> [BE] Feat: S14P21D208-95 이메일 회원가입 구현
> 
> ## 🧑‍💻 MR 세부 내용
> - 이메일 중복 확인 API 구현 (GET /api/auth/check-email/{email})
> - 인증코드 발송 API 구현 (POST /api/auth/email/send-code)
> - 인증코드 검증 API 구현 (POST /api/auth/email/verify-code)
> - 회원가입 API 확장 (POST /api/auth/signup)
> - EmailService 구현 (Gmail SMTP 기반)
> - PasswordValidator 구현 (비밀번호 정책 검증)
> - RedisTokenService 이메일 인증 관련 메서드 추가
> - 에러코드 추가 (EMAIL_001, VERIFY_001~003, SIGNUP_001~003)
> 
> ## 📎 Issue 번호
> S14P21D208-95

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-09)
  > ## 코드 리뷰
  > 
  > 전체적으로 이메일 인증 → 코드 검증 → 회원가입 3단계 흐름이 잘 분리되어 있고, DTO record 사용과 PasswordValidator 분리도 좋습니다.
  > 
  > ### 이슈
  > 
  > #### 1. [중간] 보안 - 인증코드 관련 이메일 평문 로깅
  > 
  > \에서 이메일을 평문으로 로깅하고 있습니다:
  > \프로덕션 로그 레벨이 DEBUG로 설정되면 개인정보 노출 위험이 있습니다.
  > → \ 처럼 마스킹 처리하거나 제거 권장
  > 
  > #### 2. [중간] 버그 - @Async + RuntimeException 조합
  > 
  > \에서:
  > \로 실행되는 메서드에서 RuntimeException을 던지면 호출자가 받을 수 없습니다. 예외가 삼켜지므로 로깅만 하거나, \를 설정해야 합니다.
  > 
  > #### 3. [중간] 버그 - Redis 값 파싱 시 구분자 충돌 가능
  > 
  > \에서:
  > \해시 값에 \가 포함될 경우 파싱이 깨질 수 있습니다.
  > → \ 사용하거나, 구분자를 \로 변경 권장
  > 
  > #### 4. [낮음] 보안 - SMTP 기본값
  > 
  > \환경변수 미설정 시 무의미한 값으로 SMTP 연결 시도됩니다. 빈 값으로 두고 시작 시 fail-fast하는 게 나을 수 있습니다.
  > 
  > #### 5. [낮음] UX - PasswordValidator 특수문자 범위
  > 
  > 허용 특수문자에 \, \, \, \ 등이 빠져 있어 이런 특수문자를 쓰면 거부됩니다. 의도적이라면 에러 메시지에 허용 문자 목록을 명시하면 좋겠습니다.
  > 
  > ---
  > 
  > 위 이슈들만 보완하면 머지해도 될 것 같습니다. 수고하셨습니다\!

---

### !43 · [BE] Feat: S14P21D208-109 메인 도메인 API 4개 구현

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `feature/be/main-api` → `dev-backend`
- 생성: 2026-03-09 · 머지: 2026-03-10
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/43](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/43)

<details><summary>MR 설명</summary>

> ## :page_facing_up: MR 한 줄 요약
> 
> 메인 페이지에 필요한 4개 API(추천종목 TOP10, 매수/매도 신호, 시장지수, 카테고리별 종목)를 구현했습니다.
> 
> ## :technologist: MR 세부 내용
> 
> ### 신규 API
> 
> | API | 방식 | 엔드포인트 | 설명 |
> |-----|----|-------|----|
> | FS- MAIN-001 | SSE | `/api/main/top-stocks` | 오늘 날짜 기준 AI 추천 종목 TOP10 |
> | FS- MAIN-002 | GET | `/api/main/new-signals` | 당일 매수 상위 3 + 매도 상위 3 |
> | FS- MAIN-003 | SSE | `/api/main/market-index` | 코스피/코스닥/환율 실시간 지수 |
> | FS- MAIN-004 | SSE | `/api/main/categories` | 카테고리별 등락률 대표 종목 2개씩 |
> 
> ### 아키텍처
> 
> - **Redis 캐시**: 2분 TTL, `@Scheduled(fixedRate = 60_000)`으로 1분마다 백그라운드 갱신
> - **SSE**: `SseManager`를 `global/sse/`에 공용 컴포넌트로 분리 (다른 도메인에서도 재사용 가능)
> - **unnamed events**: 프론트 `EventSource.onmessage` 호환
> - **시장 지수 데이터**: 네이버 금융 비공식 API 호출 (KOSPI, KOSDAQ, USD/KRW)
> - **DB 쿼리**: `LATERAL JOIN` 네이티브 쿼리로 최신 가격/신호 효율적 조회
> 
> ### 타입 정리
> 
> - DTO: `BigDecimal` → `float`/`int` (DB REAL 타입에 맞춤)
> - confidence: DB `float` 타입 정수로 변환
> - JSON 키: snake_case (`@JsonNaming`)
> 
> ### 추가 작업
> 
> - health/news/main 컨트롤러 Swagger 어노테이션 추가
> - DEV/PROD SQL 스키마 `NUMERIC(10,4)` → `REAL` 통일
> - 단위 테스트 11개 작성 (전체 통과)
> 
> ### 변경 파일: 22개 (신규 13, 수정 8, 삭제 1)
> 
> ## :paperclip: Issue 번호
> 
> S14P21D208-109

</details>

**리뷰 토론**

- 💬 **강지석** (2026-03-09)
  > # 📊 Main API 구조 및 코드 리뷰
  > 
  > ## 전체 구조 요약
  > 
  > | API | 엔드포인트 | 방식 |
  > |---|---|---|
  > | 추천 종목 TOP10 | `GET /api/main/top-stocks` | SSE |
  > | 매수/매도 신호 | `GET /api/main/new-signals` | REST |
  > | 시장 지수 (코스피/코스닥/환율) | `GET /api/main/market-index` | SSE |
  > | 카테고리별 대표 종목 | `GET /api/main/categories` | SSE |
  > 
  > **구조 특징**
  > 
  > - Redis 캐시
  > - `@Scheduled` 1분 주기 갱신
  > - SSE broadcast
  > 
  > → **캐시 + 스케줄러 + SSE 구조가 잘 분리된 설계**
  > 
  > ---
  > 
  > # ⚠️ Issues
  > 
  > ## 1️⃣ SSE timeout `Long.MAX_VALUE` (메모리 누수 위험)
  > 
  > **파일:** `MainServiceImpl.java`
  > 
  > ```java
  > SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
  > ```
  > 
  > 문제
  > 
  > - 클라이언트 연결 종료를 서버가 즉시 감지 못하면
  > - emitter 객체가 **영구적으로 남을 수 있음**
  > 
  > 권장
  > 
  > ```java
  > new SseEmitter(30 * 60 * 1000L); // 30분
  > ```
  > 
  > 또한 **클라이언트에서 자동 재연결 로직 구현 필요**
  > 
  > ---
  > 
  > ## 2️⃣ `CopyOnWriteArrayList` 성능 이슈
  > 
  > **파일:** `SseManager.java`
  > 
  > ```java
  > private final Map<String, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();
  > ```
  > 
  > 문제
  > 
  > - `CopyOnWriteArrayList`
  > - **write(add/remove) 시 배열 전체 복사 발생**
  > 
  > SSE 특성상
  > 
  > - emitter 등록
  > - emitter 제거
  > 
  > 가 **빈번하게 발생 가능**
  > 
  > 권장
  > 
  > - `ConcurrentLinkedQueue`
  > - `Collections.synchronizedList`
  > 
  > ---
  > 
  > ## 3️⃣ broadcast 중 remove 로직
  > 
  > **파일:** `SseManager.java`
  > 
  > ```java
  > for (SseEmitter emitter : list) {
  >     try {
  >         emitter.send(SseEmitter.event().data(data));
  >     } catch (IOException e) {
  >         list.remove(emitter);
  >     }
  > }
  > ```
  > 
  > 설명
  > 
  > - `CopyOnWriteArrayList`라서 **ConcurrentModificationException은 발생하지 않음**
  > - 하지만 **snapshot 기반이라 즉시 반영되지 않음**
  > 
  > 문제
  > 
  > - dead emitter에 **중복 send 시도 가능**
  > 
  > 권장 구조
  > 
  > ```java
  > List<SseEmitter> deadEmitters = new ArrayList<>();
  > 
  > for (SseEmitter emitter : list) {
  >     try {
  >         emitter.send(SseEmitter.event().data(data));
  >     } catch (IOException e) {
  >         deadEmitters.add(emitter);
  >     }
  > }
  > 
  > list.removeAll(deadEmitters);
  > ```
  > 
  > ---
  > 
  > ## 4️⃣ `@Scheduled` 4개 동일 타이밍 실행
  > 
  > 현재
  > 
  > ```java
  > @Scheduled(fixedRate = 60000, initialDelay = 5000)
  > ```
  > 
  > 4개 스케줄이 **동시에 실행**
  > 
  > 문제
  > 
  > - DB
  > - 외부 API
  > 
  > 부하가 **한 시점에 집중**
  > 
  > 권장
  > 
  > ```
  > 5000
  > 10000
  > 15000
  > 20000
  > ```
  > 
  > 초기 지연 분산
  > 
  > ---
  > 
  > ## 5️⃣ 외부 API 실패 시 `0` 반환 (silent failure)
  > 
  > ```java
  > return new MarketIndexItemResponse(0f, 0f);
  > ```
  > 
  > 문제
  > 
  > 클라이언트 화면에서
  > 
  > ```
  > KOSPI 0
  > ```
  > 
  > 처럼 **실제 데이터처럼 보일 수 있음**
  > 
  > 권장
  > 
  > 1️⃣ 이전 캐시 유지  
  > 2️⃣ API 실패 시 broadcast 스킵
  > 
  > ---
  > 
  > ## 6️⃣ Native Query named parameter
  > 
  > ```java
  > .setParameter("tradeType", tradeType)
  > ```
  > 
  > 설명
  > 
  > - `createNativeQuery`에서
  > - named parameter(`:tradeType`)
  > 
  > 은 **JPA 표준이 아님**
  > 
  > Hibernate에서는 동작하지만
  > 
  > 권장
  > 
  > ```
  > ?1
  > ```
  > 
  > positional parameter
  > 
  > ---
  > 
  > ## 7️⃣ LATERAL JOIN 인덱스 확인 필요
  > 
  > 파일
  > 
  > ```
  > MainStockQueryRepository.java
  > ```
  > 
  > 필요 인덱스
  > 
  > ```sql
  > CREATE INDEX idx_stock_prices_stock_time
  > ON stock_prices(stock_id, trade_timestamp);
  > 
  > CREATE INDEX idx_ai_ml_reports_stock_time
  > ON ai_ml_reports(stock_id, report_time);
  > ```
  > 
  > 없으면
  > 
  > - LATERAL JOIN
  > - **풀스캔 가능**
  > 
  > ---
  > 
  > ## 8️⃣ NUMERIC → REAL 변경 (정밀도 손실)
  > 
  > 파일
  > 
  > ```
  > 02-init-schema.sql
  > ```
  > 
  > 차이
  > 
  > | 타입 | 특징 |
  > |---|---|
  > | NUMERIC | 고정 소수점 (정확) |
  > | REAL | 부동소수점 |
  > 
  > 금융 데이터에서
  > 
  > - PER
  > - PBR
  > - 수익률
  > - 신뢰도
  > 
  > → **정밀도 손실 가능**
  > 
  > 권장
  > 
  > **핵심 금융 컬럼은 NUMERIC 유지**
  > 
  > ---
  > 
  > ## 9️⃣ RestClient 생성 방식
  > 
  > 현재
  > 
  > ```java
  > this.restClient = RestClient.builder().build();
  > ```
  > 
  > 문제
  > 
  > - 테스트에서 **mock 불가능**
  > 
  > 권장
  > 
  > ```java
  > @Bean
  > RestClient restClient() {
  >     return RestClient.builder().build();
  > }
  > ```
  > 
  > DI 주입
  > 
  > ---
  > 
  > ## 🔟 API 경로 변경 (Breaking Change)
  > 
  > ```java
  > @RequestMapping("/api/main")
  > ```
  > 
  > 기존
  > 
  > ```
  > /api/v1/main
  > ```
  > 
  > 변경
  > 
  > ```
  > /api/main
  > ```
  > 
  > 확인 필요
  > 
  > - 프론트엔드
  > - API 계약
  > 
  > ---
  > 
  > # 👍 잘된 점
  > 
  > - 캐시 + SSE + 스케줄러 구조 분리
  > - `SseManager` 범용 컴포넌트화
  > - `record DTO` + `SnakeCaseStrategy` 일관성
  > - 테스트 커버리지 양호
  > - Swagger 문서화 적용
  > 
  > ---
  > 
  > # 📌 요약
  > 
  > | 심각도 | 항목 | 내용 |
  > |---|---|---|
  > | High | #8 | NUMERIC → REAL 정밀도 손실 |
  > | High | #7 | LATERAL JOIN 인덱스 확인 필요 |
  > | Medium | #1 | SSE timeout 메모리 누수 |
  > | Medium | #5 | 외부 API 실패 시 0 반환 |
  > | Medium | #9 | RestClient 테스트 불가 |
  > | Low | #4 | 스케줄러 동시 실행 |
  > | Low | #2, #3 | CopyOnWriteArrayList 비효율 |
  > | Info | #10 | API 경로 변경 |
  > 
  > ---
  > 
  > # 결론
  > 
  > 전체적으로
  > 
  > - **캐시 + 스케줄러 + SSE 구조가 잘 설계됨**
  > - **테스트도 충분히 작성됨**
  > 
  > 우선적으로 확인할 부분
  > 
  > 1️⃣ 금융 데이터 정밀도 (`NUMERIC → REAL`)  
  > 2️⃣ `LATERAL JOIN` 인덱스 존재 여부

- 💬 **이혜민** (2026-03-10)
  > ## 코드 리뷰 반영 결과
  > 
  > ### :white_check_mark: 반영한 항목
  > 
  > **1. SSE 타임아웃 축소** (`MainServiceImpl.java`)
  > 
  > - `Long.MAX_VALUE` → `5 * 60 * 1000L` (5분)
  > - 클라이언트 `EventSource`는 타임아웃 후 자동 재연결하므로 UX 영향 없음
  > - 서버 스레드/메모리 점유 시간 대폭 감소
  > 
  > **2. 외부 API 실패 시 안전한 처리** (`MainServiceImpl.java`)
  > 
  > - 네이버 금융 API 호출 실패 시 `0f` 반환 → `null` 반환으로 변경
  > - `refreshMarketIndex()`에서 null이면 broadcast 스킵, 이전 Redis 캐시 유지
  > - 0원짜리 코스피/환율이 프론트에 노출되는 문제 방지
  > 
  > **3. `@Scheduled` initialDelay 분산** (`MainServiceImpl.java`)
  > 
  > - 4개 스케줄러 모두 `initialDelay = 5_000`이었음
  > - `5s / 10s / 15s / 20s`로 분산하여 서버 시작 직후 DB 동시 쿼리 부하 방지
  > 
  > **4. DB 복합 인덱스 추가** (`02-init-schema.sql`)
  > 
  > - `stock_prices(stock_id, trade_timestamp DESC)` — LATERAL JOIN 최적화
  > - `ai_ml_reports(stock_id, report_time DESC)` — LATERAL JOIN 최적화
  > - DEV/PROD 양쪽 스키마에 동일하게 적용
  > 
  > ---
  > 
  > ### :pause_button: 미반영 항목 (사유)
  > 
  > **5. heartbeat 메커니즘**
  > 
  > - 타임아웃을 5분으로 줄였기 때문에 heartbeat 없이도 충분
  > - 클라이언트 `EventSource`가 자동 재연결하므로 별도 heartbeat는 불필요한 복잡도
  > 
  > **6. `CopyOnWriteArrayList` → `ConcurrentHashMap` 변환**
  > 
  > - `CopyOnWriteArrayList`는 SSE emitter 수가 적은 환경(수십\~수백)에서 충분한 성능
  > - 대규모 트래픽이 아닌 이상 자료구조 변경은 과도한 최적화
  > 
  > **7. `@Scheduled` 별도 클래스 분리**
  > 
  > - 현재 스케줄러가 4개뿐이라 `MainServiceImpl`에 두는 것이 응집도 측면에서 더 나음
  > - 스케줄러가 10개 이상으로 늘어날 때 분리해도 늦지 않음
  > 
  > **8. Redis 직렬화 실패 시 예외 처리 강화**
  > 
  > - `MainCacheRepository`에서 이미 `Optional.empty()` 반환으로 처리 중
  > - 캐시 미스 시 DB에서 재조회하는 fallback이 있어 추가 처리 불필요
  > 
  > **9. `extractFloat` 메서드에 로깅 추가**
  > 
  > - 파싱 실패 시 다음 필드명을 시도하는 것이 정상 흐름 (네이버 API 응답 필드명이 달라질 수 있음)
  > - 정상 동작에 대해 warn 로그를 남기면 오히려 로그 노이즈
  > 
  > **10. 테스트 커버리지 보강**
  > 
  > - 기존 11개 테스트로 핵심 로직 커버됨
  > - 네이버 API mock 테스트는 가성비 대비 효과가 낮음 (외부 API 응답 구조가 바뀌면 mock도 같이 바꿔야 함)

---

### !59 · [AI] Feat: S14P21D208-82 재무 팩터 생성 모듈 구현

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/ai/stock-fundamental-factor` → `dev-ai`
- 생성: 2026-03-10 · 머지: 2026-03-10
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/59](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/59)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> DART 분기 재무제표와 pykrx 일별 펀더멘탈 데이터를 통합하여 섹터 중립 재무 팩터를 생성하는 모듈을 구현합니다.
> 
> ## MR 세부 내용
> - features/build_fundamental_factors.py: 재무 팩터 생성 모듈 신규 생성
>   - PER, PBR: pykrx 일별 데이터 (134종목)
>   - ROE, ROA: DART 분기 재무제표 (134~135종목)
>   - 부채비율: DART 직접 제공 (308종목)
>   - 영업이익률: operating_income / revenue (255종목)
>   - 매출성장률 QoQ: 전분기 대비 변화율 (301종목)
>   - GICS 섹터 내 z-score 표준화 (섹터 중립 팩터)
>   - Point-in-Time 보장 (as_of_date 기준 look-ahead bias 방지)
> - config.py: RAW_FUNDAMENTAL_PATH, PROCESSED_FUNDAMENTAL_PATH 경로 추가
> - main_train.py: --only-fundamental 옵션 및 재무 팩터 생성 파이프라인 단계 추가
> 
> ## 실행 결과
> - 처리 종목: 332종목 (건너뜀 0)
> - 출력: processed/fundamental/fundamental_factors_20260305.parquet (18컬럼)
> - z-score 검증: 전체 평균 ≈ 0.000, 표준편차 ≈ 0.96~0.99 (정상)
> 
> ## Issue 번호
> S14P21D208-82

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-10)
  > ## 코드 리뷰 리포트 — MR !59
  > 
  > **리뷰어**: AI Code Reviewer
  > **파일 수**: 3
  > **전체 이슈**: 8건
  > 
  > ---
  > 
  > ### CRITICAL (0건)
  > 없음
  > 
  > ---
  > 
  > ### HIGH (2건)
  > 
  > **1. `build_fundamental_factors.py` — DART 파일 중복 I/O (성능)**
  > 
  > `_load_dart_financial()`과 `_compute_revenue_growth_qoq()`가 동일한 종목의 같은 parquet 파일들을 **독립적으로 2회** 읽습니다. 332종목 x 분기수만큼의 파일을 이중으로 읽기 때문에 파이프라인 실행 시간이 불필요하게 2배 가까이 소요됩니다.
  > 
  > ```python
  > # _compute_ticker_factors 내부에서:
  > dart_row = _load_dart_financial(ticker, reference_date)  # 파일 읽기 1회
  > revenue_growth_qoq = _compute_revenue_growth_qoq(ticker, reference_date)  # 동일 파일 읽기 2회
  > ```
  > 
  > **수정 제안**: DART 재무 데이터를 한 번만 로드하고, 로드된 DataFrame에서 최신 분기 행과 QoQ 성장률을 모두 계산하는 통합 함수로 리팩토링하세요.
  > 
  > ```python
  > def _load_dart_financials(ticker, reference_date):
  >     """DART 파일을 한 번만 로드하여 (latest_row, revenue_growth_qoq)를 반환"""
  >     # ... 파일 로드는 1회만 수행
  >     return latest_row, revenue_growth_qoq
  > ```
  > 
  > ---
  > 
  > **2. `main_train.py:65` — `build_fundamental()` 반환값 None 미처리**
  > 
  > `build_fundamental()`은 실패 시 `None`을 반환하지만, `main_train.py`에서 반환값을 검증하지 않고 바로 출력합니다.
  > 
  > ```python
  > fundamental_path = build_fundamental()
  > print(f"[train] fundamental factors: {fundamental_path}")  # None이 출력됨
  > ```
  > 
  > 다른 단계(LightGBM, LSTM 등)도 동일한 패턴이지만, `run_all=True`일 때 후속 앙상블 단계가 재무 팩터에 의존할 수 있으므로 실패 시 경고 또는 조기 종료가 필요합니다.
  > 
  > ```python
  > fundamental_path = build_fundamental()
  > if fundamental_path is None:
  >     print("[pipeline] 재무 팩터 생성 실패 - 건너뜁니다.")
  > else:
  >     print(f"[train] fundamental factors: {fundamental_path}")
  > ```
  > 
  > ---
  > 
  > ### MEDIUM (4건)
  > 
  > **3. `build_fundamental_factors.py` — `_compute_sector_zscores`에서 groupby 결과 미사용**
  > 
  > `for sector, group in df.groupby("gics_sector")`에서 `group`을 사용하지 않고 다시 `df["gics_sector"] == sector` 마스크로 필터링합니다. groupby의 group을 직접 사용하면 더 효율적입니다.
  > 
  > ```python
  > # 현재 (비효율적)
  > for sector, group in df.groupby("gics_sector"):
  >     valid_mask = df["gics_sector"] == sector  # group을 안 쓰고 다시 필터링
  >     vals = df.loc[valid_mask, factor].astype(float)
  > ```
  > 
  > ```python
  > # 개선안
  > for sector, group in df.groupby("gics_sector"):
  >     vals = group[factor].astype(float)
  >     mean, std = vals.mean(), vals.std()
  >     if np.isnan(mean) or std == 0 or np.isnan(std):
  >         df.loc[group.index, zscore_col] = 0.0
  >     else:
  >         df.loc[group.index, zscore_col] = (vals - mean) / std
  > ```
  > 
  > ---
  > 
  > **4. `build_fundamental_factors.py` — `iterrows()` 사용 (성능)**
  > 
  > `_load_dart_financial()`에서 `for _, row in df.iterrows()`를 사용하고 있습니다. pandas의 `iterrows()`는 행 단위로 Series를 생성하므로 느립니다. 벡터화 연산으로 대체하면 대규모 데이터에서 성능이 크게 개선됩니다.
  > 
  > ```python
  > # 개선안: 벡터화 필터링
  > df["as_of_date"] = pd.to_datetime(df["as_of_date"], errors="coerce")
  > df = df[df["as_of_date"] <= reference_date]
  > ```
  > 
  > ---
  > 
  > **5. `build_fundamental_factors.py:305` — 참조일 자동 결정 시 10개 파일만 샘플링**
  > 
  > `_resolve_reference_date()`에서 `[:10]`으로 상위 10개 파일만 확인합니다. `sorted()`는 파일명 기준 정렬이므로, 가장 최신 날짜를 가진 파일이 상위 10개에 포함되지 않을 수 있습니다.
  > 
  > **수정 제안**: 샘플 수를 늘리거나, 마지막 몇 개 파일도 확인하세요 (`[-5:]` 포함).
  > 
  > ---
  > 
  > **6. `build_fundamental_factors.py` — `_safe_divide` 무한대(inf) 미처리**
  > 
  > `_safe_divide`가 `inf` 입력을 체크하지 않습니다. 재무 데이터에서 극단적으로 큰 값이 들어오면 결과가 `inf`가 될 수 있고, 이후 z-score 계산에서 왜곡을 유발합니다.
  > 
  > ```python
  > def _safe_divide(numerator, denominator):
  >     if denominator == 0 or not np.isfinite(denominator) or not np.isfinite(numerator):
  >         return float("nan")
  >     return numerator / denominator
  > ```
  > 
  > ---
  > 
  > ### LOW (2건)
  > 
  > **7. `build_fundamental_factors.py` — 타입 힌트 `dict[str, object]`가 너무 포괄적**
  > 
  > `_compute_ticker_factors`의 반환 타입 `dict[str, object]`는 value 타입 정보가 없어 IDE 자동완성이 동작하지 않습니다. `TypedDict`나 `dict[str, str | float]`를 권장합니다.
  > 
  > ---
  > 
  > **8. `main_train.py` — 재무 팩터 단계가 `--skip-features` 플래그에 영향받지 않음**
  > 
  > 기존 LightGBM, LSTM은 `--skip-features` 시 피처 생성을 건너뛰지만, 재무 팩터는 이 플래그와 무관합니다. 의도적 설계라면 문제없지만, 일관성을 위해 주석으로 명시하면 좋겠습니다.
  > 
  > ---
  > 
  > ### 긍정적 사항
  > 
  > - **Point-in-Time 처리**: `as_of_date` 기반 look-ahead bias 방지가 잘 구현되었습니다.
  > - **섹터 중립 z-score**: GICS 섹터별 표준화로 cross-sectional 비교 가능성을 확보했습니다.
  > - **Fallback 로직**: pykrx -> DART -> 계산 순으로 데이터 소스 우선순위가 명확합니다.
  > - **로깅**: 단계별 진행 상황과 유효 종목 수 로깅이 잘 되어 있습니다.
  > - **MR 설명**: 실행 결과와 검증 수치까지 포함하여 매우 상세합니다.
  > 
  > ---
  > 
  > **최종 판정: COMMENT**
  > 
  > CRITICAL 이슈 없이 전반적으로 잘 구현되었습니다. HIGH 이슈 2건(중복 I/O, None 미처리)은 가능하면 수정을, MEDIUM 이슈들은 후속 개선으로 처리하는 것을 권장합니다.

- 💬 **장호정** (2026-03-10)
  > ## 코드 리뷰 리포트 (2차) - MR \!59
  > 
  > **리뷰어**: AI Code Reviewer
  > **커밋**: 877b1f27 (최초 구현) + 097f8792 (1차 리뷰 반영)
  > **파일 수**: 3
  > 
  > ---
  > 
  > ### 1차 리뷰 반영 확인
  > 
  > | # | 심각도 | 포인트 | 상태 |
  > |---|--------|--------|------|
  > | 1 | HIGH | DART 파일 중복 I/O | 해결 - _load_dart_financials 통합 |
  > | 2 | HIGH | build_fundamental() None 미처리 | 해결 - None 가드 추가 |
  > | 3 | MEDIUM | groupby 결과 미사용 | 해결 - group 직접 사용 |
  > | 4 | MEDIUM | iterrows() 성능 | 해결 - 벡터화 필터링 |
  > | 5 | MEDIUM | 10개 파일만 샘플링 | 해결 - head+tail 샘플링 |
  > | 6 | MEDIUM | _safe_divide inf 미처리 | 해결 - np.isfinite() 적용 |
  > | 7 | LOW | 타입 힌트 포괄적 | 해결 - dict[str, str or float] |
  > | 8 | LOW | --skip-features 일관성 | 해결 - 주석으로 의도 명시 |
  > 
  > 모든 이전 리뷰 포인트가 적절히 해결되었습니다.
  > 
  > ---
  > 
  > ### 2차 리뷰 - 잔여 이슈
  > 
  > #### CRITICAL (0건)
  > 없음
  > 
  > #### HIGH (0건)
  > 없음
  > 
  > #### MEDIUM (1건)
  > 
  > **1. 테스트 코드 부재**
  > 
  > 신규 모듈 build_fundamental_factors.py(578줄)에 대한 단위 테스트가 없습니다. 특히:
  > - _load_dart_financials: Point-in-Time 필터링 정확성
  > - _compute_sector_zscores: 섹터별 z-score 정규화 검증
  > - _safe_divide: 경계값(0, inf, NaN) 처리
  > 
  > 후속 이슈 등록을 권장합니다.
  > 
  > #### LOW (1건)
  > 
  > **2. _resolve_reference_date 중복 샘플링**
  > 
  > all_files[:5] + all_files[-5:]는 파일 10개 미만 시 중복 읽기 발생. dict.fromkeys()로 제거 가능.
  > 
  > ---
  > 
  > ### 긍정적 사항
  > 
  > - 1차 리뷰 피드백 빠르고 정확하게 반영
  > - 리팩토링 후 코드 109줄 감소 + 성능 개선
  > - _load_dart_financials 통합으로 I/O 절반 감소
  > - Point-in-Time, 섹터 중립 z-score, fallback 견고
  > 
  > ---
  > 
  > **최종 판정: APPROVE**
  > 
  > CRITICAL/HIGH 이슈 없음. 머지 가능합니다. 테스트 코드는 후속 이슈로 추적 권장.

---

### !62 · [BE] Feat: S14P21D208-95 소셜 로그인 구현

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `feature/be/oauth-login` → `dev-backend`
- 생성: 2026-03-10 · 머지: 2026-03-10
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/62](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/62)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
>   Google, Naver, Kakao OAuth 소셜 로그인/회원가입 기능 구현
> 
> ## 🧑‍💻 MR 세부 내용
>   - Google, Naver, Kakao OAuth 인가 코드 → 토큰 교환 → 프로필 조회 플로우 구현
>   - 기존 소셜 계정 로그인 / 신규 회원 약관 동의 후 자동 가입 처리
>   - OAuth CSRF 방지를 위한 state 파라미터 검증 (Redis 저장)
>   - OAuth 시작 URL 반환 API (`GET /api/auth/oauth/{provider}/start`)
>   - 소셜 회원가입 약관 동의 API (`POST /api/auth/policy`)
>   - Jira convention.md git 추적 제거
> 
> ## 📎 Issue 번호
> S14P21D208-95

</details>

**리뷰 토론**

- 💬 **강지석** (2026-03-10)
  > ## 🔍 코드 리뷰 — OAuth 포함 Auth 전체 점검                                                                                                                    
  >                                                                                                                                                                  
  >   ### 🔴 Critical (배포 전 반드시 수정)                                                                                                                          
  >                                                                                                                                                                  
  >   **C1. UserController IDOR 취약점**                                                                                                                             
  >   `UserController`에서 `@RequestHeader("X-User-Id")`로 userId를 받고 있음.
  >   헤더 조작만으로 다른 유저의 비밀번호 변경/탈퇴가 가능.                                                                                                         
  >   → JWT SecurityContext에서 userId 추출하도록 수정 필요
  >                                                                                                                                                                  
  >   **C2. JWT tokenVersion DB 검증 누락**
  >   명세 10.4절: JWT 검증 순서에 `tokenVersion(DB)` 비교 포함.                                                                                                     
  >   현재 `JwtAuthenticationFilter`에서 tokenVersion을 꺼내기만 하고 DB와 비교하지 않음.                                                                            
  >   → 비밀번호 재설정 후에도 기존 AT가 만료까지 유효한 상태                                                                                                        
  >                                                                                                                                                                  
  >   **C3. 로그인 타이밍 공격 방어 누락**                                                                                                                           
  >   명세 10.6절: 존재하지 않는 이메일에도 `BCrypt.checkpw(input, DUMMY_HASH)` 수행 필요.                                                                           
  >   현재는 유저 미존재 시 바로 예외 throw → 응답 시간 차이로 이메일 존재 여부 추측 가능                                                                            
  >                                                                                                                                                                  
  >   **C4. OAuth state provider 불일치 검증 누락**                                                                                                                  
  >   `oauthCallback`에서 `consumeOAuthState`로 가져온 provider와 URL path의 provider가 일치하는지 검증 안 함.                                                       
  >   → Google로 시작한 state를 Kakao 콜백에 사용 가능                                                                                                               
  >                                                                                                                                                                  
  >   ---                                                                                                                                                            
  >                                                                                                                                                                  
  >   ### 🟠 High (조기 수정 권장)
  > 
  >   **H1. 비밀번호 변경 시 세션 무효화 안 됨**                                                                                                                     
  >   `UserServiceImpl.updatePassword`에서 tokenVersion 미증가, RT 미삭제.
  >   `resetPassword`는 하고 있으므로 동일하게 적용 필요                                                                                                             
  >                                                                                                                                                                  
  >   **H2. Redis `keys()` 사용**                                                                                                                                    
  >   명세 7.3절: "KEYS 명령 사용 금지". `RedisTokenService.deleteAllRefreshTokens`에서 `redisTemplate.keys(pattern)` 사용 중.                                       
  >   → SCAN 기반으로 변경 필요                                                                                                                                      
  >                                                                                                                                                                  
  >   **H3. JWT 시크릿 기본값 하드코딩**                                                                                                                             
  >   `application.properties`에 기본값이 평문으로 존재. 환경변수 미설정 시 토큰 위조 가능.                                                                          
  >   → 시크릿 미설정 시 애플리케이션 기동 실패하도록 변경 권장                                                                                                      
  >                                                                                                                                                                  
  >   **H4. CORS 배포 도메인 미등록**                                                                                                                                
  >   `SecurityConfig`에 `localhost:3000`, `localhost:5173`만 허용.                                                                                                  
  >   → `http://j14d208.p.ssafy.io` 추가 필요 (환경변수로 관리 권장)                                                                                                 
  >                                                                                                                                                                  
  >   **H5. Step-up 인증 미적용**                                                                                                                                    
  >   명세 10.7절: 비밀번호 변경/회원 탈퇴에 Step-up HIGH 필수.                                                                                                      
  >   `JwtAuthenticationDetails`에 `isElevated()`, `isAuthTimeWithinMinutes()` 구현되어 있으나 어디서도 호출 안 됨                                                   
  >                                                                                                                                                                  
  >   ---                                                                                                                                                            
  >                                                                                                                                                                  
  >   ### 🟡 Medium (다음 스프린트에 수정)                                                                                                                           
  >    
  >   **M1. Redis GET→DELETE 비원자적 (TOCTOU)**                                                                                                                     
  >   `consumeVerifiedToken`, `consumeOAuthState`, `consumeTempToken` 모두 GET 후 DELETE.
  >   동시 요청 시 일회용 토큰 이중 사용 가능.                                                                                                                       
  >   → `GETDEL` (Redis 6.2+) 또는 Lua 스크립트로 원자적 처리                                                                                                        
  >    
  >   **M2. `incrementVerificationAttempts` 레이스 컨디션**                                                                                                          
  >   읽기 → 파싱 → 증가 → 쓰기가 비원자적.
  >   동시 요청 시 max attempt 우회 가능.                                                                                                                            
  >   → Redis INCR 또는 Lua 스크립트로 원자적 처리                                                                                                                   
  >                                                                                                                                                                  
  >   **M3. `getAuthStatus()` 하드코딩**                                                                                                                             
  >   항상 `(false, null, "GUEST")` 반환. 사용 안 할 거면 제거, 쓸 거면 JWT 기반으로 구현                                                                            
  >                                                                                                                                                                  
  >   **M4. `lastLoginAt`에 `now()` 반환**
  >   명세 6.1절: 이전 로그인 시간을 login_history에서 조회해야 함.                                                                                                  
  >   현재 항상 현재 시간 반환                                                                                                                                       
  >                                                                                                                                                                  
  >   **M5. DTO 필드명 명세 불일치**                                                                                                                                 
  >   명세: `termsAgreements` / 코드: `agreements`                                                                                                                   
  >   → 프론트와 합의 후 통일
  >                                                                                                                                                                  
  >   **M6. 닉네임 최소 길이 검증 누락**                                                                                                                             
  >   명세: "2~20자" / 코드: `@Size(max = 20)` → `min = 2` 추가 필요                                                                                                 
  >                                                                                                                                                                  
  >   **M7. `LoginRequest.email`에 `@NotBlank` 누락**                                                                                                                
  >                                                                                                                                                                  
  >   **M8. `OAuthCallbackRequest.redirectUri` 미사용**                                                                                                              
  >   받기만 하고 검증/사용 안 함. 제거하거나 화이트리스트 검증 추가
  >                                                                                                                                                                  
  >   **M9. `OAuthCallbackResponse.TermsDto`에 `url` 필드 누락**                                                                                                     
  >   명세 4.1절: 약관 응답에 `url` 포함. 현재 `termsId`, `title`, `required`만 있음                                                                                 
  >                                                                                                                                                                  
  >   ---                                                                                                                                                            
  >                                                                                                                                                                  
  >   ### 🟢 Low (개선 사항)                                                                                                                                         
  >                   
  >   **L1. `check-email` 최소 200ms 응답 미적용**                                                                                                                   
  >   명세 5.1절: 타이밍 공격 방어를 위해 최소 200ms 보장 필요
  >                                                                                                                                                                  
  >   **L2. `getOAuthStartUrl` 반환값이 provider 인증 URL이 아님**                                                                                                   
  >   현재 `/api/auth/{provider}/callback?state=...` (로컬 콜백 경로)만 반환.                                                                                        
  >   프론트가 직접 provider 인증 URL을 조립하는 구조라면 OK, 아니면 수정 필요                                                                                       
  >                                                                                                                                                                  
  >   **L3. JWT 서명 알고리즘 확인 필요**                                                                                                                            
  >   명세 10.4절: HS512 명시. `signWith(secretKey)`는 키 길이에 따라 HS256이 될 수 있음                                                                             
  >                                                                                                                                                                  
  >   **L4. `sendVerificationCode` 후 `remainingAttempts` 항상 MAX**                                                                                                 
  >   새 코드 저장 시 attempts가 0으로 리셋되므로 반환값이 항상 5 (무의미)                                                                                           
  >                                                                                                                                                                  
  >   **L5. 인증코드 해싱이 명세와 다름**                                                                                                                            
  >   명세 5.2절: SHA256 사용. 현재: BCrypt 사용.                                                                                                                    
  >   동작에는 문제 없으나 6자리 코드에 BCrypt는 불필요하게 느림                                                                                                     
  >                                                                                                                                                                  
  >   ---

---

### !68 · [AI] Feat: S14P21D208-126 LightGBM 모델 성능 개선

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/ai/stock-lgbm-tuning` → `dev-ai`
- 생성: 2026-03-11 · 머지: 2026-03-11
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/68](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/68)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> LightGBM 피처 개선(57개), 이진 분류 전환, 신뢰도 기반 예측 보류를 적용하여 Sharpe +0.325 달성 및 하락장 DA 회복
> 
> ## MR 세부 내용
> 
> ### 1. 피처 개선 (31 -> 57개)
> - 학습 데이터 5년 제한 (rolling window)
> - 수급 피처 정규화 (foreign/institution buy ratio)
> - 재무 팩터 통합 (PER/PBR/ROE z-score)
> - 크로스섹셔널 랭크 표준화 (날짜별 백분위 13개)
> - 반전 감지 피처 (momentum_accel, rsi_divergence, volume_climax)
> 
> ### 2. 이진 분류 전환
> - 3-class (상/횡/하) -> 2-class (상위50%/하위50%)
> - objective: multiclass -> binary
> - 횡보 클래스 제거로 예측 단순화
> 
> ### 3. 신뢰도 기반 예측 보류
> - CONFIDENCE_THRESHOLD=0.55 기준 저신뢰 예측 보류
> - cDA(confident DA) 윈도우별 출력
> - 하락장 DA 38.8% -> cDA 51.1% (+12.4%p 회복)
> 
> ## Walk-Forward 검증 결과 (3개월 21윈도우)
> - DA: 48.3%, cDA: ~50%
> - Sharpe: +0.325 (양수 전환)
> - MDD: -7.1% (목표 -15% 충족)
> - 성능 추세: +0.086 (상승)
> - 최근 2026-Q1: DA=61.8%
> 
> ## Issue 번호
> S14P21D208-126

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-11)
  > ## 코드 리뷰 리포트 - MR #68
  > 
  > **리뷰어**: AI Code Reviewer
  > **파일 수**: 3
  > **전체 이슈**: 6건
  > 
  > ---
  > 
  > ### CRITICAL (0건)
  > 없음
  > 
  > ### HIGH (0건)
  > 없음
  > 
  > ### MEDIUM (3건)
  > 
  > **1. build_lgbm_features.py - rsi_divergence inf 위험**
  > 
  > rsi_divergence 계산에서 rolling mean이 0에 가까우면 나눗셈으로 inf 발생 가능. replace(0, np.nan) 적용 권장.
  > 
  > **2. lgbm_trainer.py - 매 윈도우마다 251MB parquet 재로드**
  > 
  > train_and_predict_window 호출 시 21회 전체 로드. 모듈 레벨 캐싱으로 30% 이상 성능 개선 가능.
  > 
  > **3. walk_forward_validator.py - lgbm_df+fwd_df 이중 merge**
  > 
  > simple_avg용 merge와 confident_da용 merge가 별도 수행. 1회 merge 결과 재사용 권장.
  > 
  > ### LOW (3건)
  > 
  > **4.** momentum_accel을 TECH_FEATURES가 아닌 별도 REVERSAL_FEATURES로 분리 권장
  > **5.** binary 분류에서 accuracy와 direction_accuracy 중복 (주석 명시 권장)
  > **6.** CONFIDENCE_THRESHOLD CLI 파라미터화 권장
  > 
  > ### 긍정적 사항
  > 
  > - 크로스섹셔널 랭크: groupby(date).rank(pct=True) 구현 깔끔
  > - 이진 분류 전환: params/predict/evaluate 일관 반영
  > - 반전 피처 설계: momentum_accel 직관적
  > - 신뢰도 필터링: coverage 비율 추적 포함
  > - 기존 main() 미변경: 하위 호환 유지
  > 
  > ---
  > 
  > **최종 판정: APPROVE**
  > 
  > CRITICAL/HIGH 없음. 머지 가능합니다.

---

### !70 · [BE] Feat: S14P21D208-124 REPORT 관련 API 구현

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `feature/be/report-api-002-005` → `dev-backend`
- 생성: 2026-03-11 · 머지: 2026-03-11
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/70](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/70)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 종목 상세 리포트 화면에 필요한 report API를 API 명세/ERD 기준으로 구현하고, 의장 분석과 토론 기록은 REPORT-001 형태의 통합 이력 API로 정리했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - report 도메인 API를 실제 DB 조회형으로 구현
> - `GET /api/report/{stockId}`를 REPORT-001 기준의 통합 이력 API로 구현
>   - 응답: 날짜별 리스트
>   - 각 원소에 `date`, `chairman`, `debate` 포함
> - 기존 단건 의장 분석 API 의미와 `GET /api/report/{stockId}/debate` 엔드포인트 제거
> - 아래 API 구현
>   - `GET /api/report/{stockId}`
>   - `GET /api/report/{stockId}/performance`
>   - `GET /api/report/{stockId}/performance/trades`
> - `ai_debate_reports` 기반으로 의장 분석/토론 기록 응답 매핑
> - `ai_trading_history` 기반으로 종목별 매매 내역 응답 구현
> - 전역 AI 포트폴리오 기준으로 성과 요약 및 차트 응답 구현
>   - 차트: `ai_daily_performance.cumulative_return`
>   - 해당 종목 marker: `ai_trading_history`
>   - 해당 종목 현재 수익률: `ai_portfolio_holdings.return_rate`
> - report/performance/debate 전용 DTO 추가
> - 부족한 repository 추가 및 조회 메서드 보강
> - JSONB 컬럼(`debate_summary`, `debate_full_log`, `final_stances`) 파싱을 위해 엔티티 필드를 `JsonNode`로 정리
> - backend 로컬 빌드 검증 완료
>   - `./mvnw -q -DskipTests package`
> 
> ## 📎 Issue 번호
> - S14P21D208-124

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-11)
  > ## 전체 요약
  > 
  > REPORT 도메인 API 3개를 구현한 MR입니다. 전반적으로 구조가 깔끔하고, JSONB 파싱 로직도 방어적으로 잘 작성되어 있습니다. 아래 몇 가지 이슈와 개선점이 있습니다.
  > 
  > ---
  > 
  > ## 1. 잠재적 버그
  > 
  > ### 1-1. `getPerformanceTrades()`에서 `tradePriceRate`를 `price`로 매핑
  > 
  > `new TradeItem(
  >     trade.getTradeType().name(),
  >     trade.getTradeTime(),
  >     trade.getTradePriceRate(),  // DB: "체결가 (퍼센트/비율)"
  >     trade.getReturnRate()
  > )
  > `
  > 
  > * DB 스키마 주석에 `trade_price_rate`는 \*\*"체결가 (퍼센트/비율)"\*\*로 되어 있고, DTO 필드명은 `price`입니다. 실제 체결 가격인지, 비율인지 의미가 혼동될 수 있으니 확인이 필요합니다.
  > 
  > ### 1-2. `calculateWinRate` 반환 단위
  > 
  > `return (float) winningCount * 100 / sellCount;
  > `
  > 
  > * 100을 곱해서 퍼센트 단위(예: 75.0)로 반환하는데, `PerformanceResponse`의 다른 필드(`cumulative_return`, `recent_return`)와 단위가 통일되는지 확인해주세요 (소수점 비율 vs 퍼센트).
  > 
  > ### 1-3. `dailyPerformances` 데이터 크기
  > 
  > `List<AiDailyPerformance> dailyPerformances = aiDailyPerformanceRepository
  >     .findByPortfolioIdOrderByRecordDateAsc(portfolio.getId());
  > `
  > 
  > * 기간 제한 없이 전체 조회하고 있어서, 데이터가 누적되면 응답 크기가 커질 수 있습니다. 필요 시 기간 제한이나 페이징을 고려해보세요.
  > 
  > ---
  > 
  > ## 2. 설계 관련 피드백
  > 
  > ### 2-1. `ReportService` 인터페이스에 레거시 메서드 잔존
  > 
  > `public interface ReportService {
  >     StockReportResponse getLatestReport(String ticker);  // Controller에서 미사용
  >     List<ReportHistoryItemResponse> getReportHistory(Long stockId);
  >     ...
  > }
  > `
  > 
  > * `getLatestReport(String ticker)`는 Controller에서 더 이상 호출되지 않습니다. 인터페이스/구현체/`StockReportResponse` DTO 모두 정리하는 게 좋습니다.
  > 
  > ### 2-2. 생성자 주입 방식 불일치
  > 
  > * `ReportController`는 `@RequiredArgsConstructor` 사용
  > * `ReportServiceImpl`은 수동 생성자 6개 파라미터 직접 작성
  > * 필드에 `final` + `@RequiredArgsConstructor`로 통일하면 간결해집니다.
  > 
  > ---
  > 
  > ## 3. 사소한 개선점
  > 
  > ### 3-1. DTO 필드명 컨벤션
  > 
  > * Record 필드가 `snake_case` (`final_stances`, `created_at`, `round_no` 등)로 되어 있어, Java 코드에서 `report.created_at()`처럼 호출됩니다.
  > * `camelCase` 필드 + Jackson `@JsonNaming(SnakeCaseStrategy.class)` 또는 글로벌 설정으로 변환하는 방식이 더 자연스럽습니다.
  > 
  > ### 3-2. 권한 체크
  > 
  > * Controller에 `@PreAuthorize` 등 인증 관련 어노테이션이 없습니다. Spring Security에서 전역으로 처리하는 것이라면 괜찮지만, 확인이 필요합니다.
  > 
  > ### 3-3. Repository 메서드명
  > 
  > `findTopByStockIdOrderByReportDateDescCreatedAtDesc
  > findByPortfolioIdAndStockIdOrderByTradeTimeDesc
  > `
  > 
  > * 동작에는 문제없지만, 너무 길어질 경우 `@Query`로 가독성을 높이는 것도 방법입니다.
  > 
  > ---
  > 
  > ## 최종 판단
  > 
  > | 항목 | 상태 |
  > |----|----|
  > | 빌드 | 통과 |
  > | 잠재 버그 | **주의 3건** (1-1, 1-2, 1-3) |
  > | 코드 품질 | 양호 (JSONB 파싱 방어코드 잘 작성) |
  > | 레거시 정리 | 미완 (`getLatestReport` 잔존) |
  > 
  > **레거시 메서드 정리와 단위 통일 확인 후 머지를 권장합니다.**
  - ↳ **최규직** (2026-03-11)
    > # 추가 커밋에서는 아래 내용만 반영했습니다.
    > 
    > - `/api/report/{stockId}` 에 `offset`, `limit` 쿼리 추가
    >   - report history 이력 리스트를 페이지네이션 가능하게 수정
    > - `/api/report/{stockId}/performance/trades` 에 `offset`, `limit` 쿼리 추가
    >   - 모달 거래내역 리스트를 페이지네이션 가능하게 수정
    > - `/api/report/{stockId}/performance` 는 페이지네이션 제거
    >   - 전체 차트 데이터를 그대로 내려주도록 원복
    > - `history`, `trades` 페이지네이션은 DB 조회 단계에서 `OFFSET/LIMIT`으로 처리하도록 수정
    > - `NewsController` 스타일에 맞춰 report controller Swagger 설명 추가
    >   - `@Tag`, `@Operation`, `@Parameter`
    > - report 응답 DTO들에 Swagger `@Schema(description=...)` 추가
    > - 자바 필드명은 camelCase, 응답 JSON은 snake_case 유지하도록 정리
  - ↳ **이혜민** (2026-03-11)
    > ### 1. (중요) `getReportHistory`에서 데이터 없으면 예외 발생
    > 
    > `if (reports.isEmpty()) {
    >     throw new BusinessException(ReportErrorCode.REPORT_NOT_FOUND);
    > }
    > `
    > 
    > * 조회 API에서 결과가 없을 때 **예외**를 던지는 것은 일반적이지 않습니다.
    > * 빈 리스트 `[]`를 반환하는 게 REST API 관례에 맞고, 프론트에서도 처리가 간편합니다.
    > * 단건 조회(`findById`)가 아닌 **목록 조회**이므로 빈 결과는 정상 케이스입니다.
    > 
    > ### 2. (중요) `getPerformance`에서 전체 dailyPerformance 무제한 조회
    > 
    > `List<AiDailyPerformance> dailyPerformances = aiDailyPerformanceRepository
    >     .findByPortfolioIdOrderByRecordDateAsc(portfolio.getId());
    > `
    > 
    > * 기간 제한 없이 전체를 가져오므로, 데이터가 수년 쌓이면 응답이 매우 커집니다.
    > * 최근 N일(예: 90일, 365일) 제한이나 페이징을 고려해주세요.
    > 
    > ### 3. (중간) `getPerformance`에서 trades도 전체 조회
    > 
    > `List<AiTradingHistory> trades = aiTradingHistoryRepository
    >     .findByPortfolioIdAndStockIdOrderByTradeTimeDesc(portfolio.getId(), stockId);
    > `
    > 
    > * 페이징 없는 오버로드를 사용해 전체 거래 내역을 가져옵니다.
    > * `buildTradeMarkers`와 `calculateWinRatePercent` 양쪽에서 쓰이긴 하지만, 거래 수가 많아지면 메모리 부담이 있습니다.
    > 
    > ### 4. (경미) `calculateWinRatePercent` 캐스팅 순서
    > 
    > `return (float) winningCount * 100 / sellCount;
    > `
    > 
    > * 동작은 정상이지만 `(float) (winningCount * 100) / sellCount`로 의도를 명확히 하면 가독성이 좋아집니다.
    > * `winningCount * 100`이 long 연산이라 오버플로우 가능성은 사실상 없지만, 명시적이면 더 좋습니다.
    > 
    > ### 5. (경미) `buildTradeMarkers`에서 같은 날 여러 거래 시 첫 건만 표시
    > 
    > `markers.putIfAbsent(trade.getTradeTime().toLocalDate(), trade.getTradeType().name());
    > `
    > 
    > * 같은 날 BUY → SELL이 모두 있으면 시간순 정렬 후 첫 건(BUY)만 마커에 들어갑니다.
    > * 의도된 동작이면 괜찮지만, 프론트에서 "이 날은 매수/매도 모두 있었다"를 표현하고 싶다면 마커 구조를 리스트로 변경할 수 있습니다.
    > 
    > ### 6. (경미) `ReportErrorCode` 파일이 diff에 없음
    > 
    > * `ReportErrorCode.REPORT_NOT_FOUND`를 사용하는데, 해당 파일 변경이 이 MR에 포함되어 있지 않습니다.
    > * 이미 존재하는 파일이면 괜찮지만, 새로 만든 거라면 MR에 포함시켜야 합니다.
    > 
    > ---
    > 
    > ## 최종 판단
    > 
    > | 항목 | 상태 |
    > |----|----|
    > | 이전 리뷰 피드백 반영 | 대부분 반영됨 |
    > | 코드 구조/가독성 | 양호 (JSONB 파싱 방어코드 깔끔) |
    > | 잠재 이슈 | **목록 조회 시 예외 던지기** (1번), **무제한 조회** (2, 3번) |
    > | Swagger 문서화 | 잘 되어 있음 |
    > 
    > **1번(빈 목록에 예외)과 2번(dailyPerformance 무제한 조회)만 수정하면 머지해도 좋을 것 같습니다.**

---

### !71 · [FE] Feat: S14P21D208-90 종목 리스트 UI 구현

- 작성자: **정준용** · 상태: `closed`
- 브랜치: `feature/fe/stocklist-ui` → `dev-frontend`
- 생성: 2026-03-11 · 머지: -
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/71](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/71)

<details><summary>MR 설명</summary>

> 종목 리스트 UI 구현
> 
> - 50개 단위 pagenation 처리
> - mock 데이터 활용 확인 완료
> - 리스트 이동 시 자연스러운 애니메이션 활용
> - motion 라이브러리 활용

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-11)
  > ## 코드 리뷰 리포트 - MR #71
  > 
  > **리뷰어**: AI Code Reviewer (Frontend)
  > **파일 수**: 22 (20개 리뷰)
  > **전체 이슈**: 9건
  > 
  > ---
  > 
  > ### CRITICAL (0건)
  > 없음
  > 
  > ### HIGH (1건)
  > 
  > **1. StocksPageClient.tsx:53 - className에 class= 오타**
  > 
  > className 문자열에 class= 접두어가 포함되어 있어 레이아웃이 깨집니다.
  > 
  > 현재: className="class=mx-auto flex w-full ..."
  > 수정: className="mx-auto flex w-full ..."
  > 
  > ---
  > 
  > ### MEDIUM (5건)
  > 
  > **2. StocksDesktopTable.tsx:119 - 잘못된 metric value 전달**
  > 
  > activeMetric이 RETURN이 아닐 때 item.id를 value로 전달하고 있습니다. item.id는 종목 식별자이지 재무 수치가 아닙니다.
  > 
  > 수정: value={getMetricValue(item, activeMetric)} 사용
  > 
  > **3. AppNav.tsx:200-216 - IIFE 패턴 불필요**
  > 
  > map 내부에서 (() => { ... })() IIFE를 사용하고 있습니다. 일반 블록 화살표 함수로 충분합니다.
  > 
  > 수정: navItems.map((item) => { const isActive = ...; return (...); })
  > 
  > **4. StocksDesktopTable / StocksMobileList - StockLogo 및 rowLayoutTransition 중복**
  > 
  > 두 파일에 동일한 StockLogo 컴포넌트와 rowLayoutTransition 상수가 복사되어 있습니다. DRY 위반.
  > 
  > 수정: stocks/components/StockLogo.tsx로 분리
  > 
  > **5. useWatchlist.ts - onSettled 제거로 인한 stale data 위험**
  > 
  > onSettled에서 watchlist 쿼리 invalidation이 제거되었습니다. watchlist 토글 후 스크랩 페이지에서 stale data가 표시될 수 있습니다.
  > 
  > 수정: watchlistQueryKeys.all invalidation 유지 권장
  > 
  > **6. StocksDesktopTable.tsx:38 - 컴포넌트 내부 key prop 무효**
  > 
  > DesktopSkeletonRow 내부 div에 key가 있지만, 컴포넌트 내부의 key는 React에서 무시됩니다. 호출 시점의 key만 유효합니다.
  > 
  > ---
  > 
  > ### LOW (3건)
  > 
  > **7. StocksSortTabs.tsx:21 - compact ternary 무효**
  > 
  > compact ? "py-4" : "py-4" - 양쪽 동일한 값. 의도적이면 ternary 제거, 아니면 compact 시 py-3 등 차별화.
  > 
  > **8. SkeletonRow index prop 미사용**
  > 
  > key 제거 시 index prop도 불필요. 제거 권장.
  > 
  > **9. "더보기" 버튼 aria-label 미설정**
  > 
  > 동적 텍스트 변경 시 스크린 리더 지원을 위해 aria-label="다음 종목 불러오기" 추가 권장.
  > 
  > ---
  > 
  > ### 긍정적 사항
  > 
  > - 서버/클라이언트 컴포넌트 분리 (page.tsx server -> StocksPageClient client) 적절
  > - TypeScript 타입 정의 깔끔 (any 사용 없음)
  > - API route handler에서 Set 기반 whitelist 입력 검증
  > - useInfiniteQuery 사용 및 getNextPageParam 로직 적절
  > - useMemo로 정렬 결과 캐싱
  > - XSS 위험 없음 (dangerouslySetInnerHTML 미사용)
  > - motion 라이브러리 활용한 자연스러운 애니메이션
  > 
  > ---
  > 
  > **최종 판정: REQUEST CHANGES**
  > 
  > HIGH 이슈 1건 (class= 오타)은 레이아웃이 깨지므로 반드시 수정 필요. MEDIUM #2 (item.id를 metric value로 전달)도 잘못된 지표 표시 원인이므로 함께 수정 권장.

---

### !72 · [BE] Feat: S14P21D208-95 약관 API 및 DB 연동 구현

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `feature/be/policy-terms` → `dev-backend`
- 생성: 2026-03-11 · 머지: 2026-03-11
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/72](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/72)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> [BE] Feat: S14P21D208-95 약관 API 및 DB 연동 구현
> 
> ## 🧑‍💻 MR 세부 내용
> - TermType enum 수정 (MARKETING → INVESTMENT_DISCLAIMER)
> - Flyway V2 마이그레이션 추가 (3개 약관 본문 데이터 포함)
> - PolicyController v1 제거 및 /api/policy 경로로 변경
> - GET /api/policy/list 약관 목록 조회 API 추가
> - PolicyServiceImpl DB 연동 (하드코딩 제거)
> - SecurityConfig /api/policy/** permitAll 추가
> 
> ## 📎 Issue 번호
> S14P21D208-95
> 
> 
> Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-11)
  > ## 전체 요약
  > 
  > 약관 API를 하드코딩에서 DB 연동으로 전환하고, Flyway V2 마이그레이션으로 약관 데이터를 시딩하는 MR입니다. 변경 범위가 적절하고 명확합니다. 아래 몇 가지 피드백이 있습니다.
  > 
  > ---
  > 
  > ## 1. 주요 이슈
  > 
  > ### 1-1. 응답에 `Map<String, Object>` 사용
  > 
  > `public ApiResponse<List<Map<String, Object>>> list() { ... }
  > public ApiResponse<Map<String, Object>> terms() { ... }
  > `
  > 
  > * `Map<String, Object>`는 타입 안전성이 없고, API 스펙을 코드만 보고 파악하기 어렵습니다.
  > * 다른 도메인(report 등)에서는 전용 DTO Record를 사용하고 있습니다. `TermsResponse`, `TermsSummaryResponse` 같은 DTO를 만드는 것을 권장합니다.
  > 
  > ### 1-2. `buildResponse`에서 `enforcedAt` null 처리
  > 
  > `"enforcedAt", terms.getEnforcedAt() != null ? terms.getEnforcedAt().toString() : ""
  > `
  > 
  > * `Map.of()`는 **null value를 허용하지 않기** 때문에 빈 문자열로 처리한 것으로 보입니다. 하지만 프론트에서 빈 문자열 `""`과 미설정을 구분해야 할 수 있습니다.
  > * DTO를 사용하면 Jackson이 `null`을 자동 처리하므로 이 문제가 해결됩니다.
  > 
  > ---
  > 
  > ## 2. 설계 관련 피드백
  > 
  > ### 2-1. 3개의 개별 메서드 중복
  > 
  > `public Map<String, Object> getTerms() {
  >     Terms terms = termsRepository.findByTermTypeAndIsActiveTrue(TermType.SERVICE)...
  >     return buildResponse(terms);
  > }
  > public Map<String, Object> getPrivacy() {
  >     Terms terms = termsRepository.findByTermTypeAndIsActiveTrue(TermType.PRIVACY)...
  >     return buildResponse(terms);
  > }
  > public Map<String, Object> getDisclaimer() {
  >     Terms terms = termsRepository.findByTermTypeAndIsActiveTrue(TermType.INVESTMENT_DISCLAIMER)...
  >     return buildResponse(terms);
  > }
  > `
  > 
  > * 세 메서드가 `TermType`만 다르고 로직이 동일합니다. `getByType(TermType type)` 하나로 통합하고, Controller에서 타입을 전달하는 방식이 더 간결합니다.
  > * 다만 현재 규모에서는 큰 문제는 아닙니다.
  > 
  > ---
  > 
  > ## 3. Flyway 마이그레이션
  > 
  > ### 3-1. 약관 본문 시행일
  > 
  > `부칙
  > 본 약관은 2025년 3월 11일부터 시행합니다.
  > `
  > 
  > * 약관 본문 내 시행일이 `2025년 3월 11일`로 되어 있는데, 현재 날짜 기준(`2026년`)과 맞지 않습니다. 의도된 것인지 확인해주세요.
  > 
  > ### 3-2. 기존 데이터와의 충돌
  > 
  > * `INSERT`만 있고 기존 데이터 정리 로직이 없습니다. 만약 같은 `term_type`의 `is_active=true` 데이터가 이미 존재하면, `findByTermTypeAndIsActiveTrue`가 여러 건을 반환할 수 있고, `Optional`에서 예외가 발생합니다.
  > * 안전하게 하려면 INSERT 전에 기존 동일 타입의 `is_active`를 `false`로 UPDATE하는 것이 좋습니다.
  > 
  > ### 3-3. 오타
  > 
  > `투자자는 ... 스스로 투자 대상의 가치를 판단하여야 합니다.
  > `
  > 
  > * `스스로` → `스스로` (맞춤법: `스스로`가 맞긴 하지만 `스스로`보다 `스스로`... 사실 `스스로`가 맞습니다. 무시하셔도 됩니다!)
  > 
  > ---
  > 
  > ## 최종 판단
  > 
  > | 항목 | 상태 |
  > |----|----|
  > | 빌드 | 통과 (추정) |
  > | 코드 품질 | 양호 (하드코딩 제거, DB 연동 전환 깔끔) |
  > | 주요 이슈 | `Map<String, Object>` → DTO 전환 권장, 기존 데이터 충돌 방어 필요 |
  > | 마이그레이션 | 시행일 확인, 중복 INSERT 방어 추가 권장 |
  > 
  > **DTO 전환은 후속 작업으로 해도 되고, 기존 데이터 충돌 방어만 V2 마이그레이션에 추가하면 머지 가능합니다.**

---

### !73 · [AI] Feat: S14P21D208-128 Streamlit 데이터 파이프라인 대시보드 구현

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/ai/streamlit-dashboard` → `dev-ai`
- 생성: 2026-03-11 · 머지: 2026-03-11
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/73](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/73)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 데이터 수집 파이프라인의 현황, 품질, 탐색을 시각화하는 Streamlit 대시보드 구현
> 
> ## MR 세부 내용
> - dashboard/app.py: Streamlit 멀티페이지 앱 진입점 (사이드바 네비게이션)
> - dashboard/pages/1_overview.py: 데이터 현황 페이지 (종목별 수집 상태, 매크로 지표 현황, 파일 수/용량)
> - dashboard/pages/2_quality.py: 데이터 품질 페이지 (NaN 비율, 피처 스케일 분포, 종목별 완결성)
> - dashboard/pages/3_explore.py: 데이터 탐색 페이지 (OHLCV/수급/매크로/펀더멘털 인터랙티브 차트)
> - requirements.txt에 streamlit, plotly 의존성 추가
> 
> ## Issue 번호
> S14P21D208-128

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-11)
  > ## 코드 리뷰 - MR !73
  > 
  > **Files Reviewed**: 5
  > **Total Issues**: 7
  > 
  > ### HIGH (2)
  > 
  > **1. 3_explore.py:48-65 - sector_mapping.json 파싱이 tickers 키를 무시함**
  > 
  > `sector_mapping.json`의 실제 구조는 `{"tickers": {"005930": {"name": "삼성전자", ...}}}`인데,
  > `_load_sector_mapping()`이 최상위 키를 순회하므로 `tickers`, `meta` 등의 키가 종목으로 잘못 매핑됩니다.
  > 
  > ```python
  > # 현재 (잘못됨)
  > for k, v in data.items():  # k = "tickers", "meta" 등
  > 
  > # 수정 필요
  > ticker_data = data.get("tickers", data)
  > for k, v in ticker_data.items():
  > ```
  > 
  > **2. 2_quality.py:148-171 - 재무 파일 10,000+개 전체 순회 성능 문제**
  > 
  > `_check_financial_quality()`가 10,427개 재무 parquet 파일을 모두 읽습니다.
  > 파일당 `pd.read_parquet` 호출이므로 수분~수십 분 소요될 수 있습니다.
  > 캐시(ttl=300)가 있지만 첫 로드 시 브라우저가 타임아웃될 수 있습니다.
  > 
  > -> 샘플링(100개 등) 또는 파일 메타데이터만 읽는 방식으로 변경 권장
  > 
  > ### MEDIUM (3)
  > 
  > **3. 1_overview.py:149-150 - sector_mapping 파싱이 tickers 키를 고려하지 않음**
  > 
  > `_load_sector_mapping()`이 raw dict를 반환하는데, `render_ticker_status_table()`에서
  > `sector_mapping.get(ticker, {})`로 접근합니다. 실제 종목 데이터는 `tickers` 키 아래에 있으므로
  > 항상 빈 dict가 반환되어 종목명/섹터가 모두 "-"로 표시됩니다.
  > 
  > -> `_load_sector_mapping()`에서 `data.get("tickers", data)` 반환하도록 수정
  > 
  > **4. 3_explore.py:583-586 - 불필요한 이중 main() 호출**
  > 
  > ```python
  > if __name__ == "__main__":
  >     main()
  > else:
  >     main()
  > ```
  > Streamlit 페이지는 항상 실행되므로 단순히 `main()`만 호출하면 됩니다.
  > 
  > **5. 1_overview.py:158 - 종목 수가 많을 때 느린 순차 parquet 읽기**
  > 
  > `_get_parquet_last_date()`를 337개 종목에 대해 순차 호출합니다.
  > 각 parquet의 metadata만 읽어도 되므로 pyarrow metadata 활용이 더 효율적입니다.
  > 
  > ### LOW (2)
  > 
  > **6. app.py:22 - sys.path 조작이 여러 파일에 중복**
  > 
  > 4개 파일 모두 `sys.path.insert(0, ...)`를 개별적으로 수행합니다.
  > `dashboard/__init__.py`에서 한 번만 하거나, PYTHONPATH 환경변수로 통일하면 깔끔합니다.
  > 
  > **7. 2_quality.py - base_features.parquet 품질 분석이 누락**
  > 
  > 스킬 설명에서 요구한 "NaN 비율 바 차트", "피처 스케일 분포", "종목별 완결성 히트맵"이
  > 현재 구현에는 없습니다. 원시 파일별 결측률 점검만 있어서 가공 데이터 품질 확인이 불가합니다.
  > 
  > ---
  > 
  > ### RECOMMENDATION: REQUEST CHANGES
  > 
  > HIGH 이슈 2건(sector_mapping 파싱 오류, 재무 파일 성능)을 수정한 후 머지 권장합니다.

- 💬 **장호정** (2026-03-11)
  > ## 코드 리뷰 (2차) - MR !73
  > 
  > 이전 리뷰 피드백 반영 확인 + 재검토입니다.
  > 
  > ### 이전 이슈 반영 확인
  > 
  > | 이슈 | 상태 |
  > |------|------|
  > | HIGH-1: 3_explore.py sector_mapping tickers 키 | FIXED (58행 `data.get("tickers", data)`) |
  > | HIGH-2: 2_quality.py 재무 파일 성능 | FIXED (149행 `sample_size=100`, 랜덤 샘플링) |
  > | MEDIUM-3: 1_overview.py sector_mapping 파싱 | FIXED (59-60행 `raw.get("tickers", raw)`) |
  > | MEDIUM-4: 3_explore.py 이중 main() | FIXED (584행 단일 `main()`) |
  > | MEDIUM-5: 1_overview.py 캐시 분리 | FIXED (121행 `@st.cache_data` 적용) |
  > 
  > ### 남은 이슈
  > 
  > **MEDIUM (1)**
  > 
  > 1. `2_quality.py:152,156` - `random.sample` 캐시 비결정성
  > 
  > `@st.cache_data`로 캐시된 함수 안에서 `random.sample`을 사용하면, 같은 인자(`sample_size=100`)로 호출 시 **캐시된 결과가 반환**되어 실제로는 매번 같은 샘플이 사용됩니다 (TTL 만료 전까지). 이는 의도된 동작일 수 있으나, "캐시 초기화 및 재검사" 버튼 클릭 시 다른 샘플이 선택되어 결과가 달라질 수 있다는 점을 사용자에게 안내하면 좋겠습니다. 현재 caption에 "샘플 검사"라고 표시되어 있어 크게 문제는 아닙니다.
  > 
  > **LOW (2)**
  > 
  > 2. `1_overview.py:135` - 재무 파일명 파싱이 `_` 1개 기준 rsplit
  > 
  > 재무 파일명이 `{ticker}_{quarter}_{date}.parquet` (예: `005930_2024Q03_20260305.parquet`) 형태인데, `rsplit("_", 1)`로 마지막 `_` 하나만 분리하면 `parts[0]`이 `005930_2024Q03`이 됩니다. ticker만 추출하려면 `split("_", 1)[0]`이 더 정확합니다. 다만 현재는 `financial_tickers`를 set으로 모아서 `has_financial` 체크에만 쓰므로 실질적 버그는 아닙니다 (같은 ticker의 여러 파일이 모두 같은 prefix를 공유).
  > 
  > 3. `app.py` + pages - sys.path 중복 (이전 LOW-6, 유지)
  > 
  > 4개 파일 모두 `sys.path.insert(0, ...)`를 개별 수행. 기능상 문제 없으나 정리하면 깔끔합니다.
  > 
  > ---
  > 
  > ### RECOMMENDATION: APPROVE
  > 
  > 이전 HIGH/MEDIUM 이슈 5건 모두 수정 확인. 남은 이슈는 LOW/MEDIUM으로 머지 차단 사유가 아닙니다. 머지해도 좋습니다.

---

### !75 · [BE] Feat: S14P21D208-123 FS-NOTI 알림 API 구현

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `feature/be/notification-api` → `dev-backend`
- 생성: 2026-03-11 · 머지: 2026-03-11
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/75](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/75)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> FS-NOTI 알림 API 6종을 구현하고 리뷰 반영으로 인증 공통화 및 삭제 API 요청 방식을 정리했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - `/api/notifications/unread-count`, `/list`, `/{notificationId}`, `/read-all`, `DELETE /{notificationId}`, `DELETE /api/notifications` 구현
> - JWT 인증 사용자 기준으로 알림 조회/읽음/삭제가 동작하도록 연동
> - 알림 보관 기간 30일, 페이지당 최대 6건, 미확인 알림 수 `99+` 정책 반영
> - notification DTO를 snake_case 응답 구조와 Swagger 스키마 기준으로 정리
> - `user_notifications`, `stock_notifications`, `stocks` 조인 기반 조회/일괄 읽음/일괄 삭제 쿼리 추가
> - 리뷰 반영:
>   - `AuthenticatedUserProvider` 추가로 controller의 인증 사용자 조회 공통화
>   - 알림 일괄 삭제 API를 DELETE body 대신 query param 방식으로 변경
>   - notification query builder/tab 바인딩 중복 정리
>   - retention cutoff 시각을 서비스 메서드당 1회 계산으로 정리
>   - 테스트 setup을 `CREATE IF NOT EXISTS + DELETE` 방식으로 경량화
> - `NotificationControllerTest` 기준 API 시나리오 검증 완료
> 
> ## 📎 Issue 번호
> <!-- closed #123 -->

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-11)
  > ## 잘 된 부분
  > 
  > * API 6종 완성도 높음 (unread-count, list, 읽음, 전체 읽음, 삭제, 일괄 삭제)
  > * 30일 보관 정책 일관 적용
  > * 99+ 배지 포맷 깔끔
  > * 테스트 충실 (6개 시나리오 + 보관 만료 데이터 커버)
  > * `NotificationTab` enum `from()` 안전 파싱
  > * `NotifyType` → 응답값 변환 분리
  > * Swagger 문서화 충실
  > * `nullable` 수정이 DB 스키마와 일치
  > 
  > ---
  > 
  > ## 이슈
  > 
  > ### 1. (중요) Controller에서 직접 `SecurityContextHolder` 접근
  > 
  > `private Long getAuthenticatedUserId() {
  >     Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
  >     ...
  > }
  > `
  > 
  > * Controller마다 복사해야 합니다. **공통 유틸 또는 `@AuthenticationPrincipal` 커스텀 어노테이션**으로 분리하는 게 좋습니다.
  > 
  > ### 2. (중간) `DELETE` 요청에 `@RequestBody` 사용
  > 
  > `@DeleteMapping
  > public ApiResponse<NotificationBulkActionResponse> deleteNotifications(
  >     @RequestBody NotificationTabRequest request
  > )
  > `
  > 
  > * HTTP DELETE에 body는 일부 클라이언트/프록시에서 무시될 수 있습니다.
  > * `@RequestParam`으로 받는 게 더 안전합니다: `DELETE /api/notifications?tab=SURGE`
  > 
  > ### 3. (중간) Native Query StringBuilder 패턴 3곳 반복
  > 
  > `StringBuilder query = new StringBuilder("""...""");
  > if (tab != NotificationTab.ALL) {
  >     query.append("AND sn.noti_type = :notiType");
  > }
  > `
  > 
  > * `findNotifications`, `markAllAsRead`, `deleteAll`에서 동일 패턴 반복됩니다.
  > * tab 조건 WHERE절 생성 헬퍼 메서드로 추출하면 중복을 줄일 수 있습니다.
  > 
  > ### 4. (중간) `retentionCutoff()` 매 호출마다 새 시각 생성
  > 
  > `private OffsetDateTime retentionCutoff() {
  >     return OffsetDateTime.now().minusDays(RETENTION_DAYS);
  > }
  > `
  > 
  > * 같은 트랜잭션 내에서 여러 번 호출 시 미세하게 다른 시각이 됩니다.
  > * 메서드 단위로 한 번 계산해서 파라미터로 넘기는 게 더 정확합니다.
  > 
  > ### 5. (경미) 테스트에서 매번 테이블 DROP/CREATE
  > 
  > `@BeforeEach
  > void setUp() {
  >     recreateTables();
  >     seedData();
  > }
  > `
  > 
  > * 무겁습니다. `@Sql` 어노테이션이나 `TRUNCATE` 방식이 더 가볍습니다.
  > 
  > ---
  > 
  > ## 최종 판단
  > 
  > | 항목 | 상태 |
  > |----|----|
  > | 기능 완성도 | 6개 API 모두 구현 |
  > | DB 스키마 일치 | 확인 완료 |
  > | 보안 | JWT 인증, SQL Injection 안전 |
  > | 테스트 | 충분 |
  > | 수정 권장 | 인증 공통화(1), DELETE body→param(2) |
  > 
  > **1\~2번 수정 후 머지 권장합니다.**

---

### !85 · [BE] Feat: S14P21D208-134 관심종목 추가/제거 API 구현

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `feature/be/watchlist-api` → `dev-backend`
- 생성: 2026-03-12 · 머지: 2026-03-12
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/85](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/85)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> [BE] Feat: S14P21D208-134 관심종목 추가/제거 API 구현
> 
> ## 🧑‍💻 MR 세부 내용
> - POST /api/users/watchlist 관심종목 추가 (알림 자동 ON, 50개 제한)
> - DELETE /api/users/watchlist/{stockId} 관심종목 제거
> - WatchlistController 인증 방식 X-User-Id 헤더 → SecurityContextHolder 변경
> - UserWatchlist 엔티티에 create() 팩토리 메서드, toggleNoti() 메서드 추가
> - UserErrorCode에 관심종목 에러코드 추가 (중복/미존재/한도초과/종목없음)
> - WatchlistAddResponse, WatchlistRemoveResponse DTO 추가
> 
> ## 📎 Issue 번호
> S14P21D208-134

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-12)
  > ### 잘된 점
  > 
  > - `X-User-Id` 헤더 방식에서 `SecurityContextHolder` 인증 방식으로 전환한 건 좋습니다
  > - boilerplate를 실제 구현으로 교체하면서 DTO를 record로 깔끔하게 정의했습니다
  > - 관심종목 50개 제한, 중복 체크, 존재하지 않는 종목 체크 등 검증이 잘 되어 있습니다
  > - `UserWatchlist.create()` 팩토리 메서드로 엔티티 생성 로직을 캡슐화한 건 좋습니다
  > 
  > ---
  > 
  > ### 수정 필요 사항
  > 
  > **1. `getWatchlist`에서 삭제된 Stock 방어 처리**
  > 
  > stock != null ? stock.getTicker() : null, stock != null ? stock.getName() : null,
  > 
  > Stock이 DB에서 삭제된 경우 `null`이 프론트로 전달됩니다. 이런 데이터를 아예 필터링하거나, 에러로 처리하는 게 나을 수 있습니다.
  > 
  > **2. `addWatchlist`에서 동시성 이슈**
  > 
  > if (watchlistRepository.existsById(watchlistId)) { ... } // ↓ 이 사이에 다른 요청이 들어오면 중복 insert 가능
  > 
  > watchlistRepository.save(UserWatchlist.create(userId, request.stockId()));
  > 
  > `existsById` → `save` 사이에 동시 요청이 들어오면 중복 insert가 발생할 수 있습니다. 복합키라 DB에서 unique constraint로 막히긴 하지만, 그 경우 `DataIntegrityViolationException`이 터지면서 500이 됩니다. `try-catch`로 감싸거나, DB constraint 위반 시 `WATCHLIST_ALREADY_EXISTS`로 변환하는 처리가 필요합니다.
  > 
  > **3. `countByIdUserId`도 같은 동시성 이슈**
  > 
  > long currentCount = watchlistRepository.countByIdUserId(userId); if (currentCount \>= WATCHLIST_MAX_SIZE) { ... }
  > 
  > 동시에 2개 요청이 오면 둘 다 49개로 읽고 둘 다 save해서 51개가 될 수 있습니다. 심각하진 않지만 인지는 해두면 좋겠습니다.
  > 
  > **4. `STOCK_NOT_FOUND` 에러 코드 위치**
  > 
  > `STOCK_NOT_FOUND`가 `UserErrorCode`에 있는데, Stock은 user 도메인이 아니라 stock 도메인 소속입니다. 다른 도메인에서도 재사용할 가능성이 있으면 `StockErrorCode`나 `GlobalErrorCode`로 옮기는 게 맞습니다.
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 상태 |
  > |----|----|
  > | 인증 방식 전환 | 좋음 |
  > | DTO 설계 | 좋음 |
  > | 비즈니스 검증 | 좋음 |
  > | 동시성 방어 | 보완 필요 |
  > | 에러 코드 위치 | 개선 권장 |

---

### !87 · [BE] Feat: 관심종목 상태 조회 및 알림 토글 API 구현

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `feature/be/watchlist-status-toggle` → `dev-backend`
- 생성: 2026-03-12 · 머지: 2026-03-13
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/87](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/87)

<details><summary>MR 설명</summary>

> 📄 MR 한 줄 요약 
> 관심종목 개별 상태 조회(GET) 및 알림 ON/OFF 토글(PATCH) API 구현 
> 
> 🧑‍💻 MR 세부 내용 
> GET /api/users/watchlist/{stockId}: isWatched, isNotiEnabled 반환 
> PATCH /api/users/watchlist/{stockId}: 알림 토글, 미등록 시 예외 
> Map→타입세이프 DTO 교체 
> 
> 📎 Issue 번호 
> S14P21D208-137  
> S14P21D208-138

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-13)
  > ### 1. 요청/응답 필드명 불일치
  > 
  > 요청 DTO에서는 `alarmOn`, 응답 DTO에서는 `isNotiEnabled`로 필드명이 다릅니다. 프론트에서 혼란이 생길 수 있으니 한쪽으로 통일하는 게 좋습니다.
  > 
  > // 요청 public record WatchlistAlertToggleRequest(boolean alarmOn) {}
  > 
  > // 응답 public record WatchlistAlertToggleResponse(boolean isNotiEnabled) {}
  > 
  > ### 2. WatchlistStatusResponse 필드명 변경 확인
  > 
  > 기존 더미 응답에서는 `scraped`, `alarmOn`이었는데 새 DTO에서는 `isWatched`, `isNotiEnabled`로 변경되었습니다. 프론트와 필드명 합의가 되었는지 확인이 필요합니다.
  > 
  > // 기존 더미 Map.of("scraped", false, "alarmOn", true)
  > 
  > // 변경 후 public record WatchlistStatusResponse(boolean isWatched, boolean isNotiEnabled) {}

---

### !89 · [FE] feat : S14P21D208-59  S14P21D208-136  mainpage-test-api 및 stock-detail-ui 구현 후 코드리뷰 반영

- 작성자: **정준용** · 상태: `merged`
- 브랜치: `feature/fe/stock-detail-ui` → `dev-frontend`
- 생성: 2026-03-12 · 머지: 2026-03-12
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/89](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/89)

<details><summary>MR 설명</summary>

> ## 작업 내용
> - 종목 상세 페이지의 데스크톱/태블릿/모바일 레이아웃을 전반적으로 정리했습니다.
> - 상단 상세 헤더, 차트 영역, 투자 주요 지표, 연간/분기 실적 분석, 종목 핵심 뉴스, 최신 공시 섹션 스타일을 시안 기준으로 맞췄습니다.
> - 관심종목/알림 버튼 동작을 점검하고 관심종목 관련 로직을 안정화했습니다.
> 
> ## 주요 변경 사항
> - 상세 헤더를 `종목명 | 종목 상세 정보` 한 줄 구조로 변경했습니다.
> - 뒤로가기 아이콘 색상을 `color-border-primary` 기준으로 맞췄습니다.
> - 버튼/클릭 가능한 요소 hover 시 커서가 `pointer`로 보이도록 전역 스타일을 추가했습니다.
> - 종목 상단 메타 정보(`KOSPI 200 / 티커 / 마감 기준 / 종목명`) 간격과 타이포를 조정했습니다.
> - 차트 기간 탭 밑줄이 `1분봉 ~ 1년` 구간까지만 보이도록 수정했습니다.
> - 가격 차트 하단 시간 라벨을 제거했습니다.
> - 캔들 차트 토글을 공용 `ToggleSwitch` 컴포넌트로 분리하고 크기를 조정했습니다.
> - 투자 주요 지표 섹션을 반응형 레이아웃으로 재구성했습니다.
> - `PER / PSR / PBR / EPS / BPS / ROE / 배당 수익률` 설명 UI를 공통 컴포넌트로 분리했습니다.
> - 데스크톱에서는 `?` hover 팝오버, 태블릿/모바일에서는 바텀시트로 설명이 뜨도록 구현했습니다.
> - 실적 차트 범례(`매출 / 영업이익`)를 JSX로 직접 렌더링해 폰트 크기 차이를 제거했습니다.
> - 연간/분기 실적 표의 외곽 radius/border를 제거하고 표 헤더 첫 컬럼을 탭 상태에 따라 `연간`/`분기`로 표시하도록 변경했습니다.
> - 실적 관련 최신 공시 카드를 시안 구조에 맞게 다시 구성했습니다.
> - 종목 핵심 뉴스 제목과 태그 타이포를 테마 토큰 기반으로 맞췄습니다.
> - AI 분석 리포트 보기 버튼 텍스트 색상이 라이트/다크 모드에서 정상적으로 보이도록 전용 스타일을 적용했습니다.
> - 관심종목 버튼 문구를 `관심종목`으로 통일했습니다.
> - 관심종목 미추가 상태에서는 알림 설정 버튼이 비활성화되고 금지 커서가 보이도록 수정했습니다.
> 
> ## 관심종목 로직 수정
> - 관심종목 추가/삭제/상태조회/알림토글/관심종목 뉴스/관심종목 SSE 스트림이 항상 프론트 로컬 watchlist route를 사용하도록 정리했습니다.
> - `NEXT_PUBLIC_USE_API_MOCK=false` 환경에서도 관심종목 버튼이 실패하지 않도록 경로를 고정했습니다.
> - optimistic update와 rollback 로직을 보완해 관심종목 해제 시 알림 상태가 잘못 남는 문제를 정리했습니다.
> 
> ## 확인 사항
> - 관심종목 기능은 현재 백엔드 실 API가 아니라 프론트 로컬 watchlist route 기반으로 동작합니다.
> - 따라서 관심종목 데이터는 프런트 mock/store 기준이며 영속 저장은 되지 않습니다.
> - OAuth/인증 흐름은 이번 MR의 중심 범위가 아니며, 본 MR은 종목 상세/관심종목 UX 및 동작 안정화에 집중했습니다.
> 
> ------------------------------------
> -----------------------------------
> ## 변경 배경
> 
> 리뷰에서 지적된 실제 동작 이슈들을 우선 수정했습니다.
> 디자인/스타일은 최대한 유지하고, 로직 안정화와 회귀 방지에만 집중했습니다.
> 
> ## 주요 변경사항
> 
> - `StockMetricInfoTrigger`의 viewport 판정을 렌더 본문에서 제거하고, 마운트 후 상태로 관리하도록 변경
>   - SSR/CSR hydration mismatch 방지
> - 인증 복원 중 `AppNav`에서 로그인 버튼이 잠깐 노출되는 문제 보정
>   - `authStatus === "restoring"` 동안 placeholder 유지
> - `로그인 유지` 체크박스가 실제 동작에 반영되도록 인증 persistence 로직 추가
>   - 유지 선택 시 자동 세션 복원
>   - 해제 시 다음 진입에서 자동 복원하지 않도록 처리
> - 주식 상세 페이지 API/SSE 호출을 로컬 `/api/stocks/*` 경로로 고정
>   - `NEXT_PUBLIC_USE_API_MOCK=false` 환경에서도 상세 페이지가 새 route handler를 타도록 수정
> - 종목 차트 period 변경 시 이전 데이터가 잠깐 남는 문제 수정
>   - SSE subscription key 기반으로 loading/data reset 처리
> - `useWatchlistNotification`의 `toggle` 참조 안정화
> - `stockId === 0` falsy 처리 방지
>   - `StockActionButtons`에서 `stockId == null` 체크로 수정
> - `ToggleSwitch` 접근성 보강
>   - 캔들 차트 토글에 `aria-label` 추가
> - `globals.css`에서 주석 처리된 폰트 규칙 정리
>   - `font: inherit`는 사용하지 않고 `font-family`만 명시적으로 적용
> 
> ## 리뷰 반영 항목
> 
> - [x] `StockMetricInfoTrigger` hydration mismatch
> - [x] `AppNav` 인증 복원 중 UI 깜빡임
> - [x] `LoginCard`의 `keepSignedIn` 미사용
> - [x] 주식 상세 API가 환경 설정에 따라 로컬 route를 우회하던 문제
> - [x] SSE period 변경 시 stale chart 노출
> - [x] `useWatchlistNotification` 콜백 불안정 참조
> - [x] `StockActionButtons`의 falsy stockId 엣지케이스
> - [x] `ToggleSwitch` 접근성 라벨
> 
> ## 스타일 관련 메모
> 
> - 기존 화면 스타일은 유지했습니다.
> - 리뷰 코멘트 중 `font: inherit`는 요청대로 사용하지 않았고,
>   전체 타이포가 깨지지 않도록 `font-family`만 명시적으로 적용했습니다.
> 
> ## 검증
> 
> - `tsc --noEmit` 통과
> - `eslint .` 통과
> 
> ## 영향 범위
> 
> - 인증 복원/로그인 유지 흐름
> - 주식 상세 페이지 API 호출 및 SSE 차트 갱신
> - 헤더 인증 상태 표시
> - 지표 설명 패널 렌더링 안정성
> 
> 
> 
> ## jira-key
> S14P21D208-59 S14P21D208-136

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-12)
  > ## 코드리뷰 결과 (프론트엔드 관점)
  > 
  > **리뷰어**: AI Code Reviewer
  > **대상**: MR #89 - 종목 상세 페이지 리빌드
  > **변경 파일**: 73개
  > 
  > ### 전체 요약
  > 
  > 종목 상세 페이지를 기존 플레이스홀더에서 반응형 풀 페이지로 리빌드한 대규모 MR입니다. 전반적으로 컴포넌트 분리, 타입 정의, API 추상화, SSE 스트림 처리 등이 잘 구성되어 있습니다. 아래에 심각도별 이슈를 정리합니다.
  > 
  > | 심각도 | 건수 |
  > |--------|------|
  > | **CRITICAL** | 1 |
  > | **HIGH** | 4 |
  > | **MEDIUM** | 5 |
  > | **LOW** | 4 |
  > 
  > ---
  > 
  > ### CRITICAL (1건)
  > 
  > **1. `StockMetricInfoTrigger.tsx` - SSR Hydration Mismatch**
  > 
  > ```tsx
  > const isDesktop = typeof window !== "undefined" && window.matchMedia(DESKTOP_MEDIA_QUERY).matches;
  > ```
  > 
  > 이 코드가 렌더 함수 본문에서 직접 실행됩니다. 서버에서는 항상 `false`, 클라이언트에서는 뷰포트에 따라 `true`가 되어 **hydration mismatch**가 발생합니다. `useEffect` + `useState`로 클라이언트 마운트 후 판단해야 합니다.
  > 
  > ```tsx
  > // 수정 예시
  > const [isDesktop, setIsDesktop] = useState(false);
  > useEffect(() => {
  >   const mq = window.matchMedia(DESKTOP_MEDIA_QUERY);
  >   setIsDesktop(mq.matches);
  >   const handler = (e) => setIsDesktop(e.matches);
  >   mq.addEventListener('change', handler);
  >   return () => mq.removeEventListener('change', handler);
  > }, []);
  > ```
  > 
  > ---
  > 
  > ### HIGH (4건)
  > 
  > **2. `globals.css` - `font: inherit` 주석 처리**
  > 
  > ```css
  > button, input, textarea, select {
  >   /* font: inherit; */
  > }
  > ```
  > 
  > CSS reset의 핵심 규칙을 주석으로 남겨두면 안 됩니다. 의도적 제거라면 완전히 삭제하고 제거 이유를 남겨야 합니다. `font: inherit` 제거 시 폼 요소와 헤딩이 브라우저 기본 폰트를 사용하게 되어 **앱 전반에 타이포그래피 불일치**가 발생할 수 있습니다.
  > 
  > **3. `AppNav.tsx` - `isAuthReady` 제거로 인한 UI 깜빡임**
  > 
  > 기존에 `authStatus !== "restoring"` 체크로 인증 상태 복원 중 빈 placeholder를 보여줬는데, 이를 제거하면서 페이지 로드 시 로그인 버튼이 잠깐 보였다가 프로필로 전환되는 **flash 현상**이 발생할 수 있습니다.
  > 
  > **4. `LoginCard.tsx` - `keepSignedIn` 상태 미사용**
  > 
  > ```tsx
  > const [keepSignedIn, setKeepSignedIn] = useState(true);
  > ```
  > 
  > `keepSignedIn` 상태가 선언되고 체크박스 UI에 바인딩되어 있지만, `loginWithEmail` 호출 시 이 값이 전달되지 않습니다. 사용자가 "로그인 상태 유지"를 해제해도 동작에 차이가 없는 dead code입니다.
  > 
  > **5. `useWatchlistNotification.ts` - `toggle` 콜백의 불안정한 참조**
  > 
  > ```tsx
  > const toggle = useCallback(async () => {
  >   const nextStatus = await toggleMutation.mutateAsync(statusQuery.data);
  >   return nextStatus.isNotifiedEnabled;
  > }, [statusQuery.data, toggleMutation]);
  > ```
  > 
  > `toggleMutation`은 `useMutation`이 매 렌더마다 새 객체를 반환하므로, 이 `useCallback`은 사실상 매 렌더마다 재생성됩니다. 하위 컴포넌트 불필요 리렌더링의 원인이 됩니다.
  > 
  > ---
  > 
  > ### MEDIUM (5건)
  > 
  > **6. `globals.css` - `!important` 사용**
  > 
  > ```css
  > .ai-report-link-text {
  >   color: var(--color-white) !important;
  > }
  > ```
  > 
  > `!important`는 유지보수를 어렵게 합니다. specificity 조정이나 더 구체적인 selector를 사용하는 것이 좋습니다.
  > 
  > **7. `window.alert` 사용** (`LoginCard.tsx`, `StockActionButtons.tsx`)
  > 
  > `window.alert`는 UX가 좋지 않고 브라우저를 블로킹합니다. Toast 또는 인라인 에러 메시지를 사용하는 것이 좋습니다.
  > 
  > **8. `HomePageClient.tsx` + `api/main.ts` - 인기검색어 파생 로직 중복**
  > 
  > `getPopularSearches()`에서도 `topStocks`를 `slice(0,5).map()`하고, `HomePageClient`에서도 동일한 `useMemo`로 파생합니다. 둘 중 하나만 남기고 통일해야 합니다.
  > 
  > **9. ECharts 테마 변경 미대응** (`StockPriceChart.tsx`, `StockFinancialChart.tsx`)
  > 
  > 차트 초기화 시 `getComputedStyle`로 CSS 변수를 읽지만, 다크/라이트 테마 전환 시 차트 색상이 업데이트되지 않습니다.
  > 
  > **10. `StockActionButtons.tsx` - `stockId === 0` 엣지케이스**
  > 
  > ```tsx
  > if (!stockId) { return <Skeleton />; }
  > ```
  > 
  > `stockId`가 `number | undefined`이므로 `0`도 falsy입니다. `stockId == null`로 체크해야 합니다.
  > 
  > ---
  > 
  > ### LOW (4건)
  > 
  > **11. Notification polling 주기 변경** - 15초/30초에서 60초/60초로 변경한 근거가 MR description에 없습니다.
  > 
  > **12. `StockAnnouncementsSection` - "전체보기" 클릭 불가** - `<span>`으로 되어 있어 클릭 불가. `<Link>` 또는 `<button>`으로 변경 권장.
  > 
  > **13. `StockKeywordsNewsSection` - "더보기" 동일 이슈** - 위와 동일.
  > 
  > **14. `ToggleSwitch.tsx` - `aria-label` 미제공** - `aria-pressed`는 있지만 `aria-label`이 없어 스크린리더 접근성 부족.
  > 
  > ---
  > 
  > ### 잘 된 점
  > 
  > - 컴포넌트 분리가 깔끔합니다. `StockDetailPageClient`를 중심으로 각 섹션이 독립 컴포넌트로 잘 나뉘어 있습니다.
  > - 타입 시스템 활용이 좋습니다. `stockDetail.ts`에 도메인 타입을 집중 정의하고 각 API/hook에서 참조하는 구조가 명확합니다.
  > - SSE 훅 공유화: `useSseState`를 `shared/hooks/`로 이동시켜 재사용성을 높인 것이 좋습니다.
  > - ECharts dynamic import: 번들 사이즈 최적화를 위한 동적 임포트 패턴이 적절합니다.
  > - LoginModal lazy loading: `next/dynamic`으로 지연 로딩한 것이 좋습니다.
  > - API 스펙 문서: `STOCK_DETAIL_API.md`로 FE-BE 간 계약을 명시한 것이 협업에 도움됩니다.
  > - Optimistic update: 관심종목/알림 토글의 optimistic update + rollback 로직이 잘 구성되어 있습니다.
  > 
  > ---
  > 
  > ### 최종 판정: **REQUEST CHANGES**
  > 
  > CRITICAL 1건(hydration mismatch)과 HIGH 이슈들을 수정한 뒤 re-review를 권장합니다.

---

### !105 · [AI] Feat: S14P21D208-146 파이프라인 rclone Drive 동기화 통합

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/ai/rclone-pipeline-sync` → `dev-ai`
- 생성: 2026-03-13 · 머지: 2026-03-14
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/105](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/105)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 파이프라인 실행 전후에 rclone Drive 동기화를 통합하여 EC2는 수집 실행기, Drive가 단일 데이터 소스로 동작
> 
> ## MR 세부 내용
> - 수집 전 rclone_sync_down으로 수집 대상 디렉토리별 다운로드 (ohlcv, supply_demand, macro, financial)
> - 수집 후 rclone_sync_up으로 raw, processed 디렉토리 업로드
> - subdir 단위 동기화로 불필요한 전체 동기화 방지
> - RCLONE_AUTO_SYNC, RCLONE_REMOTE 환경변수로 활성화/비활성화 제어
> 
> ## Issue 번호
> S14P21D208-146

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-13)
  > ## 코드 리뷰 반영 사항
  > 
  > ### CRITICAL: rclone sync 데이터 삭제 위험 수정
  > - 기존: 업로드 시 `raw/`, `processed/` 전체를 `rclone sync`로 동기화
  > - 문제: `rclone sync`는 소스에 없는 파일을 대상에서 삭제하므로, 다운로드하지 않은 `raw/universe/`, `raw/fundamental/` 등이 Drive에서 삭제될 위험
  > - 수정: 다운로드·업로드 모두 동일한 subdir 단위 목록(`_RCLONE_SYNC_DIRS`)으로 대칭 구성
  > 
  > ### HIGH: 누락된 동기화 대상 추가
  > - `raw/universe`, `raw/fundamental`, `processed/base_features` 추가
  > - `build_base_features.py`의 섹터 매핑 및 유니버스 검증에 필요

---

### !106 · [BE] Feat: S14P21D208-145 알림 설정 조회/변경 API 구현

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `feature/be/notification-settings` → `dev-backend`
- 생성: 2026-03-13 · 머지: 2026-03-13
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/106](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/106)

<details><summary>MR 설명</summary>

> 📄 MR 한 줄 요약
> - 알림함 전체 알림 ON/OFF 및 이메일 알림 ON/OFF 설정 조회/변경 API 구현
> 
> 🧑‍💻 MR 세부 내용
> - users 테이블에 is_noti_enabled 컬럼 추가 (Flyway V3 마이그레이션)
> - User 엔티티에 isNotiEnabled 필드 및 updateNotiEnabled() 메서드 추가
> - GET /api/notifications/settings: 전체 알림, 이메일 알림 설정 조회
> - PATCH /api/notifications/settings: 전체 알림, 이메일 알림 설정 변경 (null인 필드는 무시)
> - NotificationSettingsResponse, NotificationSettingsUpdateRequest DTO
> - 기존 NotificationController에 settings 엔드포인트 추가
> 
> 📎 Issue 번호
> S14P21D208-145

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-13)
  > ## 코드리뷰: MR #106 - 알림 설정 조회/변경 API
  > 
  > ### 수정 제안
  > 
  > #### 1. 알림 설정 API가 UserService에 위치
  > 
  > NotificationController에서 UserService를 직접 주입하고 있습니다. 알림 설정이 복잡해지면 UserService가 비대해질 수 있으므로, NotificationService에 메서드를 두는 게 도메인 책임 분리상 더 자연스럽습니다.
  > 
  > #### 2. @RequestBody에 @Valid 누락
  > 
  > @PatchMapping("/settings") public ApiResponse updateNotificationSettings( @RequestBody NotificationSettingsUpdateRequest request) {
  > 
  > 다른 컨트롤러 메서드들과 일관성을 위해 @Valid @RequestBody로 하는 게 좋습니다.
  > 
  > #### 3. 에러코드 GlobalErrorCode.NOT_FOUND 사용
  > 
  > User user = userRepository.findById(userId) .orElseThrow(() -\> new BusinessException(GlobalErrorCode.NOT_FOUND));
  > 
  > 다른 도메인에서는 UserErrorCode 같은 도메인별 에러코드를 쓰는데, 여기만 GlobalErrorCode.NOT_FOUND를 씁니다. 통일하는 게 좋습니다.
  > 
  > #### 4. 두 필드 모두 null인 요청 처리
  > 
  > if (request.isNotiEnabled() != null) { ... } if (request.isEmailNotiEnabled() != null) { ... }
  > 
  > 두 필드 모두 null이면 아무 변경 없이 현재 상태만 반환합니다. 동작상 문제는 없지만, 불필요한 DB 조회 + 트랜잭션이 발생합니다. 심각한 건 아닙니다.

---

### !107 · [BE] Fix: S14P21D208-109 SSE 초기 데이터 즉시 전송 및 테스트 컨트롤러 개선

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `fix/be/sse-buffer-flush` → `dev-backend`
- 생성: 2026-03-13 · 머지: 2026-03-13
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/107](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/107)

<details><summary>MR 설명</summary>

> ## 📄 작업 내용
> 
> SSE 초기 데이터 즉시 전송(Tomcat 버퍼 비활성화) 및 테스트 컨트롤러 개선
> 
> ## 🧑‍💻 변경 사항
> 
> ### SSE 초기 데이터 즉시 전송
> - `SseBufferingFilter`: `response.setBufferSize(0)` 추가하여 Tomcat 응답 버퍼 비활성화
> - SSE 연결 즉시 초기 데이터가 클라이언트에 도달하도록 개선 (기존: 1분 뒤 broadcast 시점에 도달)
> 
> ### SSE 전송 로직 통합
> - `SseManager`: `sendToEmitter()` 메서드 추가 (단일 emitter 초기 데이터 전송용)
> - `MainServiceImpl`: `sendInitial`을 `SseManager.sendToEmitter()`로 통일, `CompletableFuture` 제거
> 
> ### 테스트 컨트롤러 개선
> - `SseManager` 연동으로 1분마다 A/B 두 세트의 더미 데이터를 교대 broadcast
> - 프론트에서 SSE 실시간 갱신이 정상 동작하는지 확인 가능
> - 시장 지수 엔드포인트는 실제 `MainService.streamMarketIndex()` 호출 (DB 불필요, 네이버 API + Redis)
> 
> ## 📎 관련 이슈
> 
> S14P21D208-109

</details>

**리뷰 토론**

- 💬 **정준용** (2026-03-13)
  > response.setBufferSize(0) is not a safe way to disable servlet buffering. Servlet containers generally expect a positive buffer size, so this can throw IllegalArgumentException depending on the runtime. That would break SSE requests before the stream is even established. Please remove this line and rely on SseEmitter.send(...) flush behavior plus proxy buffering headers such as X-Accel-Buffering: no.

- 💬 **이혜민** (2026-03-13)
  > setBufferSize(0) → setBufferSize(1)로 변경했습니다.
  > 서블릿 스펙상 양수를 기대하는 컨테이너 호환성 이슈를 해소하면서,
  > 1바이트 버퍼로 사실상 즉시 flush 동작을 유지합니다.

---

### !111 · S14P21D208-139 한투 api 연동

- 작성자: **정준용** · 상태: `merged`
- 브랜치: `feature/be/stock` → `dev-backend`
- 생성: 2026-03-13 · 머지: 2026-03-16
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/111](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/111)

<details><summary>MR 설명</summary>

> ## 작업 내용
> 
> dev-backend 대비 한국투자증권(KIS) 연동 기반의 종목 조회/실시간 차트 기능을 추가했습니다.
> 
> ### 1. KIS 연동 인프라 추가
> - KIS REST 인증/토큰/approval key 처리 추가
> - KIS 시세/기간별 차트/관심종목 상위 조회 클라이언트 추가
> - KIS 웹소켓 실시간 체결 구독 및 분봉 집계기 추가
> - Redis 기반 KIS 캐시 및 cache key/ttl 정책 추가
> 
> ### 2. 종목 API 추가 및 정리
> - `GET /api/stocks`
>   - KIS 관심종목 상위 데이터 기반 Top200 목록 제공
>   - `signal`, `sector`, `market_cap`, `sort`, `keyword`, `offset`, `limit` 필터/페이지네이션 지원
> - `GET /api/stocks/{stockId}`
>   - 종목 기본 정보 조회 API 추가
> - `GET /api/stream/stocks/{stockId}/prices?period=...`
>   - 차트 SSE 엔드포인트 추가
>   - `1MIN`은 KIS 실시간 분봉 전용
>   - `1D`는 DB minute + 실시간 분봉 overlay
>   - `1W/1M/3M/1Y/3Y`는 DB 집계 데이터 기반
> - KIS 점검/미리보기용 API 추가
>   - quote
>   - period-prices
>   - pipeline-preview
>   - realtime subscribe/minute snapshot/pipeline preview
> 
> ### 3. 메인 페이지 보완
> - 메인 SSE 초기 연결 시 캐시 미스 fallback 로직 정리
> - Naver 환율 URL을 현재 응답 가능한 endpoint로 수정
> - 최근 거래일 기준 신호 조회로 수정
> 
> ## 테스트
> - `.\mvnw.cmd -q -DskipTests compile`
> - `.\mvnw.cmd -q "-Dtest=StockPriceStreamServiceImplTest,StockApiControllerTest" test`
> 
> ## 참고 사항
> - `/api/stream/stocks/{stockId}/prices?period=1MIN` 는 장 마감 후 또는 체결 없음 상태에서는 빈 배열을 반환할 수 있습니다.
> - `/api/stocks/{stockId}` 및 `/api/stream/stocks/{stockId}/prices` 는 `stocks` 메타데이터가 DB에 있어야 정상 조회됩니다.
> - `/api/stocks` 의 `signal/confidence` 는 현재 변동률 기반 임시 휴리스틱입니다.
> 
> ## 📎 Issue 번호
> S14P21D208-139
> 
> 
> ## 변경 배경
> 
> KIS 연동 및 실시간 분봉 집계 추가 이후 코드 리뷰에서 지적된 예외 처리, 보안, 리소스 누수, 계층 위반, 테스트 공백을 정리했습니다.
> 
> 이번 MR은 기존 DB 스키마나 엔티티 구조를 변경하지 않고, `services/backend` 내부에서만 수정했습니다.
> 
> ## 주요 변경 사항
> 
> ### 1. KIS 예외 처리 정리
> - `KisApiException`이 `GlobalExceptionHandler`를 우회하던 문제 수정
> - `KisApiException` 전용 핸들러 추가
> - KIS 연동 실패 시 500이 아니라 실제 상태코드 기반 응답 반환
> - KIS/stock 관련 신규 및 수정 메시지를 한국어로 정리
> 
> 관련 파일:
> - `global/exception/GlobalExceptionHandler`
> - `infra/kis/KisApiException`
> - `domain/stock/exception/StockErrorCode`
> 
> ### 2. 내부 KIS 확인 API 보안 강화
> - KIS health/preview/realtime 확인용 엔드포인트를 `/api/internal/kis/**`로 유지
> - `ROLE_ADMIN`만 접근 가능하도록 보안 정책 추가
> - 외부 노출 위험이 있던 `restBaseUrl`, `mode`, `tokenCached`, `approvalKeyCached` 등의 정보에 일반 사용자 접근 차단
> 
> 관련 파일:
> - `domain/health/controller/KisHealthController`
> - `global/config/SecurityConfig`
> 
> ### 3. KIS REST 클라이언트 재사용 구조로 변경
> - `RestClient`를 요청마다 새로 만들지 않도록 공용 팩토리 추가
> - timeout 설정 추가
> - retry 시 즉시 재시도 대신 backoff 적용
> - transport / HTTP / business error fallback 메시지 한국어화
> 
> 관련 파일:
> - `infra/kis/KisRestClientFactory`
> - `infra/kis/KisAuthClient`
> - `infra/kis/stock/KisDomesticStockClient`
> - `infra/kis/KisHashKeyClient`
> - `infra/kis/KisProperties`
> 
> ### 4. KIS WebSocket 리소스/구독 관리 개선
> - `HttpClient`를 connect 시마다 새로 만들지 않고 재사용하도록 수정
> - ACK 처리 시 마켓코드 `"J"` 하드코딩 제거
> - stale subscription cleanup 추가
> - 장기 실행 시 subscription/pending/ack/firstTick 상태가 누적되지 않도록 정리
> 
> 관련 파일:
> - `infra/kis/websocket/KisWebSocketClient`
> 
> ### 5. 실시간 1분봉 집계기 안정성 개선
> - stale state cleanup 추가
> - `Clock` 주입 가능하게 변경해 시간 의존 테스트 불안정성 제거
> - Spring 생성자 선택 충돌 방지
> - 분봉 집계 상태가 무한히 쌓이지 않도록 보완
> 
> 관련 파일:
> - `infra/kis/websocket/KisRealtimeMinuteCandleAggregator`
> 
> ### 6. 캐시 TTL 정책 보완
> - 기존 주말 기준만 보던 market open 판단에 공휴일 설정값 지원 추가
> - 실시간/조회 캐시 TTL 전략을 설정 기반으로 유지 가능하도록 정리
> 
> 관련 파일:
> - `infra/kis/cache/MarketCacheTtlPolicy`
> 
> ### 7. 계층 구조 정리
> - `StockTopListServiceImpl`에서 `SecurityContextHolder` 직접 접근 제거
> - 컨트롤러에서 인증 사용자 ID를 받아 서비스로 전달하도록 변경
> - `WatchlistRepository` 직접 접근 제거
> - `WatchlistService`를 통해 watchlist stock id 조회하도록 정리
> 
> 관련 파일:
> - `global/security/AuthenticatedUserProvider`
> - `domain/stock/controller/StockApiController`
> - `domain/stock/service/StockTopListService`
> - `domain/stock/service/StockTopListServiceImpl`
> - `domain/user/service/WatchlistService`
> - `domain/user/service/WatchlistServiceImpl`
> 
> ### 8. API 응답 컨벤션 정리
> - `StockApiController` 응답을 `ApiResponse<T>`로 통일
> - stock 관련 API 응답 래핑 누락 보완
> 
> 관련 파일:
> - `domain/stock/controller/StockApiController`
> 
> ### 9. SSE 타임아웃 보완
> - `SseEmitter(0L)` 무한 타임아웃 제거
> - 적절한 유한 타임아웃으로 변경
> 
> 관련 파일:
> - `domain/stock/controller/StockPriceStreamController`
> - `domain/stock/service/StockPriceStreamServiceImpl`
> 
> ### 10. 공통 상수/정규화 중복 제거
> - 마켓코드 `"J"` 중복 하드코딩 제거
> - ticker 정규화 로직 공통화
> 
> 관련 파일:
> - `domain/stock/support/StockMarketConstants`
> - `domain/stock/support/StockRequestNormalizer`
> - `domain/stock/service/StockServiceImpl`
> - `domain/stock/service/StockMarketQueryServiceImpl`
> - `domain/stock/service/StockRealtimeMinuteServiceImpl`
> - `domain/health/service/KisHealthServiceImpl`
> - `domain/stock/service/StockPriceStreamServiceImpl`
> 
> ## 테스트 보강
> 
> 추가/수정:
> - `KisApiException -> ApiResponse` 매핑 테스트
> - `/api/internal/kis` 인증/권한 테스트
> - controller 테스트에서 raw service 호출 제거
> - `@MockBean` -> `@MockitoBean` 전환
> - `KisRealtimeMinuteCandleAggregator` 시간 의존 테스트 개선
> - `MarketCacheTtlPolicy` 테스트 추가
> - websocket parser invalid ack 케이스 추가
> - `StockTopListServiceImpl` 예외/비인증 경로 테스트 보강
> - `StockPriceStreamServiceImpl` 테스트 분리
> 
> 관련 테스트 파일:
> - `SallaemallaeBackendApplicationTests`
> - `domain/health/controller/KisHealthControllerSecurityTest`
> - `domain/stock/controller/StockApiControllerTest`
> - `domain/stock/service/StockPriceStreamServiceImplTest`
> - `domain/stock/service/StockTopListServiceImplTest`
> - `infra/kis/cache/MarketCacheTtlPolicyTest`
> - `infra/kis/websocket/KisRealtimeMinuteCandleAggregatorTest`
> - `infra/kis/websocket/KisWebSocketMessageParserTest`
> 
> 
> 
> =====================================================================================================================
> ## 개요
> 
> 한국투자증권(KIS) 연동 이후 리뷰에서 나온 안정성/성능 이슈를 반영했습니다.
> 
> 이번 MR은 DB 스키마 변경 없이 백엔드 애플리케이션 로직만 수정하며,
> 특히 아래 영역을 보완했습니다.
> 
> - KIS REST/인증 처리 안정성
> - WebSocket 구독 상태 관리
> - 실시간 1분봉 집계 경로
> - SSE 전송 예외 처리
> - top stocks 캐시 적용
> - 민감정보 노출 가능성 완화
> 
> ## 주요 변경 사항
> 
> ### 1. KIS 설정/보안
> - `KisProperties`의 `toString()`에서 민감값이 노출되지 않도록 정리
> - WebSocket subscription ACK timeout을 설정값으로 분리
>   - `KIS_REALTIME_SUBSCRIPTION_ACK_TIMEOUT_SECONDS`
> 
> ### 2. KIS REST 호출 개선
> - `KisDomesticStockClient`의 `toInt(JsonNode)` 파싱 로직 단순화
> - `RestClient` 재사용 구조 유지
> - retry/backoff, timeout 기반 호출 구조 유지
> 
> ### 3. WebSocket 성능/상태 관리 개선
> - subscription 조회를 선형 탐색에서 lookup map 기반으로 변경
> - `findSubscription()` 경로를 O(1) 조회로 개선
> - stale subscription cleanup 구조 유지
> - ACK timeout 하드코딩 제거
> 
> ### 4. 실시간 1분봉 집계 안정화
> - `KisRealtimeMinuteCandleAggregator`에서 별도 lock map 제거
> - `ConcurrentHashMap.compute(...)` 기반으로 상태 갱신
> - stale state 정리 로직 유지
> 
> ### 5. SSE 전송 안정성 개선
> - `StockPriceStreamServiceImpl`에서 snapshot 전송 중 예외 발생 시
>   - emitter를 `completeWithError()` 처리
>   - 주기 태스크를 중단하도록 수정
> 
> ### 6. top stocks 캐시 추가
> - `StockTopListServiceImpl`이 KIS를 직접 두드리지 않고
>   `CachedKisDomesticStockGateway`를 통해 조회하도록 변경
> - top interest 캐시 key/TTL 추가
>   - 장중 10초
>   - 장외 60초
> 
> ## 영향 범위
> 
> - DB 스키마 변경 없음
> - 테이블/컬럼 추가 없음
> - 엔티티 구조 변경 없음
> - 백엔드 애플리케이션 로직과 테스트만 수정
> 
> ========================================
> 찐찐찐막
> ## 변경 내용
> 
> 리뷰에서 추가로 지적된 KIS 실시간 집계 및 테스트 품질 이슈를 반영했습니다.
> 
> ### 1. 실시간 분봉 집계 안정화
> - `KisRealtimeMinuteCandleAggregator`에서 `ConcurrentHashMap.compute()` 내부 Redis I/O 제거
> - `compute()`는 분봉 병합만 수행하고,
>   - latest tick 저장
>   - current minute candle 저장
>   - closed candle 저장
>   - current candle 삭제
>   는 compute 외부에서 처리하도록 변경
> - `rollCurrentCandleIfExpired` 경로도 동일하게 정리
> 
> ### 2. WebSocket 구독 상태 관리 단순화
> - `KisWebSocketClient`에서 `subscriptions` Set 제거
> - `subscriptionsByLookupKey` 하나만 기준으로 cleanup / shutdown / reconnect / resubscribe 처리
> - 중복 상태 관리로 인한 불일치 가능성 축소
> 
> ### 3. 테스트 한글 문자열 복구
> - `StockTopListServiceImplTest`의 깨진 문자열 복구
>   - `삼성전자`
>   - `SK하이닉스`
>   - `삼성`
> - keyword 필터 검증이 실제 의미 있는 테스트가 되도록 수정
> 
> ## 영향 범위
> 
> - DB 스키마 변경 없음
> - 테이블/컬럼 추가 없음
> - 애플리케이션 로직과 테스트만 수정
> 
> ## 검증
> 
> 실행:
> ```powershell
> cd services/backend
> mvn -Dmaven.repo.local=C:\Users\SSAFY\.m2\repository clean -Dtest=StockTopListServiceImplTest,CachedKisDomesticStockGatewayTest,KisRealtimeMinuteCandleAggregatorTest test
> 
> 
> =================================
> 마지막일듯한 mr 
> 
> ## 개요
> 
> KIS 연동 관련 최종 리뷰 피드백을 반영했습니다.
> 
> 이번 변경은 DB 스키마 수정 없이 백엔드 애플리케이션 로직만 정리하는 범위이며,
> 특히 아래 항목을 중심으로 안정성과 책임 분리를 보완했습니다.
> 
> - KIS health 응답 최소화
> - SSE 스케줄러 리소스 관리 개선
> - KIS WebSocket 구독/재연결 처리 보강
> - top stock 서비스 책임 분리
> - watchlist projection 적용
> - retry backoff 설정화
> - nullable 반환 의도 명시
> 
> ## 주요 변경 사항
> 
> ### 1. KIS health 응답 최소화
> 내부 인프라 정보 노출 가능성을 줄이기 위해 `KisHealthResponse`에서 아래 필드를 제거했습니다.
> - `mode`
> - `restBaseUrl`
> - `tokenCached`
> - `approvalKeyCached`
> - `quoteCacheKey`
> 
> 이제 `/api/internal/kis`는 상태 확인에 필요한 최소 정보만 반환합니다.
> 
> 관련:
> - `domain/health/dto/KisHealthResponse`
> - `domain/health/service/KisHealthServiceImpl`
> 
> ### 2. SSE 스케줄러 안정화
> `StockPriceStreamServiceImpl`의 scheduler를 고정 2스레드에서 설정 기반으로 변경했습니다.
> 
> 반영 내용:
> - `ScheduledThreadPoolExecutor` 사용
> - `setRemoveOnCancelPolicy(true)` 적용
> - 종료 시 `shutdown -> awaitTermination -> shutdownNow` 순서로 정리
> 
> 설정값:
> - `stock.stream.scheduler.pool-size`
> - `stock.stream.scheduler.shutdown-wait-seconds`
> 
> 관련:
> - `domain/stock/service/StockPriceStreamServiceImpl`
> 
> ### 3. KIS WebSocket 구독/재연결 보강
> 재연결 구간의 구독 처리 경쟁 조건을 줄이기 위해 구독 메시지 전송 흐름을 정리했습니다.
> 
> 반영 내용:
> - 구독 전송을 scheduler 경유로 직렬화
> - `onOpen`에서 일괄 재구독 처리
> - disconnect 시 acknowledged 상태 초기화
> - 실패 ACK는 성공 구독 상태로 남지 않도록 수정
> 
> 관련:
> - `infra/kis/websocket/KisWebSocketClient`
> 
> ### 4. Top stock 서비스 책임 분리
> `StockTopListServiceImpl`에 몰려 있던 필터/정렬/시그널/쿼리 파싱 규칙을 분리했습니다.
> 
> 신규 support 클래스:
> - `domain/stock/service/StockTopListSupport`
> 
> 정리 결과:
> - `StockTopListServiceImpl`는
>   - KIS ranking 조회
>   - DB metadata enrichment
>   - watchlist enrichment
>   - 응답 조합
>   중심으로 역할 축소
> 
> ### 5. KIS retry backoff 설정화
> `KisDomesticStockClient` 내부의 하드코딩된 retry backoff 값을 설정으로 이동했습니다.
> 
> 추가 설정:
> - `KIS_RETRY_BACKOFF_MILLIS`
> 
> 관련:
> - `infra/kis/KisProperties`
> - `infra/kis/stock/KisDomesticStockClient`
> 
> ### 6. nullable 반환 의도 명시
> `MainServiceImpl.extractNullableFloat`에 `@Nullable`을 추가해
> 기존 `0f`가 아닌 `null` 반환 의도를 코드 레벨에서 명확히 했습니다.
> 
> 관련:
> - `domain/main/service/MainServiceImpl`
> 
> ### 7. Watchlist projection 적용
> `getWatchlistedStockIds()`가 전체 watchlist 엔티티를 로딩하지 않도록 projection 쿼리로 변경했습니다.
> 
> 반영 내용:
> - `SELECT w.id.stockId ...` projection 추가
> - 서비스는 projection 결과만 Set으로 변환
> 
> 관련:
> - `domain/user/repository/WatchlistRepository`
> - `domain/user/service/WatchlistServiceImpl`
> 
> # 지라 이슈 S14P21D208-139

</details>

**리뷰 토론**

- 💬 **강지석** (2026-03-13)
  > # 코드리뷰: [BE] feat S14P21D208-139 한투 API 연동
  > 
  > ## CRITICAL
  > 
  > ### 1. `KisApiException`이 프로젝트 예외 체계 무시
  > `KisApiException`이 `RuntimeException`을 직접 상속하여 `BusinessException`/`ErrorCode` 프레임워크를 우회합니다. `GlobalExceptionHandler`에서 잡히지 않아 항상 500 응답이 됩니다. `status`, `code` 필드는 사실상 죽은 코드입니다.
  > → `KisErrorCode` enum 생성 후 `BusinessException` 사용, 또는 `GlobalExceptionHandler`에 `@ExceptionHandler(KisApiException.class)` 추가
  > 
  > ### 2. `KisWebSocketClient` - HttpClient 리소스 누수
  > `connectIfNecessary()` 호출마다 새 `HttpClient`를 생성하는데 이전 인스턴스를 닫지 않습니다. `HttpClient`는 내부 스레드풀을 갖고 있어서 재연결 시마다 스레드와 파일 디스크립터가 누적됩니다.
  > → 한 번 생성하여 재사용하거나, 교체 시 이전 인스턴스 close 처리
  > 
  > ### 3. `KisHealthResponse`가 인프라 내부 정보 노출
  > `restBaseUrl`, `mode`, `tokenCached`, `approvalKeyCached`를 인증만 되면 누구나 조회 가능합니다. `/api/internal/kis/**`에 admin-only 접근 제한이 필요합니다.
  > 
  > ---
  > 
  > ## HIGH
  > 
  > ### 4. `RestClient`를 매 API 호출마다 새로 생성
  > `KisAuthClient`, `KisDomesticStockClient` 모두 `RestClient.builder().baseUrl(...).build()`를 매번 호출합니다. 커넥션 풀링 불가, 리소스 낭비입니다.
  > → 생성자 또는 `@Bean`에서 한 번 생성하여 재사용
  > 
  > ### 5. WebSocket URL이 `ws://` (비암호화)
  > `KisProperties`에서 WebSocket URL이 `ws://`를 사용합니다. 실시간 데이터와 approval key가 평문으로 전송됩니다.
  > → `wss://` 지원 여부 확인 후 변경
  > 
  > ### 6. WebSocket 구독 ACK에 마켓코드 `"J"` 하드코딩
  > `KisWebSocketClient` line 194에서 `new Subscription(ack.topic(), "J", ack.ticker())` — KOSDAQ 종목(`"Q"`) 구독 시 ACK 매칭이 안 되어 무한 재구독이 발생합니다.
  > → 실제 마켓코드를 전달하도록 수정
  > 
  > ### 7. `KisRealtimeMinuteCandleAggregator` 메모리 누수
  > `locks`, `currentCandles`, `firstTickLoggedSubscriptions` 맵에 항목이 추가만 되고 제거되지 않습니다. 장기 운영 시 메모리가 계속 증가합니다.
  > → 주기적 cleanup 또는 TTL 기반 eviction 추가
  > 
  > ### 8. `StockTopListServiceImpl`에서 `SecurityContextHolder` 직접 접근
  > Service 레이어에서 `SecurityContextHolder.getContext().getAuthentication()` 호출은 프레젠테이션 레이어 관심사 침범입니다. 다른 컨트롤러들은 `AuthenticatedUserProvider`를 사용합니다.
  > → Controller에서 userId 받아서 파라미터로 전달
  > 
  > ### 9. `StockTopListServiceImpl`이 타 도메인 Repository 직접 접근
  > `WatchlistRepository`를 직접 주입하여 User 도메인 데이터에 접근합니다. 컨벤션상 Service 간 호출이 원칙입니다.
  > → `UserService` 또는 `WatchlistService` 경유
  > 
  > ### 10. `StockApiController`가 `ApiResponse` 래핑 누락
  > `getTopStocks()`, `getStockBasicInfo()`가 raw DTO를 반환합니다. 프로젝트 컨벤션상 모든 API는 `ApiResponse<T>` 래퍼를 사용해야 합니다.
  > → `ApiResponse.success()` 래핑 추가
  > 
  > ---
  > 
  > ## MEDIUM
  > 
  > ### 11. retry 로직에 backoff 없음
  > `KisDomesticStockClient` retry 루프가 즉시 재시도합니다. 429(Rate Limit) 시 역효과입니다.
  > → exponential backoff 또는 최소 지연 추가
  > 
  > ### 12. `MarketCacheTtlPolicy`가 공휴일 미처리
  > `isMarketOpen()`이 주말만 체크합니다. 추석, 설날 등 한국 공휴일에 불필요한 짧은 TTL(5초) 적용되어 KIS API 과호출이 발생합니다.
  > 
  > ### 13. 금융 데이터에 `Float` 사용
  > `fluctuationRate`, `changeRate` 등에 `Float`를 사용합니다. 부동소수점 정밀도 문제가 있습니다. (`0.1f + 0.2f != 0.3f`)
  > → 정확한 계산이 필요한 곳은 `BigDecimal` 고려
  > 
  > ### 14. SSE `SseEmitter(0L)` — 무한 타임아웃
  > `StockPriceStreamController`에서 타임아웃 0 = 무한입니다. 연결이 영원히 유지되어 리소스를 점유합니다.
  > → 적절한 최대 타임아웃 설정 (예: 30분)
  > 
  > ### 15. JSON 직렬화 전략 불일치
  > 일부 DTO는 `@JsonNaming(SnakeCaseStrategy)`, 나머지는 camelCase입니다. API 응답 포맷이 불일치합니다.
  > → 전체 통일
  > 
  > ### 16. 마켓코드 `"J"`가 5곳에 분산 하드코딩
  > `StockPriceStreamServiceImpl`, `StockMarketQueryServiceImpl`, `StockRealtimeMinuteServiceImpl`, `KisHealthServiceImpl`, `StockTopListServiceImpl`
  > → 공통 상수로 추출
  > 
  > ### 17. `ticker` 정규화 로직 3곳 중복
  > `normalizeTicker`가 `StockMarketQueryServiceImpl`, `StockRealtimeMinuteServiceImpl`, `StockServiceImpl`에 동일하게 존재합니다.
  > → 유틸 클래스로 추출
  > 
  > ### 18. `StockController`와 `StockApiController` 역할 중복
  > `/api/v1/stocks`와 `/api/stocks`에서 유사한 종목 조회/상세 기능을 제공합니다.
  > → 하나로 통합 또는 역할 구분 명확화
  > 
  > ---
  > 
  > ## LOW
  > 
  > ### 19. `RestClient`에 timeout 미설정
  > `KisAuthClient`, `KisDomesticStockClient`에서 timeout이 없습니다. KIS API 행 시 스레드 무한 블로킹 가능합니다.
  > 
  > ### 20. 에러 메시지 영어/한국어 혼용
  > `StockErrorCode`는 영어 (`"Stock not found."`), 다른 도메인은 한국어입니다. 통일이 필요합니다.
  > 
  > ### 21. `StockTopListServiceImpl` 465줄
  > inner enum 4개 + inner record 2개 포함. 클래스 분리를 고려해주세요.
  > 
  > ### 22. `StockDataPipelineMapper`가 service 패키지에 위치
  > 매핑 유틸리티인데 service 패키지에 있습니다. `mapper` 패키지로 이동을 고려해주세요.
  > 
  > ---
  > 
  > ## 테스트
  > 
  > ### 23. 에러/예외 케이스 테스트 전무
  > 8개 테스트 파일 중 어느 것도 예외 발생 경로를 테스트하지 않습니다. (잘못된 ID, null 입력, KIS API 실패 등)
  > 
  > ### 24. `StockApiControllerTest`에서 서비스 직접 호출
  > Controller 테스트인데 `stockPriceStreamService.getLatestPrices()`를 MockMvc 없이 직접 호출합니다. 서비스 테스트와 컨트롤러 테스트가 혼재합니다.
  > 
  > ### 25. deprecated `@MockBean` 사용
  > `SallaemallaeBackendApplicationTests`에서 `org.springframework.boot.test.mock.mockito.MockBean` 사용합니다. (Spring Boot 3.4+ deprecated) `StockApiControllerTest`는 이미 `@MockitoBean` 사용 중입니다.
  > 
  > ### 26. 시간 의존 테스트
  > `KisRealtimeMinuteCandleAggregatorTest`가 `OffsetDateTime.now()` 의존합니다. 분 경계에서 비결정적 실패 가능합니다.
  > → `Clock` 주입 방식으로 변경
  > 
  > ---
  > 
  > ## 우선순위 요약
  > 
  > | 우선순위 | 머지 전 필수 | 항목 |
  > |---------|------------|------|
  > | **CRITICAL** | ✅ | 1, 2, 3 |
  > | **HIGH** | ✅ | 4, 6, 7, 8, 10 |
  > | **MEDIUM** | 가급적 | 11, 15, 16, 17 |
  > | **LOW** | 다음 스프린트 | 19~22 |
  > | **테스트** | 가급적 | 23, 24 |

- 💬 **강지석** (2026-03-16)
  > ## 코드리뷰: KIS API 연동 리뷰 반영 (6b08d20)
  > 
  > 리뷰 반영 잘 되었습니다. `KisRestClientFactory` 분리, 구독 TTL 정리, `StockRequestNormalizer` 통합, Health 엔드포인트 보안 적용 등 주요 피드백이 모두 반영된 것 확인했습니다.
  > 
  > 아래는 추가로 발견된 사항입니다.
  > 
  > ---
  > 
  > ### Critical
  > 
  > **C1. `appSecret` 로깅 노출 위험**
  > - `KisDomesticStockClient.buildHeaders()`에서 매 요청마다 `appsecret` 헤더 전송 (KIS 프로토콜상 필수)
  > - Spring RestClient DEBUG 로깅이 헤더를 그대로 출력할 수 있음
  > - `KisProperties`에 `@ToString.Exclude` 추가하고, 로깅 레벨 설정 확인 필요
  > 
  > **C2. `toInt(JsonNode node)` 혼란스러운 코드**
  > - `KisDomesticStockClient`에서 `nullableText(node, "")` 호출 → `node.path("")`는 항상 MissingNode 반환
  > - 결과적으로 동작은 맞지만 의도가 불명확 → `node.asText(null)` 직접 호출로 정리 권장
  > 
  > ---
  > 
  > ### Important
  > 
  > **I1. `KisWebSocketClient.findSubscription()` — 매 틱마다 O(n) 탐색**
  > - 장중 초당 수백 호출 가능
  > - `Map<String, Subscription>` (key: `topic:ticker`)로 O(1) 조회 변경 권장
  > 
  > **I2. `KisRealtimeMinuteCandleAggregator.locks` 맵 무한 증가**
  > - 구독 해제된 종목의 lock 객체가 정리되지 않음
  > - `ConcurrentHashMap.compute()` 사용하면 외부 lock 자체가 불필요
  > 
  > **I3. `StockPriceStreamServiceImpl` SSE 스케줄 태스크 예외 처리 누락**
  > - `sendSnapshot`에서 `IOException`/`IllegalStateException` 외 예외(DB 타임아웃 등) 발생 시 태스크만 종료되고 emitter는 열린 채 남음
  > - 전체 try-catch로 감싸서 `emitter.completeWithError()` 호출 필요
  > 
  > **I4. `StockTopListServiceImpl.getTopStocks()` 캐싱 없음**
  > - `CachedKisDomesticStockGateway`를 거치지 않고 매 요청마다 KIS API 직접 호출
  > - 부하 시 KIS API 제한 초과 가능 → 5~10초 TTL 캐시 추가 권장
  > 
  > **I5. WebSocket 구독 응답 대기 7초 하드코딩**
  > - `StockRealtimeMinuteServiceImpl`에서 `.get(7, TimeUnit.SECONDS)`
  > - `KisProperties`로 설정 가능하게 변경 권장 (장 시작 시 응답 지연 가능)
  > 
  > ---
  > 
  > ### Suggestions
  > 
  > | # | 내용 |
  > |---|------|
  > | S1 | `KisAuthClient`/`KisDomesticStockClient`의 `nullableText`/`toInt`/`toFloat` 중복 → `KisJsonUtils` 추출 |
  > | S2 | `streamPrices`가 `@Transactional(readOnly=true)`인데 내부에서 WebSocket 구독 → 의미적 분리 고려 |
  > | S3 | `MarketCacheTtlPolicy` no-arg 생성자 제거 (Spring은 항상 `@Autowired` 생성자 사용) |
  > | S4 | `KisRealtimeMinuteCandleAggregator`에도 `Clock` 주입 권장 (테스트 가능성) |
  > | S5 | `getTopStocks` 파라미터 8개 → Query Object 패턴으로 묶기 |
  > | S6 | WebSocket `ws://` 사용 (KIS 제약) → 비암호화 통신 한계 문서화 |
  > 
  > ---
  > 
  > ### 테스트 커버리지 보완 제안
  > 
  > 현재 테스트 잘 되어 있는 부분: 컨트롤러 MockMvc, 메시지 파서, 캐시 TTL, 캔들 집계기
  > 
  > 추가하면 좋을 테스트:
  > - `KisTokenManager` / `KisApprovalKeyManager` (Redis + 동기화)
  > - `CachedKisDomesticStockGateway` 캐시 히트/미스
  > - WebSocket 재연결 로직
  > - 구독 정리 스케줄 태스크
  > 
  > ---
  > 
  > ### 종합
  > 
  > 리뷰 반영이 잘 되었습니다. **I3(SSE 예외 처리)**과 **I4(top stocks 캐싱)**는 프로덕션 트래픽 전에 처리 권장, 나머지는 후속 작업으로 가능합니다.

- 💬 **강지석** (2026-03-16)
  > # KIS 연동 안정화 및 실시간 시세/캐시 리뷰 반영 — 코드 리뷰 (2차)
  > 
  > **커밋:** `e691875` — `[BE] fix : S14P21D208-139 KIS 연동 안정화 및 실시간 시세/캐시 리뷰 반영`
  > **리뷰어:** 강지석
  > **일시:** 2026-03-16
  > 
  > ---
  > 
  > ## 1차 리뷰 반영 확인
  > 
  > 이전 리뷰에서 지적한 항목들의 반영 상태입니다.
  > 
  > | # | 이전 지적 | 반영 여부 | 확인 위치 |
  > |---|----------|---------|----------|
  > | 1 | appSecret 로깅 위험 | ✅ 반영됨 | `KisProperties`에 `@ToString(onlyExplicitlyIncluded = true)` 추가, appKey/appSecret 제외 |
  > | 2 | toInt 메서드 혼란 | ✅ 반영됨 | `nullableText` 호출 제거, `node.asText(null)` 단일 경로로 정리 |
  > | 3 | O(n) 구독 조회 | ✅ 반영됨 | `subscriptionsByLookupKey` HashMap 추가, O(1) 조회 |
  > | 4 | lock map 무한 증가 | ✅ 반영됨 | `locks` 맵 제거, `ConcurrentHashMap.compute()` 사용 |
  > | 5 | SSE 예외 처리 | ✅ 반영됨 | `catch (Exception e)` + 로그 추가 + 실패 시 스케줄러 취소 |
  > | 6 | Top Stocks 캐싱 없음 | ✅ 반영됨 | `CachedKisDomesticStockGateway.getTopInterestStocks()` 추가 |
  > | 7 | 하드코딩된 7초 타임아웃 | ✅ 반영됨 | `KisProperties.realtimeSubscriptionAckTimeoutSeconds` 설정값 사용 |
  > 
  > 전반적으로 1차 리뷰 항목이 모두 깔끔하게 반영되었습니다. 수고하셨습니다.
  > 
  > ---
  > 
  > ## 2차 리뷰 — 새로 발견된 사항
  > 
  > ### 🔴 Critical
  > 
  > #### 1. 테스트 파일 한글 깨짐
  > 
  > **파일:** `StockTopListServiceImplTest.java`
  > 
  > ```java
  > // 현재 (깨진 상태)
  > new KisTopInterestStockItem(1, "005930", "?쇱꽦?꾩옄", ...)
  > Stock samsung = stock(1L, "005930", "?쇱꽦?꾩옄", ...)
  > Stock hynix = stock(3L, "000660", "SK?섏씠?됱뒪", ...)
  > 
  > // 원래 의도
  > "삼성전자", "SK하이닉스", "삼성"
  > ```
  > 
  > 커밋 시 파일 인코딩이 깨진 것으로 보입니다. `UTF-8 BOM` 또는 `EUC-KR` 혼용 가능성이 있습니다.
  > 테스트 자체는 통과할 수 있지만, keyword 검색 필터(`"?쇱꽦"`)가 실제 데이터와 매칭되므로 **테스트가 의미 없는 검증**이 됩니다.
  > 
  > **조치:** 파일 인코딩을 UTF-8로 통일 후 한글 문자열을 복원해주세요.
  > 
  > ---
  > 
  > ### 🟡 Important
  > 
  > #### 2. ConcurrentHashMap.compute() 내부에서 Redis I/O 수행
  > 
  > **파일:** `KisRealtimeMinuteCandleAggregator.java`
  > 
  > ```java
  > currentCandles.compute(aggregateKey, (ignored, current) -> {
  >     KisRealtimeMinuteCandleData base = current != null
  >         ? current
  >         : cacheRepository.getCurrentMinuteCandle(...).orElse(null);  // Redis 조회
  >     KisRealtimeMinuteCandleData updated = merge(base, tick);
  >     cacheRepository.saveLatestTick(...);             // Redis 쓰기
  >     cacheRepository.saveCurrentMinuteCandle(...);    // Redis 쓰기
  >     return updated;
  > });
  > ```
  > 
  > `ConcurrentHashMap.compute()`는 해당 키의 버킷 락을 잡고 실행됩니다. 람다 내부에서 Redis I/O를 수행하면:
  > - Redis 응답 지연 시 같은 버킷의 다른 키 연산도 블로킹됩니다
  > - ConcurrentHashMap 공식 문서에서도 "computation should be short and simple"이라고 경고합니다
  > 
  > 기존 `synchronized` 블록에서의 문제(lock 맵 증가)는 해결했지만, 부작용이 생겼습니다.
  > 
  > **제안:** compute()에서는 병합 로직만 수행하고, Redis I/O는 compute() 밖으로 분리하는 방식이 안전합니다.
  > 
  > ```java
  > // compute()는 순수 병합만
  > KisRealtimeMinuteCandleData updated = currentCandles.compute(aggregateKey, (ignored, current) -> {
  >     KisRealtimeMinuteCandleData base = current != null ? current : cachedCandle;
  >     return merge(base, tick);
  > });
  > 
  > // Redis I/O는 밖에서
  > cacheRepository.saveLatestTick(...);
  > cacheRepository.saveCurrentMinuteCandle(... updated ...);
  > ```
  > 
  > 다만 캐시 조회(`getCurrentMinuteCandle`)를 compute 밖에서 하면 race condition이 생길 수 있으므로, `computeIfAbsent`로 초기화만 분리하는 방식도 고려해주세요.
  > 
  > ---
  > 
  > #### 3. `rollCurrentCandleIfExpired`도 compute 내부에서 캐시 삭제 수행
  > 
  > **파일:** `KisRealtimeMinuteCandleAggregator.java`
  > 
  > ```java
  > currentCandles.compute(aggregateKey, (ignored, existing) -> {
  >     KisRealtimeMinuteCandleData base = existing != null
  >         ? existing
  >         : cacheRepository.getCurrentMinuteCandle(marketCode, ticker).orElse(null);
  >     return rollCurrentCandleIfExpired(base);  // 내부에서 persistClosedCandle + deleteCurrentMinuteCandle 호출
  > });
  > ```
  > 
  > `rollCurrentCandleIfExpired()` 내부에서 `persistClosedCandle()`과 `cacheRepository.deleteCurrentMinuteCandle()`을 호출하고 있으므로, 2번과 동일한 문제가 있습니다.
  > 
  > ---
  > 
  > ### 🟢 Minor / Suggestion
  > 
  > #### 4. subscriptions Set과 subscriptionsByLookupKey 이중 관리
  > 
  > **파일:** `KisWebSocketClient.java`
  > 
  > ```java
  > private final Set<Subscription> subscriptions = ConcurrentHashMap.newKeySet();
  > private final Map<String, Subscription> subscriptionsByLookupKey = new ConcurrentHashMap<>();
  > ```
  > 
  > 같은 데이터를 두 곳에서 관리하고 있습니다. `subscriptions`는 이제 조회에 사용되지 않고, `subscribeDomesticTrade`에서 `add`, `removeSubscription`에서 `remove`만 합니다. `subscriptionsByLookupKey.values()`로 대체 가능해 보입니다.
  > 
  > 당장 버그는 아니지만, 추후 둘의 동기화가 어긋나면 찾기 어려운 버그가 될 수 있습니다. 리팩토링 여유가 있을 때 `subscriptions` Set 제거를 검토해주세요.
  > 
  > #### 5. MarketCacheTtlPolicy 기본 생성자 제거 — 테스트 영향 확인
  > 
  > **파일:** `MarketCacheTtlPolicy.java`
  > 
  > ```java
  > // 제거됨
  > public MarketCacheTtlPolicy() {
  >     this(Clock.system(ZONE_ID), Set.of());
  > }
  > ```
  > 
  > 기존에 이 기본 생성자를 사용하던 테스트가 있다면 컴파일 에러가 발생합니다. 현재 diff에는 관련 테스트 수정이 없으므로, 기존에 사용처가 없었던 것으로 보이지만 확인 부탁드립니다.
  > 
  > #### 6. 새 테스트 추가 — 좋습니다
  > 
  > `CachedKisDomesticStockGatewayTest.java`에서 캐시 hit/miss 케이스를 잘 검증하고 있습니다.
  > `StockTopListServiceImplTest`도 `CachedKisDomesticStockGateway`로 의존성이 정리되었습니다.
  > 
  > ---
  > 
  > ## 요약
  > 
  > | 등급 | 건수 | 내용 |
  > |------|------|------|
  > | 🔴 Critical | 1 | 테스트 파일 한글 인코딩 깨짐 |
  > | 🟡 Important | 2 | compute() 내부 Redis I/O (2건) |
  > | 🟢 Minor | 2 | subscriptions 이중 관리, 기본 생성자 제거 확인 |
  > 
  > 1차 리뷰 반영은 훌륭합니다. **인코딩 문제는 반드시 수정**이 필요하고, compute() 내 I/O는 현재 트래픽에서 당장 문제가 되진 않겠지만 안정성을 위해 개선을 권장합니다.

- 💬 **이혜민** (2026-03-16)
  > ## 전체 평가
  > 
  > 전반적으로 **잘 구조화된 MR**입니다. KIS API 연동 인프라부터 서비스, 캐시, 웹소켓, SSE까지 계층이 명확하고 반복적 리뷰 피드백을 꼼꼼하게 반영한 흔적이 보입니다. 아래는 개선이 필요한 부분들입니다.
  > 
  > ---
  > 
  > ## 리뷰 요약
  > 
  > | 등급 | 건수 | 설명 |
  > |----|----|----|
  > | :red_circle: Critical | 3 | 머지 전 수정 권장 |
  > | :yellow_circle: Major | 4 | 강하게 권장 |
  > | :green_circle: Minor | 6 | 개선 제안 |
  > 
  > ---
  > 
  > ## :red_circle: Critical (반드시 수정)
  > 
  > ### 1. `KisHealthResponse`에 민감정보 노출 가능성
  > 
  > **파일:** `domain/health/dto/KisHealthResponse.java`
  > 
  > `KisHealthController`의 응답에 `mode`, `restBaseUrl`, `tokenCached`, `approvalKeyCached` 등이 포함되어 있습니다. `ROLE_ADMIN`만 접근 가능하도록 SecurityConfig에서 제한했지만, `KisHealthResponse` record 자체가 내부 인프라 정보를 담고 있어 향후 실수로 공개 엔드포인트에서 사용될 위험이 있습니다.
  > 
  > ```java
  > public record KisHealthResponse(
  >     boolean configured,
  >     String mode,           // ← 운영 모드 노출
  >     String restBaseUrl,    // ← 내부 API URL 노출
  >     boolean tokenCached,
  >     boolean approvalKeyCached,
  >     ...
  > )
  > ```
  > 
  > 권장: restBaseUrl과 mode는 health 응답에서 제거하거나, admin 전용 상세 응답과 일반 응답을 분리해주세요.
  > 
  > ---
  > 
  > ### 2. StockPriceStreamServiceImpl - ScheduledExecutorService 리소스 누수 가능성
  > 
  > 파일: domain/stock/service/StockPriceStreamServiceImpl.java
  > 
  > private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(2);
  > 
  > SSE 연결마다 scheduleAtFixedRate로 태스크를 등록하는데, 스레드풀 크기가 2로 고정입니다. 동시 SSE 연결이 많아지면 태스크가 큐잉되어 지연됩니다. 또한 @PreDestroy에서 shutdownNow()만 호출하고 awaitTermination은 없습니다.
  > 
  > 권장:
  > 
  > - 스레드풀 크기를 설정값으로 분리하거나 적절히 늘리기
  > - shutdown() → shutdownNow() → awaitTermination(timeout) 패턴으로 변경
  > 
  > ---
  > 
  > ### 3. KisWebSocketClient - WebSocket 재연결 시 경쟁 조건
  > 
  > 파일: infra/kis/websocket/KisWebSocketClient.java
  > 
  > private final AtomicBoolean connecting = new AtomicBoolean(false); private final AtomicBoolean connected = new AtomicBoolean(false);
  > 
  > subscribeDomesticTrade에서 connected.get() 체크 후 sendSubscriptionMessage를 호출하는데, 이 사이에 disconnect가 발생하면 메시지가 유실될 수 있습니다.
  > 
  > 권장: 연결 후 구독 재전송은 onOpen 콜백에서 일괄 처리하는 패턴으로 통합하세요.
  > 
  > ---
  > 
  > ## :yellow_circle: Major (강하게 권장)
  > 
  > ### 4. StockTopListServiceImpl - 457줄 God class 경향
  > 
  > 파일: domain/stock/service/StockTopListServiceImpl.java
  > 
  > 이 클래스 하나에 다음이 모두 포함되어 있습니다:
  > 
  > - KIS 랭킹 조회
  > - DB 메타데이터 enrichment
  > - 관심종목 조회
  > - 시그널 휴리스틱 계산
  > - 필터링/정렬/페이지네이션
  > - DTO 변환
  > 
  > 권장: 필터/정렬 로직, 시그널 파생 로직을 별도 클래스로 분리하면 테스트와 유지보수가 용이해집니다.
  > 
  > ---
  > 
  > ### 5. KisDomesticStockClient - 하드코딩된 retry backoff
  > 
  > 파일: infra/kis/stock/KisDomesticStockClient.java
  > 
  > private static final long RETRY_BACKOFF_MILLIS = 250L;
  > 
  > Thread.sleep(RETRY_BACKOFF_MILLIS)로 직접 대기하는 방식은 요청 스레드를 블로킹합니다.
  > 
  > 권장: Spring의 @Retryable이나 Resilience4j 같은 라이브러리 도입을 고려해주세요.
  > 
  > ---
  > 
  > ### 6. MainServiceImpl - extractNullableFloat 리턴타입 변경
  > 
  > 파일: domain/main/service/MainServiceImpl.java
  > 
  > // 변경 전
  > 
  > private float extractFloat(JsonNode node, String... fieldNames) { ... return 0f; }
  > 
  > // 변경 후
  > 
  > private Float extractNullableFloat(JsonNode node, String... fieldNames) { ... return null; }
  > 
  > 반환값이 0f → null로 바뀌었습니다. 현재 호출부에서는 null 체크를 하고 있어 괜찮지만, 향후 다른 곳에서 호출 시 NPE 위험이 있습니다.
  > 
  > 권장: 주석 또는 @Nullable 어노테이션으로 변경 사유를 명시해주세요.
  > 
  > ---
  > 
  > ### 7. WatchlistServiceImpl.getWatchlistedStockIds - 불필요한 엔티티 로딩
  > 
  > 파일: domain/user/service/WatchlistServiceImpl.java
  > 
  > return watchlistRepository.findAllByIdUserId(userId).stream() .map(watchlist -\> watchlist.getId()) .map(id -\> id != null ? id.getStockId() : null) .filter(Objects::nonNull) .collect(Collectors.toSet());
  > 
  > getId().getStockId()만 필요한데 전체 엔티티를 로딩하고 있습니다.
  > 
  > 권장: JPQL 프로젝션 쿼리(SELECT w.id.stockId FROM Watchlist w WHERE w.id.userId = :userId)로 변경하면 불필요한 엔티티 로딩을 줄일 수 있습니다.
  > 
  > ---
  > 
  > ## :green_circle: Minor (개선 제안)
  > 
  > ### 8. AuthenticatedUserProvider.getCurrentUserIdOrNull() - 의도 명시
  > 
  > 파일: global/security/AuthenticatedUserProvider.java
  > 
  > 비인증 사용자에게 null을 반환하는 것은 의도된 설계이지만, 이 메서드를 사용하는 쪽에서 null일 때의 동작을 반드시 검증해야 합니다.
  > 
  > 권장: 메서드에 Javadoc으로 "비인증 시 null 반환" 명시
  > 
  > ---
  > 
  > ### 9. StockMarketConstants - 매직 스트링 중복
  > 
  > 파일: infra/kis/stock/KisDomesticStockClient.java
  > 
  > private static final String DEFAULT_MARKET_CODE = "J";
  > 
  > StockMarketConstants.DOMESTIC_MARKET_CODE와 동일한 값이 중복 선언되어 있습니다.
  > 
  > 권장: StockMarketConstants.DOMESTIC_MARKET_CODE를 직접 참조하세요.
  > 
  > ---
  > 
  > ### 10. StockPriceStreamController - 에러 emitter에 30분 타임아웃
  > 
  > 파일: domain/stock/controller/StockPriceStreamController.java
  > 
  > private static final long SSE_ERROR_TIMEOUT_MILLIS = Duration.ofMinutes(30).toMillis();
  > 
  > 에러를 반환하고 즉시 complete()하는 emitter에 30분 타임아웃은 불필요합니다.
  > 
  > 권장: 짧은 값(예: 30초)으로도 충분합니다.
  > 
  > ---
  > 
  > ### 11. SecurityConfig - 와일드카드 패턴 범위
  > 
  > 파일: global/config/SecurityConfig.java
  > 
  > .requestMatchers("/api/stocks").permitAll() .requestMatchers("/api/stocks/_").permitAll() .requestMatchers("/api/stream/stocks/_/prices").permitAll()
  > 
  > /api/stocks/\*는 1단계 하위까지만 매칭합니다. 향후 /api/stocks/{id}/something 같은 하위 경로가 추가되면 의도치 않게 인증이 필요해질 수 있습니다.
  > 
  > 권장: 주석으로 의도(1단계만 허용)를 명시해두세요.
  > 
  > ---
  > 
  > ### 12. DTO record 수 과다
  > 
  > 새로 추가된 DTO record가 약 20개입니다. 내부 preview/pipeline 관련 DTO(StockDataPipelinePreviewResponse, StockStoragePreviewResponse 등)는 admin 디버깅 용도로 보이는데, 향후 정리 대상입니다.
  > 
  > ---
  > 
  > ### 13. 테스트 diff 누락
  > 
  > 테스트 파일 10개가 변경 목록에 있지만 GitLab API 응답에서 diff 본문이 비어 있습니다. 아래 테스트가 실제로 포함되었는지 확인이 필요합니다:
  > 
  > - KisHealthControllerSecurityTest
  > - StockApiControllerTest
  > - StockTopListServiceImplTest
  > - StockPriceStreamServiceImplTest
  > - KisRealtimeMinuteCandleAggregatorTest
  > - KisWebSocketMessageParserTest
  > - MarketCacheTtlPolicyTest
  > - CachedKisDomesticStockGatewayTest
  > - MarketCacheKeyFactoryTest
  > - StockDataPipelineMapperTest
  > 
  > ---
  > 
  > ## :white_check_mark: 잘 한 점
  > 
  > - 계층 분리가 명확 — infra/kis (외부 API), cache (Redis), domain/stock/service (비즈니스), controller (표현)
  > - 캐시 전략이 체계적 — MarketCacheTtlPolicy로 장중/장외 TTL 분리, 키 팩토리 패턴 적용
  > - StockRequestNormalizer — 입력 정규화를 공통 유틸로 분리
  > - CachedKisDomesticStockGateway — 캐시 레이어를 비즈니스 로직에서 분리한 패턴이 깔끔
  > - SecurityConfig에 ROLE_ADMIN 제한 — 내부 API 보안 처리가 적절
  > - @ToString(onlyExplicitlyIncluded = true) — KisProperties에서 민감값(appKey, appSecret) 로깅 방지 처리
  > - 리뷰 피드백 반영이 성실 — 4차례 추가 커밋으로 지적사항을 꼼꼼히 수정

- 💬 **이혜민** (2026-03-16)
  > ### 🟡 Major
  > 
  > #### 1. `KisWebSocketClient` — `HttpClient` 재사용은 되었으나 `ScheduledExecutorService` 미종료
  > 
  > **파일:** `KisWebSocketClient.java`
  > 
  > `private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();`
  > 
  > `@PreDestroy`에서 `scheduler.shutdownNow()`를 호출하는지 diff에서 잘려 확인 불가하지만, `StockPriceStreamServiceImpl`과 달리 `awaitTermination`이 없을 가능성이 높습니다.
  > 
  > **권장:** `StockPriceStreamServiceImpl`과 동일한 graceful shutdown 패턴 적용
  > 
  > #### 2. `StockTopListSupport` — 시그널 휴리스틱 기준 하드코딩
  > 
  > **파일:** `StockTopListSupport.java`
  > 
  > `static SignalFilter resolveSignal(Float fluctuationRate) { if (fluctuationRate >= 1.5f) return SignalFilter.BUY; if (fluctuationRate <= -1.5f) return SignalFilter.SELL; return SignalFilter.HOLD; }`
  > 
  > ±1.5% 기준이 코드에 하드코딩되어 있습니다. MR 설명에 "임시 휴리스틱"이라 명시되어 있지만, 향후 AI 모델 시그널로 교체할 때를 대비해 TODO 주석을 남겨두면 좋겠습니다.
  > 
  > **권장:** 향후 AI 모델 교체를 대비한 TODO 주석 추가 (예: `// TODO: 향후 AI 모델 기반 시그널로 교체`)
  > 
  > #### 3. `KisApprovalKeyManager` — `OffsetDateTime.now()` 타임존 미지정
  > 
  > **파일:** `KisApprovalKeyManager.java`
  > 
  > `private boolean isValid(CachedSecret secret) { return secret != null && OffsetDateTime.now().plusSeconds(properties.getRefreshMarginSeconds()).isBefore(secret.expiresAt()); }`
  > 
  > 다른 곳은 모두 `OffsetDateTime.now(ZONE_ID)`로 Asia/Seoul 타임존을 명시하는데, 이 클래스만 `OffsetDateTime.now()`로 시스템 기본 타임존을 사용합니다. `writeToRedis`의 `Duration.between(OffsetDateTime.now(), ...)`도 마찬가지입니다.
  > 
  > **권장:** `ZONE_ID` 상수를 추가하고 `OffsetDateTime.now(ZONE_ID)`로 통일
  > 
  > #### 4. `KisAuthClient` — WebSocket URL 스킴이 `ws://` (비암호화)
  > 
  > **파일:** `KisProperties.java`
  > 
  > `public String wsBaseUrl() { return isProdMode() ? "ws://ops.koreainvestment.com:21000" : "ws://ops.koreainvestment.com:31000"; }`
  > 
  > REST API는 `https://`를 사용하는데 WebSocket은 `ws://`(비암호화)입니다. 이것이 KIS 공식 스펙이라면 문제없지만, 주석으로 의도를 명시해주세요.
  > 
  > **권장:** `// KIS 공식 WebSocket은 ws:// (비암호화) 프로토콜만 지원` 등 주석 추가
  > 
  > #### 5. SecurityConfig — /error permitAll 추가
  > 
  > 파일: SecurityConfig.java
  > 
  > .requestMatchers("/error", "/error/**").permitAll()
  > 
  > 
  > Spring Boot의 기본 에러 핸들러 접근 허용인데, 에러 응답에 stack trace 등 민감정보가 포함될 수 있습니다.
  > 
  > 권장: application.yml에서 server.error.include-stacktrace=never 설정 확인
  > 
  > #### 6. KisDomesticStockClient.toInt — 이중 호출
  > 
  > 파일: KisDomesticStockClient.java
  > 
  > toInt(row.path("data_rank")) != null ? toInt(row.path("data_rank")) : items.size() + 1,
  > 
  > 
  > toInt()를 같은 노드에 대해 2번 호출합니다. 변수에 저장 후 null 체크하는 것이 깔끔합니다.
  > 
  > 권장: 값을 변수에 추출한 뒤 null 체크하여 이중 호출 방지

- 💬 **강지석** (2026-03-16)
  > # KIS API 코드리뷰 (3차) — e691875 → 27f5188
  > 
  > ## 이전 리뷰 피드백 반영 현황
  > 
  > 이전 리뷰에서 지적된 2건이 **모두 잘 반영**되었습니다.
  > 
  > 1. **테스트 파일 한글 인코딩 깨짐 해결** — `StockTopListServiceImplTest`에서 `?쇱꽦?꾩옄` 등의 깨진 문자열이 `삼성전자`, `SK하이닉스`로 복구됐습니다. `WatchlistServiceImplTest`에서는 한글 → ASCII 전략으로 전환하여 재발 가능성도 차단했습니다.
  > 
  > 2. **`ConcurrentHashMap.compute()` 내부 Redis I/O 제거** — `KisRealtimeMinuteCandleAggregator`에서 `MergeResult`/`ExpiredCurrentResult` 레코드 + `AtomicReference` 패턴으로 람다 내부를 순수 연산으로 분리하고, I/O는 `compute()` 반환 후 수행하는 구조로 깔끔하게 개선됐습니다.
  > 
  > ### 추가로 좋아진 점
  > 
  > - `KisHealthResponse`에서 내부 인프라 정보(mode, restBaseUrl, tokenCached 등) 노출 제거 → 보안 강화
  > - `StockTopListServiceImpl` 내부 로직을 `StockTopListSupport` 유틸리티 클래스로 분리 → 가독성 향상
  > - `KisWebSocketClient`에서 중복 `subscriptions` Set 제거 → `subscriptionsByLookupKey` 단일화
  > - `ScheduledThreadPoolExecutor.setRemoveOnCancelPolicy(true)` 적용
  > - graceful shutdown 패턴 적용 (`shutdownNow` → `shutdown` + `awaitTermination`)
  > - `OffsetDateTime.now()` → `OffsetDateTime.now(ZONE_ID)` 타임존 명시
  > - `server.error.include-stacktrace=never` 설정 추가
  > - Watchlist 조회 최적화: JPQL projection으로 불필요한 엔티티 로딩 제거
  > 
  > ---
  > 
  > ## 새로 발견된 이슈
  > 
  > ### 심각도: 높음
  > 
  > #### 1. KisWebSocketClient — `connectIfNecessary`에서 webSocket 이중 할당
  > 
  > **파일**: `KisWebSocketClient.java` (connectIfNecessary 내부)
  > 
  > `buildAsync(...).join()` 반환 후 `webSocket = socket`을 할당하고 있는데, `onOpen` 콜백에서도 `KisWebSocketClient.this.webSocket = webSocket`으로 한 번 더 할당합니다. `onOpen`은 `buildAsync` 완료 전에 호출되므로 실질적으로 같은 객체를 두 번 할당하는 중복입니다.
  > 
  > 현재 동작에 문제는 없지만, `connectIfNecessary`의 `webSocket = socket` 할당을 제거해야 합니다. `onOpen`에서 이미 처리하고 있으므로 중복이며, 향후 로직 변경 시 혼란을 줄 수 있습니다.
  > 
  > **수정 제안**:
  > ```java
  > // connectIfNecessary() 내부
  > try {
  >     httpClient.newWebSocketBuilder()
  >         .connectTimeout(Duration.ofSeconds(properties.getTimeoutSeconds()))
  >         .buildAsync(URI.create(properties.wsBaseUrl()), new KisListener())
  >         .join();
  >     // webSocket 할당은 onOpen에서 처리됨
  > } catch (Exception e) {
  > ```
  > 
  > ---
  > 
  > ### 심각도: 중간
  > 
  > #### 2. StockPriceStreamServiceImpl — ScheduledThreadPoolExecutor 다운캐스트
  > 
  > **파일**: `StockPriceStreamServiceImpl.java` (92~96행)
  > 
  > ```java
  > ScheduledThreadPoolExecutor executor = (ScheduledThreadPoolExecutor) Executors.newScheduledThreadPool(...);
  > ```
  > 
  > `Executors.newScheduledThreadPool`의 API 반환 타입은 `ScheduledExecutorService`입니다. 현재 OpenJDK에서는 `ScheduledThreadPoolExecutor`를 반환하지만, 향후 JDK 버전에서 변경되면 `ClassCastException`이 발생합니다.
  > 
  > **수정 제안**: 직접 생성으로 변경
  > ```java
  > ScheduledThreadPoolExecutor executor = new ScheduledThreadPoolExecutor(
  >     Math.max(2, schedulerPoolSize)
  > );
  > executor.setRemoveOnCancelPolicy(true);
  > this.scheduler = executor;
  > ```
  > 
  > #### 3. KisDomesticStockClient — retry backoff 오버플로우 가능성
  > 
  > **파일**: `KisDomesticStockClient.java` (251~253행)
  > 
  > ```java
  > long delay = baseDelayMillis * (1L << Math.max(0, attempt - 1));
  > ```
  > 
  > `retryAttempts`를 외부 설정으로 높게 (40+) 잡으면 `1L << 39 ≈ 5500억`이 되어 long 오버플로우가 발생합니다. 현재 기본값(1)에서는 문제없지만 설정이 외부에 노출되어 있으므로 방어가 필요합니다.
  > 
  > **수정 제안**:
  > ```java
  > int shift = Math.min(Math.max(0, attempt - 1), 20);
  > long delay = baseDelayMillis * (1L << shift);
  > delay = Math.min(delay, 30_000L); // 최대 30초
  > ```
  > 
  > #### 4. KisWebSocketClient — sendSubscriptionMessage 실패 시 pending future 미완료
  > 
  > **파일**: `KisWebSocketClient.java` (sendSubscriptionMessage)
  > 
  > 이전 코드에서는 전송 실패 시 `pendingAcknowledgements`에서 해당 future를 꺼내 `completeExceptionally`로 처리했지만, 이번 변경에서 해당 로직이 제거됐습니다. 전송 실패(예: `objectMapper.writeValueAsString` 실패) 시 `CompletableFuture`가 영원히 완료되지 않아 호출자가 무한 대기할 수 있습니다.
  > 
  > **수정 제안**: 삭제된 에러 처리 로직 복원
  > ```java
  > } catch (Exception e) {
  >     CompletableFuture<KisWebSocketSubscriptionAck> pending =
  >         pendingAcknowledgements.remove(subscription);
  >     if (pending != null && !pending.isDone()) {
  >         pending.completeExceptionally(e);
  >     }
  >     log.warn("Failed to send KIS websocket subscription...", ...);
  > }
  > ```
  > 
  > ---
  > 
  > ### 심각도: 낮음
  > 
  > #### 5. WatchlistServiceImpl — LinkedHashSet 사용 의도 불명확
  > 
  > 반환 타입이 `Set<Long>`인데 `LinkedHashSet`으로 감싸고 있습니다. 순서 보장이 필요 없다면 `HashSet`이 더 효율적이고 의도가 명확합니다. JPQL 결과 순서를 유지하려는 의도라면 주석을 추가해주세요.
  > 
  > #### 6. application.properties — stacktrace 설정 환경별 분리
  > 
  > `server.error.include-stacktrace=never`는 좋은 보안 설정이지만, `application-local.properties`에서 `on-param` 등으로 오버라이드해두면 로컬 디버깅에 도움이 됩니다.
  > 
  > ---
  > 
  > ## 요약
  > 
  > | 심각도 | 건수 | 핵심 |
  > |-------|------|------|
  > | 높음 | 1 | webSocket 이중 할당 제거 |
  > | 중간 | 3 | ScheduledThreadPoolExecutor 다운캐스트, retry backoff 오버플로우, pending future 미완료 |
  > | 낮음 | 2 | LinkedHashSet 의도 명시, stacktrace 설정 분리 |
  > 
  > **머지 가능 여부**: 이전 리뷰 피드백이 전부 잘 반영됐고, 코드 구조 개선도 훌륭합니다. #1(이중 할당)과 #4(pending future)만 수정하면 머지해도 좋겠습니다.

---

### !116 · [FE] Refactor: S14P21D208-177 theme.css 디자인 토큰 구조 정리

- 작성자: **송민경** · 상태: `merged`
- 브랜치: `feature/fe/theme_token` → `dev-frontend`
- 생성: 2026-03-16 · 머지: 2026-03-17
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/116](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/116)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> theme.css를 피그마 디자인 토큰 기준으로 재구성하고 라이트/다크, 데스크톱/모바일 토큰 구조를 정리했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - `src/styles/theme.css`를 primitive, semantic, legacy alias 구조로 재정리했습니다.
> - 라이트/다크 모드 색상 토큰을 semantic 기준으로 분리했습니다.
> - 타이포 토큰을 데스크톱 기본값으로 설정하고 모바일은 `@media (max-width: 767px)`에서 override 되도록 변경했습니다.
> - 기존 컴포넌트가 사용 중인 `--color-*`, `--typo-*` 변수명은 유지하여 하위 호환성을 확보했습니다.
> 
> ## 📎 Issue 번호
> <!-- closed #177 -->

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-16)
  > ## 코드리뷰: theme.css 디자인 토큰 구조 정리
  > 
  > 전반적으로 primitive > semantic > legacy alias 3계층 구조로의 리팩토링이 잘 되어 있습니다. 토큰 네이밍도 일관성 있고, 하위 호환성도 잘 유지됐습니다. 아래 몇 가지 확인 사항 남깁니다.
  > 
  > ---
  > 
  > ### 1. [Bug] 다크모드에서 `--color-bg-flash-*` 누락
  > 
  > 라이트모드에서는 `--semantic-color-bg-flash-positive`와 `--semantic-color-bg-flash-negative`가 정의되어 있고, legacy alias가 이를 참조합니다.
  > 하지만 `[data-theme="dark"]`와 `prefers-color-scheme: dark` 블록 모두에서 해당 semantic 토큰이 빠져 있어, 다크모드에서는 라이트모드 값(빨간색 flash)이 그대로 적용됩니다.
  > 
  > 기존 다크모드에서는 별도로 정의되어 있었으므로 의도적 제거인지 확인 부탁드립니다.
  > 
  > ---
  > 
  > ### 2. [Breaking Change?] `--typo-body-lg-letter-spacing` 값 변경
  > 
  > - **Before**: `-0.02em`
  > - **After**: `var(--letter-spacing-normal)` = `0px`
  > 
  > 이건 리팩토링이 아닌 시각적 변경입니다. body-lg를 사용하는 컴포넌트에서 자간이 달라질 수 있으니, 디자인 시스템과 일치하는지 확인해 주세요.
  > 
  > ---
  > 
  > ### 3. [Suggestion] `--color-brand-secondary-*`와 `--color-neutral-*`의 1:1 매핑
  > 
  > 현재 brand-secondary가 neutral을 그대로 참조하고 있어 사실상 alias입니다. 브랜드 컬러가 추후 변경될 가능성을 고려한 설계라면 좋지만, 주석으로 의도를 명시해 두면 유지보수에 도움이 될 것 같습니다.
  > 
  > ---
  > 
  > ### 4. [Nit] `--typo-body-xs-*`만 raw primitive 토큰 직접 참조
  > 
  > 다른 body 사이즈(sm, md, lg)는 semantic 토큰을 참조하지만, xs만 `var(--font-size-300)`, `var(--line-height-400)`을 직접 참조합니다. 일관성을 위해 `--semantic-body-xs-*`를 추가하거나 통일하면 좋겠습니다.
  > 
  > ---
  > 
  > ### 5. [Nit] `prefers-color-scheme: dark` 블록 중복
  > 
  > `[data-theme="dark"]`와 내용이 완전히 동일합니다. 주석으로 sync 관계를 명시해 두면 한쪽만 수정하는 실수를 방지할 수 있습니다.
  > 
  > ---
  > 
  > ### 6. [Good] BOM 문자 제거
  > 
  > 파일 시작의 BOM이 제거되었네요. 좋습니다.
  > 
  > ---
  > 
  > **요약**: 1번(다크모드 flash 토큰 누락)은 버그 가능성이 있어 확인 필요, 2번(letter-spacing 변경)은 시각적 변경이므로 의도 확인 필요합니다. 나머지는 개선 제안입니다.
  > 
  > LGTM with minor fixes

---

### !118 · [FE] feat : S01P21D208-144 포트폴리오 UI 구현

- 작성자: **정준용** · 상태: `merged`
- 브랜치: `feature/fe/portfoilo` → `dev-frontend`
- 생성: 2026-03-16 · 머지: 2026-03-16
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/118](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/118)

<details><summary>MR 설명</summary>

> ## 변경 목적
> - 포트폴리오 페이지의 반응형 레이아웃 기준을 정리했습니다.
> - 포트폴리오 데이터 요청이 env 기반 mock 설정을 정상적으로 따르도록 수정했습니다.
> - 1024px 이상에서 데스크톱 구조가 일관되게 유지되도록 정리했습니다.
> 
> ## 주요 변경 사항
> - 포트폴리오 API 요청 수정
>   - `/portfolio` 데이터 요청이 `NEXT_PUBLIC_API_MOCKING` 값을 따라 동작하도록 정리
>   - 기존 `useBaseUrl: false` 제거로 mock on/off 전환 시 로컬 mock / 서버 API를 정상 분기
> 
> - 포트폴리오 페이지 반응형 구조 정리
>   - `1024px(lg)` 이상을 데스크톱 기준으로 통일
>   - 히어로 영역, 본문 2열 구조, 우측 사이드바 노출 시점을 동일 기준으로 정리
>   - 보유 종목 / 오늘 매매 내역 보드도 같은 브레이크포인트 기준으로 데스크톱 테이블 레이아웃 적용
> 
> - 히어로 영역 UI 보정
>   - 제목 줄바꿈이 단어 중간에서 깨지지 않도록 단어 단위 줄바꿈 처리
>   - 태블릿/데스크톱 구간에서 텍스트 블록과 이미지 크기/정렬 보정
>   - 메인 컬럼 좌우 여백 소폭 조정
> 
> ## 기대 효과
> - 포트폴리오 페이지가 브레이크포인트마다 구조가 갑자기 바뀌는 문제를 줄임
> - mock 환경과 서버 환경 전환 시 포트폴리오 API 동작 일관성 확보
> - 태블릿/데스크톱에서 히어로 섹션 가독성 개선
> 
> 
> ## 이슈번호
> S01P21D208-144

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-16)
  > ## 코드 리뷰 리포트 — MR !118
  > 
  > **리뷰어**: 프론트엔드 전문가 관점
  > **파일 수**: 32개 변경
  > **총 이슈**: 14건
  > 
  > ---
  > 
  > ### CRITICAL (0)
  > 없음
  > 
  > ---
  > 
  > ### HIGH (4)
  > 
  > **1. 중복 mock route — 오타 경로 portfoilo 가 별도 파일로 존재**
  > - `src/app/api/portfoilo/route.ts` 와 `src/app/api/portfolio/route.ts` 가 **완전히 동일한 코드**입니다.
  > - 오타 경로를 별도 파일로 유지하면 유지보수 시 한쪽만 수정하고 다른 쪽을 빠뜨리는 사고가 발생합니다.
  > - **권장**: portfoilo route를 삭제하고, 필요하다면 next.config.ts의 redirects에서 오타 경로를 정상 경로로 리다이렉트하세요.
  > 
  > **2. globals.css — * { margin: 0 } 전역 리셋 삭제**
  > - 이 변경은 포트폴리오 페이지만이 아니라 **앱 전체**에 영향을 줍니다.
  > - h1~h6, p, ul 등 기본 마진이 브라우저 기본값으로 복원되어 기존 페이지의 레이아웃이 깨질 수 있습니다.
  > - **권장**: 이 변경이 의도적이라면 별도 MR로 분리하여 전 페이지 영향도를 확인한 뒤 머지하세요. 포트폴리오 MR에서 함께 바꾸면 사이드이펙트 추적이 어렵습니다.
  > 
  > **3. Mock Auth 보안 — shouldUseMockAuth() 프로덕션 리스크**
  > - mock.ts의 shouldUseMockAuth()가 NEXT_PUBLIC_API_MOCKING (클라이언트 노출 env)을 fallback으로 사용합니다.
  > - 프로덕션에서 env 설정 실수로 NEXT_PUBLIC_API_MOCKING=true가 되면 **인증 우회**가 가능해집니다.
  > - **권장**: NODE_ENV === 'production'이면 무조건 false를 반환하는 가드를 추가하세요.
  > 
  > ```ts
  > export function shouldUseMockAuth() {
  >   if (process.env.NODE_ENV === 'production') return false;
  >   // ... 기존 로직
  > }
  > ```
  > 
  > **4. PortfolioTabsSection.tsx — 332줄 단일 컴포넌트**
  > - HoldingRows, HoldingCards, TodayTradeRows, TodayTradeCards, MonthlyReturnRows, MonthlyReturnCards 총 6개의 서브 컴포넌트가 하나의 파일에 인라인 정의되어 있습니다.
  > - **권장**: 최소한 탭별 콘텐츠(HoldingsTab, TodayTradesTab, MonthlyReturnsTab)를 별도 파일로 분리하세요. 현재 구조는 수정 시 충돌 범위가 넓고 코드 탐색이 어렵습니다.
  > 
  > ---
  > 
  > ### MEDIUM (6)
  > 
  > **5. AppNav — Icon === null 일 때 LuNewspaper 폴백**
  > - 기존에는 빈 span이었는데 LuNewspaper 아이콘으로 변경되었습니다.
  > - 현재 아이콘이 null인 nav item은 뉴스(/news) 하나뿐이므로 당장 문제는 없지만, 향후 아이콘 없는 항목이 추가되면 모두 뉴스 아이콘이 됩니다.
  > - **권장**: icon: LuNewspaper를 뉴스 nav item에 직접 지정하고 폴백은 빈 아이콘으로 유지하세요.
  > 
  > **6. 다크모드 --color-bg-danger-subtle 값 변경 (red-800 → red-600)**
  > - 다크모드에서 subtle 배경이 더 밝아지는 방향입니다. subtle의 시맨틱(은은한 배경)과 반대로 선명해질 수 있습니다.
  > - 다른 subtle 토큰(info-subtle, success-subtle, warning-subtle)은 800~950 범위를 사용하므로 일관성이 떨어집니다.
  > - **권장**: red-900 정도로 조정하거나, 의도적인 디자인 결정이라면 코멘트를 남겨주세요.
  > 
  > **7. PORTFOLIO_API.md 문서와 실제 코드 불일치**
  > - 문서에 "프런트 클라이언트는 useBaseUrl: false로 로컬 route를 강제 사용"이라고 되어있지만, 실제 getPortfolio.ts에는 useBaseUrl 옵션이 없습니다.
  > - MR 설명에도 "useBaseUrl: false 제거"가 변경사항으로 명시되어 있어 **문서가 과거 상태**를 반영하고 있습니다.
  > - **권장**: PORTFOLIO_API.md를 현재 코드 상태에 맞게 업데이트하세요.
  > 
  > **8. portfolioFormatters.ts — 중복 formatter 인스턴스**
  > - currencyFormatter와 integerFormatter가 완전히 동일한 new Intl.NumberFormat("ko-KR")입니다.
  > - **권장**: 하나로 통합하세요. 향후 통화 포맷이 바뀌면 (style: 'currency' 등) 분리하면 됩니다.
  > 
  > **9. formatSignedValue — 경계값 미처리**
  > - NaN이나 Infinity 입력 시 "NaN%", "+Infinity%" 같은 문자열이 UI에 노출됩니다.
  > - **권장**: 방어 로직 추가 또는 호출부에서 유효성을 보장하는 방식 중 하나를 선택하세요.
  > 
  > **10. GoSearch style={{ strokeWidth: 2 }} 인라인 스타일**
  > - 프로젝트 컨벤션이 Tailwind CSS 기반인데, 이 부분만 인라인 스타일입니다.
  > - react-icons는 SVG이므로 strokeWidth를 CSS class로 제어하기 어려운 점은 이해하지만, 가능하면 Tailwind arbitrary value [stroke-width:2]를 시도해보세요.
  > 
  > ---
  > 
  > ### LOW (4)
  > 
  > **11. 브랜치명 오타 feature/fe/portfoilo**
  > - portfolio의 오타입니다. 브랜치명은 머지 후에도 기록에 남으므로 참고 사항입니다.
  > 
  > **12. createMockUserId — 해시 충돌 가능성**
  > - email의 문자 코드 합산으로 ID를 생성하는데, 같은 합을 가진 다른 이메일이 충돌할 수 있습니다.
  > - mock 전용이므로 차단 사유는 아니지만, 인지하고 계시면 좋겠습니다.
  > 
  > **13. horse.png 이미지 최적화**
  > - 바이너리 파일이라 크기를 확인하진 못했지만, public/images/에 직접 넣는 방식이면 Next.js Image Optimization 적용 여부를 확인하세요.
  > - Image 컴포넌트를 사용하고 있어 자동 최적화가 적용되지만, 원본 파일 크기가 크다면 사전 압축을 권장합니다.
  > 
  > **14. Auth route의 import 순서 변경**
  > - callback/route.ts, login/route.ts 등에서 type import가 value import 아래로 이동했습니다.
  > - ESLint import order 규칙이 있다면 자동 정렬 결과일 수 있으나, 기존 코드와의 일관성을 확인하세요.
  > 
  > ---
  > 
  > ## 총평
  > 
  > 전반적으로 포트폴리오 페이지의 **설계 방향은 좋습니다**. 타입 시스템 활용, React Query 도입, 포맷터 분리, 반응형 구조 등이 잘 잡혀 있습니다.
  > 
  > 다만 이 MR의 **스코프가 넓습니다**:
  > - 포트폴리오 UI 리빌드
  > - Mock auth 시스템 추가
  > - 글로벌 CSS 리셋 변경
  > - 테마 토큰 추가/변경
  > - 네비게이션 변경
  > 
  > 가능하다면 **mock auth 시스템**과 **globals.css 리셋 변경**은 별도 MR로 분리하여 영향도를 독립적으로 검증하는 것을 권장합니다.
  > 
  > ---
  > 
  > **RECOMMENDATION: REQUEST CHANGES**
  > 
  > HIGH #2 (글로벌 CSS 리셋 제거의 앱 전체 영향) 와 HIGH #3 (mock auth 프로덕션 가드 부재)은 머지 전 해결이 필요합니다.

---

### !119 · [AI] Feat: S14P21D208-154 S14P21D208-155 S14P21D208-156 S14P21D208-158 S14P21D208-159 토론 배치 API 및 로컬 워커 구현

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `feature/ai/debate-worker` → `dev-ai`
- 생성: 2026-03-16 · 머지: 2026-03-16
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/119](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/119)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 토론 배치용 AI API와 로컬 데스크탑 워커를 구현하고 로컬 검증 테스트를 추가했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - `/ai/debate/targets`, `/ai/debate/inputs/{stock_id}`, `/ai/debate/results` API를 구현했습니다.
> - `X-API-Key` 기반 내부 인증을 적용해 debate API를 보호했습니다.
> - `trading_history` 기준으로 모의투자 대상 종목만 토론 배치 대상으로 조회할 수 있도록 구성했습니다.
> - `services/ai/4_debate_worker` 모듈을 추가해 로컬 데스크탑에서 연속 실행 가능한 토론 워커를 구현했습니다.
> - SQLite 체크포인트 기반으로 재시도, lease 만료 복구, 결과 재전송 로직을 추가했습니다.
> - 개인 데스크탑 세팅 가이드, 운영 가이드, 장애 복구 가이드를 문서화했습니다.
> - 토론 결과 저장 API와 워커 체크포인트 흐름에 대한 로컬 단위 테스트를 추가했습니다.
> 
> ## 📎 Issue 번호
> - S14P21D208-154
> - S14P21D208-155
> - S14P21D208-156
> - S14P21D208-158
> - S14P21D208-159

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-16)
  > ### 전체 구조 평가
  > 
  > 32개 파일, 약 2,889줄의 변경으로 크게 두 파트로 나뉩니다:
  > 
  > 1. **서버 사이드** (`3_ai_server/domains/debate/`) — Debate 대상 조회, 입력 패킷 조립, 결과 저장 API
  > 2. **워커 사이드** (`4_debate_worker/`) — 로컬 데스크탑에서 LLM 토론 실행 + 체크포인트 기반 복구
  > 
  > 전반적으로 **설계가 잘 되어 있습니다**. 서버-워커 분리, 체크포인트 기반 복구, lease 방식의 작업 관리 등 운영 안정성을 고려한 구조입니다.
  > 
  > ---
  > 
  > ### 좋은 점
  > 
  > 1. **체크포인트 설계가 견고함** — `result_ready` 상태로 LLM 결과를 먼저 저장 후 API POST하는 구조는 비싼 추론 결과를 보호합니다. 테스트(`test_runner.py`)에서 재시작 시 캐시된 결과 재사용을 잘 검증하고 있습니다.
  > 
  > 2. **lease 기반 작업 관리** — `running` 상태에 lease 만료 시간을 걸어 비정상 종료 후에도 자동 복구되는 구조가 좋습니다.
  > 
  > 3. **외부 의존성 최소화** — `4_debate_worker`가 `urllib`만 사용하고 `requests`/`httpx` 없이 구현해서 의존성이 가볍습니다.
  > 
  > 4. **서버 API 인증** — `X-API-Key` 헤더 기반 내부 API 인증이 잘 분리되어 있습니다.
  > 
  > 5. **테스트 커버리지** — 핵심 시나리오(정상 저장, 중복 처리, ticker 불일치, 체크포인트 복구)를 테스트로 잘 커버합니다.
  > 
  > ---
  > 
  > ### 개선 필요 사항
  > 
  > #### 심각도: 높음
  > 
  > **1. `_connect()` 호출마다 새 connection을 열지만 명시적으로 close하지 않음**
  > - `checkpoint_store.py:74-76` — `_connect()`가 `with self._connect() as conn:` 패턴으로 쓰이지만, `sqlite3.connect()`의 context manager는 commit/rollback만 하고 **connection을 닫지 않습니다**.
  > - 장시간 continuous 모드에서 connection이 계속 쌓일 수 있습니다.
  > - 수정: `finally: conn.close()` 추가하거나, 단일 connection을 재사용하는 방식으로 변경.
  > 
  > **2. `claim_next_job`에서 SELECT + UPDATE가 원자적이지 않음**
  > - `checkpoint_store.py:102-156` — 현재는 단일 워커라 문제없지만, 여러 대를 돌리겠다는 문서 내용과 모순됩니다. 멀티 워커 시 동일 job을 동시에 claim할 수 있습니다.
  > - 수정: `UPDATE ... RETURNING` 또는 `BEGIN IMMEDIATE` 트랜잭션 사용 고려.
  > 
  > **3. `service.py`에서 `ai_ml_report`가 `None`일 때 예외 발생 가능**
  > - `service.py:104-114` — `ai_ml_report`가 `None`이면 `AiMlReportPayload(...)` 블록은 건너뛰지만, `resolved_model_version`이 `None`이 되어 하위 prediction 조회도 전부 스킵됩니다. 이건 의도된 것 같지만, `ai_ml_report`가 없으면서 prediction은 있는 케이스를 놓칩니다.
  > 
  > #### 심각도: 중간
  > 
  > **4. 스키마 중복 정의**
  > - `3_ai_server/domains/debate/schemas.py`와 `4_debate_worker/worker/schemas.py`에 `FinancialSnapshot`, `AiMlReportPayload`, `NewsItem` 등이 **완전히 동일하게 중복** 정의되어 있습니다 (약 180줄).
  > - 한쪽이 변경되면 다른 쪽도 수동으로 맞춰야 합니다.
  > - 권장: 공통 스키마 패키지를 만들거나, 최소한 주석으로 동기화 대상임을 명시.
  > 
  > **5. `load_dotenv()` 호출 위치**
  > - `4_debate_worker/main.py:21` — `load_dotenv()`가 `from core.config import settings` **이후**에 호출됩니다. `pydantic_settings`가 이미 `.env`를 읽지만, 순서가 혼란스럽습니다. 제거하거나 import 전으로 옮기는 것이 명확합니다.
  > 
  > **6. `sync_targets`에서 `rowcount` 신뢰성**
  > - `checkpoint_store.py:97-98` — `ON CONFLICT ... DO UPDATE`일 때 SQLite의 `rowcount`는 INSERT와 UPDATE 모두 1을 반환합니다. 실제 "새로 추가된 건수"가 아닌 "처리된 건수"가 됩니다.
  > 
  > **7. `_extract_json` 파서가 중첩 JSON에 취약**
  > - `llm_client.py:82-94` — `find("{")` / `rfind("}")` 방식은 LLM이 여러 JSON 블록을 반환하면 잘못된 범위를 잡을 수 있습니다. 현재 프롬프트가 잘 제어하고 있어 당장은 괜찮지만, 모델 변경 시 위험합니다.
  > 
  > #### 심각도: 낮음
  > 
  > **8. `DebateStock` 모델이 기존 `Stock`과 별도로 정의됨**
  > - `models.py:9-17` — `stocks` 테이블을 가리키는 `DebateStock`이 별도로 정의되어 있습니다. 기존 `Stock` 모델과 매핑이 분리되어 있어 불일치 위험이 있습니다.
  > - 권장: 기존 `Stock` 모델을 import해서 사용하거나, 이유를 주석으로 명시.
  > 
  > **9. `api_client.py` timeout 값이 LLM timeout과 동일**
  > - `main.py:47` — `DebateApiClient`의 timeout에 `LLM_REQUEST_TIMEOUT_SECONDS` (180초)를 쓰고 있습니다. API 호출은 보통 LLM보다 훨씬 빠르므로 별도 설정이 적절합니다.
  > 
  > **10. continuous 모드에서 graceful shutdown이 없음**
  > - `runner.py:37-40` — `while True` + `time.sleep`으로 구현되어 있어 SIGTERM/SIGINT 시 현재 작업이 중단됩니다. lease 기반 복구가 있어 데이터 손실은 없지만, `signal` 핸들러 추가를 권장합니다.
  > 
  > **11. 문서 내 절대 경로**
  > - `README.md:26` — `/home/ssafy/dev-ai/...` 같은 절대 경로가 하드코딩되어 있습니다. 상대 경로로 변경해야 합니다.
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 구분 | 평가 |
  > |------|------|
  > | 아키텍처 | 서버-워커 분리, 체크포인트 기반 복구 — 잘 설계됨 |
  > | 코드 품질 | 전반적으로 깔끔. Pydantic 활용 적절 |
  > | 테스트 | 핵심 시나리오 커버. 더 넓은 에러 케이스 추가 가능 |
  > | 보안 | API Key 인증 적절. `INTERNAL_API_KEY` 기본값(`change_me_ai_internal_key`) 주의 |
  > | 운영 | 문서(3개)가 상세하고 실용적 |
  > 
  > **머지 가능 여부**: 높음(#1 connection leak)과 중간(#4 스키마 중복, #5 dotenv 순서) 이슈를 수정하면 머지해도 좋겠습니다. 나머지는 후속 작업으로 처리 가능합니다.

---

### !120 · [BE] Feat: S14P21D208-160 디바이스 세션 관리 구현

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `feature/be/device-session` → `dev-backend`
- 생성: 2026-03-16 · 머지: 2026-03-16
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/120](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/120)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> [BE] Feat: S14P21D208-160 디바이스 세션 관리 구현
> 
> ## 🧑‍💻 MR 세부 내용
> - V4 마이그레이션: device_sessions 테이블 생성 (login_history와의 역할 차이 주석 포함)
> - TrustLevel enum: NEW → RECOGNIZED → TRUSTED 로그인 횟수 기반 자동 승급
> - DeviceSession 엔티티 + Repository (FIFO 제거 쿼리, trust_level 우선순위 정렬)
> - DeviceNameParser: User-Agent → 사람이 읽을 수 있는 기기명 파싱
> - DeviceSessionService: 등록/갱신, 5대 제한 FIFO, 원격 로그아웃, 전체 세션 제거
> - AuthServiceImpl: login/signup/logout/oauth/resetPassword에 세션 연동
> - AuthController: GET /api/auth/sessions, DELETE /api/auth/sessions/{deviceId}, POST /api/auth/logout/all
> - 세션 목록 응답에 maxDevices, currentCount 포함 (명세 7.4절)
> 
> 
> ## 📎 Issue 번호
> S14P21D208-160

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-16)
  > ### 전체 구조 평가
  > 
  > 15개 파일, 약 779줄의 변경으로 디바이스 세션 관리 기능을 구현합니다:
  > 
  > 1. **DB 마이그레이션** — `device_sessions` 테이블 생성 (V4)
  > 2. **엔티티/리포지토리** — `DeviceSession` + FIFO 제거 쿼리
  > 3. **서비스** — 등록/갱신, 5대 제한, 원격 로그아웃, 전체 세션 제거
  > 4. **컨트롤러** — GET /sessions, DELETE /sessions/{deviceId}, POST /logout/all
  > 5. **기존 AuthService 연동** — login/signup/logout/oauth/resetPassword에 세션 연동
  > 
  > 전반적으로 **완성도가 높고 깔끔한 구현**입니다. 기존 인증 흐름에 자연스럽게 통합되어 있고, login_history와의 역할 차이를 마이그레이션 주석에 잘 설명한 것이 인상적입니다.
  > 
  > ---
  > 
  > ### 좋은 점
  > 
  > 1. **마이그레이션 주석이 훌륭함** — `V4__create_device_sessions.sql`에서 login_history와의 관계, trust_level 승급 기준, ip_address 중복 존재 이유까지 명확하게 문서화했습니다. 다른 팀원이 읽기 좋습니다.
  > 2. **TrustLevel 자동 승급 설계** — enum에 `fromLoginCount()` 로직을 넣어서 엔티티의 `updateOnLogin()`에서 자연스럽게 호출됩니다. 향후 Step-up 인증 확장도 고려한 설계입니다.
  > 3. **FIFO 제거 우선순위** — 단순 시간순이 아니라 `trust_level 낮은 순 → last_login_at 오래된 순`으로 정렬하여 신뢰도 높은 기기를 보호합니다.
  > 4. **revokeSession에서 RT 동시 삭제** — 세션 제거 시 Redis의 Refresh Token도 함께 삭제하여 일관성을 보장합니다. 기존 logout 로직도 이를 활용하도록 리팩토링했습니다.
  > 5. **DTO 설계** — record 활용, `isCurrent` 플래그, `maxDevices`/`currentCount` 포함 등 프론트엔드가 바로 쓸 수 있는 응답 구조입니다.
  > 
  > ---
  > 
  > ### 개선 필요 사항
  > 
  > #### 심각도: 높음
  > 
  > **1. `revokeSession`에서 존재하지 않는 세션 제거 시 silent fail**
  > 
  > - `DeviceSessionServiceImpl:87-90` — `deleteByUserIdAndDeviceId`는 해당 행이 없어도 예외를 던지지 않습니다. `AuthErrorCode.SESSION_NOT_FOUND`를 정의해놓고 사용하지 않고 있습니다.
  > - 수정: 삭제 전 `findByUserIdAndDeviceId`로 존재 여부 확인 후 없으면 `SESSION_NOT_FOUND` 예외.
  > 
  > **2. `logoutAll`에서 `revokeAllSessions` 호출과 `deleteAllRefreshTokens` 중복 가능성**
  > 
  > - `AuthServiceImpl:403-407` — `deviceSessionService.revokeAllSessions(userId)`가 내부적으로 이미 `redisTokenService.deleteAllRefreshTokens(userId)`를 호출합니다. 하지만 `logoutAll`에서는 직접 `deleteAllRefreshTokens`를 호출하지 않으니 현재는 문제 없습니다.
  > - 다만 `resetPassword` 메서드(540번 라인 부근)에서는 `redisTokenService.deleteAllRefreshTokens` + `deviceSessionService.revokeAllSessions` 둘 다 호출하고 있어, `revokeAllSessions` 내부에서 `deleteAllRefreshTokens`가 **두 번** 실행됩니다.
  > - 수정: `resetPassword`에서 `redisTokenService.deleteAllRefreshTokens` 호출을 제거하거나, `revokeAllSessions`에서 RT 삭제를 분리.
  > 
  > **3. `enforceDeviceLimit`에서 flush 타이밍 문제**
  > 
  > - `DeviceSessionServiceImpl:105-121` — `deviceSessionRepository.delete(target)` 후 바로 새 세션을 `save`하는데, JPA의 flush 순서에 따라 unique constraint 위반이 발생할 수 있습니다 (같은 트랜잭션 내에서 delete → insert 순서가 보장되지 않을 수 있음).
  > - 수정: `delete` 후 `deviceSessionRepository.flush()`를 명시적으로 호출.
  > 
  > #### 심각도: 중간
  > 
  > **4. `DeviceNameParser`에 단위 테스트가 없음**
  > 
  > - 파싱 로직이 다양한 User-Agent 케이스를 다루고 있지만, 테스트가 없어 엣지 케이스(빈 문자열, 비표준 UA, 봇 UA 등)에서의 동작을 보장하기 어렵습니다.
  > - 권장: `DeviceNameParserTest` 추가.
  > 
  > **5. `X-Device-Id` 헤더 검증 없음**
  > 
  > - `AuthController`의 `getSessions`, `revokeSession`, `logoutAll` 모두 `@RequestHeader("X-Device-Id")`를 받지만, 빈 문자열이나 과도하게 긴 값에 대한 검증이 없습니다.
  > - 수정: `@Size(max=255)` 또는 서비스 레이어에서 검증.
  > 
  > **6. `countByUserId` 쿼리가 불필요할 수 있음**
  > 
  > - `DeviceSessionRepository:15-16` — `countByUserId`를 JPQL로 별도 정의했지만, Spring Data JPA는 `countByUserId(Long userId)`를 메서드명만으로 자동 생성합니다. `@Query` 어노테이션은 불필요합니다.
  > - (동작에는 영향 없음, 코드 간결성 차원)
  > 
  > **7. `logoutAll`에서 현재 기기의 세션도 삭제됨**
  > 
  > - `AuthServiceImpl:407` — `deviceSessionService.revokeAllSessions(userId)`가 현재 기기 포함 모든 세션을 삭제합니다. 이게 의도된 동작이라면 괜찮지만, 프론트엔드에서 "전체 로그아웃 후 현재 기기는 유지" 같은 UX를 원할 수 있습니다.
  > - 확인 필요: 기획 명세 7.4절에서 현재 기기 처리 방식 확인.
  > 
  > #### 심각도: 낮음
  > 
  > **8. `DeviceSession.onCreate()`에서 `OffsetDateTime.now()` 두 번 호출**
  > 
  > - `DeviceSession:65-68` — `createdAt`과 `lastLoginAt`에 각각 `OffsetDateTime.now()`를 호출하므로 미세한 시간차가 발생할 수 있습니다.
  > - 수정: 변수에 한 번만 담아서 사용.
  > 
  > ```java
  > OffsetDateTime now = OffsetDateTime.now();
  > this.createdAt = now;
  > this.lastLoginAt = now;
  > ```
  > 
  > **9. `Windows NT 10` 매칭이 Windows 11을 놓침**
  > 
  > - `DeviceNameParser:89` — Windows 11도 `Windows NT 10.0`을 사용합니다. 정확한 구분이 필요하면 Client Hints 기반 파싱이 필요하지만, 현재 수준에서는 "Windows 10"으로 표시해도 큰 문제는 없습니다.
  > 
  > **10. `enforceDeviceLimit` 로그에 민감 정보**
  > 
  > - `DeviceSessionServiceImpl:119-120` — deviceId를 로그에 남기고 있습니다. deviceId가 UUID 같은 식별자라면 괜찮지만, 혹시 민감한 값이 들어올 수 있는지 확인이 필요합니다.
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 구분 | 평가 |
  > |----|----|
  > | 아키텍처 | 기존 인증 흐름에 자연스럽게 통합, 역할 분리 적절 |
  > | 코드 품질 | record DTO, enum 로직 캡슐화, 주석 충실 |
  > | 테스트 | `DeviceNameParser` 테스트 부재가 아쉬움 |
  > | 보안 | X-Device-Id 검증 부재, 현재 세션 제거 방지(컨트롤러)는 잘 처리 |
  > | DB 설계 | 마이그레이션 주석 우수, 인덱스 적절 |
  > 
  > **머지 가능 여부**: 높음(#1 silent fail, #2 RT 이중 삭제, #3 flush 타이밍) 이슈를 수정하면 머지해도 좋겠습니다. 특히 #1은 이미 에러코드를 만들어놓고 안 쓰고 있어서 금방 수정할 수 있습니다.

- 💬 **강지석** (2026-03-16)
  > # 디바이스 세션 코드리뷰 응답
  > 
  > ## 수정 완료 항목
  > 
  > | # | 항목 | 수정 내용 |
  > |---|------|-----------|
  > | 1 | revokeSession silent fail | `findByUserIdAndDeviceId`로 존재 여부 확인 후 없으면 `SESSION_NOT_FOUND` 예외 발생하도록 수정 |
  > | 2 | resetPassword RT 이중 삭제 | `redisTokenService.deleteAllRefreshTokens()` 직접 호출 제거. `revokeAllSessions()` 내부에서 RT 삭제를 포함하므로 중복 호출 제거 |
  > | 5 | X-Device-Id 검증 부재 | 세션 관련 3개 엔드포인트(`getSessions`, `revokeSession`, `logoutAll`)에 `@Size(max = 255)` 추가 |
  > | 6 | countByUserId @Query 불필요 | Spring Data JPA 메서드명 기반 자동 생성으로 변경, `@Query` 어노테이션 제거 |
  > | 8 | OffsetDateTime.now() 두 번 호출 | 지역 변수 `now`에 한 번만 담아서 `createdAt`, `lastLoginAt`에 할당 |
  > 
  > ## 수정하지 않은 항목과 사유
  > 
  > ### #3 (높음) enforceDeviceLimit flush 타이밍 — 실제 문제 아님
  > 
  > > 리뷰 원문: "JPA의 flush 순서에 따라 unique constraint 위반이 발생할 수 있습니다"
  > 
  > 이 지적은 **해당되지 않습니다.** unique constraint는 `(user_id, device_id)` 조합에 걸려 있습니다.
  > 
  > `enforceDeviceLimit`에서 제거되는 세션과 새로 추가되는 세션은 **서로 다른 `device_id`를 가집니다.** 만약 같은 `device_id`였다면 `registerOrUpdateSession` 상단의 `findByUserIdAndDeviceId`에서 이미 발견되어 update 경로를 탔을 것이므로, `enforceDeviceLimit`이 호출되는 시점에서는 항상 새로운 `device_id`가 들어옵니다.
  > 
  > 따라서 Hibernate의 flush 순서(insert → update → delete)와 무관하게, `device_id`가 다르므로 unique constraint 충돌이 발생할 수 없습니다.
  > 
  > ### #4 (중간) DeviceNameParser 단위 테스트 부재
  > 
  > 유효한 지적이지만, 현재 스프린트 범위에서는 우선순위가 낮습니다. `DeviceNameParser`는 순수 문자열 파싱 유틸리티이고 로직이 단순하여 동작이 예측 가능합니다. 향후 파싱 규칙이 복잡해지거나 엣지 케이스가 보고되면 테스트를 추가할 예정입니다.
  > 
  > ### #7 (중간) logoutAll에서 현재 기기 세션도 삭제
  > 
  > 이것은 **의도된 동작**입니다.
  > 
  > API 명세 7.3절 "전체 디바이스 로그아웃"은 현재 기기를 포함한 **모든 기기에서 로그아웃**하는 기능입니다. 구현에서도 현재 기기의 Access Token을 블랙리스트에 등록하고, Refresh Token 쿠키를 삭제하며, `token_version`을 증가시켜 모든 토큰을 무효화하고 있습니다. 현재 기기의 세션만 남기는 것은 이 흐름과 모순됩니다.
  > 
  > "현재 기기 제외 전체 로그아웃"이 필요한 경우 별도 API로 구현하는 것이 적절합니다.
  > 
  > ### #9 (낮음) Windows NT 10 매칭이 Windows 11을 놓침
  > 
  > 맞는 관찰이지만, **User-Agent 기반으로는 해결이 불가능한 알려진 한계**입니다.
  > 
  > Windows 11도 User-Agent에 `Windows NT 10.0`으로 표시되며, 정확한 구분을 위해서는 `Sec-CH-UA-Platform-Version` (Client Hints) 헤더가 필요합니다. 현재 `DeviceNameParser`는 사용자가 대략적으로 기기를 식별하기 위한 보조 정보이므로, "Windows 10"으로 표시되는 것이 기능에 영향을 주지 않습니다.
  > 
  > ### #10 (낮음) enforceDeviceLimit 로그에 deviceId 노출
  > 
  > `device_id`는 프론트엔드에서 생성하는 **UUID 형식의 식별자**로, 개인정보나 민감 정보가 아닙니다. 세션 관리/디버깅을 위해 로그에 남기는 것이 적절하며, 보안상 문제가 없습니다.

---

### !121 · [AI] Feat: TFT v2 앙상블 모델 마이그레이션 및 프로덕션 베이스라인 구축

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/ai/stock-tft-prediction` → `dev-ai`
- 생성: 2026-03-16 · 머지: 2026-03-16
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/121](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/121)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> LSTM 기반 모델을 TFT v2 앙상블로 교체하고 v6-K200 프로덕션 베이스라인 확정
> 
> ## MR 세부 내용
> - LSTM to TFT v2 모델 마이그레이션
> - TFT v2 피처 생성 모듈 추가 (build_tft_features.py)
> - Walk-Forward 21윈도우 체크포인트 학습
> - 앙상블 백테스트 v1-v7 파라미터 탐색 및 최적화
> - v6-K200 프로덕션 베이스라인 확정 (Sharpe 1.953, MDD -6.82%)
> - KOSPI200 200종목 필터링 적용
> - 2025-01 ~ 2026-02 최신 구간 백테스트 검증 (+26.91%)
> - LSTM 피처 개선 및 Walk-Forward 시퀀스 지원
> - 앙상블 메타모델 타겟 매핑 버그 수정
> - N-HiTS, PatchTST 모델 실험 노트북
> 
> ## Issue 번호
> S14P21D208-127
> S14P21D208-140
> S14P21D208-167

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-16)
  > ## Code Review Report (노트북 제외)
  > 
  > **Files Reviewed:** 13 | **Total Issues:** 14
  > 
  > ### CRITICAL (0)
  > 보안 취약점 없음
  > 
  > ### HIGH (3) — 머지 전 수정 권장
  > 
  > 1. **`visualize_backtest.py:33`** — 하드코딩된 Google Drive 경로
  >    - `Path("G:/내 드라이브/...")` → `config.py`의 `BACKTEST_PATH` 사용 권장
  > 
  > 2. **`visualize_backtest.py:39-41`** — 날짜 하드코딩된 파일명
  >    - `equity_curve_top_n_20260313.parquet` → glob으로 최신 파일 탐색
  > 
  > 3. **`visualize_backtest.py:118`** — MDD 값 하드코딩
  >    - `axhline(y=-17.75)` → `drawdown.min()`으로 동적 계산
  > 
  > ### MEDIUM (7)
  > 
  > | # | 파일 | 이슈 |
  > |---|------|------|
  > | 1 | `portfolio_simulator.py:193` | `except Exception: pass` 에러 무시 — 로깅 필요 |
  > | 2 | `ensemble_trainer.py:158,411` | `build_meta_features` 두 함수 간 ~100줄 중복 |
  > | 3 | 7개 파일 | `sys.path.insert(0, ...)` 반복 — 패키지화 권장 |
  > | 4 | `lstm_trainer.py:227` | `torch.load` weights_only=True 누락 |
  > | 5 | `lstm_trainer.py:162` | 검증셋 전체 GPU 전송 — OOM 위험 |
  > | 6 | `build_tft_features.py:590` | 전체 데이터 기준 3σ 클리핑 — 데이터 누수 가능 |
  > | 7 | `lstm_trainer.py:1` | `from __future__ import annotations` 누락 |
  > 
  > ### LOW (4)
  > - `regime_backtest.py` f-string 로거 → lazy `%s` 포맷 권장
  > - `visualize_backtest.py:34` INITIAL_CAPITAL 매직넘버 중복
  > - `fee_optimizer.py:21` 미사용 import `asdict`
  > - 다수 파일 `print()`와 `logger.info()` 혼용
  > 
  > ### RECOMMENDATION: REQUEST CHANGES
  > HIGH 3건(visualize_backtest.py 하드코딩)은 다른 환경에서 즉시 실패하므로 수정 권장.
  > 단, 1회성 시각화 스크립트이므로 급하면 머지 후 후속 이슈로 처리 가능.

---

### !122 · [BE] Feat: S14P21D208-161 Step-up 인증 구현

- 작성자: **강지석** · 상태: `closed`
- 브랜치: `feature/be/step-up-auth` → `dev-backend`
- 생성: 2026-03-16 · 머지: -
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/122](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/122)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> [BE] Feat: S14P21D208-161 Step-up 인증 구현
> 
> ## 🧑‍💻 MR 세부 내용
> - POST /api/auth/step-up/verify 엔드포인트 추가
> - 비밀번호 검증 후 ELEVATED Access Token 발급
> - StepUpGuard 컴포넌트 (requireHigh 5분, requireMedium 15분)
> - AUTH_STEP_UP_REQUIRED, AUTH_STEP_UP_EXPIRED, AUTH_STEP_UP_INVALID_METHOD 에러코드 추가
> 
> ## 📎 Issue 번호
> S14P21D208-161

</details>

**리뷰 토론**

- 💬 **강지석** (2026-03-17)
  > # Step-up 인증 코드 리뷰
  > 
  > > 브랜치: `feature/be/step-up-auth`
  > > 커밋: `d056898` [BE] Feat: S14P21D208-161 Step-up 인증 구현
  > 
  > ---
  > 
  > ## 잘 된 부분
  > 
  > - **StepUpGuard 분리** — 민감도별(HIGH 5분 / MEDIUM 15분) 검증을 컴포넌트로 분리하여 재사용성 좋음
  > - **기존 AT 블랙리스트 처리** — step-up 후 기존 STANDARD 토큰을 블랙리스트에 등록, ELEVATED 토큰만 유효하게 만든 것은 보안상 올바름
  > - **JWT에 authLevel/authTime 클레임** 포함하여 stateless하게 처리
  > - **소셜 계정 비밀번호 인증 차단** (`PWD_SOCIAL_ACCOUNT`) 처리 적절
  > - **에러코드 체계** — `STEPUP_001~003` 명확하게 분류됨
  > 
  > ---
  > 
  > ## 확인/개선 필요 사항
  > 
  > ### 1. `@Transactional(readOnly = true)` 이슈
  > `stepUpVerify`에서 `redisTokenService.addToBlacklist()`는 Redis 쓰기 작업이지만 `readOnly = true`로 설정되어 있음. JPA 쓰기가 없어서 동작은 하지만, 의도와 맞지 않으므로 `readOnly` 제거 권장.
  > 
  > ```java
  > // AS-IS
  > @Transactional(readOnly = true)
  > public StepUpVerifyResponse stepUpVerify(...)
  > 
  > // TO-BE
  > @Transactional
  > public StepUpVerifyResponse stepUpVerify(...)
  > ```
  > 
  > ### 2. `getClaimsIgnoreExpiration` 사용
  > 만료된 토큰도 파싱 가능한 메서드로 claims를 추출하고 있음. step-up은 **유효한 토큰 상태**에서만 가능해야 하므로, 만료된 AT로 step-up 요청이 가능한 건 의도된 것인지 확인 필요.
  > 
  > ### 3. Rate Limit 원복 충돌
  > 이 브랜치에서 rate limit이 원래 빡빡한 값으로 되돌아감. `fix/be/password-policy-relax` 브랜치에서 완화한 값과 머지 시 충돌 예상.
  > 
  > | 항목 | dev-backend (현재) | 이 브랜치 |
  > |------|-------------------|----------|
  > | LOGIN | 100회/분 | 10회/분 |
  > | GENERAL | 500회/분 | 100회/분 |
  > 
  > ### 4. PasswordValidator 원복 충돌
  > 대문자 필수 조건이 다시 살아있음. `fix/be/password-policy-relax`에서 제거한 것과 충돌.
  > 
  > ### 5. `DeviceSessionServiceImpl.revokeSession` 변경
  > 세션 존재 여부 확인(`findByUserIdAndDeviceId`) 없이 바로 삭제로 변경됨. 존재하지 않는 세션 삭제 시 사용자에게 에러를 알려주지 않아도 괜찮은지 확인 필요.
  > 
  > ### 6. `AuthenticatedUserProvider`에서 `getCurrentUserIdOrNull` 제거
  > 다른 곳에서 이 메서드를 사용하고 있었다면 컴파일 에러 발생 가능. 사용처 확인 필요.
  > 
  > ### 7. CORS 배포 도메인 제거됨
  > `https://j14d208.p.ssafy.io`가 allowedOrigins에서 빠져있음. 브랜치 분기 시점 차이로 보이며 머지 시 주의 필요.
  > 
  > ---
  > 
  > ## 머지 전 필수 작업
  > 
  > 1. `dev-backend` 기준으로 rebase 또는 충돌 해결 (rate limit, password policy, CORS)
  > 2. `getClaimsIgnoreExpiration` 의도 확인
  > 3. `@Transactional(readOnly = true)` 제거

---

### !125 · [FE] feat : S14P21D208-178 뉴스 리스트 페이지 ui구현

- 작성자: **정준용** · 상태: `merged`
- 브랜치: `feature/fe/news-ui` → `dev-frontend`
- 생성: 2026-03-16 · 머지: 2026-03-17
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/125](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/125)

<details><summary>MR 설명</summary>

> ## 변경 목적
> 
> - 뉴스 페이지를 시안 기준으로 신규 구현했습니다.
> - `/api/news`, `/api/news/search` mock API를 추가했습니다.
> - 뉴스 검색, 상세 필터, 키워드 인터랙션, 반응형 레이아웃을 정리했습니다.
> 
> ## 주요 변경 사항
> 
> - 뉴스 페이지 UI 구현
>   - `/news` 라우트 신규 구성
>   - 상단 소개 영역, 검색창, 상세 필터 버튼, 탭, 뉴스 리스트, 우측 인기 키워드 영역 구현
>   - 데스크톱은 메인 리스트 + 우측 사이드바, 모바일은 단일 컬럼 구조로 반응형 대응
> - 상세 필터 모달 구현
>   - 정렬 기준: 최신순 / 정확도순 / 많이 본 순
>   - 기간: 1주일 / 1개월 / 3개월
>   - 데스크톱 드롭다운형, 모바일 바텀시트형으로 동작
>   - 시안 기준 크기/여백/선택 UI 정리
>   - 데스크톱에서 relative 부모 폭에 묶여 모달 폭이 줄어들던 문제 수정
> - 검색/키워드 인터랙션
>   - 뉴스 검색 입력값 기반 리스트 필터링
>   - 우측 인기 키워드 클릭 시 해당 키워드로 검색
>   - 뉴스 카드 태그 클릭 시 검색이 아니라 종목 상세 페이지(`/stocks/[ticker]`)로 이동
>   - 검색 인풋 focus 시 외곽선/ring 없이 커서만 보이도록 수정
> 
> ===============================
> 
> # 추가사항
> 
> ## 변경 목적
> 
> - 뉴스 페이지 MR 리뷰에서 지적된 구조/성능/접근성 이슈를 반영했습니다.
> - 검색/필터/정렬 흐름을 단순화하고, mock 데이터/route 중복을 정리했습니다.
> 
> ## 주요 변경 사항
> 
> - React Query 캐시 키 보완
>   - `useNewsQuery`의 `queryKey`에 `keyword`만 넣던 구조를 전체 params 기준으로 변경
>   - 이후 offset/limit 기반 서버 페이지네이션 전환 시에도 캐시가 올바르게 분리되도록 정리
> - 검색 로직 단순화
>   - `useDeferredValue` + 수동 `setTimeout` debounce 중복 사용 제거
>   - `useDeferredValue`만 유지해 검색 딜레이 구조를 단순화
>   - 검색 입력은 shared `Input` 대신 네이티브 `input`으로 교체해 `!important` 스타일 오버라이드 제거
> - 뉴스 mock / 유틸 정리
>   - `parseNumber` 중복을 `newsQueryUtils.ts`로 추출
>   - `normalizeKeyword` 중복을 `normalizeNewsKeyword`로 통합
>   - mock 뉴스 데이터 문자열/종목명 정리
>   - 뉴스 item에 `url` 필드 추가
> - 정렬 성능 개선
>   - 인기순 정렬 시 비교 함수마다 `getMockNewsSeeds()`를 재생성하던 구조 제거
>   - 정렬 전에 `Map(id -> views)`를 구성해 조회 비용을 줄임
> - 필터 모달 구조 개선
>   - 모바일 바텀시트는 `createPortal`로 `document.body`에 렌더링
>   - 데스크톱은 전체 화면 fixed backdrop 대신 외부 클릭 감지로 닫히도록 변경
>   - Escape 닫기 유지
> - 기사 카드/접근성 보완
>   - 뉴스 기사 제목에 원문 링크 추가
>   - 구분 점에 `aria-hidden={true}` 명시
>   - 관련 종목 태그는 기존대로 종목 상세 페이지로 이동
> - 페이지 문자열 정리
>   - 뉴스 페이지/필터 모달/키워드 사이드바/mock 데이터의 깨진 문자열을 UTF-8 기준으로 복구
> 
> ## 주요 파일
> 
> - `src/app/news/components/NewsPageClient.tsx`
> - `src/app/news/components/NewsFilterModal.tsx`
> - `src/app/news/components/NewsArticleCard.tsx`
> - `src/app/news/components/NewsKeywordSidebar.tsx`
> - `src/app/news/hooks/useNewsQuery.ts`
> - `src/app/news/types/news.ts`
> - `src/app/news/utils/mockNewsData.ts`
> - `src/app/news/utils/newsFormatters.ts`
> - `src/app/news/utils/newsQueryUtils.ts`
> - `src/app/api/news/route.ts`
> - `src/app/api/news/search/route.ts`
> 
> ## 참고 사항
> 
> - 현재는 mock 단계라 `limit: NEWS_FETCH_LIMIT`로 전체를 가져온 뒤 클라이언트 페이지네이션을 유지합니다.
> - 추후 실제 API 연동 시 서버 사이드 페이지네이션으로 전환할 수 있도록 TODO를 남겼습니다.
> - 탭 UI는 이번 MR에서는 별도 shared 컴포넌트로 추출하지 않았습니다.
> 
> ## 테스트
> 
> - `pnpm lint`
> - `pnpm build`
> 
> ## 이슈 번호
> 
> S14P21D208-178

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-16)
  > ## 코드 리뷰 리포트 — MR !125
  > 
  > **리뷰어**: FE 코드리뷰
  > **파일 수**: 12개 (신규 11, 수정 1)
  > **전체 이슈**: 13건
  > 
  > ---
  > 
  > ### CRITICAL (0건)
  > 없음
  > 
  > ---
  > 
  > ### HIGH (3건)
  > 
  > **1. `useNewsQuery` queryKey에 offset/limit 누락** — `hooks/useNewsQuery.ts:9`
  > 
  > 현재 queryKey가 `["news", "list", params.keyword]`로 keyword만 포함하고 있습니다. offset, limit이 변경되어도 캐시 키가 같아서 React Query가 refetch하지 않습니다.
  > 
  > 현재 구현에서는 항상 `offset: 0, limit: NEWS_FETCH_LIMIT(60)`으로 고정 호출하고 클라이언트 사이드 페이지네이션을 하고 있어 당장 버그는 아니지만, 나중에 서버 사이드 페이지네이션으로 전환할 때 반드시 문제가 됩니다.
  > 
  > ```ts
  > // 권장
  > queryKey: ["news", "list", params],
  > ```
  > 
  > ---
  > 
  > **2. `useDeferredValue` + 수동 debounce 중복 사용** — `components/NewsPageClient.tsx:51~65`
  > 
  > `useDeferredValue(searchInput)`과 `setTimeout 200ms` debounce를 동시에 사용하고 있습니다. `useDeferredValue`는 이미 React가 우선순위 기반으로 렌더링을 지연시키는 메커니즘인데, 여기에 수동 타이머 debounce까지 추가하면 불필요한 복잡성이 생깁니다.
  > 
  > **둘 중 하나만 사용하세요:**
  > - `useDeferredValue`만 사용 → React 19 concurrency 활용 (권장)
  > - `setTimeout` debounce만 사용 → API 호출 횟수 직접 제어
  > 
  > 현재 코드는 `deferredSearchInput`이 변경될 때 또 200ms 기다린 후 `setKeyword`를 호출하므로, 실제 검색까지 체감 딜레이가 과도합니다.
  > 
  > ---
  > 
  > **3. Input 컴포넌트에 `!important` 오버라이드 과다** — `components/NewsPageClient.tsx:160~164`
  > 
  > ```
  > !outline-none !ring-0 !shadow-none !focus:border-transparent ...
  > ```
  > 
  > 공유 `Input` 컴포넌트의 기본 스타일을 `!important`로 7개나 덮어쓰고 있습니다. 이는 Input 컴포넌트의 디자인 계약을 우회하는 것이며, Input이 변경되면 함께 깨질 수 있습니다.
  > 
  > **대안:**
  > - Input 컴포넌트에 `variant="ghost"` 같은 옵션 추가
  > - 또는 이 맥락에서는 `<input>` 네이티브 엘리먼트를 직접 사용
  > 
  > ---
  > 
  > ### MEDIUM (6건)
  > 
  > **4. `parseNumber` 함수 중복** — `api/news/route.ts:8`, `api/news/search/route.ts:7`
  > 
  > 두 mock API route에 동일한 `parseNumber` 함수가 각각 정의되어 있습니다. `shared/utils`나 news 모듈 내 공용 유틸로 추출하세요.
  > 
  > ---
  > 
  > **5. `getPopularityScore`에서 매 비교마다 전체 mock seed 재생성** — `utils/newsFormatters.ts:15~18`
  > 
  > ```ts
  > function getPopularityScore(item: NewsItem) {
  >   const seed = getMockNewsSeeds().find(...);
  > }
  > ```
  > 
  > `sortNewsItems` 내에서 `.sort()` 비교 함수가 호출될 때마다 `getMockNewsSeeds()`가 전체 배열을 새로 생성하고, `.find()`로 선형 탐색합니다. 정렬 비교 횟수가 O(n log n)이므로, 전체적으로 O(n^2 log n) 수준의 비효율이 발생합니다.
  > 
  > **수정 제안:** sort 전에 Map으로 미리 구축하세요.
  > ```ts
  > const viewsMap = new Map(getMockNewsSeeds().map(s => [s.id, s.views]));
  > ```
  > 
  > ---
  > 
  > **6. `normalizeKeyword` 함수 중복** — `utils/mockNewsData.ts`, `utils/newsFormatters.ts`
  > 
  > 동일한 함수가 두 파일에 각각 정의되어 있습니다. 하나로 통합하세요.
  > 
  > ---
  > 
  > **7. body scroll lock 직접 DOM 조작** — `components/NewsPageClient.tsx:69~92`
  > 
  > `document.body.style.overflow = "hidden"`은 다른 모달이나 스크롤 잠금 로직과 충돌할 수 있습니다. 또한 `window.matchMedia("(max-width: 1023px)").matches`를 `useEffect` 실행 시점에만 확인하므로, 모달이 열린 상태에서 화면 크기가 변경되면 scroll lock 상태가 어긋납니다.
  > 
  > ---
  > 
  > **8. 뉴스 기사 카드에 링크 없음** — `components/NewsArticleCard.tsx`
  > 
  > 관련 종목 태그에는 `/stocks/[ticker]` 링크가 있지만, 기사 제목 자체에는 뉴스 원문 링크가 없습니다. `NewsItem` 타입에 `url` 필드가 빠져 있는지 확인 필요합니다.
  > 
  > ---
  > 
  > **9. 필터 모달 backdrop이 Portal 없이 렌더링됨** — `components/NewsFilterModal.tsx:123~130`
  > 
  > 모바일 바텀시트의 `fixed inset-0` backdrop이 `relative` 부모 안에서 렌더링됩니다. 현재 z-index로 처리했지만, 부모 요소에 `transform`, `filter`, `will-change` 등이 적용되면 `fixed` positioning이 containing block에 갇히는 CSS 스펙 이슈가 발생할 수 있습니다. `createPortal`로 document.body에 렌더링하는 것이 안전합니다.
  > 
  > ---
  > 
  > ### LOW (4건)
  > 
  > **10. `aria-hidden` 값 누락** — `NewsArticleCard.tsx:34`
  > 
  > `aria-hidden`만 쓰면 빈 문자열로 평가됩니다. 명시적으로 `aria-hidden="true"`를 사용하세요.
  > 
  > ---
  > 
  > **11. 전체 데이터 fetch 후 클라이언트 페이지네이션** — `NewsPageClient.tsx:105`
  > 
  > `NEWS_FETCH_LIMIT = 60`으로 전체를 한 번에 가져와서 클라이언트에서 slice하고 있습니다. Mock 단계에서는 괜찮지만, 실제 API 연동 시 서버 사이드 페이지네이션으로 전환해야 합니다. TODO 주석을 남겨두면 좋겠습니다.
  > 
  > ---
  > 
  > **12. 탭 컴포넌트 재사용 가능성** — `NewsPageClient.tsx:176~193`
  > 
  > 탭 UI 패턴이 다른 페이지에서도 반복될 수 있습니다. `shared/ui/Tabs` 컴포넌트로 추출을 고려해보세요.
  > 
  > ---
  > 
  > **13. 데스크톱 필터 backdrop이 `fixed inset-0`** — `NewsFilterModal.tsx:120`
  > 
  > 데스크톱에서 필터 닫기용 투명 backdrop이 `fixed inset-0`으로 전체 화면을 덮습니다. 이 상태에서 다른 요소 클릭이 불가능하므로 UX 측면에서 의도된 동작인지 확인이 필요합니다.
  > 
  > ---
  > 
  > ## 총평
  > 
  > 전반적으로 **뉴스 페이지 구조가 잘 잡혀 있습니다.** 프로젝트 컨벤션(feature module 구조, camelCase 타입, CSS 변수 토큰, apiFetch 활용)을 잘 따르고 있고, 반응형 대응과 필터 UX도 세심하게 구현되었습니다.
  > 
  > **반드시 수정**: HIGH 1~2번 (queryKey, debounce 중복)
  > **가능하면 수정**: MEDIUM 4~6번 (코드 중복, 성능)
  > **다음 스프린트 고려**: 서버 사이드 페이지네이션 전환, Portal 적용
  > 
  > ### RECOMMENDATION: **REQUEST CHANGES** (HIGH 이슈 해결 후 머지 권장)

---

### !127 · [FE] S14P21D208-176 검색 모달 및 mock search API 구현

- 작성자: **송민경** · 상태: `merged`
- 브랜치: `feature/fe/search-modal-ui` → `dev-frontend`
- 생성: 2026-03-16 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/127](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/127)

<details><summary>MR 설명</summary>

> ## :page_facing_up: MR 한 줄 요약
> 
> 네브바 검색을 모달 기반 검색 흐름으로 전환하고, 검색 자동완성 및 최근 검색어 mock API를 함께 구축했습니다.
> 
> ## :technologist: MR 세부 내용
> 
> - 검색 자동완성용 `/api/search` mock API를 추가했습니다.
> - 최근 검색어 조회/저장/개별 삭제/전체 삭제용 mock API를 추가했습니다.
> - 검색 도메인 타입과 프론트 API 클라이언트 함수를 추가했습니다.
> - 검색용 mock 데이터를 KOSPI200 대표 종목군 중심으로 확장했습니다.
> - 뉴스 mock 데이터도 섹터별로 확장해 종목/이슈·뉴스 탭 검색 품질을 보강했습니다.
> - 네브바 검색 input과 `SearchModal`을 연결했습니다.
> - `SearchModal`에 최근 검색어, 종목/이슈·뉴스 탭, 검색어 하이라이트를 구현했습니다.
> - 검색 결과 텍스트 스타일을 `theme.css` 기준 typography/class로 정리했습니다.
> - Enter 입력 시 페이지 이동이 발생하지 않고 모달 내부 검색만 유지되도록 변경했습니다.
> - 이슈/뉴스 선택 시 제목이 input에 반영되지 않도록 수정했습니다.
> - 검색 form submit 시 부모로 검색어를 전달할 수 있도록 `onSubmit` 로직을 연결했습니다.
> - `resolvedActiveTab` 계산 로직을 제거하고 `activeTab` 기반으로 렌더 구조를 단순화했습니다.
> - 검색 결과 유무에 따라 종목/뉴스 탭이 자동 전환되도록 보정 effect를 추가했습니다.
> - 모달 루트에 `dialogRef`를 연결해 키보드 접근성 개선 작업을 반영했습니다.
> - ESC 닫기, 포커스 순환, body scroll lock 관련 effect 구조를 정리했습니다.
> - empty state 문구 영역의 중복 padding을 제거해 본문 정렬 기준을 맞췄습니다.
> 
> ## :paperclip: Issue 번호
> 
> S14P21D208-176

</details>

**리뷰 토론**

- 💬 **정준용** (2026-03-20)
  > 1. \[P1\] MinIO 빈이 항상 생성되어 환경변수가 없으면 애플리케이션이 아예 뜨지 않습니다.\
  >    MinioConfig.java
  > 
  > MinioConfig가 컨텍스트 초기화 시점에 minio.endpoint, minio.access-key, minio.secret-key를 반드시 요구합니다. 여기에 StorageController -\> FileStorageService -\> MinioClient 의존성이 바로 연결돼 있어서, MinIO 설정이 없는 테스트/로컬 환경에서는 서버 전체가 기동 실패합니다.\
  > 실제로 .\\mvnw.cmd -q -Dtest=SallaemallaeBackendApplicationTests test를 돌리면 Could not resolve placeholder 'minio.endpoint' 에러가 발생합니다.\
  > @ConditionalOnProperty 같은 조건부 등록을 쓰거나, 테스트/로컬용 기본값을 넣는 방식이 필요합니다.
  > 
  > 2. \[P2\] 프로필 수정 API가 DB에 실제 저장되는데 길이 검증이 없습니다.\
  >    UserProfileUpdateRequest.java
  > 
  > 이제 프로필 수정은 JPA를 통해 실제 DB에 반영되는데, 요청 DTO는 아직 @NotBlank만 검사합니다. 그런데 users.nickname은 20자, profile_image_url은 512자 제한이 있어서, 너무 긴 값이 들어오면 사전 검증 없이 DB까지 갔다가 예외가 발생하고, 최종적으로는 일반 500 에러로 떨어집니다.\
  > nickname과 profileImageUrl에 @Size를 추가해서 400 검증 에러로 막는 게 맞습니다.
  > 
  > 3. \[P2\] presigned URL 방식이 실제로는 이미지 파일만 업로드하도록 강제하지 못합니다.\
  >    FileStorageService.java
  > 
  > 서버는 클라이언트가 보낸 contentType 문자열만 믿고 있고, 저장 확장자도 fileName에서 그대로 뽑아 씁니다. 그런데 실제 presigned PUT 요청에는 업로드 헤더나 메타데이터 제약이 묶여 있지 않습니다.\
  > 즉, contentType=image/png로 URL을 발급받고 fileName=payload.html처럼 보내면, 공개 .html URL을 받은 뒤 임의 바이트를 업로드할 수 있습니다. 지금의 화이트리스트는 우회 가능합니다.\
  > 업로드 시 Content-Type까지 서명에 포함시키거나, 업로드 후 서버에서 실제 파일을 검증하거나, 확장자를 MIME 기준으로 서버가 직접 결정하도록 바꾸는 쪽이 안전합니다.

---

### !148 · [BE] fix : S14P21D208-139 한투 api 컨트롤러 및 엔드포인트 수정

- 작성자: **정준용** · 상태: `merged`
- 브랜치: `feature/be/stock` → `dev-backend`
- 생성: 2026-03-17 · 머지: 2026-03-17
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/148](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/148)

<details><summary>MR 설명</summary>

> 📄 MR 한 줄 요약
> 
> /api/stocks 기준으로 종목 API를 통합하고, KIS 연동·실시간 분봉·캐시 fallback을 정리해 비로그인 조회와 장애 대응을 안정화했습니다.
> 
> 🧑‍💻 MR 세부 내용
> 
> 사용하지 않는 스켈레톤 경로인 /api/v1/stocks 계열을 제거하고, 실제 사용 경로를 /api/stocks로 통합했습니다.
> StockApiController에 KIS 기반 종목 조회 API를 정리했습니다.
> 추가/정리된 경로:
> GET /api/stocks
> GET /api/stocks/{stockId}
> GET /api/stocks/{ticker}/quote
> GET /api/stocks/{ticker}/period-prices
> GET /api/stocks/{ticker}/pipeline-preview
> POST /api/stocks/{ticker}/realtime/subscribe
> GET /api/stocks/{ticker}/realtime/minute-candles
> GET /api/stocks/{ticker}/realtime/pipeline-preview
> 종목 API는 로그인 없이 조회 가능해야 한다는 요구사항에 맞춰 SecurityConfig에서 /api/stocks/**를 공개로 열었습니다.
> /api/stocks top list 조회 시 KIS 랭킹 API가 rate limit(EGW00201)로 실패하더라도 바로 502를 내지 않도록 fallback을 추가했습니다.
> fallback 전략:
> 1차: Redis stale cache 반환
> 2차: 현재 DB의 stocks + 최신 stock_prices_daily 기반 로컬 목록 생성
> top list fallback을 위해 StockPriceDailyRepository에 최신 일별 가격 조회 쿼리를 추가했습니다.
> CachedKisDomesticStockGateway에 stale top-interest cache key 및 TTL 처리를 추가했습니다.
> KIS 연동과 실시간 경로는 그대로 유지했고, “DB 적재용 가공 파이프라인”은 preview 응답으로만 제공하며 실제 insert는 하지 않습니다.
> 검증:
> GET /api/stocks?limit=3 → 200
> GET /api/stocks/1 → 200
> GET /api/stocks/005930/quote → 200
> GET /api/stocks/005930/period-prices → 200
> GET /api/stocks/005930/pipeline-preview → 200
> POST /api/stocks/005930/realtime/subscribe?market=J → 200
> GET /api/stocks/005930/realtime/minute-candles?market=J&limit=3 → 200
> Docker 환경에서 KIS REST 응답, websocket subscribe ACK, 실시간 틱 수신, Redis 실시간 키 생성까지 확인했습니다.
> 관련 테스트를 함께 수정/보강했습니다.
> StockApiControllerTest
> StockTopListServiceImplTest
> CachedKisDomesticStockGatewayTest
> 
> 
> 
> 
> 
> =================================
> ======
> 📄 MR 한 줄 요약
> /api/stocks 기준으로 종목 API를 통합하고, KIS REST/WebSocket 연동과 top-list fallback을 정리해 공개 조회와 장애 대응을 안정화했습니다.
> 
> 🧑‍💻 MR 세부 내용
> 
> 사용하지 않는 스켈레톤 경로인 /api/v1/stocks 계열 대신 /api/stocks 기준으로 종목 API를 정리했습니다.
> StockApiController에 실제 사용하는 종목 조회 API를 통합했습니다.
> GET /api/stocks
> GET /api/stocks/{stockId}
> GET /api/stocks/{ticker}/quote
> GET /api/stocks/{ticker}/period-prices
> GET /api/stocks/{ticker}/pipeline-preview
> POST /api/stocks/{ticker}/realtime/subscribe
> GET /api/stocks/{ticker}/realtime/minute-candles
> GET /api/stocks/{ticker}/realtime/pipeline-preview
> 종목 API는 로그인 없이 조회 가능해야 한다는 요구사항에 맞춰 /api/stocks/**를 공개로 유지했고, 삭제된 레거시 경로 /api/v1/stocks/**에 대한 permitAll()은 제거했습니다.
> /api/stocks top list 조회 시 KIS 랭킹 API rate limit 또는 외부 장애가 발생해도 바로 502로 실패하지 않도록 fallback을 추가했습니다.
> 1차: Redis stale cache 반환
> 2차: 로컬 DB의 stocks + 최신 stock_prices_daily 기반 목록 반환
> StockPriceDailyRepository는 fallback 조회 성능을 위해 최신 일별 가격 조회를 DISTINCT ON (stock_id) 기반 native query로 정리했습니다.
> MarketCacheTtlPolicy에서 top-interest stale cache TTL을 확대했습니다.
> 장중 30분
> 장외 6시간
> CachedKisDomesticStockGateway는 정상 경로에서 stale cache를 먼저 읽지 않고, KIS 요청 실패 시에만 stale cache를 조회하도록 최적화했습니다.
> KIS WebSocket 실시간 경로에서 ALREADY IN SUBSCRIBE 응답을 논리적 성공으로 처리해, 같은 종목 재구독 시 subscriptionAcknowledged 상태가 false로 내려가지 않도록 수정했습니다.
> “DB 적재용 파이프라인”은 preview 응답으로만 제공하며, 실제 DB insert는 하지 않습니다.
> 검증:
> 
> 테스트 통과
> StockApiControllerTest
> StockTopListServiceImplTest
> CachedKisDomesticStockGatewayTest
> MarketCacheTtlPolicyTest
> Docker 재배포 후 확인
> GET /api/stocks?limit=3 → 200
> GET /api/v1/stocks/005930/quote → 401
> GET /api/stocks/005930/quote → 200
> GET /api/stocks/005930/period-prices... → 200
> GET /api/stocks/005930/pipeline-preview... → 200
> POST /api/stocks/005930/realtime/subscribe?market=J → 200
> GET /api/stocks/005930/realtime/minute-candles?market=J&limit=3 → 200
> KIS REST 응답, websocket subscribe ACK, 실시간 틱 수신, Redis 실시간 키 생성까지 실제 확인했습니다.
> 
> 📎 Issue 번호
> S14P21D208-139

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-17)
  > ### 좋은 점
  > 
  > 1. **컨트롤러 통합이 깔끔함** — 중복된 3개 컨트롤러를 1개로 합치면서 엔드포인트 경로도 일관성 있게 정리됨
  > 2. **Fallback 전략이 단계적** — KIS 실패 시 stale cache → DB 기반 로컬 목록 순서로 graceful degradation
  > 3. **Swagger 문서화가 충실** — 새 엔드포인트에 `@Operation`, `@Parameter` 어노테이션이 잘 달려있음
  > 4. **테스트 보강이 잘 됨** — fallback 시나리오, stale cache 반환, stale cache 없을 때 예외 전파 등 주요 경로를 모두 커버
  > 
  > ---
  > 
  > ### 이슈 및 개선 제안
  > 
  > #### \[Critical\] SecurityConfig에 불필요한 레거시 경로 공개
  > 
  > `.requestMatchers("/api/stocks", "/api/stocks/**").permitAll()
  > .requestMatchers("/api/v1/stocks", "/api/v1/stocks/**").permitAll()  // ← 삭제된 경로
  > `
  > 
  > `StockController`와 `StockMarketController`를 삭제했는데, `/api/v1/stocks/**`를 여전히 `permitAll()`로 열어두고 있습니다. 현재는 매핑되는 컨트롤러가 없어서 404가 반환되지만, 향후 누군가 `/api/v1/` 경로에 다른 컨트롤러를 만들면 의도치 않게 인증 없이 접근 가능해집니다. **삭제하는 것이 안전합니다.**
  > 
  > #### \[Medium\] `findLatestByStockIdIn` 쿼리 — 서브쿼리 성능 이슈 가능성
  > 
  > `select p from StockPriceDaily p
  > where p.stockId in :stockIds
  >   and p.tradeDate = (
  >     select max(p2.tradeDate) from StockPriceDaily p2
  >     where p2.stockId = p.stockId
  >   )
  > `
  > 
  > 이 서브쿼리는 stockIds 개수가 많아질 경우 (전체 active 종목) 상관 서브쿼리가 종목마다 실행되어 느려질 수 있습니다. `stock_price_daily` 테이블에 `(stock_id, trade_date)` 복합 인덱스가 있는지 확인이 필요합니다. Fallback 경로이므로 당장은 괜찮지만, 종목 수가 늘어나면 네이티브 쿼리나 `ROW_NUMBER()` 윈도우 함수로 변경을 권장합니다.
  > 
  > #### \[Medium\] Stale cache TTL이 primary cache TTL보다 짧을 수 있음
  > 
  > `// MarketCacheTtlPolicy
  > topInterestTtl()       → 장중 10초, 장외 60초
  > topInterestStaleTtl()  → 장중 5분, 장외 30분
  > `
  > 
  > 현재는 stale \> primary 이므로 괜찮지만, stale cache의 목적을 생각하면 **stale TTL은 훨씬 길게** (예: 장중 30분, 장외 수 시간) 설정하는 것이 장애 대응에 더 유리합니다. KIS가 5분 넘게 먹통이면 stale도 만료되어 결국 DB fallback으로 가기 때문입니다.
  > 
  > #### \[Low\] `getTopInterestStocks`에서 stale cache를 API 호출 전에 미리 읽음
  > 
  > `var stale = cacheRepository.get(staleCacheKey, KisTopInterestStockData.class);
  > try {
  >     KisTopInterestStockData fresh = kisDomesticStockClient.getTopInterestStocks(...);
  >     ...
  > } catch (RuntimeException e) {
  >     if (stale.isPresent()) { return ... }
  >     throw e;
  > }
  > `
  > 
  > 정상 경로(KIS 성공)에서도 매번 stale cache를 Redis에서 읽습니다. 성능에 큰 영향은 없겠지만, catch 블록 안에서 stale을 읽도록 하면 정상 경로에서 불필요한 Redis 호출을 1회 줄일 수 있습니다.
  > 
  > #### \[Low\] `buildLocalFallbackResponse` — `resolveMarketCap`, `resolveSectorFilter` 메서드 diff에 없음
  > 
  > `resolveMarketCap(stock, price),
  > resolveSectorFilter(stock, stock.getName())
  > `
  > 
  > 이 두 메서드가 기존 코드에 이미 있는 것으로 보이지만, fallback에서 `price`가 `null`일 수 있는데 (`latestPrice`가 없는 경우) `resolveMarketCap`에서 null-safe 처리가 되어 있는지 확인이 필요합니다.
  > 
  > #### \[Info\] `getPeriodPrices`의 `startDate`, `endDate` — `required` 미설정
  > 
  > `@RequestParam String startDate,
  > @RequestParam String endDate,
  > `
  > 
  > 이 파라미터들은 `required=true`(기본값)라서 없으면 400이 나옵니다. 의도된 것이라면 OK이지만, 날짜 형식(`yyyyMMdd`) 유효성 검증은 서비스 레이어에서 하고 있는지 확인이 필요합니다.
  > 
  > ---
  > 
  > ### 결론
  > 
  > 전체적으로 **잘 정리된 MR**입니다. 컨트롤러 통합, fallback 전략, 테스트 모두 방향이 좋습니다.
  > 
  > **머지 전 꼭 수정할 것:**
  > 
  > * SecurityConfig에서 `/api/v1/stocks` 관련 `permitAll()` 라인 삭제
  > 
  > **가능하면 개선할 것:**
  > 
  > * `(stock_id, trade_date)` 인덱스 존재 확인
  > * Stale cache TTL 재검토
  > * `resolveMarketCap`의 null-safe 여부 확인

---

### !151 · [BE] Feat: S14P21D208-124, S14P21D208-157 리포트/포트폴리오/시그널 API 구현

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `feature/be/S14P21D208-124-157-report-signal-api` → `dev-backend`
- 생성: 2026-03-17 · 머지: 2026-03-17
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/151](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/151)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 
> report-service 포트폴리오 메인 API와 AI 매매신호 리스트 API를 구현하여
> 매매신호 종합 화면 및 의장 포트폴리오 메인 화면 연동을 가능하게 했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> 
> - `GET /api/portfolio/chairman` 구현
>   - `report` 도메인 내부에 구현
>   - `tab=HOLDINGS|TODAY_TRADES|MONTHLY_RETURNS` 지원
>   - 포트폴리오 요약, 오늘의 시그널 요약, 인기 종목 AI 신호, 탭별 리스트 응답 추가
> 
> - `GET /api/signals` 구현
>   - `/api/v1/signals` -> `/api/signals` 정리
>   - `filter=ALL|BUY|SELL`
>   - `sort=LATEST|UP|DOWN`
>   - `offset`, `limit` 페이지네이션 지원
> 
> - `news` / `report` 도메인 스타일 기준으로 정리
>   - Controller Swagger annotation 반영
>   - DTO `@Schema(description=...)` 반영
>   - Java camelCase / JSON snake_case 규칙 반영
> 
> - 실제 조회 로직 추가
>   - portfolio: `ai_portfolio`, `ai_portfolio_holdings`, `ai_trading_history`, `ai_daily_performance`, `ai_ml_reports`, `stock_prices_daily`
>   - signal: `ai_ml_reports`, `stock_prices_daily`, `stocks`
> 
> - 테스트 추가
>   - `ChairmanPortfolioServiceImplTest`
>   - `SignalServiceImplTest`
> 
> - 검증
>   - `./mvnw -Dtest=SignalServiceImplTest,ChairmanPortfolioServiceImplTest test` 통과
>   - 전체 `./mvnw test`는 기존 stock 테스트의 H2 `gics_cluster` 스키마 문제로 실패
>   - 이번 변경과 직접 관련 없는 기존 테스트 이슈로 확인
> 
> - 참고 사항
>   - 포트폴리오 응답의 `alpha_vs_kospi`, `monthly_returns.kospi_return`, `monthly_returns.alpha`는
>     현재 기준 지표 데이터 소스가 명확하지 않아 우선 `null` 처리
>   - 추후 데이터 연결 후 보완 예정
> 
> ## 📎 Issue 번호
> 
> - S14P21D208-124
> - S14P21D208-157

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-17)
  > ### 전체 요약
  > 
  > `GET /api/portfolio/chairman` (의장 포트폴리오 메인) 및 `GET /api/signals` (AI 매매신호 리스트) 두 개의 신규 API를 구현한 MR입니다. 네이티브 쿼리 기반의 QueryRepository 패턴, Support 클래스를 통한 입력 검증/정렬 분리, DTO snake_case 처리 등이 포함되어 있습니다.
  > 
  > ---
  > 
  > ### 좋은 점
  > 
  > 1. **계층 분리가 잘 됨** — Controller → Service → QueryRepository로 책임이 명확하게 나뉘어 있음
  > 2. **Support 유틸 클래스** — 입력 검증, enum 파싱, 정렬 로직을 Support로 분리해서 서비스 코드가 깔끔함
  > 3. **DTO Swagger 문서화 충실** — 모든 필드에 `@Schema(description=...)` 이 적용되어 API 문서 자동 생성 품질이 높음
  > 4. **테스트 커버리지** — 정상 경로 + 잘못된 입력 예외 케이스를 모두 테스트
  > 5. **월별 수익률 복리 계산** — `MonthlyAccumulator`가 일별 수익률을 복리로 정확하게 합산
  > 
  > ---
  > 
  > ### 이슈 및 개선 제안
  > 
  > #### \[Critical\] SignalQueryRepository에서 `LATERAL JOIN`이 `LEFT JOIN`이 아닌 `JOIN`
  > 
  > `// SignalQueryRepository.java - findLatestSignalCandidates() JOIN LATERAL ( SELECT close_price, fluctuation_rate FROM stock_prices_daily WHERE stock_id = s.id AND trade_date <= CURRENT_DATE ORDER BY trade_date DESC, id DESC LIMIT 1 ) p ON true`
  > 
  > `ChairmanPortfolioQueryRepository`에서는 동일한 패턴에 `LEFT JOIN LATERAL`을 사용했는데, Signal 쪽은 `JOIN LATERAL`입니다. 만약 `stock_prices_daily`에 해당 종목의 가격 데이터가 아직 없으면 **그 종목 전체가 결과에서 누락**됩니다. AI 리포트는 생성됐지만 가격 데이터가 아직 적재 안 된 종목이 있을 수 있으므로, `LEFT JOIN LATERAL`로 변경하는 것이 안전합니다.
  > 
  > #### \[Medium\] `findLatestSignalCandidates()` — 전체 후보를 메모리로 로드
  > 
  > \`List candidates = signalQueryRepository.findLatestSignalCandidates(); // → 메모리에서 filter, sort, skip, limit
  > 
  > \`
  > 
  > 현재 BUY/SELL 전체 후보를 한 번에 DB에서 가져온 뒤 Java에서 필터링/정렬/페이지네이션합니다. 종목 수가 수백 개 수준이면 괜찮지만, 종목 수가 크게 늘어나면 매 요청마다 전체를 읽는 것은 비효율적입니다. 현재 규모에서는 OK이지만, 향후에는 DB 레벨 필터/정렬/페이지네이션을 고려하면 좋겠습니다.
  > 
  > #### \[Medium\] `toOffsetDateTime` — UTC 하드코딩
  > 
  > `// ChairmanPortfolioQueryRepository.java, SignalQueryRepository.java (동일 코드 중복) if (value instanceof java.sql.Timestamp timestamp) { return timestamp.toInstant().atOffset(ZoneOffset.UTC); }`
  > 
  > PostgreSQL의 `timestamptz` 컬럼은 JDBC 드라이버가 `OffsetDateTime`으로 직접 매핑해주지만, `timestamp` (without tz) 컬럼이면 `java.sql.Timestamp`로 오는데 여기서 **UTC로 하드코딩**합니다. 실제 DB 타임존이 KST(+09:00)라면 9시간 차이가 납니다. DB 컬럼이 `timestamptz`인지 확인하고, 아니라면 `ZoneId.of("Asia/Seoul")`을 사용해야 합니다.
  > 
  > #### \[Medium\] `toLong`, `toInteger`, `toFloat`, `toOffsetDateTime` 유틸 중복
  > 
  > `ChairmanPortfolioQueryRepository`와 `SignalQueryRepository`에 **완전히 동일한** 4개의 private 유틸 메서드가 복사되어 있습니다. 이 패턴이 계속 늘어나면 유지보수가 어려워지므로, 공통 유틸 클래스로 추출하는 것이 좋습니다.
  > 
  > #### \[Medium\] `PortfolioQuery.of()`에서 도달 불가능한 코드
  > 
  > `// ChairmanPortfolioSupport.java static PortfolioQuery of(String tab, int offset, int limit) { if (offset < 0 || limit < 1 || limit > MAX_LIMIT) { throw new BusinessException(ReportErrorCode.REPORT_INPUT_INVALID); } return new PortfolioQuery( Tab.from(tab), offset, limit == 0 ? DEFAULT_LIMIT : limit  // ← limit < 1이면 위에서 이미 예외 ); }`
  > 
  > `limit == 0`은 위의 `limit < 1` 검증에서 이미 걸리므로 삼항 연산자의 `DEFAULT_LIMIT` 분기는 절대 도달하지 않습니다. `SignalSupport.SignalQuery.of()`에도 동일한 이슈가 있습니다. 불필요한 분기를 제거하면 코드가 더 명확해집니다.
  > 
  > #### \[Low\] 네이밍: `FilterFilter`
  > 
  > `// SignalSupport.java enum FilterFilter { ALL, BUY, SELL };`
  > 
  > `FilterFilter`라는 이름이 다소 혼란스럽습니다. `SignalFilter`나 `SignalType` 같은 이름이 더 직관적입니다. 같은 맥락에서 `SortFilter`도 `SortOrder`나 `SignalSort`가 나을 것 같습니다.
  > 
  > #### \[Low\] SecurityConfig에 `/api/portfolio/**`, `/api/signals` 공개 여부
  > 
  > MR diff에 `SecurityConfig` 변경이 없습니다. 이 두 API가 인증 필요 여부에 따라:
  > 
  > * **인증 불필요**: SecurityConfig에 `permitAll()` 추가 필요
  > * **인증 필요**: 현재 그대로 OK (기본이 인증 필요)
  > 
  > MR 설명에는 인증 관련 언급이 없으므로 확인이 필요합니다. 포트폴리오와 시그널 조회가 비로그인 사용자도 볼 수 있어야 한다면 SecurityConfig 수정이 빠져있는 것입니다.
  > 
  > #### \[Low\] `LocalDate.now()` 직접 호출 — 테스트 어려움
  > 
  > `// ChairmanPortfolioServiceImpl.java row.holdingDays(LocalDate.now()),`
  > 
  > `LocalDate.now()`를 직접 호출하면 테스트에서 날짜를 제어할 수 없습니다. `Clock`을 주입받는 패턴을 사용하면 테스트에서 날짜를 고정할 수 있습니다. 지금은 큰 문제는 아니지만, 보유 일수 계산의 정확성을 테스트하려면 필요합니다.
  > 
  > #### \[Info\] 전체 테스트 실패 관련
  > 
  > > 전체 `./mvnw test`는 기존 stock 테스트의 H2 `gics_cluster` 스키마 문제로 실패
  > 
  > 이건 이번 MR의 문제는 아니지만, CI 파이프라인에서 전체 테스트가 깨져있는 상태가 지속되면 다른 MR에서 regression을 감지하기 어렵습니다. 별도 이슈로 빠르게 수정하는 것을 권장합니다.
  > 
  > ---
  > 
  > ### 결론
  > 
  > 전체적으로 **구조와 코드 품질이 좋은 MR**입니다. 계층 분리, DTO 설계, 테스트 모두 잘 되어있습니다.
  > 
  > **머지 전 꼭 확인할 것:**
  > 
  > * `SignalQueryRepository`의 `JOIN LATERAL` → `LEFT JOIN LATERAL` 변경
  > * SecurityConfig에 해당 API 경로 공개 여부 확인
  > * `toOffsetDateTime`의 UTC 하드코딩이 의도된 것인지 확인
  > 
  > **가능하면 개선할 것:**
  > 
  > * `FilterFilter` → `SignalFilter` 네이밍 변경
  > * 네이티브 쿼리 유틸 메서드 공통화
  > * 도달 불가능한 `limit == 0` 분기 제거

---

### !154 · [BE] fix : S14P21D208-139 KIS 30건 기준으로 정리하고, fallback 시에도 현재가/등락률이 비지 않도록 KIS quote 보강을 추가

- 작성자: **정준용** · 상태: `merged`
- 브랜치: `feature/be/stock` → `dev-backend`
- 생성: 2026-03-17 · 머지: 2026-03-17
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/154](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/154)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> - /api/stocks top list를 KIS 30건 기준으로 정리하고, fallback 시에도 현재가/등락률이 비지 않도록 KIS quote 보강을 추가했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - /api/stocks top list 조회의 페이지 크기 상한을 30으로 고정했습니다.
> - limit이 30을 초과해도 에러 대신 서버에서 30으로 clamp 하도록 변경했습니다.
> - top list 1차 KIS 랭킹 API가 실패하거나 rate limit에 걸려 fallback을 타는 경우,
> - 현재 페이지에 보이는 종목들에 한해서 KIS quote API로 가격 데이터를 보강하도록 수정했습니다.
> - fallback 보강에 사용하는 값:
> - price → KIS quote currentPrice
> - fluctuation_rate → KIS quote changeRate
> - quote 보강 후 signal, confidence도 같이 다시 계산하도록 정리했습니다.
> - 이 보강은 전체 200종목이 아니라 현재 페이지에 노출되는 종목만 대상으로 수행해, 불필요한 KIS 호출을 줄였습니다.
> - 기존처럼 DB insert는 하지 않고, 조회 응답만 개선하는 범위로 유지했습니다.
> - 수정 파일:
>   - domain/stock/service/StockTopListSupport
>   - domain/stock/service/StockTopListServiceImpl
>   - test/domain/stock/service/StockTopListServiceImplTest
> - 테스트:
>   - limit=50 요청 시 실제 응답은 30개로 제한되는지 검증 추가
>   - fallback 시 일별 가격이 없더라도 KIS quote로 price, fluctuation_rate가 채워지는지 검증 추가
> - 실검증:
>   - Docker 재배포 후 GET /api/stocks?offset=0&limit=50&sort=MARKET_CAP 호출
>   - 현재 로컬 fallback 데이터는 1건뿐이지만, 응답에서price=71300 fluctuation_rate=0.35로 null이 아닌 값이 내려오는 것 확인
>   - GET /api/stocks/005930/quote에서 KIS 실데이터 응답 확인
>   - POST /api/stocks/005930/realtime/subscribe?market=J 및 실시간 분봉 조회 정상 확인
> 
> ## 이슈번호
> S14P21D208-139

</details>

**리뷰 토론**

- 💬 **강지석** (2026-03-17)
  > # KIS 30건 정리 & Fallback Quote 보강 코드 리뷰
  > 
  > > 브랜치: `feature/be/stock`
  > > 커밋: `08bdf20` [BE] fix : S14P21D208-139 KIS 30건 기준으로 정리하고, fallback 시에도 현재가/등락률이 비지 않도록 KIS quote 보강을 추가
  > 
  > ---
  > 
  > ## 잘된 점
  > 
  > - **Stale Cache 2단계 패턴** — 정상 캐시(short TTL) + stale 캐시(long TTL)로 KIS API 실패 시에도 이전 데이터 반환하는 구조가 견고함
  > - **계층적 Fallback** — KIS 랭킹 API 실패 → 로컬 DB → KIS quote 개별 보강 흐름이 합리적
  > - **30건 제한** — `Math.min(limit, MAX_LIMIT)`로 에러 대신 자동 clamp하여 API 사용성 좋음
  > - **WebSocket "ALREADY IN SUBSCRIBE" 정규화** 처리 깔끔
  > - **테스트 커버리지** 양호 — 핵심 시나리오 모두 커버
  > 
  > ---
  > 
  > ## [Critical] 수정 필수
  > 
  > ### 1. Fallback `filterCounts`가 페이지 데이터만 기준으로 계산됨
  > 
  > **파일:** `StockTopListServiceImpl.java`
  > 
  > 정상 경로에서는 **전체 후보**로 signal count를 계산하지만, fallback에서는 **페이지네이션 후(최대 30건)** 데이터로만 계산함.
  > 
  > ```java
  > // 정상 경로 (올바름)
  > return new StockListResponse(StockTopListSupport.countSignals(candidates), responseItems);
  > 
  > // fallback 경로 (문제)
  > return new StockListResponse(
  >     StockTopListSupport.countSignals(enrichedVisibleCandidates),  // 페이지 데이터만
  >     toResponses(enrichedVisibleCandidates)
  > );
  > ```
  > 
  > UI 필터 탭 건수가 전체가 아닌 현재 페이지 건수만 보여지게 됨.
  > 
  > **권장:** fallback에서도 전체 필터된 후보(`signalFiltered`) 기준으로 `countSignals` 호출 필요
  > 
  > ### 2. `enrichFallbackCandidates`에서 `KisApiException`만 catch
  > 
  > **파일:** `StockTopListServiceImpl.java`
  > 
  > ```java
  > } catch (KisApiException e) {
  >     log.warn("Failed to enrich fallback stock list with KIS quote. ticker={}, code={}",
  >         candidate.ticker(), e.getCode());
  >     enriched.add(candidate);
  > }
  > ```
  > 
  > 네트워크/JSON 파싱 실패 시 `RuntimeException`이 발생하면 enrichment 루프 전체가 중단되고 나머지 종목이 enrichment되지 않음.
  > 
  > **권장:** `Exception`으로 넓히거나 `RuntimeException`까지 catch
  > 
  > ---
  > 
  > ## [Important] 수정 권장
  > 
  > ### 3. `DISTINCT ON` 쿼리가 PostgreSQL 전용
  > 
  > **파일:** `StockPriceDailyRepository.java`
  > 
  > ```sql
  > select distinct on (stock_id) *
  > from stock_prices_daily
  > where stock_id in (:stockIds)
  > order by stock_id, trade_date desc
  > ```
  > 
  > H2 등으로 테스트 시 실패함. 현재 mock 테스트라 당장 문제없지만 통합 테스트 추가 시 주의 필요.
  > 
  > ### 4. `isMarketOpen()` 가드 제거 영향
  > 
  > **파일:** `MainServiceImpl.java`
  > 
  > 스케줄러에서 장 시간 체크가 제거됨. 장 외에도 매 60초 KIS API 호출 → 일 1,440회 불필요한 호출 발생 가능. 의도적 변경이면 코멘트 명시 권장.
  > 
  > ### 5. Fallback 시 최대 30건 순차 KIS quote 호출
  > 
  > **파일:** `StockTopListServiceImpl.java` — `enrichFallbackCandidates`
  > 
  > 콜드 스타트 시 30번 순차 API 호출로 지연 발생 가능. 당장은 캐시로 커버되지만, 필요시 `CompletableFuture` 병렬 호출 또는 배치 API 전환 검토.
  > 
  > ---
  > 
  > ## [Suggestion] 제안 사항
  > 
  > ### 6. `POST /{ticker}/realtime/subscribe` 인증 없이 호출 가능
  > 
  > **파일:** `StockApiController.java`
  > 
  > 악의적 대량 구독으로 서버 리소스 소진 가능. rate limiting 확인 및 인증 제한 검토.
  > 
  > ### 7. `pipeline-preview` 엔드포인트
  > 
  > 개발/디버깅 용도로 보이는데, 프로덕션에서 내부 데이터 구조 노출될 수 있음. 관리자 전용으로 제한 검토.
  > 
  > ### 8. `displayRank`가 항상 1부터 시작
  > 
  > 리팩토링 후 offset이 반영 안 됨. offset=10이면 displayRank가 11부터 시작해야 하는지 프론트 요구사항 확인 필요.
  > 
  > ---
  > 
  > ## 요약
  > 
  > | 등급 | 건수 | 내용 |
  > |------|------|------|
  > | Critical | 2건 | Fallback filterCounts 범위 오류, enrichment 예외 처리 누락 |
  > | Important | 3건 | PostgreSQL 전용 쿼리, 장 시간 가드 제거 영향도, 개별 quote 호출 성능 |
  > | Suggestion | 3건 | 구독 엔드포인트 인증, pipeline-preview 접근 제한, displayRank offset 반영 |
  > 
  > **Critical 2건 수정 후 머지 가능.**

---

### !184 · [BE] Feat: S14P21D208-139 한투 api 연동

- 작성자: **정준용** · 상태: `merged`
- 브랜치: `feature/be/stock` → `dev-backend`
- 생성: 2026-03-19 · 머지: 2026-03-19
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/184](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/184)

<details><summary>MR 설명</summary>

> ## :page_facing_up: MR 한 줄 요약
> 
> `/api/stocks` 응답의 `dividend_yield`를 KIS 배당률 API 기반 Redis/DB snapshot으로 연동했습니다.
> 
> ## :technologist: MR 세부 내용
> 
> - KIS ranking/dividend-rate API 연동 및 continuation page 조회 처리 구현
> - 배당 수익률 snapshot 구조 구축
>   - stock_dividend_yield_snapshots 테이블 Flyway migration
>   - 엔티티 및 리포지토리 구현
>   - ERD 및 구조 설명 문서 작성
> - snapshot 저장 및 정합성 처리
>   - Redis snapshot 저장 로직 구현
>   - DB write 실패 시 Redis가 먼저 갱신되지 않도록 정합성 보강
> - /api/stocks 응답에 배당 수익률 연동
>   - 조회 우선순위: DB latest → Redis fallback → null
>   - snapshot 기반 dividend_yield merge 로직 구현
> - 테스트 및 검증
>   - 관련 테스트 추가
>   - 기존 stock API 영향 없이 회귀 검증
> 
> ## :paperclip: Issue 번호
> 
> S14P21D208-139
> 
> ========================================
> 
> ## :page_facing_up: MR 한 줄 요약
> 
> `/api/stocks` 응답의 `dividend_yield`를 KIS 배당률 API 기반 Redis/DB snapshot으로 연동하고, 리뷰 코멘트 반영까지 마쳤습니다.
> 
> ## :technologist: MR 세부 내용
> 
> - KIS `ranking/dividend-rate` 연동 추가
> - 배당률 연속조회 시 `tr_cont` 기반 pagination 처리 및 continuation cursor 대응 보강
> - Redis snapshot(`ticker -> dividend_yield`) 저장 로직 추가
> - `stock_dividend_yield_snapshots` 테이블 Flyway migration 추가
> - 배당 snapshot 엔티티/리포지토리/서비스 추가
> - `/api/stocks` 응답에서 `DB latest -> Redis fallback -> null` 우선순위로 `dividend_yield` 병합
> - Redis 반영 시점을 transaction `afterCommit` 이후로 이동해 DB commit 실패 시 Redis만 갱신되는 문제 방지
> - `dividend_kind`를 명시적으로 다루도록 보강하고, 응답 병합 시 현금배당만 사용하도록 정리
> - `sort=MARKET_CAP` 경로는 local daily 기준으로만 계산/응답하도록 정리해 signal/filterCounts와 응답 기준 불일치 제거
> - 배당 수익률 snapshot 구조에 대한 ERD/설명 문서 추가
> 
> ### 검증 내용
> 
> - 단위/통합 테스트 통과
>   - `KisDomesticStockClientTest`
>   - `StockDividendYieldSnapshotServiceTest`
>   - `StockTopListServiceImplTest`
> - Docker 실검증 완료
>   - `/api/health`
>   - `/api/stocks/{id}`
>   - `/api/stocks/{ticker}/quote`
>   - `/api/stocks/{ticker}/period-prices`
>   - `/api/stocks/{ticker}/realtime/*`
>   - `/api/stocks?sort=CHANGE`
>   - `/api/stocks?sort=MARKET_CAP`
> 
> ### 개선  사항
> 
> - paper KIS 환경에서는 `dividend-rate` 응답이 느려 `KIS_TIMEOUT_SECONDS=8`로는 snapshot 적재가 실패할 수 있었습니다. =\> 30 초로 늘리면 이상없음 (너무느림)
> 
> ## :paperclip: Issue 번호
> 
> S14P21D208-139

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-19)
  > ## **리뷰 코멘트**
  > 
  > ### **1. 연속조회가 실제 다음 페이지를 요청하지 못할 가능성이 있습니다**
  > 
  > KisDomesticStockClient#getCashDividendRateRanking
  > 
  > 현재 구현은 CTS_AREA=를 고정 빈 값으로 두고, 다음 페이지에서는 tr_cont만 "N"으로 바꾸고 있습니다.\
  > 그런데 KIS 연속조회가 continuation cursor를 CTS_AREA로 요구하는 API라면, 이 구현은 2페이지 이후를 제대로 넘기지 못하고 1페이지를 반복 조회할 수 있습니다.
  > 
  > 그 경우 배당 snapshot이 "첫 페이지 종목만 저장되는" 형태로 부분 적재될 수 있어서 영향이 큽니다.
  > 
  > 추가로 현재 테스트도 응답 헤더의 tr_cont=M만 흉내 내고 있을 뿐, 실제로 **두 번째 요청의 query/header가 올바르게 바뀌는지**는 검증하지 못하고 있습니다.
  > 
  > 제안:
  > 
  > * KIS 문서 기준으로 연속조회에 필요한 cursor 파라미터를 다시 확인
  > * 두 번째 요청부터 CTS_AREA 또는 필요한 continuation field가 실제 반영되는지 테스트 추가
  > * 가능하면 요청 URI / 헤더를 캡처해서 검증하는 테스트로 보강
  > 
  > ---
  > 
  > ### **2. "DB 성공 후 Redis 반영" 의도가 커밋 시점까지는 보장되지 않습니다**
  > 
  > StockDividendYieldSnapshotService#refreshSnapshot
  > 
  > 지금은 DB에 saveAllAndFlush()를 한 뒤 바로 Redis snapshot을 저장하고 있습니다.\
  > 하지만 flush 성공과 **트랜잭션 commit 성공은 동일하지 않기 때문에**, flush 이후 commit 단계에서 예외가 나면 DB는 롤백되고 Redis만 최신값으로 남을 수 있습니다.
  > 
  > 즉, 현재 구조는 "DB write 실패 시 Redis 미반영"은 일부 막지만,\
  > "DB commit 실패 시 Redis 미반영"까지는 보장하지 못합니다.
  > 
  > 제안:
  > 
  > * Redis 반영을 afterCommit 훅으로 이동
  > * 또는 transactional event / TransactionSynchronization 기반으로 commit 이후에만 Redis write 수행
  > 
  > ---
  > 
  > ### **3. dividend_kind를 저장하지만 조회 시 구분하지 않아 비현금배당이 현금배당처럼 노출될 수 있습니다**
  > 
  > StockDividendYieldSnapshotService, StockDividendYieldSnapshot
  > 
  > 현재 저장 로직은 item.dividendYield()를 항상 cash_dividend_yield에 넣고 있고,\
  > 조회 시에도 cashDividendYieldValue()만 사용합니다.
  > 
  > 즉 dividend_kind가 cash가 아닌 경우에도 동일하게 dividend_yield로 노출될 수 있습니다.\
  > 또 동일 종목에 여러 kind가 섞여 있으면, 현재 최신값 선택 기준은 날짜/랭크뿐이라 비현금 항목이 최종 선택될 여지도 있습니다.
  > 
  > 제안:
  > 
  > * dividend_kind가 현금배당인 경우만 cash_dividend_yield로 저장
  > * 아니면 현금/주식배당을 분리 저장하고 응답 병합 시 명시적으로 cash만 사용
  > * 최신값 선택 시에도 dividend_kind 우선순위를 포함
  > 
  > ---
  > 
  > ### **4. sort=MARKET_CAP에서 실시간 랭킹/KIS 경로를 완전히 우회해 신호/카운트가 장중 데이터와 어긋날 수 있습니다**
  > 
  > StockTopListServiceImpl#getTopStocks
  > 
  > 이번 변경으로 sort=MARKET_CAP 요청은 KIS top ranking을 타지 않고 로컬 universe + StockPriceDaily 기반으로 바로 응답을 구성합니다.\
  > 이후 quote enrichment는 **페이지에 노출되는 일부 종목에만** 적용됩니다.
  > 
  > 그래서 장중에는 다음과 같은 불일치가 생길 수 있습니다.
  > 
  > * filterCounts는 전일 종가 기준
  > * BUY/SELL/HOLD 필터링도 전일 데이터 기준
  > * 실제 표시된 일부 종목만 실시간 quote로 보강
  > 
  > 즉 사용자가 보는 신호와 집계값이 서로 맞지 않을 수 있습니다.
  > 
  > 제안:
  > 
  > * MARKET_CAP 정렬에서도 signal/filterCounts 계산 기준을 하나로 통일
  > * 최소한 응답 전체 집계와 필터링 기준이 local daily 기준인지, 실시간 기준인지 명확히 맞추기

---

### !191 · [AI] Feat: S14P21D208-117 뉴스 디베이트 데이터 API 및 배치 스크립트

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `feature/ai/news-debate-data` → `dev-ai`
- 생성: 2026-03-19 · 머지: 2026-03-19
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/191](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/191)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 뉴스 에이전트에게 전달할 디베이트 데이터 API 및 과거 데이터 배치 내보내기 스크립트 추가
> 
> ## 🧑‍💻 MR 세부 내용
> - 디베이트 데이터 API 추가 (GET /ai/news/debate-data)
>   - 당일+전날 키워드 중 언급 횟수 상위 N개 조회 (클러스터 기반 유사 키워드 그룹핑)
>   - 각 키워드당 뉴스 원문/URL 조회
>   - 종목별 감성 지수 집계 (평균 점수, POSITIVE/NEGATIVE/NEUTRAL 건수)
> - 과거 데이터 배치 내보내기 스크립트 추가 (scripts/export_news_debate_data.py)
>   - --zip: ZIP 압축 지원
>   - --monthly: 월별 분할 (월별 ZIP 생성)
>   - --start, --end: 날짜 범위 지정
> - news 도메인 모델/스키마/CRUD/서비스/라우터 구현 및 main.py에 등록
> 
> ## 📎 Issue 번호
> S14P21D208-117

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-19)
  > - \[높음\] services/ai/3_ai_server/domains/news/router.py (기존 엔드포인트가 있던 하단 구간, diff 기준 약 30-60행) 새 /ai/news/debate-data를 추가하면서 기존 GET /ai/news/keywords/similar, GET /ai/news/keywords/{code}, GET /ai/news/{code} 핸들러가 통째로 빠졌습니다. MR 설명은 “추가”인데 실제로는 기존 read API가 3개 사라져서, 붙어 있는 클라이언트가 있으면 바로 404 회귀가 납니다. schemas.py에 관련 응답 모델이 그대로 남아 있는 점을 보면 의도적 제거보다는 라우터 재작성 중 누락에 가깝습니다.
  > 
  > ---
  > 
  > - \[중간\] services/ai/3_ai_server/scripts/export_news_debate_data.py (일자별 loop/except 구간, 약 180-240행) 날짜별 export에서 except Exception으로 계속 진행하지만 db.rollback()이 없습니다. 이 상태에서 db.execute() 계열 예외가 한 번만 나도 SQLAlchemy 세션이 failed transaction 상태로 남아서, 이후 날짜들도 연쇄적으로 실패할 수 있습니다. 그런데 현재 구현은 warning만 찍고 skip하므로 결과물이 일부만 생성돼도 프로세스는 성공처럼 끝납니다.
  > 
  > ---
  > 
  > - \[중간\] services/ai/3_ai_server/scripts/export_news_debate_data.py (sentiment_indices 생성부 약 100-120행, json.dumps 구간 약 205-215행) API 경로는 avg_score를 float()로 정규화해서 응답하는데, 배치 스크립트는 avg_score를 그대로 JSON 직렬화합니다. AVG() 결과가 Decimal로 돌아오는 환경이면 여기서 TypeError가 나고, 위의 rollback 누락과 합쳐져 해당 일자 이후 export가 전부 비는 패턴이 생길 수 있습니다.
  > 
  > ---
  > 
  > - \[중간\] services/ai/3_ai_server/domains/news/crud.py (날짜 필터가 있는 모든 쿼리, 예: 약 30-31행, 52-53행, 106-107행, 166-167행) published_at 조건을 전부 func.date(StockNews.published_at)로 감싸고 있어서 published_at 인덱스를 타기 어렵습니다. API 한 번 호출도 느려질 수 있고, 배치 스크립트는 날짜마다 같은 테이블을 반복 조회하므로 데이터가 좀만 커져도 거의 full scan에 가까운 비용이 납니다. published_at \>= start_dt / \< next_day_dt 형태로 바꾸는 쪽이 안전합니다.
  > 
  > ---
  > 
  > 가정한 부분은 “기존 /ai/news 엔드포인트가 아직 살아 있어야 한다”는 점인데, MR 설명상 deprecate 의도는 보이지 않았습니다. 참고로 이 MR에는 파이프라인이 아직 없어서 자동 검증 결과는 확인하지 못했습니다.

- 💬 **이혜민** (2026-03-19)
  > ### \[높음\] 기존 엔드포인트 누락
  > 
  > > 확인했습니다. 기존 `keywords/similar`, `keywords/{code}`, `/{code}` 3개 핸들러는 원래 `main.py`에 news 라우터가 등록되지 않은 상태였고, service 함수도 구현되지 않아 실제로 동작하지 않는 미사용 코드였습니다. 이번 커밋에서 미사용 엔드포인트와 관련 스키마를 정리했습니다.
  > 
  > ### \[중간\] 배치 스크립트 db.rollback() 누락
  > 
  > > 수정 완료. except 블록에 `db.rollback()`을 추가하여 failed transaction 상태에서 이후 날짜 처리가 연쇄 실패하지 않도록 했습니다.
  > 
  > ### \[중간\] Decimal 직렬화
  > 
  > > 수정 완료. CRUD 레이어에서 `float()`/`int()` 변환을 적용하고, 배치 스크립트에서도 `avg_sentiment_score`에 `float()` 안전 변환을 추가했습니다.
  > 
  > ### \[중간\] func.date() 인덱스 비효율
  > 
  > > 수정 완료. `func.date(StockNews.published_at) >= start_date` 패턴을 `StockNews.published_at >= start_dt AND < end_dt` (timestamp 범위 비교)로 변경하여 `published_at` 인덱스를 탈 수 있도록 했습니다.

---

### !196 · [AI] Feat: S14P21D208-117 종목별 뉴스 에이전트 데이터 생성 + DB/Redis 저장

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `feature/ai/news-debate-data` → `dev-ai`
- 생성: 2026-03-19 · 머지: 2026-03-19
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/196](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/196)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 종목별 뉴스 에이전트 데이터 집계 및 DB/Redis 저장 기능 추가 (스케줄러 연동 + 배치/수동 실행 지원)
> 
> ## 🧑‍💻 MR 세부 내용
> - 종목별 뉴스 에이전트 데이터 생성 (agent_data_builder.py)
>   - 종목별 키워드 상위 3개 + 키워드당 뉴스 원문/URL 3건
>   - 종목별 감성 지수 (avg_score, positive/negative/neutral 건수)
>   - news_agent_stock_data DB 저장 (upsert) + Redis 캐싱 (CACHE:NEWS:AGENT:{stockId}:{date})
> - 스케줄러 연동 (keyword_worker.py)
>   - 키워드 임베딩/클러스터링 완료 후 자동 실행 [4/4] 단계
> - 과거 데이터 배치 처리
>   - --start, --end: 날짜 범위 DB 적재
>   - --export: 종목별 폴더/날짜별 JSON 파일 내보내기 (GPU 서버용)
>   - --save-db: 파일 내보내기 + DB 적재 동시
> - CRUD 종목 필터 추가 (get_top_keywords, get_news_by_keyword에 stock_id 옵션)
> - Redis 설정 추가 (core/config.py), redis 패키지 추가 (requirements.txt)
> 
> ## 📎 Issue 번호
> S14P21D208-117

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-19)
  > 1. **step 4 실패가 파이프라인 성공으로 처리됩니다.**\
  >    `services/ai/1_data_pipeline/news/keyword_worker.py:151-162`에서 뉴스 에이전트 데이터 생성 예외를 모두 잡아서 "비치명적" 로그만 남기고 넘어갑니다.\
  >    그런데 바깥 루프는 `services/ai/1_data_pipeline/news/keyword_worker.py:244-247`에서 `run_keyword_pipeline()`만 정상 반환하면 바로 signal을 `DONE`으로 바꿉니다.\
  >    그래서 DB/Redis 저장이 실패해도 재시도 없이 그날 처리가 끝난 것으로 기록됩니다. 이번 MR 설명이 "스케줄러 연동"인 점을 생각하면, 최소한 이 단계 실패는 `FAILED`로 올리거나 별도 재시도 경로가 있어야 합니다.
  > 2. **실제 자동 실행 환경에서는 `redis` 의존성 누락으로 step 4가 바로 실패할 가능성이 큽니다.**\
  >    `services/ai/1_data_pipeline/news/README.md:241-248` 기준으로 워커는 `services/ai/1_data_pipeline/news/.venv-wsl`에서 `keyword_worker.py`를 실행합니다.\
  >    그런데 이번 MR에서 `redis`는 `services/ai/3_ai_server/requirements.txt:8`에만 추가됐고, 워커 환경이 설치하는 `services/ai/1_data_pipeline/news/requirements.txt`는 변경이 없습니다.\
  >    따라서 `services/ai/1_data_pipeline/news/keyword_worker.py:158`에서 `domains.news.agent_data_builder`를 import하는 순간 `ModuleNotFoundError: redis`가 발생할 수 있고, 1번 이슈 때문에 이 실패가 그대로 묻힙니다.
  > 3. **`news_agent_stock_data` 테이블과 `(stock_id, report_date)` unique constraint 생성 경로가 MR 안에 없습니다.**\
  >    `services/ai/3_ai_server/domains/news/agent_data_builder.py:113-121`은 `news_agent_stock_data`에 `ON CONFLICT (stock_id, report_date)`로 upsert합니다.\
  >    그런데 이번 MR에서 추가된 건 `services/ai/3_ai_server/domains/news/models.py:66-74`의 ORM 매핑뿐이고, 저장소 안에서는 해당 테이블이나 unique 제약을 만드는 migration/DDL을 찾지 못했습니다.\
  >    운영 DB에 수동 반영돼 있다는 전제가 아니면 첫 실행에서 `relation does not exist` 또는 `there is no unique or exclusion constraint matching the ON CONFLICT specification`로 깨질 수 있습니다.

- 💬 **이혜민** (2026-03-19)
  > **1. step 4 실패가 파이프라인 성공으로 처리되는 문제**
  > 
  > * 기존 try/except 제거하고 step 4 자체 재시도 로직(최대 5회, 10초 간격)을 추가했습니다.
  > * step 4 실패 시 step 1\~3 (키워드 추출/임베딩/클러스터링)을 다시 돌리지 않고, step 4만 독립적으로 재시도합니다.
  > * 5회 모두 실패하면 RuntimeError를 위로 던져서 파이프라인이 FAILED로 처리됩니다.
  > 
  > **2. redis 의존성 누락**
  > 
  > * `1_data_pipeline/news/requirements.txt`에 `redis>=5.0.0` 추가했습니다.
  > * 워커 환경(`.venv-wsl`)에서도 redis import가 정상 동작하도록 반영됩니다.

---

### !203 · [BE] fix : S14P21D208-149 Redis기반 top-list 캐시추가

- 작성자: **정준용** · 상태: `closed`
- 브랜치: `feature/be/stock` → `dev-backend`
- 생성: 2026-03-19 · 머지: -
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/203](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/203)

<details><summary>MR 설명</summary>

> ## :page_facing_up: MR 한 줄 요약
> 
> `/api/stocks`에 Redis 기반 top-list 캐시를 추가하고, DB category 기반 sector 태그 필터 및 멀티 선택을 지원하도록 정리했습니다.
> 
> ## :technologist: MR 세부 내용
> 
> - `/api/stocks` 최종 응답의 base response를 Redis에 캐시하도록 추가했습니다.
>   - 새 서비스:
>     - `StockTopListCacheService`
>   - 캐시 대상:
>     - 필터/정렬/페이지네이션이 적용된 `StockListResponse`
>     - 단, `is_watchlisted`는 사용자별 값이라 캐시하지 않고 응답 직전에만 overlay
>   - 캐시 키:
>     - query fingerprint 기반 MD5 토큰
>     - `KIS:TOP_LIST:{MODE}:{fingerprint}:V1`
>   - TTL:
>     - 장중 `10초`
>     - 장외 `60초`
> - `MarketCacheKeyFactory`, `MarketCacheTtlPolicy`에 top-list 전용 key/TTL을 추가했습니다.
>   - `stockTopList(...)`
>   - `stockTopListTtl()`
> - sector 필터를 기존 단일 enum 매칭에서 DB `stocks.category` 기반 매칭으로 확장했습니다.
>   - `sector=디스플레이`
>   - `sector=반도체`
>   - `sector=건설 · 인프라` 같은 프론트 태그를 그대로 받을 수 있습니다.
>   - category 비교 시 `·` / `/` / 공백 차이를 정규화해서 비교합니다.
>   - 예:
>     - `건설 · 인프라`
>     - `건설 / 인프라` 는 같은 태그로 처리됩니다.
> - sector 멀티 선택도 지원합니다.
>   - 반복 파라미터:
>     - `?sector=디스플레이&sector=반도체`
>   - comma-separated:
>     - `?sector=디스플레이,반도체` 둘 다 허용합니다.
> - `전체`는 no-filter로 처리되도록 정리했습니다.
> - keyword 검색도 ticker / name / gicsSector 외에 `category`까지 포함하도록 확장했습니다.
> - `StockTopListServiceImpl`는 캐시 hit 시 base response를 그대로 쓰고, user가 로그인된 경우에만 watchlist 상태를 overlay 하도록 정리했습니다.
>   - user별 캐시 오염 방지
>   - 같은 list query에 대해 Redis hit 가능
> - `StockApiController`는 `sector`를 `List<String>`로 받아 반복 쿼리 파라미터를 그대로 수용하도록 변경했습니다.
>   - OpenAPI 문서도 함께 정리했습니다.
> 
> =============================================================
> 
> ## :technologist: MR 세부 내용
> 
> - `StockTopListSupport`에 category code 매핑을 추가했습니다.
>   - 예:
>     - `DISPLAY` -\> `디스플레이`
>     - `FINANCE_HEALTHCARE` -\> `금융 / 헬스케어`
>     - `IT_PLATFORM_SOFTWARE` -\> `IT플랫폼 / 소프트웨어`
> - `/api/stocks`의 `sector` 파라미터는 이제 category code를 직접 받을 수 있습니다.
> - DB는 기존처럼 한국어 `stocks.category` 값을 그대로 유지하고, 백엔드에서 code -\> label 매핑 후 필터링합니다.
> - `·` 와 `/` 표기 차이는 동일한 category로 취급되도록 정규화 유지했습니다.
>   - 예:
>     - `IT플랫폼 · 소프트웨어`
>     - `IT플랫폼 / 소프트웨어` 는 동일하게 처리됩니다.
> - 기존 한국어 legacy alias도 계속 지원합니다.
>   - `금융`
>   - `자동차`
>   - `바이오`
>   - `2차전지`
> - 테스트 코드의 unicode escape 문자열을 읽기 쉬운 한국어 리터럴로 정리했습니다.
> - 컨트롤러 테스트에 category code 입력 케이스를 추가했습니다.
> - 서비스 테스트에 아래 케이스를 추가/정리했습니다.
>   - category code 필터
>   - `·` / `/` category 호환
>   - 한국어 legacy alias 호환
> 
> S14P21D208-149

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-19)
  > ### 1. Blocker - 테스트가 현재 컴파일되지 않습니다
  > 
  > 추가된 테스트 문자열이 깨지면서 따옴표가 닫히지 않아 현재 테스트 컴파일이 실패합니다.
  > 
  > `StockTopListServiceImplTest`의 `351`, `352`, `360`, `369`, `370`, `371`, `383`, `419` line 근처에서 `unclosed string literal`이 발생했고, 로컬에서도 아래 명령으로 동일하게 재현됐습니다.
  > 
  > `./mvnw -q -Dtest=StockTopListServiceImplTest,StockTopListCacheServiceTest,StockApiControllerTest,MarketCacheKeyFactoryTest,MarketCacheTtlPolicyTest test`
  > 
  > 머지 전에 테스트 문자열 인코딩/따옴표부터 먼저 정리해야 할 것 같습니다.
  > 
  > 위치: `services/backend/src/test/java/com/sallaemallae/backend/domain/stock/service/StockTopListServiceImplTest.java`
  > 
  > ### 2. Major - 기존 한국어 sector alias 호환성이 깨진 것으로 보입니다
  > 
  > `LegacySector.from()`이 이제 영어 값만 매핑하고 있어서, 기존에 허용되던 한국어 sector alias인 `금융`, `자동차`, `바이오`, `2차전지`가 더 이상 legacy sector로 해석되지 않습니다.
  > 
  > 지금 구현에서는 이런 값들이 category exact-match로만 처리되는데, 시드 데이터 기준 실제 카테고리는 `금융 / 헬스케어`처럼 저장되어 있어서 `sector=금융` 또는 `sector=바이오` 같은 요청은 이전과 다르게 빈 결과가 나올 가능성이 큽니다.
  > 
  > 이전 구현이 한국어 alias를 명시적으로 지원하고 있었던 만큼, 하위 호환이 필요하면 `LegacySector.from()`에 한국어 매핑을 유지하는 편이 안전해 보입니다.
  > 
  > 위치: `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/StockTopListSupport.java`

- 💬 **강지석** (2026-03-19)
  > # 코드 리뷰: Redis 기반 top-list 캐시 추가
  > 
  > > **커밋:** `7a23427` [BE] fix : S14P21D208-149 Redis기반 top-list 캐시추가
  > 
  > ---
  > 
  > ## 변경 요약
  > 
  > 1. **`StockTopListCacheService` 신규** — Redis 캐시 레이어 추가 (cache-aside 패턴)
  > 2. **`StockTopListServiceImpl` 리팩터링** — base response(watchlist 제외)를 캐시하고, watchlist는 항상 실시간 오버레이
  > 3. **`SectorFilter` 리팩터링** — enum → record로 변경, 다중 sector 필터 지원 (`List<String>`)
  > 4. **`StockTopListCandidate`에 `category` 필드 추가** — DB의 category 컬럼 활용
  > 5. **`LegacySector` enum 분리** — 기존 키워드 기반 sector 매칭을 GICS/category 기반으로 전환
  > 6. **TTL 정책** — 장중 10초, 장외 60초
  > 7. **테스트** — `StockTopListCacheServiceTest` 신규 + 기존 테스트 업데이트
  > 
  > ---
  > 
  > ## 잘된 점
  > 
  > - **캐시 설계**: watchlist를 캐시에서 분리한 것이 핵심적으로 좋음. 사용자별 캐시 폭발 없이 공유 캐시를 활용할 수 있음
  > - **cache fingerprint**: 쿼리 파라미터 기반 MD5 해시로 캐시 키를 생성하는 방식이 깔끔함
  > - **TTL 정책**: 장중/장외 구분이 적절함
  > - **캐시 실패 시 graceful degradation**: get/put 모두 `RuntimeException` catch + warn 로깅으로 캐시 장애가 서비스에 영향을 주지 않음
  > - **`SectorFilter` → record 전환**: 다중 sector 필터 지원이 자연스러움
  > - **테스트 헬퍼 `service()` 추출**: 반복적인 생성자 호출 제거가 좋음
  > 
  > ---
  > 
  > ## 이슈
  > 
  > ### 1. [Medium] `applyWatchlist`에서 `category` 필드 누락
  > 
  > **파일:** `StockTopListServiceImpl.java` — `applyWatchlist` 메서드
  > 
  > ```java
  > List<StockListItemResponse> watchlistedItems = baseResponse.stocks().stream()
  >     .map(item -> new StockListItemResponse(
  >         item.rank(),
  >         item.id(),
  >         item.ticker(),
  >         item.name(),
  >         item.gicsSector(),
  >         // category 필드가 빠져있음!
  >         item.price(),
  >         item.fluctuationRate(),
  >         ...
  >     ))
  >     .toList();
  > ```
  > 
  > `StockTopListCandidate`에 `category` 필드를 추가했는데, `applyWatchlist`에서 `StockListItemResponse`를 재생성할 때 `category` 필드가 누락되었다면 컴파일 에러 또는 데이터 유실이 발생할 수 있다. `StockListItemResponse`에 `category` 필드가 있는지 확인이 필요하다.
  > 
  > > 만약 `StockListItemResponse`에 `category`가 없다면 이 이슈는 해당 없음. 하지만 candidate에서 response로 변환하는 다른 코드에서는 `category`를 전달하고 있으므로 일관성 확인 필요.
  > 
  > ---
  > 
  > ### 2. [Medium] `LegacySector.FINANCE`와 `BIO`가 동일한 category에 매칭
  > 
  > **파일:** `StockTopListSupport.java` — `LegacySector.matches()`
  > 
  > ```java
  > case FINANCE -> normalizedGics.contains("financials")
  >     || normalizedCategory.equals(canonicalCategoryKey("금융 / 헬스케어"));
  > case BIO -> normalizedGics.contains("healthcare")
  >     || normalizedCategory.equals(canonicalCategoryKey("금융 / 헬스케어"));
  > ```
  > 
  > `FINANCE`와 `BIO` 둘 다 `"금융 / 헬스케어"` category에 매칭된다. 이 category에 속한 종목은 FINANCE 필터와 BIO 필터 모두에 나타나게 된다. 의도된 동작인지 확인 필요.
  > 
  > **가능한 수정:** category가 `"금융 / 헬스케어"`인 경우 GICS sector로 추가 판별하거나, category를 분리할 수 있는지 검토.
  > 
  > ---
  > 
  > ### 3. [Medium] `LegacySector.AUTO` 매칭이 너무 넓음
  > 
  > **파일:** `StockTopListSupport.java` — `LegacySector.matches()`
  > 
  > ```java
  > case AUTO -> normalizedCategory.equals(canonicalCategoryKey("소비내구재"));
  > ```
  > 
  > `"소비내구재"`는 자동차뿐만 아니라 가전, 가구 등도 포함할 수 있다. 기존 코드에서는 `"automobile"`, `"motor"`, `"자동차"`, `"기아"`, `"현대"` 등 구체적 키워드로 매칭했는데, category 기반으로 바뀌면서 범위가 넓어졌다.
  > 
  > ---
  > 
  > ### 4. [Low] 캐시 키에 MD5 사용
  > 
  > **파일:** `StockTopListCacheService.java:73`
  > 
  > ```java
  > return DigestUtils.md5DigestAsHex(query.cacheFingerprint().getBytes(StandardCharsets.UTF_8));
  > ```
  > 
  > MD5 자체는 보안 목적이 아니므로 문제는 아니지만, fingerprint 문자열이 이미 고유하고 길지 않으므로 (`signal=ALL|sector=...|...`) 해싱 없이 그대로 캐시 키로 사용해도 된다. 해시를 쓰면 디버깅 시 어떤 쿼리의 캐시인지 Redis에서 확인하기 어려워진다.
  > 
  > **제안:** 디버깅 편의를 위해 fingerprint 원문을 캐시 키에 사용하거나, 로그에 fingerprint를 함께 출력.
  > 
  > ---
  > 
  > ### 5. [Low] `cacheToken()`에서 `reduce` 대신 `String.join` 사용 가능
  > 
  > **파일:** `StockTopListSupport.java` — `SectorFilter.cacheToken()`
  > 
  > ```java
  > String categoriesToken = categoryKeys.stream()
  >     .sorted()
  >     .reduce((left, right) -> left + "," + right)
  >     .orElse("-");
  > ```
  > 
  > 더 간결하게:
  > 
  > ```java
  > String categoriesToken = categoryKeys.isEmpty() ? "-"
  >     : String.join(",", categoryKeys.stream().sorted().toList());
  > ```
  > 
  > ---
  > 
  > ### 6. [Low] 테스트에서 `lenient()` 사용
  > 
  > **파일:** `StockTopListServiceImplTest.java` — `service()` 헬퍼
  > 
  > ```java
  > private StockTopListServiceImpl service() {
  >     lenient().when(stockTopListCacheService.get(any())).thenReturn(Optional.empty());
  >     return new StockTopListServiceImpl(...);
  > }
  > ```
  > 
  > `lenient()`는 불필요한 스터빙 경고를 억제한다. 캐시 히트 테스트에서는 이 스터빙이 덮어씌워지는데, 다른 테스트에서는 실제로 필요한 스터빙이다. 현재 구조에서는 괜찮지만, `lenient()`를 남발하면 테스트에서 불필요한 mock 설정을 감지하기 어려워질 수 있다.
  > 
  > ---
  > 
  > ### 7. [Nit] 테스트의 한글 인코딩 깨짐
  > 
  > **파일:** `StockTopListServiceImplTest.java`
  > 
  > ```java
  > Stock display = stock(1L, "034220", "LG Display", "Information Technology", "?붿뒪?뚮젅??", 1_000_000L);
  > ```
  > 
  > diff에서 한글 카테고리 이름이 깨져있다 (`?붿뒪?뚮젅??`, `諛섎룄泥?`, `嫄댁꽕 / ?명봽??`). 실제 소스 파일의 인코딩이 UTF-8인지 확인 필요. 만약 diff 표시 문제라면 무시해도 됨.
  > 
  > ---
  > 
  > ## 요약
  > 
  > | 심각도 | 항목 | 설명 |
  > |--------|------|------|
  > | Medium | `applyWatchlist` category 누락 | response 재생성 시 category 필드 전달 여부 확인 |
  > | Medium | FINANCE/BIO 동일 category 매칭 | `"금융 / 헬스케어"`에 둘 다 매칭됨 |
  > | Medium | AUTO 매칭 범위 | `"소비내구재"`가 자동차 외 품목 포함 가능 |
  > | Low | MD5 해시 캐시 키 | 디버깅 편의를 위해 원문 사용 고려 |
  > | Low | `reduce` → `String.join` | 가독성 개선 가능 |
  > | Low | `lenient()` 사용 | 필요 최소한으로 제한 권장 |
  > | Nit | 테스트 한글 인코딩 | 소스 파일 UTF-8 확인 |
  > 
  > **결론:** 캐시 설계(watchlist 분리, graceful degradation, TTL 정책)는 매우 잘 되어 있다. **#1 category 필드 일관성**과 **#2 FINANCE/BIO 중복 매칭**은 머지 전에 확인하는 것을 권장한다.

---

### !208 · [BE] Feat: S14P21D208-98 MinIO presigned URL 기반 프로필 이미지 업로드 구현

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `feature/be/minio-profile-upload-v2` → `dev-backend`
- 생성: 2026-03-19 · 머지: 2026-03-19
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/208](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/208)

<details><summary>MR 설명</summary>

> MinIO presigned URL 기반 프로필 이미지 업로드 구현
> 
> ## :technologist: MR 세부 내용
> 
> * MinIO 의존성 및 MinioClient 빈 설정 추가
> * StorageController: POST /api/storage/presigned-url 엔드포인트
> * FileStorageService: presigned URL 생성 및 파일 타입 검증
> * UserServiceImpl.updateProfile() 실제 DB 저장 로직 구현
> * UserController 전체 엔드포인트 Swagger 문서 추가
> * 에러코드 UserErrorCode.USER_NOT_FOUND로 변경
> 
> ## :paperclip: Issue 번호
> 
> S14P21D208-98

</details>

**리뷰 토론**

- 💬 **정준용** (2026-03-19)
  > 1. \[P1\] 업로드 시점에 이미지 타입 제약이 실제로 보장되지 않습니다.\
  >    request.contentType()는 presigned URL 발급 전에만 검증되고, 생성된 PUT URL에는 해당 헤더 제약이 서명되지 않습니다. 그래서 클라이언트는 image/png로 URL을 발급받은 뒤 실제 업로드에서는 다른 Content-Type이나 임의의 바이너리를 보낼 수 있습니다. 공개 프로필 이미지 업로드 경로라면 이미지 전용 저장이 보장되지 않아 위험합니다.
  > 2. \[P1\] MinIO 환경변수가 없으면 애플리케이션이 기동되지 않습니다.\
  >    MinioConfig가 항상 생성되고 minio.\* 값도 모두 필수 placeholder라서, MINIO\_\* 환경변수가 없는 로컬/테스트/CI 환경에서는 컨텍스트 초기화가 실패합니다. MR 브랜치에서 ./mvnw.cmd -q -Dtest=SallaemallaeBackendApplicationTests test 실행 시 Could not resolve placeholder 'minio.endpoint'로 재현됩니다. 조건부 bean 등록이나 테스트용 기본값 처리가 필요합니다.
  > 3. \[P2\] 프로필 이미지 업로드에 파일 크기 제한이 없습니다.\
  >    현재 구현은 제한 없는 presigned PUT URL만 반환하므로, 인증된 사용자가 매우 큰 파일도 프로필 경로에 업로드할 수 있습니다. 프로필 이미지 API 용도에 비해 제약이 너무 약하고, 스토리지 비용 및 남용 리스크가 있습니다. 가능하면 presigned POST policy와 content-length-range 같은 방식으로 업로드 크기 상한을 두는 편이 안전합니다.

- 💬 **강지석** (2026-03-19)
  > # 코드 리뷰: MinIO Presigned URL 프로필 이미지 업로드
  > 
  > > **커밋:** `f90b325` [BE] Feat: S14P21D208-98 MinIO presigned URL 기반 프로필 이미지 업로드 구현
  > 
  > ---
  > 
  > ## 잘된 점
  > 
  > - **구조**: `controller → service → dto → exception` 레이어 분리가 깔끔함
  > - **DTO**: Java record 활용이 적절함
  > - **에러 코드**: `StorageErrorCode`가 기존 `ErrorCode` 인터페이스를 잘 따르고 있음
  > - **UserServiceImpl 수정**: 기존에 DB 저장 없이 Map만 리턴하던 `updateProfile`을 실제로 엔티티를 조회/수정하도록 고친 것이 좋음
  > - **Object key 설계**: `profiles/{userId}/{UUID}.{ext}` 구조가 깔끔함
  > 
  > ---
  > 
  > ## 이슈
  > 
  > ### 1. [Critical] Presigned URL에 Content-Type 제약 없음
  > 
  > **파일:** `FileStorageService.java:44-52`
  > 
  > ```java
  > String uploadUrl = minioClient.getPresignedObjectUrl(
  >     GetPresignedObjectUrlArgs.builder()
  >         .method(Method.PUT)
  >         .bucket(bucket)
  >         .object(objectKey)
  >         .expiry(PRESIGNED_EXPIRY_MINUTES, TimeUnit.MINUTES)
  >         .build()
  > );
  > ```
  > 
  > 서버에서 `contentType` 검증을 하지만, 생성된 presigned URL 자체에는 Content-Type 제약이 없다. 클라이언트가 `image/png`로 요청해서 URL을 받은 뒤, 실제로는 악성 파일을 업로드할 수 있다.
  > 
  > **수정 제안:**
  > 
  > ```java
  > .extraHeaders(Map.of("Content-Type", request.contentType()))
  > ```
  > 
  > 를 builder에 추가하여 presigned URL 레벨에서 Content-Type을 강제해야 한다.
  > 
  > ---
  > 
  > ### 2. [Medium] Exception 삼키기
  > 
  > **파일:** `FileStorageService.java:54-56`
  > 
  > ```java
  > } catch (Exception e) {
  >     throw new BusinessException(StorageErrorCode.PRESIGNED_URL_FAILED);
  > }
  > ```
  > 
  > 원본 예외가 완전히 사라진다. 운영 환경에서 MinIO 연결 오류, 인증 실패 등의 원인을 파악할 수 없게 된다.
  > 
  > **수정 제안:**
  > 
  > ```java
  > } catch (Exception e) {
  >     log.error("Presigned URL 생성 실패: bucket={}, object={}", bucket, objectKey, e);
  >     throw new BusinessException(StorageErrorCode.PRESIGNED_URL_FAILED);
  > }
  > ```
  > 
  > ---
  > 
  > ### 3. [Medium] updateProfile 응답 변경 — 프론트엔드 호환성
  > 
  > **파일:** `UserServiceImpl.java:147`
  > 
  > | Before | After |
  > |--------|-------|
  > | `Map.of("userId", userId, "nickname", ..., "profileImageUrl", ...)` | `Map.of("message", "프로필이 수정되었습니다.")` |
  > 
  > 응답 구조가 완전히 바뀌었다. 프론트엔드에서 기존 응답 필드(`userId`, `nickname`, `profileImageUrl`)를 참조하고 있다면 깨진다. **프론트엔드 팀과 확인 필요.**
  > 
  > ---
  > 
  > ### 4. [Low] 파일 크기 제한 없음
  > 
  > Presigned PUT URL로는 파일 크기를 제한할 수 없다. 누군가 수백 MB 파일을 업로드할 수 있다.
  > 
  > **방안:**
  > - Presigned POST policy 사용 (크기 조건 지정 가능)
  > - 또는 업로드 완료 후 서버에서 크기 확인 + 초과 시 삭제
  > 
  > ---
  > 
  > ### 5. [Low] 확장자만으로는 파일 타입 보장 불가
  > 
  > `extractExtension`이 파일명에서 확장자를 추출하지만, 실제 파일 내용과 확장자가 일치한다는 보장이 없다. Content-Type 검증과 함께, 업로드 후 파일 매직바이트 확인을 고려할 수 있다.
  > 
  > ---
  > 
  > ### 6. [Nit] 버킷 존재 여부 확인 없음
  > 
  > 애플리케이션 시작 시 버킷 존재 여부를 확인하거나 자동 생성하는 로직이 없다. MinIO 설정이 잘못되면 런타임에서야 에러가 발생한다.
  > 
  > **수정 제안:** `MinioConfig`에 `@PostConstruct`로 버킷 확인 로직 추가
  > 
  > ```java
  > @PostConstruct
  > public void ensureBucketExists() {
  >     try {
  >         boolean exists = minioClient().bucketExists(
  >             BucketExistsArgs.builder().bucket(bucket).build()
  >         );
  >         if (!exists) {
  >             minioClient().makeBucket(
  >                 MakeBucketArgs.builder().bucket(bucket).build()
  >             );
  >         }
  >     } catch (Exception e) {
  >         throw new RuntimeException("MinIO 버킷 초기화 실패", e);
  >     }
  > }
  > ```
  > 
  > ---
  > 
  > ## 요약
  > 
  > | 심각도 | 항목 | 설명 |
  > |--------|------|------|
  > | Critical | Content-Type 미강제 | presigned URL에 Content-Type 제약 추가 필요 |
  > | Medium | Exception 삼키기 | 로깅 추가 필요 |
  > | Medium | 응답 구조 변경 | FE 호환성 확인 필요 |
  > | Low | 파일 크기 제한 | 대용량 업로드 방지 수단 고려 |
  > | Low | 파일 타입 검증 | 매직바이트 확인 고려 |
  > | Nit | 버킷 확인 | 시작 시 버킷 존재 여부 체크 |
  > 
  > **결론:** 전반적으로 구조와 코드 품질은 좋다. **#1 Content-Type 강제**와 **#2 로깅 추가**는 머지 전에 수정하는 것을 권장한다.

---

### !211 · [INFRA] Fix: S14P21D208-32 dev-ai 배포 안정화

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `fix/infra/S14P21D208-32-dev-ai-deploy-stability` → `infra-common`
- 생성: 2026-03-19 · 머지: 2026-03-19
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/211](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/211)

<details><summary>MR 설명</summary>

> ## :page_facing_up: MR 한 줄 요약
> 
> dev-ai 배포 시 stale upstream과 불필요한 스케줄러 재배포로 인한 장애를 줄이도록 배포 경로를 안정화했습니다.
> 
> ## :technologist: MR 세부 내용
> 
> - dev-ai nginx가 ml-server 재생성 후에도 Docker DNS를 다시 해석하도록 설정해 502 재발을 완화했습니다.
> - ml-server healthcheck와 nginx 의존 조건을 추가해 초기 기동 시 upstream 연결 안정성을 높였습니다.
> - dev-ai 배포 스크립트가 변경된 서비스만 선택적으로 재배포하도록 바꿔 stock-scheduler와 news-scheduler 중단을 최소화했습니다.
> - 배포 후 nginx를 재시작해 새 ml-server upstream이 즉시 반영되도록 보완했습니다.
> - 로컬 시뮬레이션으로 `ai_only`, `stock_only`, `news_only` 분기와 기본 배포 경로를 검증했습니다.
> 
> ## :paperclip: Issue 번호
> 
> S14P21D208-32

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-19)
  > ## :mag: Code Review Report
  > 
  > **Files Reviewed:** 4  |  **Total Issues:** 5
  > 
  > ---
  > 
  > ### :red_circle: HIGH (1)
  > 
  > **1. `infra/scripts/deploy-dev-ai.sh` (마지막 블록) — nginx 재시작으로 인한 순간 다운타임**
  > 
  > ```bash
  > if [[ " ${services_to_up[*]} " == *" nginx "* ]]; then
  >   docker compose ... restart nginx
  > fi
  > ```
  > 
  > `compose_up` 이후 즉시 `restart nginx`를 호출하면 nginx가 잠시 내려가면서 **502 에러가 발생**할 수 있습니다.
  > 
  > 이미 `nginx.ai.conf`에 `resolver 127.0.0.11 valid=10s`와 변수 기반 upstream(`set $ml_server_upstream`)을 적용했기 때문에, nginx는 10초마다 자동으로 DNS를 다시 resolve합니다. 또한 `service_healthy` 조건으로 ml-server가 healthy한 뒤에 nginx가 뜨므로, **이 restart 블록은 불필요하며 오히려 가용성을 해칠 수 있습니다.**
  > 
  > **권장:** 이 restart 블록을 제거하거나, 정말 필요하다면 `docker compose exec nginx nginx -s reload` (graceful reload)로 교체하세요.
  > 
  > ---
  > 
  > ### :orange_circle: MEDIUM (2)
  > 
  > **2. `infra/scripts/deploy-dev-ai.sh` — 변경 없을 때 기본 동작이 불필요한 빌드 유발**
  > 
  > ```bash
  > if [[ ${#services_to_up[@]} -eq 0 ]]; then
  >   services_to_up=("ml-server" "nginx")
  > fi
  > ```
  > 
  > 아무것도 변경되지 않았는데 ml-server + nginx를 매번 재빌드하는 것은 배포 시간과 리소스 낭비입니다. 의도적인 안전장치라면 주석으로 이유를 명시해주세요. 아니라면 변경 없을 시 early return을 권장합니다:
  > 
  > ```bash
  > if [[ ${#services_to_up[@]} -eq 0 ]]; then
  >   echo "[INFO] No changes detected - skipping deploy."
  >   exit 0
  > fi
  > ```
  > 
  > **3. `infra/scripts/deploy-dev-ai.sh` — `diff -qr` exclude 목록이 하드코딩됨**
  > 
  > 새로운 아티팩트 디렉토리가 추가되면 여기도 함께 수정해야 합니다. `.deployignore` 같은 파일로 추출하거나, 최소한 상단에 배열 변수로 분리하면 유지보수가 쉬워집니다.
  > 
  > ---
  > 
  > ### :large_blue_circle: LOW (2)
  > 
  > **4. `infra/apps/docker-compose.ai.yml` — healthcheck의 curl 의존성**
  > 
  > ```yaml
  > test: ["CMD-SHELL", "curl -fsS http://127.0.0.1:8000/health || exit 1"]
  > ```
  > 
  > ml-server 컨테이너 이미지에 `curl`이 없으면 healthcheck가 항상 실패합니다. Python 기반이라면 curl 대신 아래가 더 안전합니다:
  > 
  > ```yaml
  > test: ["CMD-SHELL", "python -c 'import urllib.request; urllib.request.urlopen("http://127.0.0.1:8000/health")' || exit 1"]
  > ```
  > 
  > 또는 Dockerfile에 `curl` 설치를 확인해주세요.
  > 
  > **5. `infra/scripts/common.sh` — `shift 3` 추가 시 하위 호환성**
  > 
  > 다른 스크립트에서 `compose_up`을 3개 인자만으로 호출하는 곳이 있다면 `"$@"`가 빈 문자열로 확장되어 문제는 없지만, 인자 수가 3 미만이면 `shift`에서 에러가 납니다. 기존 호출부가 모두 3개 이상 인자를 넘기는지 확인해주세요.
  > 
  > ---
  > 
  > ### :white_check_mark: 잘한 점
  > 
  > - **Docker DNS resolver + 변수 upstream 패턴** (`nginx.ai.conf`): deploy 중 stale IP 문제를 깔끔하게 해결한 정석적인 접근입니다.
  > - **`service_healthy` + healthcheck 조합** (`docker-compose.ai.yml`): nginx가 ml-server 준비 전에 뜨는 502 문제를 구조적으로 방지합니다.
  > - **선택적 서비스 빌드** (`deploy-dev-ai.sh`): 변경된 서비스만 재빌드하는 증분 배포 로직이 배포 속도를 크게 개선합니다.
  > - **`common.sh` 확장**: `compose_up`에 추가 인자를 전달할 수 있게 한 변경이 깔끔하고 하위 호환됩니다.
  > 
  > ---
  > 
  > ### :clipboard: 결론
  > 
  > **RECOMMENDATION: REQUEST CHANGES**
  > 
  > HIGH 이슈 1건(nginx restart로 인한 다운타임)을 수정한 뒤 머지를 권장합니다. MEDIUM 이슈는 가능하면 이번 MR에서 함께 처리하면 좋겠습니다.

- 💬 **장호정** (2026-03-19)
  > ## :mag: Re-Review: MR #211 (커밋 e1566344 반영)
  > 
  > 이전 리뷰 피드백에 대한 수정사항을 확인했습니다.
  > 
  > ---
  > 
  > ### :white_check_mark: 해결된 이슈 (3/5)
  > 
  > **1. (이전 HIGH) nginx restart 다운타임 → 해결**
  > 
  > ```bash
  > # Before
  > docker compose ... restart nginx  # 항상 실행, 다운타임 발생
  > 
  > # After
  > if [[ "$nginx_config_changed" == true ]]; then
  >   docker compose ... exec -T nginx nginx -s reload
  > fi
  > ```
  > 
  > - `restart` → `nginx -s reload` (graceful) 로 변경하여 다운타임 제거
  > - `nginx_config_changed` 조건으로 한정하여 불필요한 reload 방지
  > - `-T` 플래그로 CI/CD 환경의 TTY 문제도 방지
  > 
  > **2. (이전 MEDIUM) 변경 없을 때 불필요한 빌드 → 해결**
  > 
  > ```bash
  > if [[ ${#services_to_up[@]} -eq 0 ]]; then
  >   echo "[INFO] No dev-ai deploy changes detected - skipping deploy."
  >   exit 0
  > fi
  > ```
  > 
  > 명확한 로그 메시지와 함께 early return 처리 완료.
  > 
  > **3. (이전 MEDIUM) exclude 하드코딩 → 해결**
  > 
  > ```bash
  > readonly DIFF_EXCLUDES=(
  >   --exclude=.git
  >   --exclude=.venv
  >   ...
  > )
  > ```
  > 
  > 상단 `readonly` 배열로 분리되어 유지보수성이 개선됨.
  > 
  > ---
  > 
  > ### :blue_book: 추가 개선사항 확인
  > 
  > **인프라 설정 비교 경로 정정**
  > 
  > ```bash
  > # Before
  > file_changed "$CHECKOUT_DIR/infra/apps/docker-compose.ai.yml" ...
  > 
  > # After
  > file_changed "$INFRA_TEMPLATE_DIR/apps/docker-compose.ai.yml" ...
  > ```
  > 
  > 인프라 템플릿 디렉토리와 배포된 소스 디렉토리를 정확하게 비교하도록 수정됨.
  > 
  > ---
  > 
  > ### :speech_balloon: 미변경 LOW 이슈 (참고용, 블로커 아님)
  > 
  > - **healthcheck curl 의존성**: ml-server 이미지에 curl이 포함되어 있는지 확인 권장
  > - **`shift 3` 호환성**: 기존 `compose_up` 호출부가 모두 3개 이상 인자를 넘기는지 확인 권장
  > 
  > ---
  > 
  > ### :clipboard: 결론
  > 
  > **RECOMMENDATION: :white_check_mark: APPROVE**
  > 
  > HIGH/MEDIUM 이슈가 모두 깔끔하게 해결되었습니다. 남은 LOW 이슈는 블로커가 아니므로 머지해도 좋겠습니다.

---

### !212 · [BE] Fix: S14P21D208-109 메인 페이지 LATERAL JOIN 글로벌 MAX 버그 수정

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `fix/be/main-query-lateral-join` → `dev-backend`
- 생성: 2026-03-19 · 머지: 2026-03-19
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/212](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/212)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 메인 페이지 API 쿼리에서 글로벌 MAX trade_date 사용으로 종목이 누락되던 버그를 종목별 최신 데이터 조회로 수정
> 
> ## 🧑‍💻 MR 세부 내용
> - LATERAL JOIN 서브쿼리에서 전체 테이블 기준 MAX trade_date를 사용하여, 해당 날짜에 데이터가 없는 종목이 결과에서 누락되는 문제 수정
> - 카테고리 API에서 200종목 중 1종목만 반환되던 현상 해결
> - 수정 대상 쿼리 3개: top-stocks, categories, new-signals
> - 수정 방식: `WHERE trade_date = (글로벌 MAX)` → `ORDER BY trade_date DESC LIMIT 1` (종목별 최신)
> 
> ## 📎 Issue 번호
> S14P21D208-109

</details>

**리뷰 토론**

- 💬 **정준용** (2026-03-19)
  > # MR 212 코드리뷰
  > 
  > ## 결론
  > 
  > - **머지 전 수정 권장**
  > - 이번 MR은 원래 버그인 "글로벌 MAX 날짜 기준으로 일부 종목이 누락되는 문제"를 해결하려는 방향은 맞습니다.
  > - 다만 수정 과정에서 **쿼리 의미가 바뀌었고**, 그 결과 **미래 데이터 노출**, **API 의미 불일치**, **비결정적 결과**, **테스트 공백**이 생겼습니다.
  > 
  > ## 수정 필요 사항
  > 
  > ### 1. \[높음\] 미래 날짜 데이터가 메인 화면에 노출될 수 있습니다
  > 
  > - 파일: MainStockQueryRepository.java:25, MainStockQueryRepository.java:31, MainStockQueryRepository.java:74, MainStockQueryRepository.java:98
  > - 문제: `report_date <= CURRENT_DATE`, `trade_date <= CURRENT_DATE` 조건이 제거되었습니다.
  > - 이유: 배치가 다음 영업일 데이터를 미리 적재하거나 타임존 차이로 미래 날짜 row가 저장되면, `top-stocks`, `categories`, `new-signals`가 미래 가격/리포트를 그대로 반환할 수 있습니다.
  > - 근거: 같은 프로젝트의 다른 쿼리들은 여전히 날짜 상한을 유지하고 있습니다. SignalQueryRepository.java:23, SignalQueryRepository.java:48, ChairmanPortfolioQueryRepository.java:151, ChairmanPortfolioQueryRepository.java:204
  > - 수정 방향: 종목별 최신 row를 고르는 방식은 유지하되, `AND report_date <= CURRENT_DATE`, `AND trade_date <= CURRENT_DATE` 조건은 다시 넣는 것이 안전합니다.
  > 
  > ### 2. \[중간\] `오늘의 추천 종목`이라는 API 의미와 실제 동작이 달라졌습니다
  > 
  > - 파일: MainStockQueryRepository.java:19, MainService.java:8, MainController.java:28
  > - 문제: 서비스/컨트롤러/Swagger는 여전히 "오늘의 추천 종목"인데, 실제 쿼리는 종목별 가장 최신 리포트를 가져오도록 바뀌었습니다.
  > - 이유: 어떤 종목은 오늘 리포트가 없고 며칠 전 리포트만 있어도 TOP10에 포함될 수 있습니다. 이건 "오늘 기준 추천"과는 다른 의미입니다.
  > - 수정 방향:\
  >   "오늘 기준" 요구사항이 맞다면 리포트는 최신 영업일 집합으로 제한하고 가격만 종목별 최신값을 써야 합니다.\
  >   반대로 요구사항이 바뀐 것이라면 메서드명, 주석, Swagger 설명도 함께 바꿔야 합니다.
  > 
  > ### 3. \[중간\] 리포트 선택 결과가 비결정적입니다
  > 
  > - 파일: MainStockQueryRepository.java:25
  > - 문제: `ORDER BY report_date DESC, created_at DESC LIMIT 1` 에 `id DESC`가 없습니다.
  > - 이유: 같은 `stock_id`, 같은 `report_date`, 같은 `created_at`인 row가 2개 존재하면 어떤 row가 선택될지 DB가 보장하지 않습니다. 운영에서 재현 어려운 흔들리는 결과가 생길 수 있습니다.
  > - 근거: 비슷한 다른 쿼리들은 이미 `id DESC`까지 포함해 결정성을 보장하고 있습니다. SignalQueryRepository.java:29, ChairmanPortfolioQueryRepository.java:156
  > - 수정 방향: `ORDER BY report_date DESC, created_at DESC, id DESC` 로 고정하는 것이 맞습니다.
  > 
  > ### 4. \[낮음\] 이번 MR 핵심 로직을 검증하는 테스트가 없습니다
  > 
  > - 파일: MainServiceImplTest.java:29
  > - 문제: 현재 메인 관련 테스트는 `MainStockQueryRepository`를 mock 처리하고 있어서 native SQL 변경을 전혀 검증하지 못합니다.
  > - 이유: 이번 MR은 서비스 로직 변경이 아니라 SQL 의미 변경이 핵심입니다. mock 테스트만으로는 실제 회귀를 잡을 수 없습니다.
  > - 수정 방향: `@DataJpaTest` 또는 H2 기반 repository 테스트를 추가해서 아래 케이스를 검증해야 합니다.\
  >   `글로벌 최신 날짜에 데이터가 없는 종목도 포함되는지`\
  >   `미래 날짜 데이터는 제외되는지`\
  >   `동일 timestamp 리포트 2건 중 더 최신 row를 안정적으로 고르는지`
  > 
  > ## 최종 정리
  > 
  > - 이번 MR의 핵심 의도 자체는 타당합니다.
  > - 하지만 현재 상태로 머지하면 아래를 먼저 바로잡아야 합니다.
  > 
  > 1. `CURRENT_DATE` 상한 조건 복구
  > 2. "오늘 기준"인지 "종목별 최신 기준"인지 API 의미 확정
  > 3. 리포트 정렬에 `id DESC` 추가
  > 4. repository 레벨 SQL 테스트 추가

- 💬 **이혜민** (2026-03-19)
  > ## :page_facing_up: MR 한 줄 요약
  > 
  > 메인 페이지 API 글로벌 MAX 버그 수정 + 장 마감(15:30 KST) 기준 거래일 필터 적용 + 카테고리 1분봉 전환
  > 
  > ## :technologist: MR 세부 내용
  > 
  > - LATERAL JOIN 서브쿼리에서 전체 테이블 기준 MAX를 사용해 종목이 누락되던 버그 수정 (카테고리 200종목 중 1종목만 반환되던 현상)
  > - 장 마감(KST 15:30) 기준 거래일 계산 로직 추가 (`getCurrentTradingDate`, `getMarketCloseCutoff`)
  >   - top-stocks: `created_at >= 직전 장마감` + `report_date <= 거래일`
  >   - new-signals: `created_at >= 직전 장마감` + `trade_date <= 거래일`
  > - 카테고리 API: `stock_prices_minute` 1분봉 우선 조회, 없으면 `stock_prices_daily` 일봉 fallback
  > - 리포트 정렬에 `id DESC` 추가하여 동일 timestamp 선택 결정성 보장
  > - 단위 테스트 4건 추가 (캐시 미스, 빈 데이터, 동일 등락률)
  > 
  > ### :warning: 후속 작업
  > 
  > - 현재 장 마감 기준 cutoff는 임시 기준이며, AI 토론 데이터 적재 신호가 DB에 들어오기 시작하면 해당 신호 기준으로 날짜 필터를 전환할 예정
  > 
  > ## :paperclip: Issue 번호
  > 
  > S14P21D208-109

---

### !215 · [FE] Feat: S14P21D208-187 MSW(Mock Service Worker) 세팅

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/fe/msw-setup` → `dev-frontend`
- 생성: 2026-03-19 · 머지: 2026-03-19
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/215](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/215)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> MSW v2 기반 네트워크 레벨 API mocking 인프라를 구축합니다.
> 
> ## MR 세부 내용
> - MSW v2 service worker 생성 (public/mockServiceWorker.js)
> - 17개 API 그룹 mock 핸들러 작성 (기존 mock 데이터 재사용)
> - browser(setupWorker) / node(setupServer) 초기화 모듈 구성
> - MSWComponent 비블로킹 클라이언트 컴포넌트 생성
> - layout.tsx에 MSWComponent 독립 배치 (Provider 체인 외부)
> - NEXT_PUBLIC_API_MOCKING=true 시 MSW 활성화, false 시 실제 백엔드 연결
> 
> ## Issue 번호
> S14P21D208-187

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-19)
  > ## 코드 리뷰 리포트
  > 
  > **리뷰 파일**: 7개 | **총 이슈**: 6개
  > 
  > ---
  > 
  > ### CRITICAL (0)
  > 없음
  > 
  > ---
  > 
  > ### HIGH (2)
  > 
  > **1. `src/shared/components/MSWProvider.tsx:6` — useEffect 의존성 배열 누락**
  > 
  > ```tsx
  > useEffect(() => {
  >   // MSW 초기화 로직
  > }); // ← 의존성 배열이 없음
  > ```
  > 
  > 의존성 배열 `[]`이 없으면 **매 렌더마다** `worker.start()`가 호출됩니다. MSW worker는 이미 실행 중이면 무시하지만, 불필요한 호출이 반복되어 성능에 영향을 줄 수 있습니다.
  > 
  > **수정 제안:**
  > ```tsx
  > useEffect(() => {
  >   // ...
  > }, []); // 마운트 시 1회만 실행
  > ```
  > 
  > ---
  > 
  > **2. `src/mocks/handlers.ts:325` — POST watchlist request body에서 snake_case 미변환**
  > 
  > ```tsx
  > http.post("/api/users/watchlist", async ({ request }) => {
  >   body = (await request.json()) as { stockId?: number };
  >   if (typeof body.stockId !== "number") { ... }
  > });
  > ```
  > 
  > MSW가 인터셉트하는 요청의 body는 `apiClient.ts`의 `snakelizeKeys`가 적용된 **snake_case** 형태(`stock_id`)입니다. 하지만 핸들러에서는 `stockId`(camelCase)로 접근하고 있어 항상 `undefined`가 됩니다.
  > 
  > **수정 제안:**
  > ```tsx
  > import { camelizeKeys } from "@/shared/utils/case";
  > 
  > const raw = (await request.json()) as Record<string, unknown>;
  > const body = camelizeKeys<{ stockId?: number }>(raw);
  > ```
  > 
  > ---
  > 
  > ### MEDIUM (3)
  > 
  > **3. `src/mocks/handlers.ts` — helpers 함수 3개가 거의 동일**
  > 
  > `parsePositiveInteger`, `parsePositiveIntegerMin1`, `parseAnnounceInteger`가 미세한 차이만 있습니다. 하나의 함수로 통합하고 `min` 파라미터를 받는 것이 유지보수에 유리합니다.
  > 
  > ---
  > 
  > **4. `src/mocks/index.ts` — MSWComponent와 역할 중복**
  > 
  > `initMocks()` 함수가 server/browser 분기를 처리하지만, 실제로 사용되는 곳은 없습니다 (MSWComponent가 직접 `@/mocks/browser`를 import). 사용하지 않는 코드라면 제거하거나, MSWComponent에서 이 함수를 활용하는 것이 좋습니다.
  > 
  > ---
  > 
  > **5. `src/app/layout.tsx:29` — `<MSWComponent />`가 `<body>` 밖에 위치**
  > 
  > ```tsx
  > <html>
  >   <MSWComponent /> {/* ← <body> 바깥 */}
  >   <body>...</body>
  > </html>
  > ```
  > 
  > HTML 스펙상 `<html>` 직계 자식은 `<head>`와 `<body>`만 허용됩니다. 실제로 React hydration 경고가 발생할 수 있습니다. `return null`이라 DOM에 영향은 없지만, `<body>` 안 최상단으로 이동하는 것이 더 안전합니다.
  > 
  > ---
  > 
  > ### LOW (1)
  > 
  > **6. `src/mocks/handlers.ts:393-406` — Auth mock에서 하드코딩된 응답**
  > 
  > login mock 응답에서 `access_token`, `user_id` 등이 하드코딩되어 있습니다. 기존 `src/app/api/auth/mock.ts`의 `createMockLoginResponse`를 재사용하면 일관성이 높아집니다.
  > 
  > ---
  > 
  > ## 종합 의견
  > 
  > **RECOMMENDATION: COMMENT (머지 가능, 개선 권장)**
  > 
  > MSW v2 세팅이 잘 구성되어 있습니다. 기존 mock 데이터를 재사용하는 점이 좋고, 핸들러 커버리지가 충분합니다. HIGH 이슈 2건(useEffect 의존성 배열, snake_case 변환)은 머지 후에도 수정 가능하지만 빠른 수정을 권장합니다.

---

### !218 · [FE] Refactor: S14P21D208-188 페이지 컴포넌트 mock 직접 import 제거

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/fe/msw-mock-migration` → `dev-frontend`
- 생성: 2026-03-20 · 머지: 2026-03-20
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/218](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/218)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 페이지 컴포넌트에서 mock 데이터를 직접 import하던 구조를 정리하여 프로덕션 코드와 mock 코드를 분리합니다.
> 
> ## MR 세부 내용
> - newsConstants.ts 생성: 프로덕션 상수(NEWS_PAGE_SIZE, NEWS_FETCH_LIMIT, getNewsStockTicker)를 mockNewsData에서 분리
> - NewsPageClient, NewsArticleCard의 import를 newsConstants로 변경하여 mock 의존 제거
> - mockNewsData.ts에서 프로덕션 상수 제거, mock 전용 데이터만 유지
> - MSW handlers.ts stocks 핸들러 sector → sectors 배열 타입 호환 수정
> - portfolio/[ticker]/page.tsx mock import에 #186 API 연동 TODO 추가
> 
> ## Issue 번호
> S14P21D208-188

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-20)
  > ## 코드 리뷰 리포트
  > 
  > **리뷰 파일**: 7개 | **총 이슈**: 3개
  > 
  > ---
  > 
  > ### CRITICAL (0)
  > 없음
  > 
  > ---
  > 
  > ### HIGH (0)
  > 없음
  > 
  > ---
  > 
  > ### MEDIUM (2)
  > 
  > **1. `src/app/news/utils/newsConstants.ts` — `NEWS_STOCK_TICKER_BY_NAME` 하드코딩 매핑 테이블**
  > 
  > 종목명→티커 매핑이 30개 하드코딩되어 있습니다. 현재는 mock 환경에서만 사용되므로 문제가 없지만, 프로덕션에서 사용하려면 종목이 추가/변경될 때마다 수동 업데이트가 필요합니다.
  > 
  > **권장:** 실제 API 연동 시 이 매핑은 서버에서 받아오는 데이터로 대체하고, `newsConstants.ts`에는 `NEWS_PAGE_SIZE`/`NEWS_FETCH_LIMIT` 같은 순수 설정값만 남기는 것이 좋습니다.
  > 
  > ---
  > 
  > **2. `src/app/news/utils/mockNewsData.ts:3-5` — re-export 패턴**
  > 
  > ```tsx
  > import { NEWS_PAGE_SIZE } from "./newsConstants";
  > export { NEWS_PAGE_SIZE };
  > ```
  > 
  > `mockNewsData`에서 `NEWS_PAGE_SIZE`를 re-export하는 이유는 기존 import 경로 호환성 때문으로 보이지만, 이 MR에서 이미 모든 소비자의 import를 `newsConstants`로 변경했으므로 re-export가 불필요합니다. `mockNewsData` 내부에서만 사용하는 거라면 re-export 없이 내부 import만 유지해도 됩니다.
  > 
  > ---
  > 
  > ### LOW (1)
  > 
  > **3. `src/mocks/handlers.ts:133` — stocks sectors 파싱 시 fallback 로직**
  > 
  > ```tsx
  > const sectors = sectorsRaw
  >   ? sectorsRaw.split(",").map((s) => s.trim()).filter(Boolean)
  >   : [ALL_SECTOR];
  > ```
  > 
  > 빈 문자열 `""` → `[ALL_SECTOR]`는 정상이지만, `",,"` 같은 edge case에서 `filter(Boolean)` 후 빈 배열이 될 수 있습니다. `sectors.length === 0 ? [ALL_SECTOR] : sectors`로 한 번 더 보호하면 안전합니다.
  > 
  > ---
  > 
  > ## 종합 의견
  > 
  > **RECOMMENDATION: APPROVE**
  > 
  > 깔끔한 리팩토링입니다. 프로덕션 상수와 mock 데이터의 관심사 분리가 명확하고, import 경로 변경이 일관성 있게 적용되었습니다. MSW handlers의 `sectors` 타입 호환 수정도 적절합니다. MEDIUM 이슈는 머지 후 후속 정리로 충분합니다.

---

### !234 · [AI] Feat: 주식 데이터 파이프라인 정리 및 펀더멘탈 지표 프로세서 구현

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/ai/stock-pipeline-cleanup` → `dev-ai`
- 생성: 2026-03-20 · 머지: 2026-03-20
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/234](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/234)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 파이프라인 범위 외 코드 정리, 재무 데이터 동기화 최적화, 펀더멘탈 파생 지표 프로세서 구현
> 
> ## MR 세부 내용
> ### S14P21D208-181: 파이프라인 정리 및 재무 데이터 최적화
> - 파이프라인 범위 외 코드 정리 (LSTM/GARCH 피처 빌드 호출 제거)
> - 재무 데이터 rclone 개별 업로드 최적화 (13,000개 비교 → 신규 파일만 전송)
> - 재무 데이터 볼륨 감지 및 자동 복구 기능 추가
> - 재무 데이터 볼륨 정상 시 확인 로그 추가
> 
> ### S14P21D208-184: 펀더멘탈 파생 지표 프로세서
> - 비율/성장률/밸류에이션 파생 지표 계산 프로세서 구현
> - 분기순이익/영업활동현금흐름 계정 매핑 누락 수정
> - PER/PBR 조회 시 KRX 세션 인증 추가
> - 거래일 탐색 범위 14일 확장 및 pykrx 내장 함수 우선 사용
> 
> ## Issue 번호
> S14P21D208-181
> S14P21D208-184

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-20)
  > ## Code Review Report
  > 
  > **Files Reviewed:** 5 | **Total Issues:** 9
  > | Severity | Count |
  > |----------|-------|
  > | CRITICAL | 0 |
  > | HIGH | 2 |
  > | MEDIUM | 5 |
  > | LOW | 2 |
  > 
  > ---
  > 
  > ### HIGH (2)
  > 
  > **1. 메모리/성능 위험: 13,000+ parquet 파일 개별 로드**
  > 📍 `processors/build_fundamental_metrics.py:62-75`
  > 
  > `load_all_financial()`이 RAW_FINANCIAL_PATH의 파일을 하나씩 `load_parquet()` 호출 후 `pd.concat`합니다. 13,000+ 파일에 대해 개별 I/O는 매우 느립니다.
  > 
  > ✅ **Fix:** PyArrow dataset reader 사용
  > ```python
  > import pyarrow.parquet as pq
  > dataset = pq.ParquetDataset(RAW_FINANCIAL_PATH)
  > combined = dataset.read().to_pandas()
  > ```
  > 
  > ---
  > 
  > **2. shift(4) YoY 성장률: 분기 누락 시 잘못된 비교**
  > 📍 `processors/build_fundamental_metrics.py:200-204`
  > 
  > `grouped.shift(4)`는 연속된 4개 분기를 가정합니다. 신규 상장 또는 DART 수집 실패로 분기가 빠지면 2024Q4 vs 2023Q3 같은 잘못된 비교가 발생합니다.
  > 
  > ✅ **Fix:** positional shift 대신 key 기반 merge
  > ```python
  > prev = df[['ticker','fiscal_year','fiscal_quarter',src_col]].copy()
  > prev['fiscal_year'] += 1  # YoY
  > df = df.merge(prev, on=['ticker','fiscal_year','fiscal_quarter'],
  >               suffixes=('','_prev'), how='left')
  > ```
  > 
  > ---
  > 
  > ### MEDIUM (5)
  > 
  > **3. `_safe_growth` 반환 타입 불일치**
  > 📍 `build_fundamental_metrics.py:217-224`
  > `np.where()`는 `ndarray` 반환이지만 타입 힌트는 `pd.Series`. `pd.Series(np.where(...), index=current.index)`로 감싸거나 타입 수정 필요.
  > 
  > **4. `processed/fundamental`이 `RCLONE_SYNC_DIRS`에 누락**
  > 📍 `config.py`
  > 새 출력 디렉토리가 rclone 동기화 대상에 포함되지 않아 Drive에 업로드되지 않음.
  > 
  > **5. `_find_nearest_trading_date` 폴백이 비거래일 반환**
  > 📍 `build_fundamental_metrics.py:278`
  > 14일 탐색 실패 시 원래 날짜(비거래일)를 그대로 반환. `fetch_per_pbr`에서 빈 결과 또는 잘못된 데이터를 받을 수 있음. `None` 반환 + 호출부 처리 권장.
  > 
  > **6. `compute_ratio_metrics` 분자 NaN 체크 누락**
  > 📍 `build_fundamental_metrics.py:122-127`
  > numpy NaN 전파로 결과는 맞지만, 조건에 분자 `.notna()` 추가로 의도 명시 권장.
  > 
  > **7. `build_announcement_features.py` 스텁 위치**
  > 📍 `processors/build_announcement_features.py`
  > pipeline.py에서 호출하지 않는 157줄 스텁. 공시 수집기 구현 시 추가하는 것이 낫거나, 별도 `PROCESSED_ANNOUNCEMENT_PATH` 분리 권장.
  > 
  > ---
  > 
  > ### LOW (2)
  > 
  > **8. `_find_nearest_trading_date`의 bare except 에러 무시**
  > 📍 `build_fundamental_metrics.py:263,276`
  > `except Exception: pass/continue`로 에러가 묻힘. `logger.debug` 추가 권장.
  > 
  > **9. `build_announcement_features.py` 도달 불가 코드**
  > 이 MR에서 어디서도 import하지 않는 dead code. 향후 MR에서 추가 권장.
  > 
  > ---
  > 
  > ### Recommendation: **REQUEST CHANGES**
  > 
  > HIGH 2건(13k 파일 로드 성능, shift(4) 데이터 정합성)을 수정 후 머지하는 것을 권장합니다.

---

### !242 · [AI] Refactor: S14P21D208-152 뉴스 크롤링 데스크탑으로 이전

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `refactor/ai/news-pipeline-optimize` → `dev-ai`
- 생성: 2026-03-20 · 머지: 2026-03-20
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/242](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/242)

<details><summary>MR 설명</summary>

> ## :page_facing_up: MR 한 줄 요약
> 
> 네이버 금융 EC2 IP 차단으로 뉴스 크롤링을 데스크탑 워커로 이전
> 
> ## :technologist: MR 세부 내용
> 
> - 원인: 네이버 금융이 EC2(AWS) IP 대역에서 뉴스 데이터를 빈 결과로 반환 (시세/지수는 정상)
> - keyword_worker.py: 크롤링 → 키워드 추출 → 임베딩 → 클러스터링 → 에이전트 데이터 전체 파이프라인 통합
> - keyword_worker.py: --run-now, --skip-crawl, --start-date/--end-date, --start-at 옵션 추가
> - scheduler.py: EC2 뉴스 크롤링 제거, 거래일 기록만 수행
> - PipelineSignal 기반 EC2:left_right_arrow:데스크탑 통신 불필요 (같은 머신에서 순차 실행)
> 
> ## 사용법
> 
> ```bash
> # 데스크탑에서 즉시 크롤링+키워드 실행
> python3 keyword_worker.py --run-now
> 
> # 특정 날짜 범위
> python3 keyword_worker.py --run-now --start-date 2026-03-18 --end-date 2026-03-20
> 
> # 크롤링 없이 키워드만
> python3 keyword_worker.py --run-now --skip-crawl
> 
> # 매일 자동 실행 (16:00 시작)
> python3 keyword_worker.py
> ```
> 
> ## :paperclip: Issue 번호
> 
> S14P21D208-152

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-20)
  > 1. 크롤링 스레드 실패가 메인 파이프라인 실패로 전파되지 않는 점이 위험해 보입니다.
  > 
  > 지금 구현은 `_crawl_in_thread()`에서 예외가 나도 로그만 남기고 `done_event`를 set하고, `run_full_pipeline()`은 `crawl_done.is_set()`와 `unprocessed == 0`만 보고 정상 완료로 빠집니다. 즉, 크롤링이 중간에 터져도 "크롤링 완료 + 미처리 뉴스 없음"으로 오판해서 재시도 없이 성공 종료될 수 있습니다.
  > 
  > `done_event`만으로는 정상 완료/실패를 구분할 수 없어서,
  > 
  > - 크롤링 예외를 별도 shared state에 저장한 뒤 메인 루프에서 raise 하거나
  > - thread 대신 future/task 결과를 받아 실패를 전파하는 방식 으로 바꾸는 게 안전해 보입니다.
  > 
  > 2. `--start-date/--end-date` 백필 옵션이 실제 후처리 범위와 맞지 않는 것 같습니다.
  > 
  > 크롤링은 지정한 기간으로 돌리는데, 후속 감성 분석/키워드 추출은 여전히 `days=2` 기준으로만 대상을 찾고 있습니다. 그래서 과거 날짜 백필을 위해 `--run-now --start-date ... --end-date ...`로 실행하면, 크롤링은 됐더라도 2일보다 오래된 뉴스는 감성 분석/키워드 추출 단계에서 빠질 수 있습니다.
  > 
  > 지금 CLI 설명만 보면 특정 날짜 범위 전체 파이프라인처럼 읽히는데 실제 동작은 그렇지 않아서,
  > 
  > - `run_keyword_pipeline()`에도 날짜 범위를 전달하거나
  > - 백필 모드에서는 `days=None` 대신 명시적 날짜 필터 기반 조회를 쓰는 쪽 으로 맞추는 게 좋아 보입니다.

- 💬 **이혜민** (2026-03-20)
  > 두 가지 모두 반영했습니다.
  > 
  > 1. 크롤링 스레드 실패 전파
  > 
  > - error_holder(list)를 공유하여 스레드 예외를 메인에 전달
  > - 크롤링 실패 시에도 이미 적재된 데이터는 후처리 진행 후 최종 raise
  > - start_worker의 재시도 루프(최대 5회)에서 자동 복구
  > 
  > 2. \--start-date/--end-date 백필 범위
  > 
  > - docstring에 days=2 제한 주의사항 명시
  > - 일일 운영(어제\~오늘)에서는 항상 2일 이내라 문제없고, 대량 백필은 별도 backfill_loader.py 사용 권장
  > - 추후 필요 시 run_keyword_pipeline에 날짜 범위 파라미터 추가 가능
  > 
  > 추가로 전체 파이프라인 완료 시 pipeline_signals 테이블에 NEWS_PIPELINE_DONE 신호를 적재하도록 추가했습니다. 다른 스케줄러에서 뉴스 파이프라인 완료 여부를 조회할 수 있습니다.

---

### !243 · [AI] Feat: S14P21D208-124 의장 포트폴리오 회계 컬럼 계약 추가

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `feature/ai/S14P21D208-159-chairman-contract` → `dev-ai`
- 생성: 2026-03-20 · 머지: 2026-03-20
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/243](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/243)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 의장 포트폴리오 replay 고도화를 위한 회계 컬럼 계약을 AI 모델 레이어에 선반영했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - `3_ai_server/domains/debate/models.py` 에 아래 테이블의 신규 컬럼을 반영했습니다.
>   - `ai_portfolio`
>   - `ai_portfolio_holdings`
>   - `ai_trading_history`
>   - `ai_daily_performance`
> - 신규 컬럼은 이후 `reset + full replay` 시점에 기존 컬럼과 함께 채워질 예정입니다.
> - 기존 컬럼 의미는 유지하고, 새 회계/보유 상세 컬럼만 추가하는 방향으로 맞췄습니다.
> 
> 주의 사항
> - 이번 MR에서는 replay/backfill 로직은 변경하지 않았습니다.
> - 값 채우기는 다음 단계 작업입니다.
> - 현재 목적은 AI-BE 간 DB 계약 정렬입니다.
> 
> 검증
> - `python3 -m py_compile services/ai/3_ai_server/domains/debate/models.py` 통과
> 
> 기동 여부
> - 별도 서버 기동은 하지 않았습니다.
> 
> 문서 반영 여부
> - 운영 문서 수정은 이번 MR 범위에 포함하지 않았습니다.
> 
> ## 📎 Issue 번호
> - S14P21D208-124

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-20)
  > codex 새로운 세션에 시켜서 셀프 코드리뷰 하고 수정했습니다.

---

### !244 · [BE] Feat: S14P21D208-124 의장 포트폴리오 회계 계약 선반영

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `feature/be/S14P21D208-159-chairman-contract` → `dev-backend`
- 생성: 2026-03-20 · 머지: 2026-03-20
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/244](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/244)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 의장 포트폴리오 회계 컬럼을 선반영하고, report/portfolio API 응답 계약을 프론트 명세 기준으로 정렬했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - `V15__expand_chairman_portfolio_contract.sql` 추가
>   - `ai_portfolio`
>   - `ai_portfolio_holdings`
>   - `ai_trading_history`
>   - `ai_daily_performance`
>   에 회계/보유 상세 컬럼을 추가했습니다.
> - 의장 포트폴리오 관련 엔티티에 신규 컬럼을 반영했습니다.
> - `GET /api/report/{stockId}/performance`
>   - `holding` 객체를 추가했습니다.
>   - `chart`를 누적수익률 차트가 아니라 가격 차트 `{date, price, trade_type}` 형태로 변경했습니다.
> - `GET /api/portfolio/chairman`
>   - `summary.yesterday_return` 필드를 추가했습니다.
> - `GET /api/portfolio/chairman/hall-of-fame`
>   - 예측 적중률 TOP 5
>   - 누적 수익률 TOP 10
>   - 최대 단일 수익률 TOP 5
>   - 매매당 평균 수익률 TOP 5
>   신규 API를 추가했습니다.
> 
> 주의 사항
> - 이번 MR은 계약 선반영 단계입니다.
> - 신규 회계 컬럼 값은 아직 replay/backfill 전이라 `null`, `0`, 빈 리스트가 나오는 것이 정상입니다.
> - 기존 컬럼 의미는 유지했고, 신규 컬럼만 추가했습니다.
> 
> 빌드/검증
> - `./mvnw -q -DskipTests compile` 통과
> - `./mvnw -q -Dtest=ChairmanPortfolioServiceImplTest test` 통과
> 
> 기동 여부
> - 별도 서버 기동은 하지 않았습니다.
> 
> 문서 반영 여부
> - Swagger/응답 DTO 설명은 현재 계약에 맞게 반영했습니다.
> - FE 작업은 이번 MR 범위에서 제외했습니다.
> 
> ## 📎 Issue 번호
> - S14P21D208-124

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-20)
  > codex 새로운 세션에 시켜서 셀프 코드리뷰 하고 수정했습니다.

---

### !245 · [AI] Fix: S14P21D208-94 뉴스 파이프라인에 published_at NULL 배치 복구 추가

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `fix/ai/null-published-at-recovery` → `dev-ai`
- 생성: 2026-03-20 · 머지: 2026-03-20
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/245](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/245)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 뉴스 파이프라인에 published_at NULL 자동 복구 추가 및 코드 품질 리팩토링
> 
> ## 🧑‍💻 MR 세부 내용
> - keyword_worker 파이프라인에 6단계(fix_null_published_at) 자동 실행 추가
> - parse_date 4곳 중복 함수를 utils/date_parser.py로 통합 (상대시간 + 한국어 형식 전체 지원)
> - daily.py save_to_db N+1 쿼리를 종목캐시 + URL 배치조회로 개선
> - kospi200.py HEADERS 중복 제거 및 os.path를 pathlib으로 통일
> - db.py get_session에 contextmanager 데코레이터 적용
> - scheduler.py 미사용 함수 3개 및 subprocess import 제거
> 
> ## 📎 Issue 번호
> S14P21D208-94

</details>

**리뷰 토론**

- 💬 **정준용** (2026-03-20)
  > MR 245에서 확인한 이슈는 2건입니다.
  > 
  > P1 date_parser.py backfill_loader.py csv_loader.py: 공통 parse_date()가 상대시간(3시간 전)을 현재 시각 기준으로 해석하도록 바뀌었는데, 이 함수가 백필/CSV 로더에도 그대로 재사용됩니다. 저장된 CSV를 나중에 적재할 때는 상대시간을 “적재 시각 기준”으로 잘못 계산하게 되어 published_at이 틀린 값으로 저장되고, NULL 복구 배치도 더 이상 이 행을 고치지 못합니다.
  > P1 keyword_worker.py keyword_worker.py keyword_worker.py: 새 fix_null_dates() 단계는 run_keyword_pipeline() 안에서만 호출되는데, 그 진입 조건인 count_unprocessed_news(days=2)는 published_at >= cutoff인 뉴스만 셉니다. 즉, backlog가 published_at IS NULL 행뿐인 경우에는 카운트가 0이어서 루프가 바로 끝나고, 이번 MR의 핵심 복구 배치가 아예 실행되지 않습니다.
  > python -m compileall C:\SSAFY\S14P21D208\.codex-mr245\services\ai\1_data_pipeline\news 는 통과했고, get_session() 호출부도 모두 with get_session() 패턴이라 그쪽 회귀는 보이지 않았습니다. 위 2건은 정적 리뷰 기준의 기능 버그입니다.

---

### !257 · [AI] Fix: S14P21D208-190 스케줄러 파이프라인 실행 후 메모리 미해제 수정

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `fix/ai/S14P21D208-190-scheduler-memory-leak` → `dev-ai`
- 생성: 2026-03-22 · 머지: 2026-03-22
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/257](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/257)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 스케줄러의 파이프라인 실행을 subprocess 방식으로 전환하여 실행 후 메모리가 해제되지 않는 문제를 수정
> 
> ## MR 세부 내용
> 
> ### 1차: 메모리 누수 수정 (966dc848)
> - 파이프라인 실행을 import 방식에서 subprocess.run 방식으로 전환
> - 분기 재무 수집도 subprocess로 분리하여 메모리 격리
> - \_ensure\_financial\_volume 인라인으로 pipeline 모듈 임포트 제거
> - \_run\_subprocess 헬퍼 추가 (로그 파이핑 + exit code 처리)
> 
> ### 2차: 코드 리뷰 이슈 수정 (ea715388)
> - subprocess 타임아웃을 threading.Timer 워치독으로 전환 (dead code 해소)
> - 분기 재무 rclone 업로드 누락 복원 (\_run\_rclone\_financial\_upload)
> - rclone 업로드 실패 시 exit code 전파 (sys.exit(0 if ok else 1))
> - 재무 볼륨 확인 로직을 utils/financial\_check.py로 추출 (DRY)
> - pipeline.py의 \_ensure\_financial\_data를 공통 모듈로 위임
> 
> ## Issue 번호
> S14P21D208-190

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-22)
  > ## Code Review Report
  > 
  > **Files Reviewed:** 1 (scheduler.py)
  > **Total Issues:** 5
  > 
  > ---
  > 
  > ### HIGH (1)
  > 
  > **1. 분기 재무 rclone 업로드 제거 — 동작 회귀**
  > `scheduler.py:237-240`
  > 
  > 기존 `run_daily_update()`에 있던 `rclone_sync_up(BASE_PATH, RCLONE_REMOTE, subdir="raw/financial")` 호출이 제거되었습니다. 증분 파이프라인 subprocess는 먼저 실행되고, `run_quarterly_financial()`은 그 이후에 별도로 실행됩니다. `raw/financial`은 `RCLONE_SYNC_DIRS`에서 의도적으로 제외(config.py:88-89)되어 있으므로, 분기 재무 수집 후 Drive 업로드가 누락됩니다.
  > 
  > **Fix:** `run_quarterly_financial()` 완료 후 rclone 업로드를 subprocess로 추가 실행 필요.
  > 
  > ---
  > 
  > ### MEDIUM (3)
  > 
  > **2. capture_output=True는 stdout/stderr를 완료까지 버퍼링**
  > `scheduler.py:174-178`
  > 
  > 파이프라인이 1~2시간 실행되는 동안 로그 출력이 전혀 보이지 않습니다. docstring의 "실시간으로 전달" 설명과 불일치합니다.
  > 
  > **Fix:** `subprocess.Popen` + line-by-line 읽기로 전환하거나, docstring 수정 필요.
  > 
  > **3. subprocess timeout 미설정 — 파이프라인 행 시 스케줄러 무한 대기**
  > `scheduler.py:174-178`
  > 
  > `subprocess.run()`에 `timeout` 파라미터가 없어, 파이프라인이 hang되면 스케줄러의 모든 후속 작업이 영구 차단됩니다.
  > 
  > **Fix:** `timeout=14400` (4시간) + `subprocess.TimeoutExpired` 예외 처리 추가.
  > 
  > **4. _ensure_financial_volume 로직 중복 (DRY 위반)**
  > `scheduler.py:282-317`
  > 
  > `pipeline._ensure_financial_data()`와 동일한 ~35줄 함수가 복제되어 향후 divergence 위험이 있습니다.
  > 
  > **Fix:** `utils/` 하위 공통 모듈로 추출하여 양쪽에서 임포트.
  > 
  > ---
  > 
  > ### LOW (1)
  > 
  > **5. --tickers로 200개 종목 코드 전달 시 로그 노이즈**
  > `scheduler.py:265-270`
  > 
  > KOSPI 200 종목 전체를 CLI 인자로 전달하면 로그에 1400+ 문자가 출력됩니다.
  > 
  > **Fix:** 로그 출력 시 종목 수만 표시하도록 개선.
  > 
  > ---
  > 
  > ### Recommendation: **REQUEST CHANGES**
  > 
  > HIGH 이슈(분기 재무 rclone 업로드 누락)는 기능 회귀이므로 머지 전 수정이 필요합니다.

---

### !258 · [AI] Feat: S14P21D208-191 파이프라인 완료 시그널 파일 생성

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/ai/pipeline-completion-signal` → `dev-ai`
- 생성: 2026-03-22 · 머지: 2026-03-22
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/258](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/258)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 파이프라인 완료 시 시그널 JSON 파일을 생성하여 ML 파이프라인이 폴링 방식으로 추론 트리거 가능
> 
> ## MR 세부 내용
> - `_write_pipeline_signal()` 함수 추가: 파이프라인 완료 시 `pipeline_signal.json` 생성
> - `run_daily_update()`에서 파이프라인 성공 여부 캡처 후 시그널 전송
> - rclone 설정 시 Drive에 자동 업로드 (subprocess로 메모리 격리)
> - CLAUDE.md에 `pipeline_signal.json` 저장 포맷 문서화
> 
> ### 시그널 파일 형식
> 
> 
> ### 연동 흐름
> 
> 
> ## Issue 번호
> S14P21D208-191

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-22)
  > ## Code Review Report
  > 
  > **Files Reviewed:** 2 (scheduler.py, CLAUDE.md)
  > **Total Issues:** 4
  > 
  > ---
  > 
  > ### CRITICAL (0) / HIGH (0)
  > 없음
  > 
  > ### MEDIUM (2)
  > 
  > **1. 파이프라인 실패 시에도 시그널 파일 생성 — ML 소비자 계약 명시 필요**
  > `scheduler.py:270`
  > 
  > 시그널이 성공/실패 모두 기록됩니다. ML 파이프라인 소비자가 `status=="success"`를 반드시 확인해야 하므로 이 계약을 주석으로 명시하면 좋겠습니다.
  > 
  > **2. 시그널 JSON에 schema version 없음**
  > `scheduler.py:364-370`
  > 
  > 스키마가 변경될 경우 소비자가 감지할 수 없습니다. `"version": 1` 필드 추가를 권장합니다.
  > 
  > ### LOW (2)
  > 
  > **3. `import json`을 함수 내부에서 수행**
  > `scheduler.py:362` — stdlib 모듈이므로 top-level로 이동 가능 (기존 패턴과 불일치하나 해롭지 않음)
  > 
  > **4. timestamp에 timezone 정보 없음**
  > `datetime.datetime.now().isoformat()` — 단일 서버 배포에서는 문제없으나 다중 리전 시 주의 필요
  > 
  > ---
  > 
  > ### 보안 점검: PASS
  > - 모든 JSON 값이 제어된 입력에서 파생 (injection 위험 없음)
  > - 하드코딩된 시크릿 없음
  > - 파일 쓰기 경로 config에서 관리
  > 
  > ### 오류 처리 점검: PASS
  > - try/except로 감싸여 있으며 실패 시 로그 후 계속 진행
  > 
  > ### Recommendation: **APPROVE**
  > 
  > MEDIUM 이슈는 권장 사항이며 머지 차단 사유 아님.

---

### !259 · [AI] Feat: S14P21D208-191 ML 추론 시 파이프라인 시그널 확인

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/ai/ml-pipeline-signal-consumer` → `dev-ai`
- 생성: 2026-03-22 · 머지: 2026-03-23
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/259](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/259)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> ML 추론 스크립트가 데이터 파이프라인 완료 시그널을 확인한 후 추론을 실행하도록 개선
> 
> ## MR 세부 내용
> - check_pipeline_signal() 함수 추가: pipeline_signal.json 읽어 날짜 + status 확인
> - main() 시작 시 시그널 확인 후 추론 여부 결정
> - 시그널 파일 없으면 수동 실행으로 간주하여 통과 (하위 호환)
> - 파이프라인 실패(status!=success) 또는 날짜 불일치 시 추론 건너뜀
> 
> ### 연동 흐름
> 
> 
> ## Issue 번호
> S14P21D208-191

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-22)
  > ## Code Review Report
  > 
  > **Files Reviewed:** 1 (daily_inference.py)
  > **Total Issues:** 5
  > 
  > ---
  > 
  > ### HIGH (1)
  > 
  > **1. 날짜 비교가 datetime.now() 기준 — 주말/공휴일에 항상 실패**
  > `daily_inference.py:572-574`
  > 
  > `datetime.now().strftime("%Y-%m-%d")`와 시그널의 `date`를 비교합니다. 비거래일에는 파이프라인이 실행되지 않으므로 시그널 날짜는 마지막 거래일이고, today는 현재 날짜입니다. **주말/공휴일에 추론이 항상 차단됩니다.**
  > 
  > **Fix:** `get_latest_trade_date()` 결과와 비교하면 거래일 기준으로 정확하게 매칭됩니다:
  > ```python
  > latest_trade_date = get_latest_trade_date()
  > if signal_date != latest_trade_date:
  >     ...
  > ```
  > 
  > ### MEDIUM (2)
  > 
  > **2. JSONDecodeError 시 True 반환 — 불완전 파일에서 추론 실행 가능**
  > `daily_inference.py:584-586`
  > 
  > 파일 쓰기 중 읽기(race condition) 시 `json.JSONDecodeError`가 발생하면 `True`를 반환하여 추론이 진행됩니다. 불완전한 데이터로 추론할 위험이 있습니다.
  > 
  > **Fix:** `JSONDecodeError`는 `False` 반환, `KeyError`만 `True` 반환으로 분리:
  > ```python
  > except json.JSONDecodeError:
  >     return False  # 파일 쓰기 중 가능성
  > except KeyError:
  >     return True   # 수동 실행으로 간주
  > ```
  > 
  > **3. 파싱 실패 시 방어적 처리 필요**
  > `daily_inference.py:584-586`
  > 
  > 손상된 시그널 파일이 파이프라인 실패를 은폐할 수 있습니다. 파일 부재와 파싱 오류를 구분해야 합니다.
  > 
  > ### LOW (2)
  > 
  > **4. version 필드 미확인** — 스키마 변경 시 무시될 수 있음 (선택적 guard 추가 권장)
  > 
  > **5. target_5d fillna 변경이 MR 제목에 미포함** — 별도 관심사이므로 커밋 분리 또는 MR 설명에 언급 권장
  > 
  > ---
  > 
  > ### Recommendation: **REQUEST CHANGES**
  > 
  > HIGH 이슈(거래일 기준 비교)는 주말/공휴일에 추론이 차단되는 기능적 문제이므로 수정 필요.

---

### !261 · [BE] Fix: S14P21D208-94 뉴스 목록 조회 publishedAt null 반환 수정

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `fix/be/news-published-at-null` → `dev-backend`
- 생성: 2026-03-22 · 머지: 2026-03-23
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/261](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/261)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 뉴스 목록 조회 시 publishedAt이 null로 반환되는 버그를 native query → JPQL 전환으로 수정
> 
> ## 🧑‍💻 MR 세부 내용
> - native query(Object[] 반환)에서 TIMESTAMPTZ 컬럼이 JDBC 드라이버에 의해 예상과 다른 타입으로 반환되어 toOffsetDateTime()에서 null 처리되던 문제
> - 뉴스 상세 조회는 JPA 엔티티를 직접 사용하여 정상 동작했으나, 목록 조회만 native query를 사용해 발생
> - StockNewsRepository: native query → JPQL 전환, Object[] → StockNews 엔티티 반환, Pageable 적용
> - NewsServiceImpl: Object[] 수동 캐스팅 제거, 엔티티 getter 직접 사용, toOffsetDateTime 메서드 삭제
> - 테스트 코드: 변경된 시그니처에 맞게 mock 수정, publishedAt 검증 추가
> 
> ## 📎 Issue 번호
> S14P21D208-94

</details>

**리뷰 토론**

- 💬 **강지석** (2026-03-22)
  > # MR 코드 리뷰: [BE] Fix: S14P21D208-94 뉴스 목록 조회 publishedAt null 반환 수정
  > 
  > - **브랜치**: `fix/be/news-published-at-null`
  > - **베이스**: `dev-backend`
  > - **커밋**: `3bc67bc`
  > 
  > ---
  > 
  > ## 변경 요약
  > 
  > Native query(`Object[]` 반환) → JPQL(`StockNews` 엔티티 반환)로 전환하여 `publishedAt`이 null로 반환되던 문제 해결.
  > 페이지네이션도 `LIMIT/OFFSET` 하드코딩에서 Spring Data `Pageable`로 변경.
  > 
  > ### 변경 파일
  > 
  > | 파일 | 변경 내용 |
  > |------|-----------|
  > | `StockNewsRepository.java` | native query → JPQL, 반환 타입 `Object[]` → `StockNews`, 페이지네이션 `Pageable` 적용 |
  > | `NewsServiceImpl.java` | `Object[]` 수동 매핑 제거 → 엔티티 getter 사용, `toOffsetDateTime()` 헬퍼 삭제 |
  > | `NewsServiceImplTest.java` | `Object[]` mock → `StockNews` 엔티티 mock, `publishedAt` 검증 assertion 추가 |
  > 
  > ---
  > 
  > ## 좋은 점
  > 
  > 1. **근본 원인 해결**: native query의 `Object[]`에서 `OffsetDateTime` 타입 변환 실패가 원인이었고, JPQL + 엔티티 반환으로 JPA가 타입 매핑을 처리하게 만든 것은 올바른 접근
  > 2. **불필요 코드 제거**: `toOffsetDateTime()` 헬퍼 메서드와 관련 import(`OffsetDateTime`, `ZoneOffset`)가 깔끔하게 제거됨
  > 3. **Spring Data 활용**: `Pageable`로 전환하여 페이지네이션을 프레임워크에 위임 → 유지보수성 향상
  > 4. **테스트 개선**: `Object[]` 대신 `StockNews` 엔티티를 직접 생성하여 테스트가 실제 동작과 더 일치하고, `publishedAt` 검증 assertion도 추가됨
  > 
  > ---
  > 
  > ## 이슈
  > 
  > ### Important
  > 
  > #### 1. `offset / limit` 페이지 계산 정확성 문제
  > 
  > ```java
  > Pageable pageable = PageRequest.of(offset / limit, limit);
  > ```
  > 
  > - 정수 나누기이므로 `offset`이 `limit`의 배수가 아닌 경우 잘못된 페이지 번호가 됨
  > - 예: `offset=15, limit=20` → `page=0` (기대: 15번째부터)
  > - 호출부에서 항상 `offset`을 `limit`의 배수로 보내고 있는지 확인 필요
  > - 만약 프론트엔드에서 page 기반으로 호출한다면, 아예 API 파라미터를 `page`로 바꾸는 게 더 안전
  > 
  > #### 2. JPQL JOIN 엔티티 매핑 확인 필요
  > 
  > ```java
  > LEFT JOIN NewsKeywordMap nkm ON sn.id = nkm.id.newsId
  > LEFT JOIN Keyword k ON nkm.id.keywordId = k.id
  > ```
  > 
  > - `NewsKeywordMap`과 `StockNews` 사이에 `@ManyToOne` 관계 매핑이 없고, `EmbeddedId`의 필드로 직접 join하고 있음
  > - JPQL에서 이 문법은 Hibernate 5.1+ `ON` 절 조건으로 동작하지만, `nkm.id.newsId`가 엔티티 연관이 아닌 순수 값 필드인지 `NewsKeywordMapId` 확인 필요
  > - 실제 통합 테스트로 쿼리가 정상 실행되는지 확인 권장
  > 
  > ### Minor
  > 
  > #### 3. `DISTINCT` 사용 시 성능 고려
  > 
  > - `SELECT DISTINCT sn FROM StockNews sn LEFT JOIN ...` — keyword 없이 조회할 때도 JOIN + DISTINCT가 걸림
  > - 뉴스 데이터가 많아지면 성능에 영향 가능
  > - keyword가 null이면 JOIN 자체를 타지 않는 별도 쿼리를 고려할 수 있음 (현재 규모에서는 괜찮을 수 있으나 참고)
  > 
  > #### 4. 테스트에서 리플렉션 사용
  > 
  > - `createStockNews()`에서 `setAccessible(true)` + 리플렉션으로 필드 세팅
  > - 엔티티에 테스트용 생성자나 빌더를 추가하는 게 유지보수에 더 나을 수 있지만, 엔티티의 불변성을 지키려는 의도라면 현행 유지해도 무방
  > 
  > #### 5. `findStockNamesByNewsIds`는 여전히 native query
  > 
  > - 이 MR의 범위 밖이긴 하나, 일관성을 위해 추후 JPQL로 전환 검토 가능
  > 
  > ---
  > 
  > ## 판정: Approve with minor comments
  > 
  > 핵심 버그 수정은 올바르게 되었고 코드 품질도 향상됨.
  > **Important #1(offset/limit 계산)** 만 호출부와 함께 한번 확인해주면 merge 가능.

- 💬 **이혜민** (2026-03-22)
  > ## 코드리뷰 대응
  > 
  > ### 수정 반영
  > 
  > **#3 DISTINCT 성능** — 쿼리를 2개로 분리했습니다.
  > - `findAllNews()`: keyword null → JOIN/DISTINCT 없이 단순 조회
  > - `findNewsByKeyword()`: keyword 있을 때만 JOIN + DISTINCT (LEFT JOIN → INNER JOIN으로 변경)
  > - Service에서 keyword 유무로 분기 호출
  > 
  > **#5 나머지 native query** — `findStockNamesByNewsIds`, `findRelatedStocksByNewsId` 모두 JPQL로 전환하여 Repository 전체 쿼리 일관성 확보했습니다.
  > 
  > ### 수정하지 않은 항목
  > 
  > | 이슈 | 사유 |
  > |------|------|
  > | #1 offset/limit 계산 | 프론트에서 offset을 항상 limit 배수로 보내고 있어 현재 동작 문제 없음. page 기반 전환은 프론트 변경 수반되므로 별도 이슈로 검토 |
  > | #2 JPQL JOIN 매핑 | `NewsKeywordMapId`가 순수 Long 필드라 `nkm.id.newsId` ON 조건 JOIN 정상 동작 확인 |
  > | #4 테스트 리플렉션 | 엔티티 불변성(protected 생성자) 유지 의도. 테스트용 빌더 추가는 프로덕션 코드 변경이라 현행 유지 |

- 💬 **강지석** (2026-03-22)
  > # [BE] Code Review: S14P21D208-94 뉴스 목록 조회 publishedAt null 반환 수정
  > 
  > ## 관련 파일
  > 
  > | 파일 | 역할 |
  > |------|------|
  > | `NewsServiceImpl.java` | 뉴스 목록/상세 비즈니스 로직 |
  > | `StockNewsRepository.java` | 뉴스 native query |
  > | `NewsListItemResponse.java` | 뉴스 목록 응답 DTO |
  > | `StockNews.java` | 뉴스 엔티티 |
  > | `V1__baseline.sql` | DB 스키마 (stock_news 테이블) |
  > 
  > ---
  > 
  > ## P0 - 즉시 수정 필요
  > 
  > ### 1. `toOffsetDateTime`에 `LocalDateTime` 케이스 누락
  > 
  > **파일**: `NewsServiceImpl.java:128-132`
  > 
  > ```java
  > // 현재 코드
  > private OffsetDateTime toOffsetDateTime(Object obj) {
  >     if (obj instanceof OffsetDateTime odt) return odt;
  >     if (obj instanceof java.sql.Timestamp ts) return ts.toInstant().atOffset(ZoneOffset.UTC);
  >     return null;  // LocalDateTime이면 여기로 빠짐
  > }
  > ```
  > 
  > PostgreSQL JDBC 드라이버 + Hibernate 6 조합에서 native query의 `TIMESTAMPTZ` 컬럼이 `LocalDateTime`으로 반환될 수 있다.
  > 이 경우 두 `instanceof` 모두 매칭되지 않고 `return null`로 빠진다.
  > 
  > **수정 제안**:
  > 
  > ```java
  > private OffsetDateTime toOffsetDateTime(Object obj) {
  >     if (obj instanceof OffsetDateTime odt) return odt;
  >     if (obj instanceof LocalDateTime ldt) return ldt.atOffset(ZoneOffset.UTC);
  >     if (obj instanceof java.sql.Timestamp ts) return ts.toInstant().atOffset(ZoneOffset.UTC);
  >     return null;
  > }
  > ```
  > 
  > ---
  > 
  > ### 2. DB에서 `published_at IS NULL` 데이터 존재 여부 확인 필요
  > 
  > **파일**: `V1__baseline.sql:250`
  > 
  > ```sql
  > published_at TIMESTAMPTZ,  -- NOT NULL 제약 없음
  > ```
  > 
  > DB 스키마에서 `published_at`이 nullable이다.
  > AI 파이프라인이 `published_at`을 채우지 않는 뉴스가 존재할 수 있다.
  > 
  > **확인 쿼리**:
  > 
  > ```sql
  > SELECT COUNT(*) FROM stock_news WHERE published_at IS NULL;
  > ```
  > 
  > - 코드 문제인지 데이터 문제인지 먼저 확인할 것
  > - 데이터 문제라면 `NOT NULL DEFAULT now()` 제약 추가 검토
  > 
  > ---
  > 
  > ## P1 - 빠른 시일 내 수정 권장
  > 
  > ### 3. `toOffsetDateTime` 중복 구현 — 3곳에서 각각 다른 timezone 정책
  > 
  > | 위치 | timezone 처리 |
  > |------|--------------|
  > | `NewsServiceImpl` | `ZoneOffset.UTC` |
  > | `WatchlistServiceImpl` | `ZoneOffset.UTC` |
  > | `SearchQueryRepository` | `ZONE_ID` (KST 추정) |
  > 
  > 같은 역할의 메서드가 3곳에 중복되어 있고, timezone 처리가 불일치한다.
  > 한국 주식 뉴스이므로 `Asia/Seoul` 기준이 맞을 가능성이 높은데, `NewsServiceImpl`과 `WatchlistServiceImpl`은 UTC를 사용 중이다.
  > 
  > **수정 제안**:
  > 
  > ```java
  > // 공통 유틸 클래스로 추출
  > public final class NativeQueryUtils {
  > 
  >     private static final ZoneId ZONE_KST = ZoneId.of("Asia/Seoul");
  > 
  >     public static OffsetDateTime toOffsetDateTime(Object obj) {
  >         if (obj == null) return null;
  >         if (obj instanceof OffsetDateTime odt) return odt;
  >         if (obj instanceof LocalDateTime ldt) return ldt.atZone(ZONE_KST).toOffsetDateTime();
  >         if (obj instanceof Timestamp ts) return ts.toInstant().atZone(ZONE_KST).toOffsetDateTime();
  >         return null;
  >     }
  > 
  >     public static Long toLong(Object obj) {
  >         if (obj instanceof Number n) return n.longValue();
  >         return null;
  >     }
  > }
  > ```
  > 
  > ---
  > 
  > ## P2 - 개선 권장
  > 
  > ### 4. keyword null일 때 불필요한 JOIN + DISTINCT 발생
  > 
  > **파일**: `StockNewsRepository.java:12-24`
  > 
  > ```sql
  > SELECT DISTINCT sn.id, sn.title, sn.publisher, sn.published_at
  > FROM stock_news sn
  > LEFT JOIN news_keyword_map nkm ON sn.id = nkm.news_id
  > LEFT JOIN keywords k ON nkm.keyword_id = k.id
  > WHERE (:keyword IS NULL OR k.name = :keyword)
  > ORDER BY sn.published_at DESC
  > LIMIT :limit OFFSET :offset
  > ```
  > 
  > - `keyword`가 null이면 LEFT JOIN만 하고 필터 없음 → 하나의 뉴스에 키워드가 여러 개면 중복 행 발생 → `DISTINCT` 필요
  > - `keyword`가 있으면 특정 키워드 하나로 필터 → 뉴스당 최대 1행 → `DISTINCT` 불필요
  > 
  > **수정 제안**: keyword 유무에 따라 쿼리를 분리하면 keyword null일 때 JOIN 비용을 아낄 수 있다.
  > 
  > ```java
  > // keyword가 null이면 JOIN 없이 단순 조회
  > @Query(value = """
  >     SELECT sn.id, sn.title, sn.publisher, sn.published_at
  >     FROM stock_news sn
  >     ORDER BY sn.published_at DESC
  >     LIMIT :limit OFFSET :offset
  >     """, nativeQuery = true)
  > List<Object[]> findAllNews(@Param("limit") int limit, @Param("offset") int offset);
  > 
  > // keyword가 있으면 JOIN + 필터
  > @Query(value = """
  >     SELECT sn.id, sn.title, sn.publisher, sn.published_at
  >     FROM stock_news sn
  >     JOIN news_keyword_map nkm ON sn.id = nkm.news_id
  >     JOIN keywords k ON nkm.keyword_id = k.id
  >     WHERE k.name = :keyword
  >     ORDER BY sn.published_at DESC
  >     LIMIT :limit OFFSET :offset
  >     """, nativeQuery = true)
  > List<Object[]> findNewsByKeyword(
  >     @Param("keyword") String keyword,
  >     @Param("limit") int limit,
  >     @Param("offset") int offset);
  > ```
  > 
  > ---
  > 
  > ## P3 - 장기 개선
  > 
  > ### 5. `Object[]` 인덱스 기반 매핑은 취약
  > 
  > **파일**: `NewsServiceImpl.java:47-54`
  > 
  > ```java
  > .map(r -> new NewsListItemResponse(
  >     toLong(r[0]),           // id
  >     (String) r[1],          // title
  >     (String) r[2],          // publisher
  >     toOffsetDateTime(r[3]), // published_at
  >     ...))
  > ```
  > 
  > native query의 SELECT 컬럼 순서가 바뀌면 바로 런타임 에러가 발생한다.
  > JPA Projection interface 또는 `@SqlResultSetMapping` 사용을 권장한다.
  > 
  > ### 6. 페이지네이션에 total count 또는 hasNext 없음
  > 
  > `NewsListResponse`에 `totalCount`가 없어서 프론트에서 "다음 페이지 존재 여부"를 판단할 수 없다.
  > `limit + 1`개를 조회해서 `hasNext`를 판단하는 방식도 가능하다.
  > 
  > ---
  > 
  > ## 요약
  > 
  > | 우선순위 | 항목 | 설명 |
  > |---------|------|------|
  > | **P0** | `toOffsetDateTime`에 `LocalDateTime` 케이스 추가 | null 반환의 직접 원인일 가능성 높음 |
  > | **P0** | DB에서 `published_at IS NULL` 데이터 확인 | 데이터 문제인지 코드 문제인지 확인 |
  > | **P1** | `toOffsetDateTime` 중복 제거 + timezone 통일 | 3곳에서 다른 구현, 유지보수 위험 |
  > | **P2** | keyword null일 때 JOIN 제거 분기 | 불필요한 DISTINCT + JOIN 비용 |
  > | **P3** | `Object[]` → Projection 전환 | 장기적 안정성 |
  > | **P3** | 페이지네이션 hasNext 추가 | 프론트 UX 개선 |

- 💬 **최규직** (2026-03-23)
  > **Findings**
  > 
  > 1. offset 기반 페이지네이션이 깨집니다. NewsServiceImpl.java (line 42) 에서 PageRequest.of(offset / limit, limit)로 바꾸면서, offset=15, limit=20 같은 요청이 기존의 “15번째부터 20개”가 아니라 다시 0페이지를 조회하게 됐습니다. 이전 구현은 native LIMIT/OFFSET이라 임의 offset을 정확히 처리했는데, 이번 MR은 offset이 limit의 배수가 아닐 때 사용자에게 중복/누락 페이지를 내려줍니다.
  > 2. URL이 없는 뉴스가 목록에서 전부 사라집니다. StockNewsRepository.java (line 11) 와 StockNewsRepository.java (line 20) 에서 sn.id IN (SELECT MIN(sn2.id) ... WHERE sn2.url IS NOT NULL GROUP BY sn2.url) 조건을 걸었는데, 이 조건 때문에 url IS NULL인 뉴스는 바깥 쿼리에서 절대 매치될 수 없습니다. 기존 구현은 URL null 뉴스도 published_at만 있으면 목록에 나왔기 때문에, 이번 변경으로 일부 뉴스가 조용히 누락될 수 있습니다.
  > 
  > 요약하면, 이번 MR은 방향은 좋지만 offset 처리와 url null 누락 두 건은 실제 사용자 화면에 바로 영향이 갈 수 있어서 수정 후 머지하는 게 안전합니다.

- 💬 **이혜민** (2026-03-23)
  > ## 코드리뷰 대응
  > 
  > ### offset 기반 페이지네이션
  > 
  > 프론트엔드에서 offset을 항상 limit의 배수로 전달하는 것을 확인했습니다. 따라서 `PageRequest.of(offset / limit, limit)` 계산이 정확하게 동작합니다. (예: offset=0, 6, 12, ... / limit=6)
  > 
  > ### URL null 뉴스 누락
  > 
  > 의도된 동작입니다. url이 null인 뉴스는 크롤링 파이프라인에서 정상적으로 수집되지 않은 데이터이므로 목록에서 제외하는 것이 맞습니다. `published_at IS NOT NULL` 필터와 동일한 맥락의 데이터 품질 필터링입니다.

---

### !271 · [INFRA] Fix: S14P21D208-32 dev-ai nginx mount drift 감지 추가

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `fix/infra/s14p21d208-32-nginx-runtime-config` → `infra-common`
- 생성: 2026-03-22 · 머지: 2026-03-22
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/271](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/271)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 이전 실패 배포로 `dev-ai`의 source는 최신인데 nginx 컨테이너는 예전 mount source를 계속 물고 있는 경우를 감지해, 다음 배포에서 nginx를 강제로 재적용하도록 보완했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> 배경:
> - 기존 stale upstream 대응 패치(runtime conf 경로 분리, nginx reload 공통화)는 이미 머지된 상태입니다.
> - 그런데 실제 EC2 확인 결과, 이전 실패 배포에서 `/srv/sallaemallae/source/dev-ai`는 최신으로 바뀌었지만 `sallae-dev-ai-nginx-1`는 여전히 예전 source 경로를 `/etc/nginx/conf.d/default.conf`에 bind mount 하고 있는 상태가 남아 있었습니다.
> - 이 경우 다음 `dev-ai` 배포에서도 source diff만 보면 nginx를 다시 포함시키지 않을 수 있어, 502가 계속 유지될 수 있는 구멍이 있었습니다.
> 
> 이번 변경:
> - `common.sh`에 현재 컨테이너가 특정 destination에 어떤 host mount source를 물고 있는지 확인하는 `container_mount_source()` 함수를 추가했습니다.
> - `deploy-dev-ai.sh`에서:
>   - 현재 `sallae-dev-ai-nginx-1`가 `/etc/nginx/conf.d/default.conf`에 어떤 source를 물고 있는지 확인
>   - 그 source가 현재 기대하는 runtime nginx conf 경로와 다르면 `nginx_mount_changed=true`로 판단
>   - 이 경우 source diff와 별개로 `services_to_up`에 `nginx`를 포함해 강제로 재적용하도록 보완했습니다.
> 
> 기대 효과:
> - 이전 실패 배포로 source만 최신화되고 nginx는 옛 mount를 유지한 상태를 자동으로 감지할 수 있습니다.
> - 다음 `dev-ai` 배포 시 nginx가 빠지지 않고 재적용되어 stale upstream / stale conf 상태를 복구할 수 있습니다.
> - scheduler 선택 배포 구조는 유지하되, nginx만 필요한 경우 다시 반영하게 됩니다.
> 
> 검증:
> - `bash -n`으로 `common.sh`, `deploy-dev-ai.sh` 문법 검사 완료
> 
> ## 📎 Issue 번호
> - S14P21D208-32

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-22)
  > 기존 패치가 source/stale conf 문제는 막았지만, “이전 실패 배포로 이미 남아 있는 stale nginx mount”는 다음 배포에서 놓칠 수 있어 그 케이스를 직접 감지하도록 보완했습니다.

---

### !272 · [BE] Fix: S14P21D208-109 메인 시그널 조회 기준 report_date로 변경

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `fix/be/main-signals-report-date` → `dev-backend`
- 생성: 2026-03-22 · 머지: 2026-03-23
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/272](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/272)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 메인 페이지 top-stocks, new-signals 조회 기준을 created_at에서 report_date로 변경하여 주말/타이밍 이슈로 빈 결과 반환되는 문제 수정
> 
> ## 🧑‍💻 MR 세부 내용
> - top-stocks: `created_at >= cutoff` 조건 제거, `report_date = tradingDate` 기준으로 변경
> - new-signals: `ai_trading_history` 경유 대신 `ai_debate_reports`에서 직접 `chairman_signal` BUY/SELL 조회
> - 거래일 판별은 기존 `getCurrentTradingDate()`(15:30 기준 전일/당일) 그대로 유지
> - 미사용 `getMarketCloseCutoff()` 메서드 및 `LocalDateTime` import 제거
> 
> ## 📎 Issue 번호
> S14P21D208-109

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-23)
  > **Findings**
  > 
  > 1. getSignalsByType()가 같은 종목을 중복으로 뽑을 수 있습니다. MainStockQueryRepository.java (line 121) 이하에서 ai_debate_reports를 report_date = :tradingDate AND chairman_signal = :signalType로 바로 조회한 뒤 ORDER BY debate_confidence DESC LIMIT 3를 하고 있는데, 같은 종목에 대해 여러 debate_version이나 재생성 row가 있으면 최신 1건으로 정규화되지 않은 채 그대로 상위 3개에 들어갑니다. 그 결과 메인의 신규 매수/매도 카드에 같은 종목이 두 번 이상 노출될 수 있습니다. 이전처럼 거래 이력 기반이 아니더라도, 최소한 stock_id별 latest 1건을 먼저 뽑는 서브쿼리나 DISTINCT ON (stock_id)가 필요합니다.
  > 2. 주말/휴장일에는 메인 시그널이 빈 결과가 될 가능성이 큽니다. MainStockQueryRepository.java (line 24) 의 주석은 \<= 조회로 직전 영업일을 자동 선택한다고 설명하지만, 실제로 getTopTenStocksToday()와 getSignalsByType()는 MainStockQueryRepository.java (line 46), MainStockQueryRepository.java (line 133) 에서 ai_debate_reports.report_date = :tradingDate를 사용합니다. 예를 들어 월요일 장 시작 전이면 tradingDate가 일요일이 되는데, 그 날짜의 debate report는 없으므로 메인 BUY/SELL/Top10 섹션이 통째로 비어버릴 수 있습니다. 가격 테이블만 \<= fallback이 있고 시그널 쪽에는 fallback이 없어서, 의도와 구현이 어긋나 있습니다.

- 💬 **이혜민** (2026-03-23)
  > ## 코드리뷰 대응
  > 
  > ### 중복 종목 문제
  > `getSignalsByType`에서 `DISTINCT ON (stock_id)` 서브쿼리를 추가하여 종목별 최신 1건만 선택하도록 수정했습니다. 같은 종목에 여러 debate_version이 있어도 중복 노출되지 않습니다.
  > 
  > ### 주말/휴장일 빈 결과
  > `report_date = :tradingDate`를 CTE 방식으로 변경했습니다. `MAX(report_date) WHERE report_date <= :tradingDate`로 직전 영업일을 먼저 구한 뒤, 해당 날짜로 필터링합니다. 주말(일요일 tradingDate)이어도 금요일 데이터만 깔끔하게 조회됩니다. `getTopTenStocksToday`, `getSignalsByType` 두 메서드 모두 동일하게 적용했습니다.

- 💬 **최규직** (2026-03-23)
  > **Findings**
  > 
  > 1. latest_date를 전역으로 한 번만 계산해서 쓰는 방식 때문에, 당일 debate 적재가 부분적으로만 끝난 시점에는 메인 시그널이 비정상적으로 줄어들 수 있습니다. MAX(report_date)가 오늘로 넘어가는 순간, 아직 오늘 row가 없는 종목들은 전부 탈락하고 어제 데이터로 fallback도 못 합니다. MainStockQueryRepository.java 의 MR 변경분 기준 latest_date CTE와 report_date = (SELECT rd FROM latest_date) 조건이 있는 구간(Top10: diff 기준 42-56행, BUY/SELL: 137-149행)이 그렇습니다. 메인 화면은 적재 중간에도 최대한 안정적으로 보여야 하니, 전역 latest date보다 \*\*종목별 latest report_date \<= :tradingDate\*\*를 고르는 쪽이 안전합니다.
  > 2. Top10 쿼리는 debate_confidence가 null인 row를 앞쪽으로 올릴 수 있습니다. 같은 파일의 Top10 쿼리에서 ORDER BY r.debate_confidence DESC만 쓰고 있어서(PostgreSQL은 DESC에서 null이 앞에 옵니다), confidence가 비어 있는 리포트가 있으면 실제 높은 confidence 종목보다 먼저 노출될 수 있습니다. 같은 파일의 BUY/SELL 쿼리는 이미 NULLS LAST를 쓰고 있으니, Top10 쪽도 동일하게 맞추는 게 필요합니다.

- 💬 **이혜민** (2026-03-23)
  > ## 코드리뷰 대응
  > 
  > ### Top10 NULLS LAST
  > 
  > `ORDER BY r.debate_confidence DESC NULLS LAST`로 수정하여 BUY/SELL 쿼리와 일관성 맞췄습니다.
  > 
  > ### 적재 중간 latest_date 전역 계산 문제
  > 
  > 인지하고 있습니다. 현재는 전역 `MAX(report_date)`로 구현했지만, 향후 AI 파이프라인의 `pipeline_signals`를 감지하여 해당 거래일의 debate 적재가 완전히 완료된 후에 날짜가 전환되도록 개선할 예정입니다.

---

### !274 · [AI] Add: S14P21D208-193 DART 정기공시 메타데이터 수집기

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/ai/collect-announcements` → `dev-ai`
- 생성: 2026-03-23 · 머지: 2026-03-23
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/274](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/274)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> DART API로 정기공시 메타데이터를 수집하여 stock_announcements DB 테이블에 적재하는 수집기 추가
> 
> ## MR 세부 내용
> - `collectors/collect_announcements.py` 신규 생성
> - DART `/list.json` API로 정기공시(1분기/반기/3분기/사업보고서) 수집
> - `rcept_dt` -> `announced_at`, `report_nm` -> `title`, `rcept_no` -> URL 조합
> - 보고서명에서 `target_year`, `has_financial_analysis`, `has_operating_profit` 자동 파싱
> - psycopg2로 `stock_announcements` 테이블에 직접 INSERT (중복 방지 포함)
> - `collect_initial()` (전체, 2020~) / `collect_incremental()` (최근 90일) 두 모드 지원
> - 기존 `collect_financial.py`의 `get_dart_corp_codes()` 재사용
> - `content`는 NULL (원문 수집은 후순위)
> 
> ### CLI 사용법
> 
> 
> ## Issue 번호
> S14P21D208-193

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-23)
  > ## Code Review Report
  > 
  > **Files Reviewed:** 1 (collect_announcements.py, 468줄)
  > **Total Issues:** 9
  > 
  > ---
  > 
  > ### CRITICAL (1)
  > 
  > **1. DB 비밀번호 하드코딩**
  > `collect_announcements.py:63`
  > 
  > `DB_PASSWORD = os.environ.get("DB_PASSWORD", "***")` — 기존 `load_financials_to_db.py`와 동일 패턴이나, 소스코드에 실제 비밀번호가 노출됩니다. 공유 DB 모듈로 추출하여 한 곳에서만 관리 필요.
  > 
  > ### HIGH (2)
  > 
  > **2. DB 연결 미해제 (connection leak)**
  > `collect_announcements.py:362-417`
  > 
  > 메인 루프에서 예외/KeyboardInterrupt 발생 시 `conn.close()`에 도달하지 못합니다. `try/finally`로 감싸야 합니다.
  > 
  > **3. docstring에 ON CONFLICT 언급 — 실제로는 WHERE NOT EXISTS 사용**
  > `collect_announcements.py:429`
  > 
  > `collect_incremental` docstring이 실제 구현과 불일치합니다.
  > 
  > ### MEDIUM (4)
  > 
  > **4. NOT EXISTS 중복 방지 — UNIQUE 제약 없이 race condition 가능**
  > `collect_announcements.py:267-283` — 동시 실행 시 중복 INSERT 가능. UNIQUE 제약 추가 권장.
  > 
  > **5. execute_values + SELECT FROM VALUES 타입 캐스팅 이슈**
  > `collect_announcements.py:271-283` — VALUES에서 text로 전달되는 값과 DB 컬럼 타입 불일치 가능. 명시적 캐스팅 필요.
  > 
  > **6. _REPORT_QUARTER_KEYWORDS 미사용 상수**
  > `collect_announcements.py:49-54` — dead code 제거 필요.
  > 
  > **7. 종목별 개별 커밋 — 배치 없음**
  > `collect_announcements.py:294-302` — 200종목 = 200 트랜잭션. 실패 시 재개 지점 불명.
  > 
  > ### LOW (2)
  > 
  > **8. DB 연결 보일러플레이트 중복 (DRY)**
  > `load_financials_to_db.py`와 동일 코드 복사. 공유 `utils/db.py` 추출 권장.
  > 
  > **9. has_operating_profit 로직 — 거의 항상 False**
  > `collect_announcements.py:242` — 보고서명 매칭 부정확. 정기 재무보고서는 항상 영업이익 포함하므로 `has_financial_analysis`와 동일하게 처리 권장.
  > 
  > ---
  > 
  > ### Recommendation: **REQUEST CHANGES**
  > 
  > CRITICAL(비밀번호 하드코딩) + HIGH 2건(connection leak, docstring 불일치) 수정 필요.

---

### !275 · [AI] Feat: S14P21D208-194 재무/공시 DB 적재를 파이프라인에 통합

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/ai/loaders-pipeline-integration` → `dev-ai`
- 생성: 2026-03-23 · 머지: 2026-03-23
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/275](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/275)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 재무 데이터 및 공시 메타데이터 DB 적재를 파이프라인에 자동화 통합
> 
> ## MR 세부 내용
> - `loaders/load_financials_to_db.py` git 추적 추가 (fundamental_metrics -> stock_financials DB upsert)
> - `pipeline.py`에 DB 적재 단계 추가 (3-2: 재무, 3-3: 공시)
> - 펀더멘탈 지표 생성 후 자동으로 stock_financials 테이블 적재
> - 공시 메타데이터 증분 수집(90일) 파이프라인 통합
> - --skip-features 시 DB 적재도 함께 건너뜀
> - DB 적재 실패 시 파이프라인 중단 없이 계속 진행
> - DB 연결은 utils/db.py 공유 모듈 사용 (비밀번호 환경변수 전용)
> 
> ### 파이프라인 흐름
> 
> 
> ## Issue 번호
> S14P21D208-194

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-23)
  > ## Code Review Report
  > 
  > **Files Reviewed:** 4 (2 신규, 2 컨텍스트)
  > **Total Issues:** 5
  > 
  > ---
  > 
  > ### CRITICAL (0) / HIGH (0)
  > 없음
  > 
  > ### MEDIUM (3)
  > 
  > **1. `import os` 미사용**
  > `load_financials_to_db.py:22` — DB 연결이 utils/db.py로 이전되면서 불필요해짐.
  > 
  > **2. --skip-features 플래그가 DB 적재도 건너뜀 — 의미적 불일치**
  > `pipeline.py:470-491` — 피처 건너뜀과 DB 적재 건너뜀은 다른 관심사. 별도 --skip-db-load 플래그 고려 또는 help 텍스트 업데이트 필요.
  > 
  > **3. _has_unique_constraint 커서 미해제 (예외 시)**
  > `load_financials_to_db.py:101-111` — try/finally로 cur.close() 보장 필요.
  > 
  > ### LOW (2)
  > 
  > **4. `import psycopg2` 미사용** — execute_values만 사용, psycopg2 직접 참조 없음.
  > 
  > **5. NaN-to-None 이중 변환** — line 131과 lines 177-179에서 중복 처리.
  > 
  > ---
  > 
  > ### 긍정적 사항
  > 
  > - 비밀번호 하드코딩 없음 (utils/db.py 환경변수 전용)
  > - SQL 파라미터화 (injection 안전)
  > - try/finally로 connection 관리 정상
  > - DB 실패 시 파이프라인 중단 없이 계속 진행
  > - 단계 순서 올바름 (펀더멘탈 -> DB 적재 -> 품질 검증)
  > 
  > ### Recommendation: **COMMENT (승인 가능)**
  > 
  > CRITICAL/HIGH 이슈 없음. MEDIUM 3건은 머지 차단 사유 아님.

---

### !276 · [BE] Feat: S14P21D208-195, S14P21D208-196 종목 상세 stock, overview API 구현

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `feature/be/S14P21D208-195-196-stock-apis` → `dev-backend`
- 생성: 2026-03-23 · 머지: 2026-03-23
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/276](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/276)

<details><summary>MR 설명</summary>

> ## 한 줄 요약
> 개별 종목 리포트 화면용 stock API를 추가하고, 상단 overview API를 별도 spec으로 구현했습니다.
> 
> ## 주요 변경
> - `GET /api/stocks/{stockId}/overview` 추가
>   - 최신 종가
>   - 52주 최고가/최저가
>   - 고점/저점 대비 현재가 등락률
> - `GET /api/stocks/{stockId}/indicators` 추가
> - `GET /api/stocks/{stockId}/financials?type=YEARLY|QUARTERLY` 추가
> - `GET /api/stocks/{stockId}/keywords` 추가
> - `GET /api/stocks/{stockId}/announcements` 추가
> - `GET /api/stocks/{stockId}/announcements/{announcementId}` 추가
> - 관련 DTO / Repository / Service / Controller / ControllerTest 추가 및 보강
> 
> ## 구현 기준
> - `overview`는 별도 합의 spec 기준으로 구현
> - `financials`, `keywords`, `announcements`, `announcement detail`은 노션 DB 명세 기준으로 구현
> - `indicators`는 현재 UI 구조 기준으로 구현
>   - `valuation / earnings / dividend`
>   - 노션 DB row와는 응답 shape가 다르므로 문서 동기화 필요
> 
> ## 검증
> - `./mvnw -q -DskipTests compile` 통과
> - `./mvnw -q -Dtest=StockApiControllerTest test` 실행
> - 신규 API 관련 테스트는 통과
> - 기존 SSE 테스트 `streamStockPrices_opensSseChannel` 1건은 기존과 동일하게 실패
> 
> ## 참고
> - `indicators`는 현재 프론트 화면 구조와 더 잘 맞는 응답으로 구현되어 있습니다.
> - 노션 DB 명세는 `indicators`만 현재 구현 기준으로 수정 필요합니다.
> 
> ## Issue
> - S14P21D208-195
> - S14P21D208-196

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-23)
  > 전체적으로 잘 구조화된 MR입니다. DTO record 패턴, 네이티브 쿼리 분리, 테스트 커버리지 모두 양호합니다. 아래 개선 포인트를 정리했습니다.
  > 
  > ## :red_circle: Critical
  > 
  > ### 1. Object\[\] 반환 네이티브 쿼리 — 타입 안전성 부재
  > 
  > KeywordRepository.findTopKeywordsByStockId와 StockNewsRepository.findLatestNewsByStockIdAndKeywordIds가 List\<Object\[\]\>를 반환합니다. 인덱스 기반 캐스팅(row\[0\], row\[1\])은 컬럼 순서가 바뀌면 런타임에 조용히 깨집니다.
  > 
  > 제안: JPA interface projection 또는 @SqlResultSetMapping을 사용하세요. 최소한 record projection이 가능합니다:
  > 
  > public interface KeywordCount { Long getId(); String getName(); Long getMentionCount(); } 
  > 
  > ### 2. N+1 가능성 — getStockIndicators에서 쿼리 4\~5개 순차 실행
  > 
  > stockFinancialRepository, stockPriceDailyRepository, stockDividendYieldSnapshotRepository, stockAnnouncementRepository 각각 별도 쿼리를 날립니다. 현재는 문제없지만, 목록 화면에서 여러 종목을 한꺼번에 조회하게 되면 병목이 됩니다.
  > 
  > 제안: 당장은 OK이나, 향후 배치 조회가 필요하면 단일 native query나 캐싱 고려.
  > 
  > ## :yellow_circle: Major 
  > ### 3. StockServiceImpl 비대화 — 400줄 넘는 단일 서비스
  > 
  > overview, indicators, financials, keywords, announcements 로직이 전부 StockServiceImpl 하나에 들어 있습니다. 각각 독립적인 도메인 로직이므로 분리하면 유지보수에 좋습니다.
  > 
  > 제안: StockOverviewService, StockIndicatorService 등으로 분리하거나, 최소한 private 헬퍼를 별도 클래스로 추출 검토.
  > 
  > ### 4. findDividendAnnouncements — 하드코딩된 "배당" 키워드
  > 
  > stockAnnouncementRepository.findDividendAnnouncements(stockId, LocalDate.now().minusYears(1), "배당"); "배당" 문자열이 서비스 코드에 하드코딩되어 있습니다. 공시 제목 패턴이 바뀌면 누락됩니다.
  > 
  > 제안: 상수로 추출하고, 주석으로 왜 "배당"인지 설명을 남겨주세요.
  > 
  > ### 5. parseQuarter — "4Q" 외 다른 포맷 미처리
  > 
  > if (reportQuarter.endsWith("Q")) { return Integer.valueOf(reportQuarter.substring(0, 1)); } "10Q" 같은 값이 들어오면 "1"만 파싱됩니다. 또한 endsWith("Q") 체크 후 substring(0, 1)이면 "4Q" → 4는 맞지만, 방어 로직이 부족합니다.
  > 
  > 제안: reportQuarter.replace("Q", "") 후 Integer.parseInt로 변환하거나, enum 사용.
  > 
  > ### 6. pagination에 LIMIT/OFFSET native query 직접 사용
  > 
  > StockAnnouncementRepository.findPageByStockId에서 native query로 LIMIT/OFFSET을 직접 쓰고 있습니다. Spring Data의 Pageable을 쓰면 일관성이 높아집니다.
  > 
  > 제안: Pageable + Page 사용 검토. countByStockId도 별도 호출 안 해도 됩니다.
  > 
  > ## :green_circle: Minor 
  > ### 7. @JsonProperty("price_range_52w") vs @JsonNaming(SnakeCaseStrategy)
  > 
  > StockOverviewResponse에서 @JsonNaming을 쓰면서 priceRange52w 필드에 @JsonProperty를 별도로 붙인 건 좋은 판단입니다. 다만 이런 예외 케이스를 주석으로 남기면 좋겠습니다.
  > 
  > ### 8. calculateDistanceRate — float 정밀도
  > 
  > return (latestPrice - referencePrice) \* 100.0f / referencePrice; float 연산은 소수점 2자리에서 오차가 날 수 있습니다. 프론트에서 표시용이라 큰 문제는 아니지만, BigDecimal로 통일하면 일관성이 좋습니다.
  > 
  > ### 9. toOffsetDateTime — UTC 하드코딩
  > 
  > return timestamp.toInstant().atOffset(ZoneOffset.UTC); DB에 KST로 저장된 데이터라면 UTC 변환 시 9시간 차이가 발생합니다. DB timezone 설정과 맞는지 확인이 필요합니다.
  > 
  > ### 10. 테스트 — happy path만 존재
  > 
  > 신규 API 6개에 대해 모두 성공 케이스만 테스트합니다. 최소한 다음을 추가하면 좋겠습니다:
  > 
  > financials에 잘못된 type 전달 시 400 응답 존재하지 않는 announcementId로 404 응답 overview에서 가격 데이터 없는 종목 조회 시 null 처리 요약 구분 항목 수 
  > ## :red_circle: Critical 2
  > (Object\[\] 타입 안전성, N+1 잠재적 이슈) 
  > ## :yellow_circle: Major 4
  > (서비스 비대화, 하드코딩, parseQuarter, pagination) 
  > ## :green_circle: Minor 4
  > (JsonProperty 주석, float 정밀도, UTC, 테스트) 
  > 
  > 전체적으로 Approve with comments 수준입니다. Critical 2건은 당장 장애를 내진 않지만, interface projection 전환은 이번 MR에서 같이 해두면 좋겠습니다.

- 💬 **최규직** (2026-03-23)
  > 리뷰 반영했습니다. `Object[]` 반환 2건은 projection으로 전환했고, 하드코딩 상수/분기 파싱/예외 케이스 테스트도 함께 보강했습니다.
  > 추가로 남은 구조 개선 항목(Service 분리, 쿼리 최적화, Pageable 전환)은 이번 MR 범위를 넘는다고 판단해 후속으로 분리하겠습니다.

---

### !283 · [AI] Add: S14P21D208-216 누락 기간 일괄 추론 캐치업 스크립트

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/ai/ml-pipeline-signal-consumer` → `dev-ai`
- 생성: 2026-03-23 · 머지: 2026-03-24
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/283](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/283)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 서버 장애/스케줄러 실패 시 누락된 기간의 ML 추론 결과를 일괄 생성하여 DB에 직접 적재하는 캐치업 스크립트 추가
> 
> ## MR 세부 내용
> - DB 최신 report_date와 OHLCV 최신 거래일 비교하여 누락 거래일 자동 산출
> - TFT/LightGBM/GARCH/메타모델 1회 로드 후 날짜별 순회 추론
> - 시그널 4개 테이블 INSERT ON CONFLICT UPSERT
> - v6 포트폴리오 시뮬레이션 실행 및 포트폴리오 3개 테이블 DB 저장
> - --skip-features, --start CLI 옵션 지원
> 
> ## Issue 번호
> S14P21D208-216

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-23)
  > ## Code Review Report
  > 
  > **Files Reviewed:** 2 (catchup_inference.py, daily_inference.py 비교)
  > **Total Issues:** 12 (CRITICAL: 1, HIGH: 3, MEDIUM: 5, LOW: 3)
  > 
  > ---
  > 
  > ### CRITICAL (1) — **수정 완료**
  > 
  > **1. 소스코드 내 DB 크레덴셜 하드코딩 (L44)**
  > 환경변수 미설정 시 폴백으로 사용자명/비밀번호가 소스에 노출됨.
  > **Fix:** 환경변수 필수로 변경 + .env 분리 → **완료 (0ee2b35)**
  > 
  > ---
  > 
  > ### HIGH (3) — **2건 수정 완료, 1건 후속 이슈**
  > 
  > **2. 날짜별 루프에 에러 핸들링 없음 (L736-758)**
  > 단일 날짜 실패 시 전체 캐치업이 중단됨.
  > **Fix:** try/except + 실패 날짜 추적/요약 → **완료 (c813990)**
  > 
  > **3. _ensure_close_cache 예외 무시 (L499-500)**
  > `except Exception: pass` — 종가 로드 실패 무시됨.
  > **Fix:** 경고 로그 출력 추가 → **완료 (c813990)**
  > 
  > **4. daily_inference.py와 대규모 코드 중복**
  > TFT 모델 정의, 추론 로직, v6 포트폴리오 시뮬레이션이 복사됨.
  > **Fix:** 공통 모듈 추출 → **후속 태스크로 트래킹 권장**
  > 
  > ---
  > 
  > ### MEDIUM (5)
  > 
  > **5. save_signals_to_db N+1 쿼리 (L106-186)** — 종목당 4회 INSERT, ticker->stock_id 매핑 반복
  > **6. _close_cache 글로벌 상태 메모리 (L485)** — 장기 배치 시 메모리 누적, 크기 제한 없음
  > **7. positions.remove() O(n) 리스트 제거 (L571)** — 성능 영향은 미미하나 중복 코드
  > **8. --start 날짜 유효성 검증 미흡 (L690-691)** — **완료 (c813990)**
  > **9. 날짜별 트랜잭션 분리 (L748-757)** — 시그널/포트폴리오 저장이 별도 트랜잭션
  > 
  > ---
  > 
  > ### LOW (3)
  > 
  > **10.** 하드코딩된 폴백 시작일 2025-01-01 (L695)
  > **11.** warnings.filterwarnings("ignore") 전체 경고 억제 (L34)
  > **12.** 스크립트 간 DB URL 기본값 불일치
  > 
  > ---
  > 
  > ### Recommendation: **APPROVE (조건부)**
  > 
  > CRITICAL/HIGH 주요 이슈 수정 완료. 코드 중복(#4)은 후속 이슈로 트래킹 권장. 나머지 MEDIUM/LOW는 비차단.

---

### !284 · [FE] Feat: S14P21D208-186 포트폴리오 상세 API 연동

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/fe/portfolio-stock-api` → `dev-frontend`
- 생성: 2026-03-23 · 머지: 2026-03-24
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/284](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/284)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 포트폴리오 개별 종목 상세페이지에 백엔드 API를 연동하고, 인증 전달 및 응답 변환 로직을 구현
> 
> ## MR 세부 내용
> - 포트폴리오 상세 API 인프라 구성 (report, performance, trades route handler)
> - 서버 컴포넌트 + SSR prefetch 적용
> - mock fallback 제거 및 백엔드 프록시 전환
> - 오타 디렉토리 portfoilo API route 삭제
> - report API route 3개에 Authorization 헤더 포워딩 추가
> - 백엔드 응답 data 필드 언래핑 및 chairman 중첩 구조 평탄화
> - trades BUY/SELL 이벤트를 프론트엔드 형식으로 페어링 변환
> - portfolio API 호출에 withAuth: true 적용
> 
> ## Issue 번호
> S14P21D208-186

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-23)
  > ## Code Review Report — 프론트엔드 전문가 리뷰
  > 
  > **Files Reviewed:** 15 | **Total Issues:** 7
  > 
  > | Severity | Count |
  > |----------|-------|
  > | CRITICAL | 0 |
  > | HIGH | 2 |
  > | MEDIUM | 3 |
  > | LOW | 2 |
  > 
  > ---
  > 
  > ### HIGH (2)
  > 
  > **1. 네트워크 에러 시 Route Handler가 500 crash 발생**
  > - `report/[stockId]/performance/route.ts`, `trades/route.ts`, `[stockId]/route.ts`
  > - `fetch()` 호출이 `try/catch`로 감싸져 있지 않습니다. 백엔드 다운/DNS 실패/타임아웃 시 unhandled exception → generic 500 응답이 반환됩니다.
  > - **Fix:** 3개 Route Handler 모두 fetch를 `try/catch`로 감싸고 502 응답 반환
  > ```typescript
  > try {
  >   const upstreamResponse = await fetch(upstreamUrl, { ... });
  >   // ... 기존 로직
  > } catch (error) {
  >   console.error(`[report/${stockId}] upstream fetch failed:`, error);
  >   return NextResponse.json(
  >     { message: "Failed to fetch from upstream" },
  >     { status: 502 },
  >   );
  > }
  > ```
  > 
  > **2. `stockId`가 URL 경로에 인코딩 없이 직접 삽입됨**
  > - `performance/route.ts:34`, `trades/route.ts:39`, `[stockId]/route.ts:38`
  > - 기존 codebase(`users/watchlist/[stockId]/route.ts`)는 `encodeURIComponent`를 사용 중. 컨벤션 불일치 + 특수문자 포함 시 SSRF 가능성.
  > - **Fix:** `encodeURIComponent(stockId)` 적용
  > ```typescript
  > const upstreamUrl = `${getApiBaseUrl()}/api/report/${encodeURIComponent(stockId)}/performance`;
  > ```
  > 
  > ---
  > 
  > ### MEDIUM (3)
  > 
  > **3. `shouldUseMock()` / `getApiBaseUrl()` 동일 함수가 3개 파일에 복사됨**
  > - 기존에 `src/app/api/users/utils.ts`에 공통 유틸 추출 선례 존재
  > - **Fix:** `src/app/api/report/utils.ts`로 추출 후 import
  > 
  > **4. BUY/SELL 페어링 비즈니스 로직(60+ lines)이 Route Handler에 위치**
  > - `trades/route.ts:69-122`
  > - Route Handler는 프록시 역할만, 비즈니스 로직은 adapter 계층에 위치하는 것이 테스트/유지보수에 유리
  > - holding-days 계산 코드가 동일 파일 내 3회 반복
  > - **Fix:** 별도 유틸 함수로 추출하거나, adapter에서 처리
  > 
  > **5. pendingBuy 없이 SELL 이벤트가 들어오면 데이터가 무시됨**
  > - `trades/route.ts:90` — unmatched SELL이 drop됨
  > - **Fix:** 최소한 경고 로그 추가
  > ```typescript
  > } else if (t.trade_type === "SELL" && !pendingBuy) {
  >   console.warn(`[trades/${stockId}] unmatched SELL at ${t.trade_time}`);
  > }
  > ```
  > 
  > ---
  > 
  > ### LOW (2)
  > 
  > **6. `new Date()` 루프 내 반복 호출** — 동일 요청 내 미세 시간차 발생 가능. 루프 밖으로 이동 권장.
  > 
  > **7. `shouldUseMock()` 기본값이 mock 활성화 (opt-out)** — 기존 패턴 그대로이므로 이 MR 범위 밖. 향후 opt-in 전환 검토.
  > 
  > ---
  > 
  > ### Recommendation: **REQUEST CHANGES**
  > 
  > HIGH 2건(try/catch 미적용, encodeURIComponent 누락)은 프로덕션 안정성을 위해 머지 전 수정이 필요합니다. MEDIUM 중 코드 중복 추출은 함께 처리하면 좋고, 나머지는 후속 작업으로 남겨도 됩니다.

- 💬 **장호정** (2026-03-23)
  > ## Code Review — 재리뷰 결과 (리팩토링 반영 후)
  > 
  > **검토 파일:** 5개 | **총 이슈:** 0건
  > 
  > ### 이전 지적 사항 해결 확인 (7/7 완료)
  > 
  > | # | 심각도 | 지적 내용 | 해결 |
  > |---|--------|-----------|------|
  > | 1 | HIGH | fetch try/catch 미적용 | ✅ 3개 route 모두 try/catch + 502 응답 |
  > | 2 | HIGH | stockId encodeURIComponent 누락 | ✅ 3개 route 모두 적용 |
  > | 3 | MEDIUM | shouldUseMock/getApiBaseUrl 중복 | ✅ report/utils.ts로 추출 |
  > | 4 | MEDIUM | BUY/SELL 페어링 로직 위치 | ✅ pairTrades.ts로 분리 |
  > | 5 | MEDIUM | unmatched SELL 무시 | ✅ console.warn 추가 |
  > | 6 | LOW | new Date() 루프 내 반복 | ✅ 루프 밖 now 변수로 통합 |
  > | 7 | LOW | shouldUseMock opt-out 방식 | ✅ 향후 개선 주석 추가 |
  > 
  > ### 코드 품질
  > - 타입 안전성: LSP 진단 에러 0건
  > - 리팩토링: 관심사 분리 개선, 코드 중복 제거
  > - 보안: encodeURIComponent 적용, 하드코딩 시크릿 없음
  > - 에러 처리: 네트워크 에러 502, upstream 에러 투명 전달
  > 
  > ### Recommendation: **APPROVE** ✅
  > 
  > 이전 리뷰 지적 7건 모두 적절하게 수정 완료. 새로 발생한 이슈 없음.

---

### !285 · [BE] Feat: S14P21D208-215 뉴스 목록 조회 기간 필터 및 totalCount 추가

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `feature/be/news-date-filter-totalcount` → `dev-backend`
- 생성: 2026-03-23 · 머지: 2026-03-24
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/285](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/285)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 뉴스 목록 조회 API에 기간 필터(startDate/endDate)와 totalCount 응답 추가
> 
> ## 🧑‍💻 MR 세부 내용
> - `GET /api/news`에 `startDate`, `endDate` 파라미터 추가
>   - `startDate` 생략 시 전체 기간, `endDate` 생략 시 오늘 날짜 기본값
>   - KST(Asia/Seoul) 기준으로 OffsetDateTime 변환하여 쿼리 실행
> - 응답에 `totalCount` 필드 추가 (필터 조건에 해당하는 전체 기사 수)
> - `OffsetBasedPageRequest` 구현으로 임의 offset 정확 처리
> - Repository에 기간 필터 + count 쿼리 4개 추가 (JPQL)
> - 테스트 8개 작성 및 통과 (기간 필터 테스트 포함)
> 
> ## 📎 Issue 번호
> S14P21D208-215

</details>

**리뷰 토론**

- 💬 **정준용** (2026-03-23)
  > [P1] 키워드 필터가 같은 URL의 중복 기사 중 일부를 누락시킬 수 있습니다.
  > StockNewsRepository.java
  > findNewsByKeyword()와 countNewsByKeyword()는 먼저 같은 URL끼리 MIN(id) 하나만 대표 row로 고른 다음, 그 대표 row 자체가 NewsKeywordMap에 연결되어 있는지만 검사합니다.
  > 문제는 이 MR 안에서도 같은 URL의 여러 row를 하나의 논리적 기사로 보고 있다는 점입니다. 실제로 관련 종목명 조회는 JOIN StockNews sn2 ON sn2.url = sn.url로 같은 URL의 다른 row까지 합쳐서 처리하고 있습니다. 그런데 키워드 필터는 그렇게 하지 않습니다.
  > 
  > 예를 들어 URL이 같은 기사 A에 대해 id 10, id 12 두 row가 있고, 키워드 AI 매핑이 id 12에만 붙어 있다면:
  > 
  > 대표 row는 MIN(id)인 10으로 선택되고
  > 키워드 매핑 검사는 id 10만 보게 되므로
  > 이 기사는 검색 결과와 totalCount에서 모두 빠집니다.
  > 즉, 중복 제거 기준(URL)과 키워드 필터 기준이 서로 다른 row를 보고 있어서 결과 누락이 생길 수 있습니다. 키워드 조건도 “대표 row 1개”가 아니라 같은 URL을 공유하는 논리적 기사 단위로 맞춰야 합니다.
  > 
  > [P2] 기본 endDate가 KST 기준이 아니라 서버 로컬 시간 기준으로 계산됩니다.
  > NewsController.java
  > NewsController는 endDate가 없을 때 LocalDate.now()로 기본값을 채우고 있습니다. 그런데 NewsServiceImpl에서는 이 날짜를 다시 Asia/Seoul 기준으로 해석해서 endDateTime을 만듭니다.
  > 문제는 현재 설정이 Hibernate JDBC timezone만 Asia/Seoul로 고정할 뿐, JVM이나 서버의 기본 timezone까지 KST로 고정하지는 않는다는 점입니다.
  > 
  > 그래서 서버가 UTC 같은 다른 timezone에서 돌고 있으면, “오늘”의 기준이 달라질 수 있습니다. 예를 들어:
  > 
  > 실제 한국 시간: 2026-03-24 00:30 KST
  > 서버 timezone이 UTC라면 LocalDate.now()는 아직 2026-03-23
  > 이 상태에서 /api/news를 endDate 없이 호출하면, 서비스는 2026-03-23을 KST 하루의 끝으로 해석하게 되어 3월 24일 새벽 기사들이 조회에서 빠지고 totalCount도 적게 계산됩니다.
  > 
  > 해결하려면 기본 endDate도 LocalDate.now(ZoneId.of("Asia/Seoul"))처럼 KST로 맞추거나, 아예 기본값 계산을 서비스 내부의 KST 처리 로직으로 일원화하는 편이 안전합니다.

- 💬 **이혜민** (2026-03-24)
  > ## 코드리뷰 대응
  > 
  > ### \[P1\] 키워드 필터 URL 단위 누락
  > 
  > 수정 완료. `findNewsByKeyword`와 `countNewsByKeyword`의 키워드 서브쿼리를 대표 row(MIN id) 직접 매칭에서 `EXISTS (... WHERE sn3.url = sn.url AND k.name = :keyword)` 방식으로 변경했습니다. 같은 URL을 공유하는 모든 row에서 키워드를 검색하므로, 관련 종목명 조회(`JOIN StockNews sn2 ON sn2.url = sn.url`)와 동일한 논리적 기사 단위로 동작합니다.
  > 
  > ### \[P2\] endDate 서버 로컬 시간 기준 문제
  > 
  > 수정 완료. Controller의 기본 endDate를 `LocalDate.now()` → `LocalDate.now(ZoneId.of("Asia/Seoul"))`로 변경했습니다. Service 내부의 KST 변환 로직과 일관되게 동작합니다.

---

### !291 · [BE] Fix: S14P21D208-215 startDateTime null 파라미터 타입 추론 실패 수정

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `feature/be/news-date-filter-totalcount` → `dev-backend`
- 생성: 2026-03-24 · 머지: 2026-03-24
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/291](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/291)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 뉴스 목록 조회 API startDateTime null 파라미터 타입 추론 실패 핫픽스
> 
> ## 🧑‍💻 MR 세부 내용
> - PostgreSQL이 JPQL의 `:startDateTime IS NULL` 조건에서 null 파라미터의 데이터 타입을 추론하지 못해 `could not determine data type of parameter $1` 에러 발생
> - `CAST(:startDateTime AS timestamp) IS NULL`로 변경하여 타입을 명시적으로 지정
> - 기존 4개 쿼리(findAllNews, countAllNews, findNewsByKeyword, countNewsByKeyword) 모두 동일 패턴 적용
> 
> ## 📎 Issue 번호
> S14P21D208-215

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-24)
  > 이번 핫픽스 방향은 이해했습니다. 다만 장애 원인이 `StockNewsRepository`의 JPQL null 바인딩이었는데, 현재 MR에는 이 케이스를 실제로 잡아주는 회귀 테스트가 없는 점이 조금 아쉽습니다.
  > 
  > 지금 있는 `NewsServiceImplTest`는 전부 repository mock 기반이라, 같은 문제가 다시 들어와도 테스트가 못 잡을 가능성이 커 보입니다. `@DataJpaTest`나 repository integration test로 `startDateTime == null`일 때 아래 4개 쿼리가 실제 DB 기준으로 정상 동작하는 케이스를 하나 추가해두면 재발 방지에 훨씬 도움이 될 것 같습니다.
  > 
  > - `findAllNews`
  > - `countAllNews`
  > - `findNewsByKeyword`
  > - `countNewsByKeyword`

---

### !295 · [AI] Fix: S14P21D208-218 뉴스 URL 정규화로 종목별 중복 저장 방지

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `fix/ai/news-url-normalize` → `dev-ai`
- 생성: 2026-03-24 · 머지: 2026-03-24
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/295](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/295)

<details><summary>MR 설명</summary>

> ## :page_facing_up: MR 한 줄 요약
> 
> 뉴스 크롤링 시 URL 정규화로 같은 기사의 종목별 중복 저장 방지
> 
> ## :technologist: MR 세부 내용
> 
> - 네이버 금융 뉴스 URL에 종목코드(`code`), 페이지(`page`), 정렬(`sm`) 파라미터가 포함되어 같은 기사도 종목별로 다른 URL로 인식되던 문제 수정
> - `url_normalizer.py` 추가: `article_id` + `office_id`만 유지하고 나머지 쿼리 파라미터 제거
> - `daily.py`, `backfill_loader.py` 모두 정규화된 URL로 중복 체크 및 저장하도록 변경
> - 같은 기사는 `stock_news`에 1row만 생성, 추가 종목은 `stock_news_map`에 매핑만 추가
> - 신규 적재분부터 적용
> 
> ## :paperclip: Issue 번호
> 
> S14P21D208-218

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-24)
  > 이번 수정이 `daily.py`랑 `backfill_loader.py`에는 들어갔는데, 같은 뉴스 적재 경로인 `loaders/csv_loader.py`는 아직 raw URL 그대로 중복 체크/저장을 하고 있습니다.
  > 
  > `csv_loader.py`를 통해 들어오는 데이터는 여전히
  > 
  > - 기존 URL 조회
  > - `StockNews.url` 저장
  > - 동일 배치 내 `existing_urls` 캐시 모두 원본 `article_url` 기준이라, 네이버 금융 기사에 `code/page/sm` 파라미터가 붙은 경우 종목별 중복 저장이 다시 발생할 수 있어 보입니다.
  > 
  > README랑 docker-compose 예시상 `csv_loader.py`도 여전히 사용하는 경로라서, 여기까지 같이 정규화하지 않으면 중복 방지 정책이 적재 경로마다 달라질 것 같습니다.
  > 
  > ---
  > 
  > 이번 이슈가 URL 정규화 규칙에 의존하는 만큼, `normalize_news_url()`에 대한 단위 테스트가 하나 있으면 좋겠습니다.
  > 
  > 예를 들면
  > 
  > - `code/page/sm`이 달라도 같은 canonical URL로 정규화되는지
  > - `article_id`/`office_id`가 없으면 원본 URL을 유지하는지
  > - 비어 있거나 malformed URL이면 그대로 반환하는지
  > 
  > 정도만 잡아놔도 이후 리팩터링 때 회귀를 막는 데 도움이 될 것 같습니다.

- 💬 **이혜민** (2026-03-24)
  > ## 코드리뷰 대응
  > 
  > ### csv_loader.py 정규화 누락
  > 
  > csv_loader.py에도 동일하게 normalize_news_url() 적용했습니다. 3개 적재 경로(daily, backfill_loader, csv_loader) 모두 정규화된 URL로 중복 체크 및 저장합니다.
  > 
  > ### 단위 테스트
  > 
  > test_url_normalizer.py 추가 (9건):
  > 
  > - code/page/sm이 달라도 같은 canonical URL로 정규화되는지
  > - article_id/office_id가 다르면 다른 URL인지
  > - 파라미터 순서가 달라도 동일하게 정규화되는지
  > - article_id/office_id만 남고 나머지 제거되는지
  > - None, 빈 문자열, malformed URL은 그대로 반환하는지
  > - 네이버 외 URL은 변경 없이 반환하는지

---

### !299 · [AI] Fix: S14P21D208-219 데일리 추론 파이프라인 통합 버그 수정

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/ai/inference-server-integration-test` → `dev-ai`
- 생성: 2026-03-24 · 머지: 2026-03-24
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/299](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/299)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 데일리 추론 파이프라인 실행 시 피처 날짜 누락, API 경로 불일치, SQL 캐스트 오류를 수정하여 추론 결과가 서버에 정상 저장되도록 한다.
> 
> ## MR 세부 내용
> - build_tft_features에 inference_mode 파라미터 추가하여 추론 시 최신 날짜 피처 유지
> - 추론 스크립트 API 경로를 /ai/signal/* prefix로 수정
> - crud.py의 ::jsonb 캐스트를 CAST(... AS jsonb)로 변경하여 SQLAlchemy 바인드 충돌 해결
> - 시그널 업로드 실패 시 응답 본문 로깅 추가
> 
> ## Issue 번호
> S14P21D208-219

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-24)
  > ## Code Review Report
  > 
  > **Files Reviewed:** 5 | **Total Issues:** 5 (수정 완료)
  > 
  > ---
  > 
  > ### HIGH (1) — ✅ 수정됨 (ab83279)
  > 
  > **`scripts/daily_inference.py:327`** — `resp` 직접 참조 → `e.response` 관용적 패턴으로 변경
  > - `except HTTPError` 블록에서 `resp.content` 대신 `e.response.content`로 접근하여 `UnboundLocalError` 위험 제거
  > 
  > ### MEDIUM (2) — ✅ 수정됨
  > 
  > 1. **`scripts/daily_inference.py:347`** — `post_portfolio`에도 동일한 HTTPError 응답 본문 로깅 추가
  > 2. **`build_tft_features.py:588`** — `target_5d` 센티넬 값 `-1` 사용 (추론 시 바이너리 0/1 외 값). 현재 파이프라인에서 추론 전 재설정하므로 동작에는 영향 없음. 추후 상수 정의 고려
  > 
  > ### LOW (2) — ✅ 1건 수정됨
  > 
  > 1. **`.env.example`** 플레이스홀더를 코드 기본값(`change_me_ai_internal_key`)과 일치시킴
  > 2. `API_KEY` 환경변수 미설정 시 fail-fast 체크 — 추후 개선 고려
  > 
  > ---
  > 
  > ### Positive Observations
  > - `inference_mode` 파라미터가 keyword-only(`*,`)로 설계되어 실수 방지
  > - `CAST(:report_data AS jsonb)` 수정은 SQLAlchemy `text()` 바인드 파라미터 충돌의 정확한 해결책
  > - API 경로 수정이 코드, 독스트링, 주석 전체에 일관 적용됨
  > 
  > **Recommendation: APPROVE** ✅ (리뷰 이슈 모두 수정 완료)

---

### !302 · [BE] Feat: S14P21D208-218 뉴스 전체 기사 수 Redis 캐싱

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `feature/be/news-redis-total-count` → `dev-backend`
- 생성: 2026-03-24 · 머지: 2026-03-24
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/302](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/302)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 뉴스 전체 기사 수를 Redis에 캐싱하여 count 쿼리 비용 절감
> 
> ## 🧑‍💻 MR 세부 내용
> - PipelineSignal 엔티티 추가 (AI 파이프라인의 pipeline_signals 테이블 매핑)
> - NewsTotalCountScheduler: 매일 20시(KST)에 pipeline_signals에서 당일 NEWS_PIPELINE_DONE 신호 확인 → Redis `news:total_count` 갱신. 20시에 신호 없으면 21시에 재시도
> - NewsServiceImpl: 필터 없는 전체 조회 시 Redis 캐시 우선 사용, 캐시 미스 시 DB fallback
> - 53만건 GROUP BY url 서브쿼리를 포함하는 count 쿼리(~1.7초)를 Redis 조회(~1ms)로 대체
> 
> ## 📎 Issue 번호
> S14P21D208-218

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-24)
  > 최신 `origin/dev-backend` 기준으로 보면, 이번 MR에서 머지 전에 확인해야 할 이슈는 2건입니다.
  > 
  > ## High
  > 
  > 1. `endDate`만 지정한 무필터 조회에도 Redis 캐시를 그대로 사용해서 `totalCount`가 잘못 반환됩니다.\
  >    NewsController.java 에서 `endDate`는 과거 날짜로 요청할 수 있는데, NewsServiceImpl.java 에서는 `startDate == null` 이기만 하면 `news:total_count` 캐시를 사용합니다.\
  >    그래서 `/api/news?endDate=2026-03-01` 같은 요청은 목록 데이터는 3월 1일까지로 조회되더라도, `totalCount`는 오늘 기준 전체 기사 수가 내려가게 됩니다.
  > 2. `news:total_count` 캐시에 기준 시점 정보가 없어서 stale count가 계속 노출될 수 있습니다.\
  >    NewsTotalCountScheduler.java 는 매일 20시, 21시에만 고정 키를 갱신하고, NewsServiceImpl.java 는 그 값이 언제 계산된 값인지 검증하지 않고 그대로 사용합니다.\
  >    따라서 파이프라인 완료가 21시 이후로 밀리거나 신호 확인이 실패한 날에는, 다음 갱신이 성공할 때까지 이전 날짜의 총건수가 계속 반환될 수 있습니다. 날짜별 키를 쓰거나, 최소한 캐시에 기준일을 함께 저장해서 요청한 `endDate`와 일치할 때만 사용하도록 하는 편이 안전합니다.
  - ↳ **이혜민** (2026-03-24)
    > ## 코드리뷰 대응
    > 
    > ### \[High\] endDate만 지정한 무필터 조회에도 Redis 캐시를 그대로 사용하는 문제
    > 
    > → 수정 완료. Redis 캐시 사용 조건을 `startDate == null AND endDate == 오늘(KST)`로 변경했습니다. 과거 endDate 요청 시 항상 DB 쿼리로 정확한 totalCount를 반환합니다.
    > 
    > ### \[High\] news:total_count 캐시에 기준 시점 정보가 없어 stale count 노출
    > 
    > → 수정 완료. 캐시 키를 `news:total_count:{날짜}` 형태로 변경하여 날짜별로 분리했습니다. 스케줄러도 당일 날짜 키에 저장하도록 수정했습니다. 파이프라인 완료가 21시 이후로 밀리는 경우에는 현재는 DB fallback으로 처리하고, 향후 pipeline_signals를 감지하여 파이프라인 완료 시점에 즉시 갱신하는 방식으로 개선할 예정입니다.

- 💬 **정준용** (2026-03-24)
  > R 302 실제 diff 9개 파일 기준으로 기능 버그는 3건입니다.
  > 
  > P1 NewsServiceImpl.java: startDate만 보고 캐시를 타서, endDate만 지정한 과거 조회의 totalCount가 현재 전체 기사 수로 잘못 반환됩니다.
  > P2 PipelineSignalRepository.java: 21시 재시도 로직을 넣었지만 완료 신호 판정이 여전히 created_at 기준이라, 늦게 DONE으로 바뀐 row는 재시도에서도 놓칠 수 있습니다.
  > P2 NewsServiceImpl.java: Redis miss/파싱 오류만 fallback하고 Redis 접속 예외는 그대로 터져서, 무필터 뉴스 목록이 새로 Redis 장애에 종속됩니다.
  > 검토 기준은 GitLab MR 페이지가 로그인 화면으로 리다이렉트되어 refs/merge-requests/302/{head,merge}의 실제 diff로 확인했습니다. 검증은 C:\SSAFY\S14P21D208\.codex-mr302\services\backend에서 .\mvnw.cmd -q "-Dtest=NewsServiceImplTest,SignalServiceImplTest" test 1회 통과로 확인했고, 다만 스케줄러/Redis 장애/과거 endDate 케이스를 직접 잡는 테스트는 이번 MR에 없습니다.
  > 
  > 참고로 신호 API에서 category/marketCap 제거는 계약 변경 위험은 보였지만, 현재 저장소 기준으로는 프런트 실연동 경로가 명확히 이 백엔드 응답을 직접 소비하는 증거가 부족해서 이번 MR 고유 finding으로는 올리지 않았습니다.
  - ↳ **이혜민** (2026-03-24)
    > ## 코드리뷰 대응 (추가)
    > 
    > ### 스케줄러/Redis 장애/과거 endDate 테스트 누락
    > 
    > → 테스트 3건 추가했습니다.
    > 
    > - **Redis 캐시 miss → DB fallback**: 캐시에 값이 없을 때 `countAllNews` DB 쿼리로 정상 조회 확인
    > - **과거 endDate → 캐시 미사용**: `endDate=2025-03-01` 요청 시 Redis 접근 없이 DB 직접 조회 확인
    > - **Redis 잘못된 캐시 값 → DB fallback**: 캐시에 `"not_a_number"` 저장된 경우 `NumberFormatException` 처리 후 DB 조회 확인
    > 
    > 전체 테스트 10건 통과 확인했습니다.

---

### !304 · [BE] Fix: S14P21D208-202 시그널 API 시가총액 필터 추가

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `fix/be/s14p21d208-202-signals-market-cap` → `dev-backend`
- 생성: 2026-03-24 · 머지: 2026-03-24
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/304](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/304)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> `/api/signals`에 시가총액 구간 필터를 추가했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - `market_cap=small|mid|large` 쿼리 파라미터를 추가했습니다.
> - 시가총액 기준 필터를 적용했습니다.
> - `small`: 1조 미만, `mid`: 1조 이상 ~ 10조 미만, `large`: 10조 이상 기준으로 처리했습니다.
> - 시가총액 계산이 불가능한 종목은 시가총액 필터 적용 시 제외되도록 처리했습니다.
> - `SignalServiceImplTest`에 시가총액 필터 및 예외 케이스 테스트를 추가했습니다.
> 
> ## 📎 Issue 번호
> <!-- closed #S14P21D208-202 -->

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-24)
  > ## MR #304 코드리뷰: 시그널 API 시가총액 필터 추가
  > 
  > **작성자:** 최규직 | **변경 파일:** 5개 | **브랜치:** `fix/be/s14p21d208-202-signals-market-cap` → `dev-backend`
  > 
  > ---
  > 
  > ### 전체 평가: ✅ 잘 작성됨
  > 
  > 구조가 깔끔하고, 기존 패턴(`SignalFilter`)을 잘 따라서 `MarketCapFilter`를 추가했습니다. 테스트도 적절합니다.
  > 
  > ---
  > 
  > ### 👍 좋은 점
  > 
  > 1. **일관된 패턴** — `SignalFilter`와 동일한 enum + `from()` + `matches()` 패턴을 따름
  > 2. **null-safe 처리** — `marketCap == null`이면 `ALL`에서만 통과, 필터 적용 시 제외 → 명세에 맞음
  > 3. **상수 사용** — `ONE_TRILLION`, `TEN_TRILLION` 매직넘버 제거
  > 4. **테스트 커버리지** — small/mid/large 각각 검증 + null 케이스 + 잘못된 입력값 예외 테스트
  > 
  > ---
  > 
  > ### 🔍 개선 제안
  > 
  > **1. `buyCount`/`sellCount`가 시가총액 필터 적용 전에 계산됨 (중요도: 🟡 중)**
  > 
  > `SignalServiceImpl.java`에서 `buyCount`와 `sellCount`는 전체 candidates 기준으로 계산되고, `items`는 시가총액 필터 적용 후 계산됩니다. 이게 **의도된 동작**인지 확인이 필요합니다.
  > 
  > - 현재: `market_cap=small`이어도 buyCount/sellCount는 전체 기준
  > - 만약 필터링된 결과 기준이어야 한다면 수정 필요
  > 
  > **2. `matches()` 내 switch에서 `ALL` 케이스 중복 (중요도: 🟢 낮음)**
  > 
  > 이미 위에서 `this == ALL` 체크 후 `return true` 했으므로 switch 안의 `case ALL -> true;`는 도달 불가능 (dead code)입니다.
  > `default -> throw new AssertionError()`로 바꾸면 더 명확합니다.
  > 
  > **3. API 파라미터 네이밍 (중요도: 🟢 낮음)**
  > 
  > `market_cap`은 snake_case인데 다른 파라미터(`filter`, `sort`, `offset`, `limit`)는 camelCase입니다. API 일관성 측면에서 `marketCap`으로 통일하는 것도 고려해볼 수 있습니다. 단, 프론트엔드와 이미 합의된 스펙이라면 현행 유지해도 됩니다.
  > 
  > **4. 테스트에서 totalCount 검증 누락 (중요도: 🟢 낮음)**
  > 
  > `getSignals_filtersByMarketCapClass` 테스트에서 `totalCount`도 함께 검증하면 위 1번 이슈(buyCount/sellCount 기준)에 대한 의도를 명확하게 문서화하는 효과가 있습니다.
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |------|------|
  > | 로직 정확성 | ✅ |
  > | 에러 처리 | ✅ |
  > | 테스트 | ✅ (커버리지 양호) |
  > | 코드 스타일 | ✅ (기존 패턴 준수) |
  > | 주요 확인사항 | buyCount/sellCount가 필터 전 기준인 게 의도인지 확인 |
  > 
  > 전반적으로 머지해도 좋은 수준입니다. 1번 사항만 의도 확인하면 될 것 같습니다.

---

### !306 · [BE] Fix: S14P21D208-218 캐시 miss 시 DB fallback 결과 Redis에 저장 + 테스트 추가

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `feature/be/news-redis-total-count` → `dev-backend`
- 생성: 2026-03-24 · 머지: 2026-03-24
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/306](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/306)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 캐시 miss 시 DB fallback 결과를 Redis에 저장하여 반복 DB 쿼리 방지
> 
> ## 🧑‍💻 MR 세부 내용
> - `getCachedTotalCount()`에서 Redis 캐시 miss → DB 조회 후 결과를 Redis에 1일 TTL로 저장하도록 수정
> - 기존에는 캐시 miss 시 매 요청마다 53만건 GROUP BY count 쿼리가 반복 실행됨
> - 캐시 hit 시 DB count 미호출 및 Redis 재저장 안 함 테스트 추가
> - 캐시 miss → DB fallback 후 Redis 저장 verify 테스트 추가
> 
> ## 📎 Issue 번호
> S14P21D208-218

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-24)
  > 최신 `origin/dev-backend` 기준으로 보면, 이번 MR에서 머지 전에 확인해야 할 이슈는 1건입니다.
  > 
  > ## High
  > 
  > 1. 새로 추가한 테스트가 Mockito matcher 타입 때문에 런타임에 바로 실패할 수 있습니다.\
  >    `services/backend/src/test/java/com/sallaemallae/backend/domain/news/service/NewsServiceImplTest.java:218` 에서\
  >    `verify(valueOperations, never()).set(any(), any(), any(Long.class), any(TimeUnit.class));`\
  >    를 사용하고 있는데, `ValueOperations#set`의 세 번째 파라미터는 primitive `long` 입니다. 여기서 `any(Long.class)` 는 `null`을 반환하므로 검증 시점에 autounboxing 되면서 `NullPointerException`이 날 수 있습니다.\
  >    이 케이스는 `anyLong()` 으로 바꾸는 게 안전합니다.
  > 
  > 이번 커밋 범위에서는 그 외에 추가로 blocking 수준의 이슈는 보이지 않았습니다.

- 💬 **이혜민** (2026-03-24)
  > ### \[High\] any(Long.class) → anyLong() 수정
  > 
  > → 수정 완료. `ValueOperations#set`의 세 번째 파라미터가 primitive `long`이므로 `any(Long.class)` 대신 `anyLong()`으로 변경하여 autounboxing NPE 가능성을 제거했습니다.

---

### !308 · [FE] Feat: S14P21D208-197 report 상세 페이지 및 토론/TTS/성과 시각화 기능 구현

- 작성자: **송민경** · 상태: `merged`
- 브랜치: `feature/fe/discussion-ui` → `dev-frontend`
- 생성: 2026-03-24 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/308](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/308)

<details><summary>MR 설명</summary>

> ## 작업 내용
> - 종목별 리포트 상세 페이지(`/report/[stockId]`) 신규 구현
> - 리포트 상단 요약, AI 투자 성과, 토론 리포트, 의장 분석, 이벤트 섹션 UI 구성
> - 투자 성과 차트에 매수/매도 시그널 표시 및 반응형 툴팁 추가
> - 전체 거래 내역 모달 추가
> - 토론 리포트에 라운드 진행, 발화 연출, 의장 판결 플로우 적용
> - TTS API 연동 및 음성 캐시 처리 추가
> - report 전용 API route(`/api/report/...`) 정리 및 mock 응답 연결
> - 포트폴리오 상세의 report 조회 경로를 `/api/report` 기준으로 통일
> - report 관련 정적 에셋(이미지/GIF/BGM/인트로 영상) 추가
> - `reports` 경로명을 `report`로 정리
> 
> ## 상세 변경 사항
> ### 1. 리포트 상세 페이지 구성
> - 종목 메타 정보, 현재가/등락률, 기준 시각 표시
> - 투자 성과, 토론 리포트, 의장 결론, 이벤트 섹션을 단일 페이지에서 조회 가능하도록 구성
> - 각 섹션별 skeleton 및 에러 메시지 처리 추가
> 
> ### 2. AI 모의투자 성과 섹션
> - 기간 필터(`1M`, `3M`, `1Y`) 제공
> - 실제 주가 흐름 위에 매수/매도 시그널을 시각적으로 표시
> - hover/click 시 툴팁으로 거래 시점과 가격 확인 가능
> - 전체 거래 내역 모달에서 날짜/구분/가격/수익률 확인 가능
> 
> ### 3. 위원회 토론 리포트
> - 라운드별 발화 순서대로 토론 진행
> - 발화 중인 위원 강조, 라운드 전환 오버레이, 의장 판결 연출 구현
> - 일시정지, 재생, 스킵, 다시보기 기능 제공
> - TTS 사전 로딩 및 캐시를 통해 재생 안정성 보완
> 
> ### 4. API / 데이터 계층
> - `/api/report/[stockId]`: 토론 리포트 응답 제공
> - `/api/report/[stockId]/performance`: 투자 성과 데이터 제공
> - `/api/report/[stockId]/performance/trades`: 거래 내역 데이터 제공
> - `/api/report/tts`: ElevenLabs 기반 음성 생성 프록시 추가
> - report 전용 type / hook / api 함수 분리
> 
> ## 테스트
> - `npm.cmd run build` 성공
> - Next.js production build 통과
> - TypeScript 검사 통과
> 
> ## 참고 사항
> - 일부 report 데이터는 현재 mock 기반입니다.
> - TTS 사용 시 ElevenLabs 환경변수 설정이 필요합니다.
> 
> ## 체크리스트
> - [x] report 상세 페이지 추가
> - [x] report API route 연결
> - [x] 투자 성과 차트/거래내역 UI 구현
> - [x] 토론 리포트 및 TTS 플로우 구현
> - [x] production build 검증 완료
> 
> 
> -----
> 
> # 1차 수정
> 
> 1. 리포트 상세 페이지 실데이터 연동 정비
> 리포트 상세 페이지를 인증 보호 페이지로 감싸고 API 호출에 withAuth를 적용했습니다.
> Hero 영역에서 stockId 대신 ticker를 노출하고 실시간 quote stream 기준 현재가, 등락률, 기준 시각을 표시하도록 변경했습니다.
> mock 데이터를 종목별 stockId 기준으로 재정비하고 report mock handler를 함께 수정했습니다.
> 더 이상 사용하지 않는 ReportIndexList를 제거했습니다.
> 2. 투자 성과 섹션 시각화 및 응답 처리 개선
> 투자 성과 섹션을 기간 토글 방식에서 전체 차트 기반 시각화 구조로 재구성했습니다.
> 차트 데이터의 tradeType을 기준으로 매수/매도 신호 마커와 거래 이력을 연동했습니다.
> performance API 응답에서 backend envelope 구조를 unwrap 하도록 수정했습니다.
> 거래 이력(trade history) 응답 데이터 파싱 로직을 보정했습니다.
> 실제 backend 응답 구조에 맞게 데이터 매핑 로직을 수정했습니다.
> 성과 API 응답 타입을 nullable 필드와 averageReturn1y 구조에 맞게 조정하고 응답 검증 및 로그를 추가했습니다.
> 성과 차트 및 거래 이력 UI에서 데이터가 비정상 표시되던 문제를 수정했습니다.
> 3. 토론 리포트 응답 정규화 및 화면 표시 개선
> getDebateReports에서 외부 백엔드의 success/data 래핑 구조를 직접 해석하도록 수정했습니다.
> chairman.chairman 내부 필드를 프론트에서 사용하는 chairman 구조로 평탄화했습니다.
> final_stances, created_at, round_no 등 외부 응답 필드를 프론트 기준으로 정규화했습니다.
> 로컬 Next 프록시 없이도 외부 백엔드 응답을 직접 사용할 수 있도록 구조를 보완했습니다.
> 토론 섹션과 의장 분석 섹션에서 값이 비어 보이던 문제를 수정했습니다.

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-24)
  > ## 코드 리뷰 리포트 - MR #308
  > 
  > **리뷰 대상:** 58개 파일 변경 (report 상세 페이지 + 토론/TTS/성과 시각화)
  > **총 이슈:** 14건
  > 
  > ---
  > 
  > ### CRITICAL (1건)
  > 
  > **1. TTS API Route - 텍스트 길이 제한 없음 + 인증 부재**
  > `src/app/api/report/tts/route.ts:46-49`
  > 
  > `text` 필드에 길이 제한이 없고, 인증(withAuth) 없이 누구나 호출 가능합니다. 악의적 사용자가 수만 자를 전송하면 ElevenLabs API 비용이 급증합니다. `speaker` 값도 화이트리스트 검증이 없어 임의 문자열 시 judge 음성으로 폴백됩니다.
  > 
  > **수정 제안:**
  > - 텍스트 최대 길이 제한 (예: 1,000자)
  > - speaker 화이트리스트 검증
  > - 가능하면 인증 추가
  > 
  > ---
  > 
  > ### HIGH (4건)
  > 
  > **2. API Route 전체 mock 전용 전환 - upstream proxy 삭제**
  > `route.ts`, `performance/route.ts`, `trades/route.ts`
  > 
  > 기존 `shouldUseMock()` 분기 + upstream fetch 로직이 전부 제거되어 환경 변수에 관계없이 항상 mock 반환. 실서비스 전환 불가.
  > -> `shouldUseMock()` 분기 복원 필요 (또는 의도적 mock-only라면 명시적 TODO/이슈 트래킹)
  > 
  > **3. useDebateReports - React Query 미사용 (프로젝트 컨벤션 위반)**
  > `src/app/report/hooks/useDebateReports.ts`
  > 
  > `useInvestmentPerformance`, `useTradeHistory`는 React Query 사용하는데 `useDebateReports`만 `useState+useEffect` 패턴. 캐싱/자동재시도/devtools 지원 부재.
  > -> `useQuery` 기반으로 통일 권장
  > 
  > **4. ReportHeroSection - 가격 변동 방향 하드코딩**
  > `src/app/report/components/ReportHeroSection.tsx:44-47`
  > 
  > 항상 빨간색 + 상승 화살표로 고정. 하락 시에도 상승으로 표시됨. `#FB2C36` 하드코딩은 CSS variable token 컨벤션 위반.
  > -> changeRate 기반 방향/색상 분기 + `var(--color-text-danger)` 사용
  > 
  > ---
  > 
  > ### MEDIUM (6건)
  > 
  > **5. 타입 정의 중복** - `debate.ts`와 `report.ts` 간 `ChairmanAnalysis*` / `Debate*` 구조 중복. 한쪽만 수정하는 실수 유발 -> 통합 권장
  > 
  > **6. DebateSection.tsx - 단일 파일 1,419줄** - TTS/BGM/비디오/상태머신/UI 전부 포함. 커스텀 훅(`useTtsPlayer`, `useDebateSequencer` 등)으로 분리 권장
  > 
  > **7. ChairmanAnalysisSection - "라운드 3 전원 일치결과" 하드코딩** - 실제 데이터와 무관하게 고정 문구 표시 -> 동적 생성 필요
  > 
  > **8. page.tsx - shouldUseMockMode() 중복 구현** - `api/report/utils.ts`의 `shouldUseMock()`과 동일 로직 중복 -> import 재사용
  > 
  > **9. ReportEventsSection - 커넥터 라인 index < 2 하드코딩** -> `index < filteredEvents.length - 1` 변경 필요
  > 
  > **10. TTS 에러 응답에 ElevenLabs 내부 오류 그대로 노출** - 서버 로그에만 기록하고 클라이언트에는 일반 메시지 반환 권장
  > 
  > ---
  > 
  > ### LOW (3건)
  > 
  > **11. console.error 9곳 잔류** - 프로덕션 브라우저 콘솔 노출. 환경 조건부 로깅 또는 에러 리포팅 서비스 전환 권장
  > 
  > **12. hidden div로 signalLabel/createdAt 렌더링** - `ReportsDetailPageClient.tsx:145-147` 디버깅 코드 잔류. 제거 또는 dev 조건부 변경
  > 
  > **13. 대규모 미디어 파일 (~76MB) Git 직접 포함** - 특히 `judge_talking.gif`(~50MB). CDN/Object Storage 이동 또는 Git LFS 사용, GIF->WebM 전환 권장
  > 
  > ---
  > 
  > ### 총평
  > 
  > 전체적으로 UI 구현 품질이 높고, 토론 진행 연출/차트 시각화 등 복잡한 기능을 잘 구현했습니다. 다만 **TTS API의 인증/입력 검증 부재**(비용 위험)와 **API route의 upstream proxy 삭제**(실서비스 차단)가 머지 전 반드시 해결되어야 합니다.
  > 
  > **Recommendation: REQUEST CHANGES**

- 💬 **정준용** (2026-03-24)
  > `dev-frontend` 대비 MR 308 실제 diff 기준으로는 위 4건이 가장 큰 회귀입니다.
  > 
  > - `P1` [route.ts](C:/SSAFY/S14P21D208/.codex-mr308/services/frontend/src/app/api/report/[stockId]/route.ts#L19): 기존 `/api/report/*` 실백엔드 프록시가 사라져서, mock 비활성화 환경에서는 기존 포트폴리오/report API 소비 경로가 전부 mock/404로 바뀝니다.
  > - `P1` [ReportsDetailPageClient.tsx](C:/SSAFY/S14P21D208/.codex-mr308/services/frontend/src/app/report/[stockId]/ReportsDetailPageClient.tsx#L21): 새 `/report/[stockId]` 페이지가 같은 파라미터를 report용 `stockId`이자 stock-detail용 `ticker`로 동시에 써서, 알림 진입과 종목상세 진입 중 최소 한쪽은 반드시 깨집니다.
  > - `P2` [DebateSection.tsx](C:/SSAFY/S14P21D208/.codex-mr308/services/frontend/src/app/report/components/DebateSection.tsx#L375): 페이지를 열기만 해도 전체 토론 TTS를 선생성해서 비용과 첫 재생 대기시간이 과도합니다.
  > - `P2` [route.ts](C:/SSAFY/S14P21D208/.codex-mr308/services/frontend/src/app/api/report/tts/route.ts#L36): TTS 프록시가 인증/제한 없이 공개되어 ElevenLabs 크레딧을 외부에서 직접 소모시킬 수 있습니다.
  > 
  > 검토는 GitLab MR 페이지가 로그인 화면으로 리다이렉트되어 `origin/dev-frontend..origin/mr-308-head` 실제 diff로 진행했습니다. 확인 중 `pnpm lint`는 `C:\SSAFY\S14P21D208\.codex-mr308\services\frontend`에 `node_modules`가 없어 실행하지 못했습니다.

- 💬 **최규직** (2026-03-24)
  > 최신 `origin/dev-frontend` 기준으로 보면, 이번 MR에서 실연동 관점으로 머지 전에 확인해야 할 이슈는 2건입니다.
  > 
  > ## High
  > 
  > 1. `/api/report/*` route가 env와 무관하게 mock 응답만 반환하도록 바뀌어서, 실환경에서 backend 연동이 완전히 끊깁니다.\
  >    `services/frontend/src/app/api/report/[stockId]/route.ts:13-33`, `services/frontend/src/app/api/report/[stockId]/performance/route.ts:13-25`, `services/frontend/src/app/api/report/[stockId]/performance/trades/route.ts:13-45` 를 보면 기존의 `shouldUseMock()` / `getApiBaseUrl()` 분기가 제거되고 upstream fetch도 모두 사라졌습니다.\
  >    그래서 `NEXT_PUBLIC_USE_API_MOCK=false` 로 배포해도 실제 backend(`/api/report/...`)를 절대 호출하지 않고, mock 데이터만 내려주거나 mock seed가 없으면 404를 반환합니다. 이건 "mock 데이터가 있다"는 수준이 아니라, 실연동 경로 자체가 사라진 회귀입니다.
  > 2. report 페이지는 backend 계약상 `stockId`를 받아야 하는데, 실제 진입 경로 중 일부는 여전히 ticker를 넘기고 있습니다.\
  >    backend는 `services/backend/src/main/java/com/sallaemallae/backend/domain/report/controller/ReportController.java:28-59` 에서 `@PathVariable Long stockId` 를 받습니다. 반면 frontend는 `services/frontend/src/app/stocks/[ticker]/components/StockAnnouncementsSection.tsx:42-47` 과 `services/frontend/src/app/report/components/ReportIndexList.tsx:3-15` 에서 `/report/${ticker}` 형태로 진입시키고 있습니다.\
  >    현재 report 페이지/훅은 이 값을 그대로 `/api/report/${stockId}` 로 넘기므로(`services/frontend/src/app/report/[stockId]/page.tsx:13-25`, `services/frontend/src/app/report/api/getDebateReports.ts:4-12`), 실환경에서는 ticker(예: `005930`)를 backend의 numeric stockId로 해석하게 됩니다. notifications 경로처럼 실제 `stockId`를 넘기는 진입점은 맞지만(`services/frontend/src/app/notifications/NotificationsPageClient.tsx:268-272`), stock 상세/리포트 인덱스에서 들어오면 잘못된 종목을 조회하거나 404가 날 가능성이 큽니다.

- 💬 **이혜민** (2026-03-24)
  > ## MR #308 코드리뷰: report 상세 페이지 및 토론/TTS/성과 시각화 구현
  > 
  > **작성자:** 송민경 | **변경 파일:** 58개 | **브랜치:** `feature/fe/discussion-ui` → `dev-frontend` **이슈:** S14P21D208-197
  > 
  > ---
  > 
  > ### 전체 평가: :white_check_mark: 대규모 기능 구현, 전반적으로 잘 구성됨
  > 
  > 리포트 상세 페이지 전체를 새로 구현한 대형 MR입니다. 컴포넌트 분리, 타입 정의, API 레이어 분리 등 구조가 잘 잡혀 있습니다.
  > 
  > ---
  > 
  > ### :thumbsup: 좋은 점
  > 
  > 1. **컴포넌트 분리** — Hero, Performance, Debate, Chairman, Events 등 섹션별로 깔끔하게 분리
  > 2. **타입 안전성** — `types/debate.ts`, `types/report.ts`로 타입을 별도 관리
  > 3. **API 레이어 분리** — `api/getDebateReports.ts`, `api/getInvestmentPerformance.ts` 등 API 함수 개별 파일로 분리
  > 4. **Skeleton/에러 처리** — 각 섹션별 로딩/에러 상태 처리
  > 5. **SVG 차트 직접 구현** — 라이브러리 의존 없이 가볍게 구현
  > 6. **TTS route에서 API 키 서버사이드 처리** — 클라이언트에 키 노출 방지
  > 
  > ---
  > 
  > ### :mag: 개선 제안
  > 
  > **1. API route에서 upstream 프록시 제거 → mock 전용으로 전환 (중요도: :red_circle: 높음)**
  > 
  > `/api/report/[stockId]/route.ts`, `performance/route.ts`, `trades/route.ts` 모두 기존 backend 프록시 로직을 제거하고 mock 데이터만 반환하도록 변경되었습니다. 이 상태로 머지하면 **실제 백엔드 연동이 끊깁니다**. mock → 실서버 전환 계획이 있는지 확인이 필요합니다.
  > 
  > **2. TTS route에서 입력값 길이 제한 없음 (중요도: :yellow_circle: 중)**
  > 
  > `/api/report/tts/route.ts`에서 `text` 파라미터에 길이 제한이 없습니다. ElevenLabs API 비용이 텍스트 길이에 비례하므로, 악의적으로 긴 텍스트를 보내면 비용 폭발이 가능합니다.
  > 
  > ```ts
  > // 제안: 최대 길이 제한 추가
  > 
  > 
  > const MAX_TTS_TEXT_LENGTH = 2000;
  > if (text.length > MAX_TTS_TEXT_LENGTH) {
  >   return NextResponse.json({ message: "Text too long" }, { status: 400 });
  > }
  > ```
  > 
  > **3. TTS route에 인증/rate limiting 없음 (중요도: :yellow_circle: 중)**
  > 
  > /api/report/tts는 POST 엔드포인트인데 인증 체크가 없습니다. 외부에서 직접 호출 가능하여 ElevenLabs 크레딧을 소진시킬 수 있습니다.
  > 
  > **4. ReportsDetailPageClient 내 파생 상태 과다 (중요도: :yellow_circle: 중)**
  > 
  > ReportsDetailPageClient.tsx에서 20개 이상의 변수를 컴포넌트 본문에서 계산하고 있습니다. 커스텀 훅(useReportPageData)으로 추출하면 가독성이 개선됩니다.
  > 
  > **5. InvestmentPerformanceSection.tsx가 489줄 (중요도: :green_circle: 낮음)**
  > 
  > 차트 빌드 로직(buildPerformanceChartData, buildChartSeries 등)을 별도 util 파일로 분리하면 컴포넌트 파일이 더 관리하기 쉬워집니다.
  > 
  > **6. voiceId 매핑 중첩 삼항 (중요도: :green_circle: 낮음)**
  > 
  > ```
  > // 현재: 중첩 삼항
  > 
  > 
  > const voiceId = speaker === "chart" ? ... : speaker === "news" ? ... : ...
  > 
  > // 제안: Record 사용
  > 
  > 
  > const VOICE_ID_MAP: Record<SpeakerId, string> = {
  >   chart: "ELEVENLABS_VOICE_ID_CHART",
  >   news: "ELEVENLABS_VOICE_ID_NEWS",
  >   fund: "ELEVENLABS_VOICE_ID_FUND",
  >   judge: "ELEVENLABS_VOICE_ID_JUDGE",
  > };
  > const voiceId = readEnvValue(VOICE_ID_MAP[speaker]);
  > ```
  > 
  > **7. reports → report 경로 변경 (중요도: :green_circle: 확인사항)**
  > 
  > notificationFormatters.ts에서 /reports/ → /report/로 변경되었는데, 다른 곳에서 아직 /reports/ 경로를 참조하는 곳이 없는지 확인 필요합니다.
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 컴포넌트 구조 | :white_check_mark: (섹션별 분리 잘 됨) |
  > | 타입 안전성 | :white_check_mark: |
  > | API 레이어 | :warning: mock 전용으로 전환됨 - 의도 확인 필요 |
  > | 보안 | :warning: TTS route 길이제한/인증 부재 |
  > | 코드 스타일 | :white_check_mark: |
  > | 성능 | :white_check_mark: (SVG 직접 구현으로 번들 경량화) |
  > 
  > 기능 완성도는 높으나, **1번(mock 전용 전환)과 2\~3번(TTS 보안)**은 머지 전 확인/보완이 필요합니다.

- 💬 **강지석** (2026-03-24)
  > # Code Review: `[FE] Feat: S14P21D208-197 report 상세 페이지 및 토론/TTS/성과 시각화`
  > 
  > - **브랜치**: `feature/fe/discussion-ui`
  > - **대상**: `origin/dev-frontend..origin/feature/fe/discussion-ui`
  > - **규모**: 58 files changed, ~4,899 insertions, ~283 deletions
  > - **리뷰 일시**: 2026-03-24
  > 
  > ---
  > 
  > ## CRITICAL
  > 
  > ### 1. `DebateSection.tsx` — 1,419줄 모놀리스
  > 
  > 단일 컴포넌트에 오디오/비디오/TTS/타이머/애니메이션/UI 렌더링이 전부 들어있음. `useState`만 **20개**. 반드시 분리 필요:
  > 
  > - `useDebatePlayback` 커스텀 훅 (오디오/TTS 상태머신)
  > - 각 phase별 서브컴포넌트 (ReadyPhase, CommitteeStage, JudgeStage 등)
  > 
  > ### 2. `DebateSection.tsx` — Stale Closure 버그
  > 
  > `getCurrentBgmVolume()` (line ~897)가 일반 함수로 선언되어 `useEffect` 안의 async 루프에서 호출됨. `roundIntroTitle`, `phase` 값이 클로저에 캡처된 시점의 값으로 고정되어 **BGM 볼륨이 잘못된 값으로 동작**.
  > 
  > ### 3. `useDebateReports.ts` / `useLatestReport.ts` — Race Condition + 메모리 누수
  > 
  > `useEffect`에 `AbortController`가 없음. `stockId`가 빠르게 바뀌면:
  > 
  > - 이전 느린 요청이 나중에 resolve되어 **stale 데이터로 덮어씀**
  > - 언마운트 후 `setState` 호출 → React 경고
  > 
  > ```ts
  > // 이렇게 수정 필요
  > useEffect(() => {
  >   const controller = new AbortController();
  >   fetchData({ signal: controller.signal }).then(...)
  >   return () => controller.abort();
  > }, [stockId]);
  > ```
  > 
  > ### 4. API 라우팅 문제
  > 
  > `getLatestReport.ts`에서 `/api/v1/reports/${symbol}/latest`로 fetch하는데, Next.js API route handler도 없고 `next.config.ts`에 rewrite 설정도 없음. **프로덕션에서 404 발생할 가능성 높음**.
  > 
  > ---
  > 
  > ## HIGH
  > 
  > ### 5. `DebateSection.tsx` — `handleStart`/`handlePauseToggle` 언마운트 미처리
  > 
  > 둘 다 `async` 함수인데 `await` 중 컴포넌트 언마운트 시 `setState`가 호출됨. abort guard 필요.
  > 
  > ### 6. `ttsCache.ts` — `getAll()`로 전체 오디오 blob 메모리 로드
  > 
  > `trimPersistedTtsCache`에서 `store.getAll()` 호출 → 120개 오디오 blob을 전부 메모리에 올림. `count()` 먼저 체크 후 `index.openCursor()`로 오래된 것만 삭제해야 함.
  > 
  > ### 7. `InvestmentPerformanceSection.tsx` / `ReportEventsSection.tsx` — `Math.min(...arr)` 스택 오버플로우
  > 
  > `Math.min(...priceValues)`는 배열을 spread하므로 데이터가 수천 건이면 `RangeError`. reduce 방식으로 변경 필요:
  > 
  > ```ts
  > const min = priceValues.reduce((a, b) => Math.min(a, b), Infinity);
  > ```
  > 
  > ### 8. SVG gradient ID 충돌
  > 
  > `InvestmentPerformanceSection.tsx`의 `id="investment-performance-fill"`, `ReportEventsSection.tsx`의 `id="report-events-area-fill"` — 같은 페이지에 여러 인스턴스 렌더시 gradient가 깨짐. `useId()` 사용 권장.
  > 
  > ### 9. `types/debate.ts` — 정의해놓고 안 쓰는 타입들
  > 
  > `DebateSignal`, `DebateRole`, `DebatePhase` 정의했지만 실제 코드에서 안 씀. `chairman.signal`은 `string`인데 `DebateSignal`이어야 함. 컴포넌트에서는 자체 `SpeakerId`, `StagePhase`를 따로 정의해서 **타입 시스템이 이중화**됨.
  > 
  > ### 10. `getLatestReport.ts` — Path Traversal 위험
  > 
  > `symbol`이 URL 파라미터에서 직접 오는데 인코딩/검증 없이 URL에 삽입:
  > 
  > ```ts
  > // 위험
  > `/api/v1/reports/${symbol}/latest`
  > 
  > // 수정
  > `/api/v1/reports/${encodeURIComponent(symbol)}/latest`
  > ```
  > 
  > 최소 `/^\d{6}$/` 정규식 검증 필요.
  > 
  > ---
  > 
  > ## MEDIUM
  > 
  > ### 11. `SignalBadge.tsx` — 매매 신호 색상 반전
  > 
  > BUY → `tone="ok"` (초록색)으로 매핑했는데, **한국 주식 컨벤션에서 상승/매수는 빨간색**. 코드베이스 다른 곳에서는 `color-text-danger`(빨강)을 쓰고 있어서 색상이 불일치.
  > 
  > ### 12. `ReportHeroSection.tsx` — 항상 상승 표시
  > 
  > `▲`와 빨간색이 하드코딩됨. 주가 하락 시에도 상승으로 표시되는 **버그**.
  > 
  > ### 13. `ReportTopBarSection.tsx` — 버튼에 onClick 없음
  > 
  > "관심종목", "알림 설정" 버튼이 렌더링만 되고 클릭 핸들러가 없음. disabled 처리나 `onClick` 구현 필요.
  > 
  > ### 14. `ChairmanAnalysisSection.tsx` — verdict 색상 하드코딩
  > 
  > BUY/SELL/HOLD 상관없이 항상 `color-text-warning`(노랑). 신호별 동적 색상 필요.
  > 
  > ### 15. `TradeHistoryModal.tsx` — 접근성 미비
  > 
  > - `role="dialog"`, `aria-modal="true"` 없음
  > - 포커스 트랩 없음 (Tab으로 모달 밖으로 나갈 수 있음)
  > - Escape 키 핸들링이 부모 컴포넌트에만 있음
  > 
  > ### 16. `ReportDebateSection.tsx` — O(n²) 연산
  > 
  > render 루프 안에서 `timelineItems.slice(0, index+1).filter(...)` → O(n) × n회. running counter로 변경 필요.
  > 
  > ### 17. `ChairmanAnalysisSection.tsx` — 불필요한 `"use client"`
  > 
  > hooks/이벤트 핸들러/브라우저 API 전혀 없는 순수 프레젠테이션 컴포넌트. Server Component로 가능 → JS 번들 절감.
  > 
  > ### 18. Mock 데이터 프로덕션 번들 포함
  > 
  > `mockDebateReportData.ts`, `mockReportPageData.ts` (~600줄)가 tree-shaking 없이 프로덕션에 포함될 수 있음. `process.env.NODE_ENV` 가드 또는 별도 mock 디렉토리 분리 필요.
  > 
  > ### 19. `ReportEventsSection.tsx` — 이벤트 26개 초과 시 버그
  > 
  > `String.fromCharCode(65 + index)`는 A~Z(26개)만 유효. 27번째부터 `[`, `\` 등이 렌더됨.
  > 
  > ---
  > 
  > ## LOW
  > 
  > - `DebateSection.tsx` line 12: `companyName` prop 받지만 사용 안 함 (dead parameter)
  > - `ReportIndexList.tsx`: 종목 코드 하드코딩 + 종목명 없이 코드만 표시
  > - `ReportHeroSection.tsx`: `♥` 기호에 `aria-hidden="true"` 없음
  > - `useTradeHistory.ts` / `getTradeHistory`: default `limit` 불일치 (100 vs 10)
  > - 날짜 포맷 함수가 3개 이상 파일에 중복 — 공통 유틸로 추출 권장
  > - `TradeHistoryResponse`에 pagination 메타 (`totalCount`, `hasMore`) 없음
  > - `ttsCache.ts`에 `"use client"` 불필요 — `typeof window` 가드만으로 충분
  > 
  > ---
  > 
  > ## 아키텍처 / 공통
  > 
  > | 항목 | 상태 |
  > |------|------|
  > | Error Boundary | 없음 — 차트 렌더 에러 시 전체 페이지 크래시 |
  > | `loading.tsx` / Suspense | 없음 — Next.js streaming 미활용 |
  > | `React.memo` | 서브컴포넌트(`MetricCard`, `SignalTooltip` 등) 전혀 없음 — hover마다 전체 리렌더 |
  > | SEO (`generateMetadata`) | 리포트 페이지에 메타데이터 미설정 |
  > | 인증 헤더 | API fetch에 토큰/쿠키 전달 없음 — 인증 필요 시 401 발생 |
  > | 캐싱 | `cache: "no-store"` 일괄 적용 — 주기적 갱신 데이터에는 `revalidate` 적절 |
  > 
  > ---
  > 
  > ## 머지 전 필수 수정 (블로커)
  > 
  > 1. **`DebateSection.tsx` 분리** — 최소 커스텀 훅 + phase별 컴포넌트
  > 2. **AbortController 적용** — `useDebateReports`, `useLatestReport` 등 모든 fetch hook
  > 3. **API 라우팅 확인** — `/api/v1/reports/...` 경로가 실제 동작하는지 확인 (rewrite 또는 route handler)
  > 4. **`ReportHeroSection` 상승/하락 분기** — 현재 항상 상승으로 표시되는 버그
  > 
  > 나머지는 우선순위에 따라 후속 처리 가능.

---

### !309 · [BE] Fix: S14P21D208-220 S14P21D208-221 S14P21D208-222 report API 응답 및 검증 보정

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `fix/be/report-api-220-221-222` → `dev-backend`
- 생성: 2026-03-24 · 머지: 2026-03-24
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/309](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/309)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> report API의 성과 차트 기간, debate 응답 파싱, 잘못된 stockId 404 처리까지 한 번에 보정했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - `S14P21D208-220`
>   - `/api/report/{stockId}/performance`의 `chart` 응답이 `2025-01-01` 이후 데이터만 포함하도록 수정
> - `S14P21D208-221`
>   - report 응답에서 `debate.rounds`, `final_stances`가 빈 배열로 내려오던 문제 수정
>   - AI 최신 저장 포맷(object 형태의 `final_stances`, `debate_full_log.rounds.opinions`)도 파싱 가능하도록 보강
> - `S14P21D208-222`
>   - 존재하지 않는 `stockId` 접근 시 `STOCK_NOT_FOUND(404)` 반환하도록 처리
>   - 적용 대상:
>     - `/api/report/{stockId}`
>     - `/api/report/{stockId}/performance`
>     - `/api/report/{stockId}/performance/trades`
> 
> 추가 작업:
> - `ReportServiceImplTest` 추가
>   - performance chart 날짜 필터 회귀 테스트
>   - object 형태 debate 데이터 파싱 테스트
>   - 존재하지 않는 stockId 404 테스트
> 
> 검증:
> - `./mvnw -q -Dtest=ReportServiceImplTest test` 통과
> 
> ## 📎 Issue 번호
> - S14P21D208-220
> - S14P21D208-221
> - S14P21D208-222

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-24)
  > ## MR #309 코드리뷰: report API 응답 및 검증 보정
  > 
  > **작성자:** 최규직 | **변경 파일:** 3개 | **브랜치:** `fix/be/report-api-220-221-222` → `dev-backend` **이슈:** S14P21D208-220, 221, 222
  > 
  > ---
  > 
  > ### 전체 평가: :white_check_mark: 좋음 (몇 가지 개선 포인트 있음)
  > 
  > 3개 이슈를 하나의 MR로 묶었지만, 변경 범위가 하나의 서비스 파일에 집중되어 있어 응집도는 괜찮습니다. AI 응답의 다양한 JSON 포맷을 방어적으로 파싱하는 접근이 적절합니다.
  > 
  > ---
  > 
  > ### :thumbsup: 좋은 점
  > 
  > 1. **방어적 JSON 파싱** — `final_stances`가 array/object 모두 올 수 있는 상황을 깔끔하게 분기 처리
  > 2. **유틸 메서드 분리** — `firstNonBlank`, `personaDisplayName`, `joinJsonText`, `appendSection` 등 재사용 가능한 헬퍼로 분리
  > 3. **`existsBy` 쿼리 활용** — 404 검증에 엔티티 전체를 로드하지 않고 `existsByIdAndIsActiveTrue` 사용 → 효율적
  > 4. **테스트 커버리지** — 차트 날짜 필터, object 형태 파싱, 404 케이스 모두 검증
  > 5. **`PERFORMANCE_CHART_START_DATE` 상수화** — 매직넘버 제거
  > 
  > ---
  > 
  > ### :mag: 개선 제안
  > 
  > **1. `roundNumbers`에서 `contains` 호출이 O(n) (중요도: :yellow_circle: 중)**
  > 
  > ```java
  > roundNumbers.addAll(summaryByRoundAndAgent.keySet());
  > opinionByRoundAndAgent.keySet().stream()
  >     .filter(roundNo -> !roundNumbers.contains(roundNo))  // ArrayList.contains = O(n)
  >     .forEach(roundNumbers::add);
  > ```
  > 
  > agentNames도 동일한 패턴입니다. 데이터가 작아서 실질적 성능 문제는 없겠지만, LinkedHashSet을 쓰면 순서 보장 + O(1) lookup이 됩니다.
  > 
  > **2. validateActiveStock의 N+1 가능성 (중요도: :yellow_circle: 중)**
  > 
  > getReportHistory, getPerformance, getPerformanceTrades 세 API 모두 진입 시 validateActiveStock을 호출합니다. 하나의 페이지에서 이 3개 API를 동시에 호출하면 동일 stockId에 대해 EXISTS 쿼리가 3번 나갑니다. 현재 구조에서 큰 문제는 아니지만, 트래픽이 늘면 캐싱이나 facade 레벨에서 한 번만 검증하는 방식을 고려할 수 있습니다.
  > 
  > **3. personaDisplayName 하드코딩 (중요도: :green_circle: 낮음)**
  > 
  > return switch (persona) { case "fundamental" -\> "펀더멘탈 위원"; case "chart" -\> "차트 위원"; case "news" -\> "뉴스 위원"; default -\> persona; }; 현재 3개로 충분하지만, 향후 AI 측에서 페르소나가 추가되면 이 매핑도 같이 수정해야 합니다. 당장은 괜찮으나, AI 쪽과 페르소나 목록이 공유되는 구조(DB 또는 설정)를 고려해볼 수 있습니다.
  > 
  > **4. 테스트에서 리플렉션 사용 (중요도: :green_circle: 낮음)**
  > 
  > AiDebateReport 생성 시 getDeclaredConstructor + setField 리플렉션을 사용하고 있습니다. 테스트 전용 빌더나 @Builder 추가가 가능하다면 유지보수성이 올라갑니다. 엔티티에 빌더 추가가 부담스러우면 현행 유지도 괜찮습니다.
  > 
  > **5. buildOpinionText에서 StringBuilder 대신 String.join 고려 (중요도: :green_circle: 낮음)**
  > 
  > appendSection으로 하나씩 붙이는 대신 non-blank 섹션을 리스트에 모아 String.join("\\n", sections)으로 처리하면 좀 더 간결해질 수 있습니다.
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 로직 정확성 | :white_check_mark: |
  > | 에러 처리 | :white_check_mark: (404 처리 적절) |
  > | JSON 파싱 방어 | :white_check_mark: (array/object 모두 대응) |
  > | 테스트 | :white_check_mark: (핵심 케이스 커버) |
  > | 코드 스타일 | :white_check_mark: |
  > | 성능 | :warning: 경미 (LinkedHashSet 권장) |
  > 
  > 머지해도 좋은 수준입니다. 1번(LinkedHashSet)은 간단한 수정이니 반영하면 좋고, 나머지는 선택 사항입니다.

- 💬 **최규직** (2026-03-24)
  > 리뷰 반영했습니다.
  > 
  > - rounds / agents 합집합 계산에 LinkedHashSet 적용
  > - opinion 텍스트 조립 로직 String.join 기반으로 정리
  > 
  > validateActiveStock 중복 조회, persona 매핑 구조화, 테스트 리플렉션 제거는 이번 MR 범위를 넘는다고 판단해 우선 보류했습니다.

---

### !310 · [AI] Feat: S14P21D208-218 기존 stock_news URL 정규화 마이그레이션 스크립트 추가

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `fix/ai/news-url-normalize` → `dev-ai`
- 생성: 2026-03-24 · 머지: 2026-03-24
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/310](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/310)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 뉴스 크롤링 URL 정규화 + 기존 데이터 중복 제거 마이그레이션 스크립트
> 
> ## 🧑‍💻 MR 세부 내용
> ### 크롤링 코드 수정
> - `utils/url_normalizer.py` 신규: 네이버 금융 URL에서 종목별 파라미터(code, page, sm) 제거하여 정규화
> - `crawlers/daily.py`: 크롤링 시 정규화 URL로 중복 체크, 이미 존재하면 `stock_news_map`에 종목 매핑만 추가
> - `loaders/backfill_loader.py`, `loaders/csv_loader.py`: 동일하게 정규화 적용
> - `tests/test_url_normalizer.py`: 정규화 함수 단위 테스트
> 
> ### 기존 데이터 마이그레이션 (수동 SQL)
> - `1_data_pipeline/news/migration_stock_news_url_dedup.sql`
> - 기존 53만건 stock_news의 URL 정규화 후 중복 제거
> - stock_news_map, news_keyword_map 대표 row ID로 재매핑
> - 8단계 실행 + 단계별 검증 쿼리 포함
> - 기존 테이블은 _old로 보존 (서비스 확인 후 별도 삭제)
> 
> ### pipeline signal 수정
> - `keyword_worker.py`: pipeline signal status를 DONE으로 정상 업데이트하도록 수정
> 
> ## 📎 Issue 번호
> S14P21D208-218

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-24)
  > 최신 `origin/dev-ai` 기준으로 보면, 이번 MR에서 머지 전에 확인해야 할 이슈는 2건입니다.
  > 
  > ## High
  > 
  > 1. `stock_news_map` 병합 시 감성값을 임의의 한 row로 고정해서, 이미 계산된 `sentiment_score` / `sentiment_label`을 잃어버릴 수 있습니다.\
  >    `services/ai/1_data_pipeline/news/migration_stock_news_url_dedup.sql:107-118` 에서\
  >    `SELECT DISTINCT ON (snm.stock_id, m.representative_id) ... ORDER BY snm.stock_id, m.representative_id, snm.news_id`\
  >    로 대표 매핑 1건만 남기고 있는데, 이 정렬 기준이면 단순히 `news_id`가 가장 작은 row가 선택됩니다.\
  >    그런데 감성값은 nullable이고 후처리로 나중에 채워지는 구조라서(`services/ai/1_data_pipeline/news/models.py:85-88`, `services/ai/1_data_pipeline/news/processors/sentiment_analyzer.py:379-380`), 같은 `(stock_id, normalized_url)` 묶음 안에서 더 뒤에 들어온 중복 row에만 감성값이 채워져 있는 경우가 충분히 가능합니다. 지금 방식대로면 null sentiment를 대표값으로 남기고 실제 계산된 감성 데이터를 버릴 수 있습니다.
  > 
  > ## Medium
  > 
  > 2. `stock_news_clean` 생성 방식이 `stock_news.id`의 시퀀스/기본값을 old 테이블과 엮어둘 위험이 있습니다.\
  >    `services/ai/1_data_pipeline/news/migration_stock_news_url_dedup.sql:81` 에서 `CREATE TABLE stock_news_clean (LIKE stock_news INCLUDING ALL);` 를 사용하고, 이후 `services/ai/1_data_pipeline/news/migration_stock_news_url_dedup.sql:213-219` 에서 기존 테이블을 `_old`로 남긴 뒤, `services/ai/1_data_pipeline/news/migration_stock_news_url_dedup.sql:266-269` 에서 나중에 old 테이블을 수동 삭제하라고 안내하고 있습니다.\
  >    Postgres에서 serial/bigserial 컬럼에 `LIKE INCLUDING ALL` 을 쓰면 default `nextval(...)` 이 원본 시퀀스를 그대로 참조하는 형태로 복사될 수 있어서, `stock_news_old` 를 나중에 삭제할 때 그 시퀀스 ownership까지 같이 정리되면 현재 운영 중인 `stock_news` 의 자동 증가가 깨질 수 있습니다. `stock_news.id` default/sequence ownership을 교체 후 명시적으로 점검하거나, 새 시퀀스를 분리해서 연결하는 단계가 필요해 보입니다.

- 💬 **최규직** (2026-03-24)
  > 최신 `origin/dev-ai` 기준으로 다시 보면, 지난번에 말씀드린 `sentiment` 보존/시퀀스 ownership 문제는 후속 커밋에서 보완된 것으로 보입니다. 다만 이번 MR에는 아직 아래 2건이 남아 있습니다.
  > 
  > ## High
  > 
  > 1. 마이그레이션의 URL 정규화 규칙이 현재 애플리케이션의 실제 정규화 규칙과 다르기 때문에, 일부 기존 중복 기사가 그대로 남을 수 있습니다.\
  >    `services/ai/1_data_pipeline/news/migration_stock_news_url_dedup.sql:42-60` 을 보면 네이버 금융 URL에 대해 `code/page/sm` 파라미터만 `regexp_replace` 로 제거하고, 남은 query string의 파라미터 순서는 그대로 둡니다.\
  >    그런데 실제 런타임 정규화 로직은 `services/ai/1_data_pipeline/news/utils/url_normalizer.py:16-30` 에서 `article_id`, `office_id` 만 추려서 `sorted(filtered.items())` 로 재조합하고 있고, 테스트도 `services/ai/1_data_pipeline/news/tests/test_url_normalizer.py:24-28` 에서 "파라미터 순서가 달라도 동일하게 정규화"되는 걸 계약으로 잡고 있습니다.\
  >    즉 `...?article_id=...&office_id=...&code=...` 와 `...?office_id=...&article_id=...&code=...` 는 현재 파이프라인에서는 동일 기사로 취급되는데, 이번 migration은 서로 다른 URL로 남겨둘 수 있습니다. 마이그레이션도 애플리케이션과 동일한 정규화 함수를 따르도록 맞추지 않으면, 과거 데이터의 dedup 결과와 이후 적재 결과가 달라집니다.
  > 
  > ## Medium
  > 
  > 1. 스크립트 설명은 "단계별로 하나씩 실행"하라고 되어 있는데, 실제 구현은 세션 스코프 `TEMP TABLE` 에 의존해서 운영 절차상 실패하기 쉽습니다.\
  >    상단 주석 `services/ai/1_data_pipeline/news/migration_stock_news_url_dedup.sql:3` 에서는 단계별 실행/검증을 안내하고 있지만, 핵심 매핑 테이블은 `services/ai/1_data_pipeline/news/migration_stock_news_url_dedup.sql:42` 의 `CREATE TEMP TABLE url_normalize_map` 으로 만들어집니다. 이후 STEP 2\~4도 이 테이블을 계속 참조합니다 (`:86`, `:117`, `:153`).\
  >    `TEMP TABLE` 은 세션이 끊기면 바로 사라지기 때문에, 운영자가 정말로 step-by-step으로 끊어서 실행하거나 세션이 한 번만 재연결돼도 다음 단계에서 `url_normalize_map does not exist` 로 실패합니다. 안내 문구를 "같은 세션에서 순차 실행"으로 명확히 바꾸거나, 아예 임시 영구 테이블로 만들어 두는 편이 안전합니다.

- 💬 **최규직** (2026-03-24)
  > 최신 `origin/dev-ai` 기준으로 다시 보면, 지난번에 말씀드린 `sentiment` 보존 문제와 `TEMP TABLE` 운영 문제는 후속 커밋에서 잘 보완됐습니다. 다만 아직 머지 전에 확인해야 할 이슈가 1건 남아 있습니다.
  > 
  > ## High
  > 
  > 1. 마이그레이션의 "앱 로직과 동일한 URL 정규화"가 아직 완전히 같지 않아서, `article_id`/`office_id` 가 없는 legacy URL이 있으면 서로 다른 기사들이 하나로 합쳐질 수 있습니다.\
  >    `services/ai/1_data_pipeline/news/migration_stock_news_url_dedup.sql:29-32,49-58` 를 보면 네이버 금융 URL이면 무조건\
  >    `...?article_id=<값>&office_id=<값>` 형태로 재조합하고, 값이 없으면 빈 문자열로 채웁니다.\
  >    그래서 `article_id` 나 `office_id` 가 빠진 URL은 `...news_read.naver?article_id=&office_id=` 로 정규화됩니다. 서로 다른 malformed URL이어도 같은 값으로 뭉개질 수 있습니다.\
  >    반면 실제 앱 로직은 `services/ai/1_data_pipeline/news/utils/url_normalizer.py:26-32` 에서 `article_id` / `office_id` 를 추출했을 때만 정규화하고, 없으면 원본 URL을 그대로 반환합니다. 이 동작은 `services/ai/1_data_pipeline/news/tests/test_url_normalizer.py:58-61` 에서도 테스트로 고정돼 있습니다.\
  >    즉 이번 스크립트는 "앱과 동일"하다고 주석에 적혀 있지만, 파라미터가 없는/불완전한 네이버 금융 URL에 대해서는 더 공격적으로 합쳐 버립니다. 운영 데이터에 그런 row가 조금이라도 있으면 조용히 과도한 dedup이 일어날 수 있습니다.
  > 
  > 이번 후속 커밋 범위에서는 그 외에 추가로 blocking 수준의 이슈는 더 보이지 않았습니다.

- 💬 **최규직** (2026-03-24)
  > 최신 `origin/dev-ai` 기준으로 다시 보면, 지난번에 말씀드린 `sentiment` 보존 / `TEMP TABLE` / `article_id·office_id` 둘 다 없는 URL 처리 문제는 후속 커밋에서 반영된 것으로 보입니다. 다만 아직 아래 1건은 확인하고 머지하는 편이 안전합니다.
  > 
  > ## Medium
  > 
  > 1. 마이그레이션의 URL 정규화 조건이 앱 로직과 아직 100% 같지는 않습니다.\
  >    `services/ai/1_data_pipeline/news/migration_stock_news_url_dedup.sql:29-35,51-59` 는 `article_id` 와 `office_id` 가 **둘 다 있을 때만** 정규화하고, 하나라도 없으면 원본 URL을 그대로 둡니다.\
  >    반면 실제 앱 로직은 `services/ai/1_data_pipeline/news/utils/url_normalizer.py:25-30` 에서 `article_id` / `office_id` 중 **하나라도 추출되면** `filtered` 를 그대로 `urlencode(sorted(...))` 해서 정규화합니다. 즉 legacy 데이터에 `article_id` 만 있거나 `office_id` 만 있는 네이버 금융 URL이 있다면, 마이그레이션 결과와 이후 파이프라인 적재 결과가 달라질 수 있습니다.\
  >    운영 데이터에 그런 케이스가 없다는 확신이 있으면 괜찮지만, "앱 로직과 동일"을 목표로 한다면 SQL 쪽도 `둘 다`가 아니라 `하나라도 있으면` 동일하게 정규화하는 편이 맞습니다.
  > 
  > 이번 후속 커밋 범위에서는 그 외에 추가로 blocking 수준의 이슈는 더 보이지 않았습니다.

- 💬 **최규직** (2026-03-24)
  > 최신 `origin/dev-ai` 기준으로 다시 보면, 이번 후속 커밋 범위에서는 추가로 blocking 수준의 이슈는 보이지 않았습니다.
  > 
  > ## No Findings
  > 
  > 1. 직전 리뷰에서 말씀드렸던 `article_id` / `office_id` 부분 정규화 불일치는 이번 후속 커밋에서 해소된 것으로 보입니다.\
  >    `services/ai/1_data_pipeline/news/utils/url_normalizer.py:25-30` 가 이제 `article_id` 와 `office_id` 가 **둘 다 있을 때만** 정규화하도록 바뀌었고,\
  >    `services/ai/1_data_pipeline/news/migration_stock_news_url_dedup.sql:29-35,51-59` 도 같은 조건을 사용하고 있어서 앱 로직과 마이그레이션 SQL이 맞춰졌습니다.
  > 2. 관련 단위 테스트도 후속 커밋에서 보강됐고, `test_url_normalizer.py` 기준으로 11개 테스트가 모두 통과하는 것까지 확인했습니다.\
  >    확인한 테스트 파일: `services/ai/1_data_pipeline/news/tests/test_url_normalizer.py`
  > 
  > ## Residual Risk
  > 
  > 1. 이번 리뷰는 정적 검토 + URL 정규화 테스트 확인 기준입니다.\
  >    실제 Postgres에서 마이그레이션 SQL 전체를 실행해 보진 못해서, 운영 적용 전에는 스테이징 DB에서 한 번 돌려보고 `stock_news_clean` / `stock_news_map_clean` / `news_keyword_map_clean` 건수 검증까지 같이 보는 걸 권장합니다.

---

### !311 · [FE] fix : S14P21D208-136 종목 상세 api 수정

- 작성자: **정준용** · 상태: `merged`
- 브랜치: `fix/fe/portfolio-ui` → `dev-frontend`
- 생성: 2026-03-24 · 머지: 2026-03-24
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/311](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/311)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 포트폴리오/종목 상세/알림 연동을 실제 API 스펙에 맞게 정리하고, 종목 리스트 모션과 실시간 현재가 SSE 경로를 dev-frontend 기준으로 보완했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - 포트폴리오 메인 API를 서버 응답 스펙 기준으로 다시 정규화했습니다.
> - `/api/portfolio/chairman` 응답의 `summary`, `signal_summary`, `popular_signals`, `holdings`, `today_trades`, `monthly_returns`를 프론트 타입에 맞게 매핑했습니다.
> - 포트폴리오는 탭별 응답을 합쳐 쓰도록 정리했고, `todayTrades`, `monthlyReturns`의 필드명 차이를 프론트에서 흡수하도록 수정했습니다.
> - 명예의 전당은 `/api/portfolio/chairman/hall-of-fame` 별도 API 기준으로 분리 조회하도록 구성했습니다.
> - 포트폴리오 상단 지표는 `summary` 값을 반영하고, 값이 없으면 `?%`, `?%p`, `?개`로 안전하게 표시되도록 유지했습니다.
> - 종목 상세 API는 서버 응답 래퍼(`success/data/error`)를 언랩하도록 정리했습니다.
> - 종목 기본 정보와 개요 API를 조합해 overview를 구성하도록 변경했습니다.
> - 종목 차트는 `/api/stocks/{ticker}/prices?candle_type=...` 기준으로 연동했고, candle type은 `MINUTE|DAILY|WEEKLY|MONTHLY|YEARLY`로 맞췄습니다.
> - 실시간 현재가는 `/api/stream/stocks/{ticker}/quote` SSE만 사용하도록 수정했습니다.
> - 종목 상세 차트는 초기 로딩 시 그래프 형태의 스켈레톤을 보여주도록 변경했습니다.
> - 차트 줌 로직은 초기 표시 범위보다 더 좁게는 축소되지 않도록 제한했고, 범위를 넓힐 때는 최신 데이터 기준으로 확장되도록 조정했습니다.
> - 종목 상세 섹션 로딩은 블러 + 오버레이 메시지 구조로 통일했습니다.
> - 매매신호 API는 `success/data/error` 래퍼 응답과 `stock_id`, `fluctuation_rate`, `created_at` 같은 서버 필드명에 맞게 타입/매핑을 수정했습니다.
> - 알림 목록 API는 envelope 응답을 처리하고, `hasMore` 계산을 위해 `limit + 1` 조회 후 잘라 쓰는 구조로 정리했습니다.
> - 전체 종목 리스트 모션은 `origin/dev-frontend` 기준으로 복원했습니다.
> - 데스크톱/모바일 리스트 모두 `LayoutGroup + motion.article + layout=\"position\" + rowLayoutTransition` 방식으로 자연스럽게 재정렬되도록 변경했습니다.
> - `public/mockServiceWorker.js`의 불필요한 eslint-disable을 제거해 lint 경고를 정리했습니다.
> 
> ## 📎 Issue 번호
> S14P21D208-136 S14P21D208-58

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-24)
  > ## MR #311 코드리뷰: 종목 상세 API 수정 및 포트폴리오/알림/매매신호 실서버 연동
  > 
  > **작성자:** 정준용 | **변경 파일:** 49개 | **브랜치:** `fix/fe/portfolio-ui` → `dev-frontend` **이슈:** S14P21D208-136, S14P21D208-58
  > 
  > ---
  > 
  > ### 전체 평가: :white_check_mark: 대규모 API 정규화 작업, 전반적으로 견고함
  > 
  > 백엔드 실서버 응답 스펙에 맞춰 프론트엔드 전반을 정규화한 대형 MR입니다. envelope 언래핑, 필드명 매핑, null-safe 처리 등이 체계적으로 잘 되어 있습니다.
  > 
  > ---
  > 
  > ### :thumbsup: 좋은 점
  > 
  > 1. **`unwrapStockDetailResponse` 공통 헬퍼** — `success/data/error` envelope 처리를 한 곳에서 관리
  > 2. **`proxyPortfolioApiRequest` 프록시 유틸** — mock/실서버 분기를 깔끔하게 처리, 헤더 전달도 꼼꼼함
  > 3. **null-safe 타입 전환** — `PortfolioHolding`, `PortfolioTodayTrade` 등의 숫자 필드를 `number | null`로 변경하고 포맷터에서 `-` 폴백 처리
  > 4. **서버 필드명 흡수** — `tradeType/action`, `tradeTime/executedAt`, `monthlyReturn/portfolioReturnRate` 등 양쪽 필드명 모두 수용
  > 5. **차트 SSE 분리** — 가격 조회(`fetchStockPricePage`)와 실시간 시세(`subscribeStockQuoteStream`)를 명확히 분리
  > 6. **`StockSectionLoadingOverlay`** — 블러+메시지 로딩 패턴을 재사용 컴포넌트로 분리
  > 7. **알림 `hasMore` 개선** — `limit + 1` 조회 후 자르는 패턴으로 정확한 페이지네이션 판단
  > 
  > ---
  > 
  > ### :mag: 개선 제안
  > 
  > **1. `fetchAllPortfolioTabItems`의 무한 루프 위험 (중요도: :red_circle: 높음)**
  > 
  > ```ts
  > while (true) {
  >   const payload = await fetchPortfolioTabPage(tab, offset, PORTFOLIO_TAB_FETCH_LIMIT);
  >   ...
  > }
  > ```
  > 
  > totalCount가 null이고 매번 50개씩 계속 반환되면 무한 루프에 빠질 수 있습니다. 최대 반복 횟수(예: 20회 = 1000건) 제한을 추가하는 것을 권장합니다.
  > 
  > **2. alt 텍스트 인코딩 깨짐 (중요도: :yellow_circle: 중)**
  > 
  > PortfolioHero.tsx에서 이미지 alt가 깨져 있습니다:
  > 
  > alt="?섏옣 ?ы듃?대━??????쇰윭?ㅽ듃" 원래 "의장 포트폴리오 대표 일러스트"여야 합니다. 파일 인코딩 문제로 보이며, 접근성에 영향을 줍니다.
  > 
  > **3. StockAnnouncementsSection에서 report 경로 불일치 (중요도: :yellow_circle: 중)**
  > 
  > \<ProtectedLink href={`/reports/${ticker}`} ...\> MR #308에서 /reports/ → /report/로 변경했는데, 이 파일에서는 여전히 /reports/를 사용합니다. 경로 통일이 필요합니다.
  > 
  > **4. normalizeStockOverview에서 중첩 삼항 과다 (중요도: :yellow_circle: 중)**
  > 
  > 각 필드마다 typeof ... === "string" ? ... : typeof ... === "string" ? ... : "" 패턴이 반복됩니다. 헬퍼 함수로 추출하면 가독성이 크게 개선됩니다:
  > 
  > function firstString(...values: unknown\[\]): string { return values.find((v): v is string =\> typeof v === "string") ?? ""; } **5. shouldUseMockApi 함수 중복 (중요도: :green_circle: 낮음)**
  > 
  > connectStockPriceStream.ts와 page.tsx(report)에 동일한 shouldUseMockApi/shouldUseMockMode 함수가 각각 정의되어 있습니다. 공통 util로 추출하면 유지보수가 편해집니다.
  > 
  > **6. 포트폴리오에서 3개 탭을 Promise.all로 병렬 조회 (중요도: :green_circle: 낮음, 확인사항)**
  > 
  > ```
  > const [holdingsResult, todayTradesResult, monthlyReturnsResult] = await Promise.all([
  >   fetchAllPortfolioTabItems("HOLDINGS"),
  >   fetchAllPortfolioTabItems("TODAY_TRADES"),
  >   fetchAllPortfolioTabItems("MONTHLY_RETURNS"),
  > ]);
  > ```
  > 
  > 현재 구조상 첫 페이지 로딩 시 최소 3개 API 호출이 발생합니다. 각 탭이 페이지네이션되어 있으면 더 많아질 수 있습니다. 초기 로딩 성능에 영향이 있을 수 있으니, 실제 데이터 양을 고려해 필요 시 lazy loading을 검토해볼 수 있습니다.
  > 
  > **7. validPeriods에서 3M, 3Y 제거 (중요도: :green_circle: 확인사항)**
  > 
  > // 변경 전: \["1MIN", "1D", "1W", "1M", "3M", "1Y", "3Y"\]
  > 
  > // 변경 후: \["1MIN", "1D", "1W", "1M", "1Y"\]
  > 
  > 기존에 3M, 3Y를 사용하던 곳이 있다면 영향을 받을 수 있습니다.
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | API 정규화 | :white_check_mark: (envelope 언래핑 체계적) |
  > | null-safe 처리 | :white_check_mark: (타입 + 포맷터 모두 대응) |
  > | 필드명 호환성 | :white_check_mark: (양쪽 필드명 수용) |
  > | 코드 구조 | :white_check_mark: (프록시/헬퍼 분리 잘 됨) |
  > | 안정성 | :warning: fetchAll 무한루프 방어 필요 |
  > | 인코딩 | :warning: alt 텍스트 깨짐 수정 필요 |
  > | 경로 일관성 | :warning: `/reports/` vs `/report/` 불일치 |
  > 
  > **1번(무한루프 방어)과 2번(alt 깨짐), 3번(경로 불일치)**는 머지 전 수정을 권장합니다. 나머지는 선택 사항입니다.

- 💬 **최규직** (2026-03-24)
  > 최신 `origin/dev-frontend` 기준으로 보면, 이번 MR에서 실연동 관점으로 머지 전에 확인해야 할 이슈는 3건입니다.
  > 
  > ## High
  > 
  > 1. `1MIN` 차트가 "오늘 날짜"만 남기도록 필터링되어 있어서, 휴장일/장 시작 전에는 분봉이 통째로 비어버릴 수 있습니다.\
  >    `services/frontend/src/app/stocks/[ticker]/api/connectStockPriceStream.ts:74-77,113-118` 에서 분봉 응답을 무조건 `today` 기준으로 잘라내고 있습니다.\
  >    그런데 backend는 `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/StockPriceStreamServiceImpl.java:62-83` 에서 `MINUTE` 요청 시 "가장 최근 390개 분봉"을 내려줄 뿐, 오늘 데이터만 보장하지 않습니다.\
  >    그래서 주말/공휴일이나 평일 장 시작 전에는 backend가 정상적으로 최근 거래일 분봉을 내려줘도, frontend가 전부 걸러서 빈 차트를 만들 가능성이 큽니다.
  > 2. 종목 상세의 "AI 분석 리포트 보기" CTA가 여전히 legacy ticker 기반 리포트 경로를 타고 있어서, 현재 backend 계약과 맞지 않습니다.\
  >    `services/frontend/src/app/stocks/[ticker]/StockDetailPageClient.tsx:73,121-123` 를 보면 이번 브랜치에서 이미 `overviewQuery.data?.id` 를 받아오고 있는데도, 리포트 CTA에는 여전히 `ticker` 를 넘기고 있습니다.\
  >    실제 링크는 `services/frontend/src/app/stocks/[ticker]/components/StockAnnouncementsSection.tsx:44-49` 에서 `/reports/${ticker}` 로 이동하고, 그 페이지는 `services/frontend/src/app/reports/api/getLatestReport.ts:17-19` 에서 `/api/reports/${symbol}/latest` 를 호출합니다.\
  >    반면 현재 backend 리포트 API는 `services/backend/src/main/java/com/sallaemallae/backend/domain/report/controller/ReportController.java:21-59` 처럼 `/api/report/{stockId}` 계열만 제공합니다. 이번 MR에서 stock detail API를 손봤어도, 상세 페이지에서 리포트로 넘어가는 실제 연동 경로는 그대로 끊겨 있습니다.

---

### !316 · [BE] Perf: S14P21D208-218 뉴스 쿼리 GROUP BY url 서브쿼리 제거

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `feature/be/news-redis-total-count` → `dev-backend`
- 생성: 2026-03-24 · 머지: 2026-03-24
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/316](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/316)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 뉴스 목록 조회 쿼리 GROUP BY url 서브쿼리 제거로 성능 최적화
> 
> ## 🧑‍💻 MR 세부 내용
> - URL 중복 제거 마이그레이션 완료로 stock_news에 URL 중복이 없어져 서브쿼리 불필요
> - `findAllNews` / `countAllNews`: `id IN (SELECT MIN(id) ... GROUP BY url)` 서브쿼리 제거
> - `findNewsByKeyword` / `countNewsByKeyword`: 동일 서브쿼리 제거 + `EXISTS` 내 URL 조인을 `newsId` 직접 매칭으로 단순화
> - `findStockNamesByNewsIds`: URL 셀프조인(`JOIN StockNews sn2 ON sn2.url = sn.url`) 제거 → `stock_news_map` 직접 조회
> - Redis 캐시 키를 `news:total_count:{날짜}` 형태로 변경, startDate null + endDate 오늘일 때만 캐시 사용
> - 캐시 miss 시 DB fallback 후 Redis에 1일 TTL로 저장
> 
> ## 📎 Issue 번호
> S14P21D208-218

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-24)
  > 최신 `origin/dev-backend` 기준으로 보면, 이번 MR에서 머지 전에 확인해야 할 이슈는 1건입니다.
  > 
  > ## High
  > 
  > 1. 이 변경은 `stock_news` URL 정규화 마이그레이션이 **이미 운영 DB에 적용돼 있다는 전제**가 강하게 걸려 있는데, MR 자체에는 그 전제가 보장되지 않습니다.\
  >    `services/backend/src/main/java/com/sallaemallae/backend/domain/news/repository/StockNewsRepository.java:12-34` 에서 전체 뉴스 목록/카운트 쿼리의 `url` 기준 dedup 서브쿼리를 제거했고,\
  >    `services/backend/src/main/java/com/sallaemallae/backend/domain/news/repository/StockNewsRepository.java:36-75` 에서는 키워드 검색과 관련 종목 조회도 더 이상 같은 `url` 의 sibling row를 보지 않고 현재 `newsId` 에만 붙은 매핑만 사용하도록 바뀌었습니다.\
  >    그런데 이 동작이 안전해지려면, 별도 AI 마이그레이션인 `services/ai/1_data_pipeline/news/migration_stock_news_url_dedup.sql:91-164` 가 먼저 실행돼서 `stock_news`, `stock_news_map`, `news_keyword_map` 이 대표 row 기준으로 실제 재구성돼 있어야 합니다.\
  >    즉 이 MR이 dev-backend에 먼저 배포되거나, 운영 DB에 마이그레이션이 아직 안 들어간 상태면:
  >    - 뉴스 목록/`totalCount` 에 중복 기사 재노출
  >    - 키워드 검색 누락
  >    - 관련 종목명 일부 누락\
  >      이 한 번에 발생할 수 있습니다. 성능 개선 방향은 맞지만, 최소한 "마이그레이션 선적용" 전제가 MR 설명/배포 절차/가드 로직 중 하나에는 명시돼 있어야 안전합니다.
  > 
  > 이번 커밋 범위에서는 그 외에 추가로 blocking 수준의 이슈는 더 보이지 않았습니다.

- 💬 **이혜민** (2026-03-24)
  > > :warning: 전제 조건: stock_news URL 정규화 마이그레이션(migration_stock_news_url_dedup.sql)이 운영 DB에 적용된 상태여야 합니다. (적용 완료 확인됨)

---

### !319 · [BE] Feat: S14P21D208-214 관심종목 뉴스 API 리팩토링

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `feature/be/watchlist-news-api-refactor` → `dev-backend`
- 생성: 2026-03-24 · 머지: 2026-03-24
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/319](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/319)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 관심종목 뉴스 API를 /api/news와 동일한 구조로 리팩토링 (JPQL 전환 + 필터 추가)
> 
> ## 🧑‍💻 MR 세부 내용
> - Native query(Object[]) → JPQL + 엔티티 반환으로 전환 (publishedAt null 반환 방지)
> - /api/news와 동일한 응답 구조(totalCount + news[])로 통일
> - keyword, startDate, endDate, offset, limit 파라미터 추가
> - DISTINCT 제거 (URL 중복 제거 마이그레이션 완료 전제)
> - toOffsetDateTime() 헬퍼 삭제 (3곳 중복 코드 중 1곳 제거)
> - 미사용 WatchlistNewsResponse/WatchlistNewsItemResponse DTO 삭제
> - 테스트 6건 작성 (키워드 필터, 기간 필터, 빈 목록, 종목 매핑 등)
> 
> ⚠️ 전제 조건: stock_news URL 정규화 마이그레이션이 운영 DB에 적용된 상태여야 합니다. (적용 완료 확인됨)
> 
> ## 📎 Issue 번호
> S14P21D208-214

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-24)
  > 최신 `origin/dev-backend` 기준으로 보면, 이번 MR에서 머지 전에 확인해야 할 이슈는 1건입니다.
  > 
  > ## High
  > 
  > 1. 관심종목 뉴스 API 응답 DTO를 `NewsListResponse` 로 바꾸면서, 현재 프론트가 실제로 쓰고 있는 `summary` / `url` 필드가 사라져서 UI가 바로 퇴행합니다.\
  >    backend는 `services/backend/src/main/java/com/sallaemallae/backend/domain/user/controller/WatchlistController.java:88-97` 에서 `/api/users/watchlist/news` 응답 타입을 `NewsListResponse` 로 바꿨고, 실제 아이템도 `services/backend/src/main/java/com/sallaemallae/backend/domain/user/service/WatchlistServiceImpl.java:55-64` 에서 `NewsListItemResponse` 로 내려줍니다.\
  >    그런데 `services/backend/src/main/java/com/sallaemallae/backend/domain/news/dto/NewsListItemResponse.java:8-18` 를 보면 이 DTO에는 `title`, `publisher`, `publishedAt`, `relatedStocks` 만 있고, 기존 watchlist 응답이 갖고 있던 `snippet(summary)` 과 `url` 이 없습니다.\
  >    프론트는 아직 `services/frontend/src/app/scraps/api/getWatchlistNews.ts:42-59` 에서 `summary/snippet`, `source/publisher`, `url` 을 파싱하고 있고, `services/frontend/src/app/scraps/components/WatchlistNewsSection.tsx:36,52,59-61` 에서 요약문과 외부 링크를 그대로 사용합니다.\
  >    따라서 이 MR만 머지되면 관심종목 뉴스 카드에서 본문 요약은 빈 문자열로 내려가고, 원문 링크도 사라져서 클릭 가능한 카드가 일반 텍스트 카드로 바뀝니다. 응답을 공용 DTO로 바꾸더라도, 현재 프론트 계약에 맞는 `snippet/url` 을 유지하거나 프론트 변경이 같은 릴리즈에 같이 묶여야 합니다.
  > 
  > 이번 커밋 범위에서는 그 외에 추가로 blocking 수준의 이슈는 더 보이지 않았습니다.

- 💬 **이혜민** (2026-03-24)
  > ## 코드리뷰 대응
  > 
  > ### snippet/url 필드 누락 문제
  > 
  > → 수정 완료. NewsListResponse 공용 DTO 대신 WatchlistNewsResponse/WatchlistNewsItemResponse를 별도 유지하여 snippet, url 필드를 포함했습니다. 프론트 계약(summary, url, source)이 그대로 유지됩니다.
  > 
  > ### 변경 내용
  > 
  > - WatchlistNewsItemResponse: id, title, snippet, url, publisher, publishedAt, relatedStocks
  > - WatchlistNewsResponse: totalCount, news\[\]
  > - /api/news의 NewsListItemResponse와는 별도 DTO로 분리하여 각 API의 응답 필드를 독립적으로 관리

---

### !320 · [AI] Feat: S14P21D208-201 S14P21D208-204 daily debate-portfolio pipeline orchestrator 추가

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `feature/ai/daily-pipeline-orchestrator` → `dev-ai`
- 생성: 2026-03-24 · 머지: 2026-03-24
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/320](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/320)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 뉴스 완료 신호를 기준으로 토론/포트폴리오를 순차 실행하는 daily 오케스트레이터를 추가하고, 리뷰 반영으로 실패 재시도 정책과 거래일 기준 replay를 보강했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> 
> ### S14P21D208-201
> debate worker / backfill 최종 디버그 및 daily 자동화 보강
> 
> 추가:
> - `services/ai/4_debate_worker/daily_main.py`
> - `services/ai/4_debate_worker/worker/daily_orchestrator.py`
> - `services/ai/4_debate_worker/worker/pipeline_signal_store.py`
> 
> 동작:
> - `pipeline_signals`에서 당일 `NEWS_PIPELINE_DONE(status=DONE)` 확인
> - 포트폴리오 마지막 반영일 다음날부터 목표 날짜까지 토론 워커 순차 실행
> - 토론 완료 후 `DEBATE_PIPELINE_DONE` 기록
> 
> 리뷰 반영:
> - 토론 실패 시 즉시 `DONE` 처리하지 않고 `PIPELINE_STAGE_MAX_FAILURES` 횟수까지는 `FAILED`만 기록 후 다음 실행에서 재시도
> - 임계치 도달 시에만 `DONE`으로 마감
> - 토론 replay 날짜는 거래일(주말/고정 공휴일 제외) 기준으로만 생성
> 
> ### S14P21D208-204
> replay / 포트폴리오 산출 최종 디버그 및 daily append 보강
> 
> 변경:
> - `services/ai/3_ai_server/scripts/chairman_portfolio_daily.py`
> - 마지막 반영일 다음날부터 목표 날짜까지 replay 가능한 날짜를 전부 찾아 순차 `append_daily()` 수행
> - 누락 날짜가 있을 경우 목표 날짜 실행 시 함께 보정 가능
> 
> 리뷰 반영:
> - 포트폴리오 실패 시 즉시 `DONE` 처리하지 않고 `PIPELINE_STAGE_MAX_FAILURES`까지는 `FAILED`만 기록 후 재시도
> - 임계치 도달 시에만 `DONE`으로 마감
> - `assert summary is not None`를 명시적 예외로 변경
> 
> ### 데스크탑 실행 환경 정리
> - `services/ai/4_debate_worker/core/config.py`
> - `services/ai/4_debate_worker/.env.example`
> - `services/ai/4_debate_worker/requirements.txt`
> - `services/ai/4_debate_worker/README.md`
> - `services/ai/4_debate_worker/docs/personal_desktop_setup.md`
> 
> 추가/정리:
> - `AI_DB_URL`
> - `PIPELINE_STAGE_MAX_FAILURES`
> - 포트폴리오 스크립트 경로 / 이름 / 모델 버전 / 초기 자본 설정
> - `sqlalchemy`, `psycopg2-binary` 의존성
> 
> ### 운영 보강
> - `PipelineSignalStore`가 `business_date` 기준으로 `created_at/processed_at`을 기록하도록 보정
> - 포트폴리오 subprocess 실패 시 stderr/stdout을 함께 남겨 디버깅 용이성 개선
> 
> ### 테스트
> - `services/ai/4_debate_worker/tests/test_daily_orchestrator.py`
> 
> 검증 시나리오:
> - 뉴스 DONE -> 토론 + 포트폴리오 실행
> - debate DONE 존재 시 포트폴리오만 실행
> - 누락 날짜가 있을 때 거래일 기준 토론 순차 보충
> - 실패 임계치 전에는 `FAILED`만 기록하고 중단
> - 실패 임계치 도달 시 `FAILED` 후 `DONE` 기록
> 
> ## ✅ 검증
> - `python3 -m py_compile` 통과
> - 현재 환경에서는 시스템 Python에 `pydantic`가 없어 unittest 전체 실행은 불가
> - 로컬 venv에서는 아래 명령으로 확인 가능
>   - `pip install -r requirements.txt`
>   - `python -m unittest tests/test_runner.py tests/test_backfill_runner.py tests/test_daily_orchestrator.py`
> 
> ## 📎 Issue 번호
> - S14P21D208-201
> - S14P21D208-204

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-24)
  > ## MR #320 코드리뷰: daily debate-portfolio pipeline orchestrator 추가
  > 
  > **작성자:** 최규직 | **변경 파일:** 10개 | **브랜치:** `feature/ai/daily-pipeline-orchestrator` → `dev-ai` **이슈:** S14P21D208-201, S14P21D208-204
  > 
  > ---
  > 
  > ### 전체 평가: :white_check_mark: 잘 설계된 파이프라인 오케스트레이터
  > 
  > 뉴스 → 토론 → 포트폴리오 순차 실행 흐름이 명확하고, 실패 시에도 파이프라인이 멈추지 않도록 FAILED + DONE 정책이 잘 적용되어 있습니다. 테스트도 주요 시나리오를 모두 커버합니다.
  > 
  > ---
  > 
  > ### :thumbsup: 좋은 점
  > 
  > 1. **명확한 파이프라인 흐름** — NEWS_DONE → DEBATE_DONE → PORTFOLIO_DONE 순차 실행, 각 단계 완료 신호 기록
  > 2. **누락 날짜 보정** — 포트폴리오 마지막 반영일 이후 \~ 목표일까지 자동 replay
  > 3. **실패 허용 정책** — 일부 실패해도 FAILED 기록 후 DONE 처리 → 운영 파이프라인 안 막힘
  > 4. **graceful shutdown** — `stop_event` + `SIGINT/SIGTERM` 핸들링
  > 5. **`_normalize_db_url`** — DB 패스워드 특수문자 URL 인코딩 처리
  > 6. **테스트 커버리지** — 5개 시나리오 (정상, debate만 스킵, 누락 보충, 토론 실패, 포트폴리오 실패)
  > 7. **문서화** — README, personal_desktop_setup 모두 업데이트
  > 
  > ---
  > 
  > ### :mag: 개선 제안
  > 
  > **1. 포트폴리오 실패해도 무조건 DONE 기록 (중요도: :yellow_circle: 중)**
  > 
  > ```python
  > except Exception as exc:
  >     self.signal_store.insert_failed(PORTFOLIO_PIPELINE_DONE)
  >     logger.warning(...)
  > 
  > self.signal_store.insert_done(PORTFOLIO_PIPELINE_DONE)  # 항상 실행됨
  > ```
  > 
  > 의도된 설계(파이프라인 안 막히게)로 이해하지만, 실패 후에도 DONE이 되면 다음 날 재실행 시 이 날짜의 포트폴리오가 영영 누락됩니다. 재시도 횟수를 두고 N회 실패 시에만 DONE 처리하거나, 별도 DONE_WITH_ERROR 상태를 고려해볼 수 있습니다.
  > 
  > **2. \_build_debate_replay_dates가 주말/공휴일 포함 (중요도: :yellow_circle: 중)**
  > 
  > `while cursor \<= target_date: replay_dates.append(cursor) cursor += timedelta(days=1)` 토요일/일요일도 포함하여 토론 워커를 실행합니다. 주말에 토론 데이터가 없으면 불필요한 실행이 발생합니다. 거래일 기준으로 필터링하면 효율적입니다.
  > 
  > **3. `subprocess.run`으로 포트폴리오 스크립트 호출 (중요도: :yellow_circle: 중)**
  > 
  > `completed = subprocess.run(command, cwd=self.working_directory, ...)` 같은 Python 프로세스에서 모듈을 import하여 실행하는 것 대비:
  > 
  > 장점: 프로세스 격리 (메모리/상태 독립) 단점: 오류 추적이 returncode + stderr 파싱에 의존 현재 구조에서 합리적인 선택이지만, stderr에서 traceback을 파싱하여 로깅하면 디버깅이 더 쉬워집니다.
  > 
  > **4. `PipelineSignalStore`에서 raw SQL 사용 (중요도: :green_circle: 낮음)**
  > 
  > SQLAlchemy를 쓰면서 text()로 raw SQL을 직접 작성하고 있습니다. 간단한 CRUD여서 문제는 없지만, SQL injection 방지를 위해 파라미터 바인딩은 잘 되어 있습니다. 다만 테이블/컬럼명 변경 시 컴파일 타임 감지가 안 되는 점은 유의해야 합니다.
  > 
  > **5. `chairman_portfolio_daily.py`에서 assert summary is not None (중요도: :green_circle: 낮음)**
  > 
  > `assert summary is not None` 프로덕션 코드에서 assert는 -O 옵션으로 비활성화될 수 있습니다. `if summary is None: raise ValueError(...)` 형태가 더 안전합니다. 다만 바로 위에서 replay_dates가 비어있으면 이미 에러를 던지므로 실질적 문제는 아닙니다.
  > 
  > **6. insert_done에 business_date 파라미터 없음 (중요도: :green_circle: 낮음)**
  > 
  > `insert_done`이 현재 시각 기준으로 `created_at`을 기록하는데, `exists_done_for_date`는 `business_date` 기준으로 조회합니다. 자정 직전/직후 실행 시 날짜가 어긋날 수 있습니다. 명시적으로 `business_date`를 받아 기록하면 더 안전합니다.
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 파이프라인 설계 | :white_check_mark: (순차 실행 + 신호 기반 진행) |
  > | 실패 처리 | :warning: DONE 무조건 기록 → 누락 가능성 |
  > | 누락 보정 | :white_check_mark: (replay 날짜 자동 계산) |
  > | 테스트 | :white_check_mark: (5개 시나리오 커버) |
  > | shutdown 처리 | :white_check_mark: (graceful) |
  > | 문서화 | :white_check_mark: |
  > | 날짜 처리 | :warning: 주말/공휴일 필터 없음, 자정 경계 주의 |
  > 
  > 전반적으로 머지 가능한 수준입니다. **1번(실패 시 DONE 정책)과 2번(주말 필터)**는 운영 환경에서 영향이 있을 수 있으니 확인을 권장합니다.

- 💬 **최규직** (2026-03-24)
  > 리뷰 반영했습니다.
  > 
  > - 토론/포트폴리오 실패 시 바로 DONE 처리하지 않고 `PIPELINE_STAGE_MAX_FAILURES`까지는 FAILED만 기록 후 재시도하도록 변경했습니다.
  > - debate replay 날짜는 거래일 기준으로만 생성하도록 보정했습니다.
  > - 포트폴리오 subprocess 실패 시 stderr/stdout을 함께 남기도록 로깅을 보강했습니다.
  > - `pipeline_signals` 기록 시 business_date 기준 timestamp를 명시적으로 기록하도록 수정했습니다.
  > - `chairman_portfolio_daily.py`의 assert는 명시적 예외로 변경했습니다.
  > 
  > raw SQL 부분은 현재 범위에서는 유지했고, 파라미터 바인딩은 그대로 안전하게 두었습니다.

---

### !321 · [FE] Feat: S14P21D208-223 MSW node server 설정 및 report mock 분기 제거

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/fe/msw-server-setup` → `dev-frontend`
- 생성: 2026-03-24 · 머지: 2026-03-24
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/321](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/321)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> MSW node server를 instrumentation.ts로 활성화하여 서버사이드 mock 처리를 MSW에 통합하고, report Route Handler의 shouldUseMock() 분기를 제거
> 
> ## MR 세부 내용
> - `src/instrumentation.ts` 추가: Node.js 프로세스 시작 시 MSW node server 활성화 (NEXT_RUNTIME === nodejs 가드 포함)
> - `src/mocks/handlers.ts`: report 관련 MSW handler 3개 추가 (/api/report/:stockId, /performance, /performance/trades)
> - report Route Handler 3개에서 shouldUseMock() 분기 및 mock data import 제거
> - `src/app/api/report/utils.ts`에서 shouldUseMock() 함수 제거 (getApiBaseUrl()만 유지)
> 
> ## Issue 번호
> S14P21D208-223

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-24)
  > ## 코드 리뷰 리포트 - MR #321
  > 
  > **리뷰 대상:** 6개 파일 변경 (MSW node server 설정 + report mock 분기 제거)
  > **총 이슈:** 3건
  > 
  > ---
  > 
  > ### CRITICAL (0건)
  > 없음
  > 
  > ### HIGH (0건)
  > 없음
  > 
  > ### MEDIUM (2건)
  > 
  > **1. instrumentation.ts - console.log 잔류**
  > `console.log("[MSW] Node server started")` - 개발 환경 전용이라 프로덕션에서는 실행되지 않지만, 디버깅 확인 후 제거하거나 별도 DEBUG 플래그로 분리 권장
  > 
  > **2. report/[stockId]/route.ts - offset/limit 변수 중복 파싱 가능성**
  > shouldUseMock() 분기 제거 후 offset/limit 변수 선언이 남아있는데, queryString으로 그대로 upstream에 전달하므로 중복 파싱일 수 있음. 확인 필요
  > 
  > ### LOW (1건)
  > 
  > **3. MSW handler stockId 존재 검증이 불필요**
  > handlers.ts의 report handler들에서 `if (!stockId)` 체크가 있으나, MSW route params에서 `:stockId`가 매칭되지 않으면 handler 자체가 호출되지 않으므로 dead code. 기존 패턴과 일관성 위해 유지 가능
  > 
  > ---
  > 
  > ### 총평
  > 
  > 깔끔한 변경입니다. instrumentation.ts의 3중 가드(NEXT_RUNTIME, NODE_ENV, API_MOCKING)는 적절하고, onUnhandledRequest: bypass로 unmatched 요청 통과도 올바릅니다. Route Handler에서 mock 분기를 제거하면서 upstream proxy 로직은 그대로 유지하여 실서비스 전환에 영향이 없습니다.
  > 
  > **Recommendation: APPROVE**

---

### !326 · [BE] Fix: S14P21D208-202 의장 포트폴리오 전일 수익률 보정

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `fix/be/chairman-portfolio-yesterday-return` → `dev-backend`
- 생성: 2026-03-24 · 머지: 2026-03-24
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/326](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/326)

<details><summary>MR 설명</summary>

> ## :page_facing_up: MR 한 줄 요약
> 
> 의장 포트폴리오 API의 `yesterday_return` 값을 실제 일별 성과 데이터로 채우도록 수정했습니다.
> 
> ## :technologist: MR 세부 내용
> 
> - `/api/portfolio/chairman` summary의 `yesterday_return`에 최신 `ai_daily_performance.daily_return` 값을 반영했습니다.
> - `alpha_vs_kospi`는 기존과 동일하게 `null` 유지했습니다. -\> 사용하지 않음.
> - `ChairmanPortfolioServiceImplTest`에 전일 수익률 검증을 추가했습니다.
> 
> ## :paperclip: Issue 번호
> 
> <!--closed #S14P21D208-202-->

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-24)
  > 최신 `origin/dev-backend` 기준으로 보면, 이번 MR에서 머지 전에 확인해야 할 이슈는 1건입니다.
  > 
  > ## High
  > 
  > 1. 지금 구현은 "전일 수익률"이 아니라 단순히 가장 최근 일별 성과를 가져오기 때문에, 당일 row가 이미 적재된 시점에는 오늘 수익률을 `yesterdayReturn` 으로 내려줄 수 있습니다.\
  >    `services/backend/src/main/java/com/sallaemallae/backend/domain/report/service/ChairmanPortfolioServiceImpl.java:60-67` 에서\
  >    `aiDailyPerformanceRepository.findTopByPortfolioIdOrderByRecordDateDesc(portfolio.getId())` 로 가장 최신 `record_date` row를 가져와 그대로 `yesterdayReturn` 에 넣고 있습니다.\
  >    그런데 repository 정의도 `services/backend/src/main/java/com/sallaemallae/backend/domain/signal/repository/AiDailyPerformanceRepository.java:10-12` 처럼 단순 최신 row 조회일 뿐이라, `record_date < today` 같은 조건이 전혀 없습니다.\
  >    MR 제목이 "전일 수익률 보정"인데, 실제로는 "가장 최근 수익률"로 바뀐 셈이라 오늘 데이터가 먼저 쌓이는 배치/운영 시점에서는 다시 잘못된 값을 내려줄 수 있습니다.\
  >    테스트도 `services/backend/src/test/java/com/sallaemallae/backend/domain/report/service/ChairmanPortfolioServiceImplTest.java:47-50,82-85,135-138` 에서 `dailyReturn` 만 stub 하고 `recordDate` 는 검증하지 않아서, 이 날짜 경계 문제를 잡아주지 못합니다.
  > 
  > 이번 커밋 범위에서는 그 외에 추가로 blocking 수준의 이슈는 더 보이지 않았습니다.

- 💬 **최규직** (2026-03-24)
  > "오늘자 수익률 row가 있어도 어제 값을 고른다"로 반영했습니다.

---

### !328 · [FE] Feat: S14P21D208-186,198,224 포트폴리오 상세페이지 API 연동, 차트 구현, SSR 인증 쿠키

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/fe/portfolio-stock-api` → `dev-frontend`
- 생성: 2026-03-24 · 머지: 2026-03-25
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/328](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/328)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 포트폴리오 상세페이지의 API 연동, SVG 차트 구현, 라우트 리네이밍, SSR prefetch 인증 쿠키 전달 및 직접 백엔드 fetch 구현
> 
> ## MR 세부 내용
> ### API 연동 (S14P21D208-186)
> - 백테스팅 기간 3년 -> 1년 변경, BacktestStats 타입 및 mock 날짜 조정
> - getStockBasicInfo API 함수 추가 (백엔드 envelope unwrap 처리)
> - useStockBasicInfoQuery 훅으로 종목명/티커 실데이터 표시
> - 라우트 폴더 [ticker] -> [stockId] 리네이밍 및 prop/변수명 통일
> - report Route Handler의 shouldUseMockReportApi 분기 및 미사용 코드 제거
> - MSW handler에 /api/stocks/:stockId/overview 및 report 관련 handler 추가
> - 뉴스 위원 아바타 이미지 매칭 누락 수정
> 
> ### 차트 구현 (S14P21D208-198)
> - ReturnChart를 SVG 기반 라인 차트로 구현 (Figma 디자인 반영)
> - performance API chart 데이터 연동 (가격 추이 + 수익률 배지)
> - CSS variable token 사용 (다크모드 대응)
> 
> ### SSR 인증 쿠키 (S14P21D208-224)
> - proxyAuthRequest에서 accessToken httpOnly 쿠키 저장
> - cookies.set()과 headers.append(set-cookie) 순서 이슈 해결 (refreshToken 유실 방지)
> - serverFetch.ts 추가: Server Component 전용 직접 백엔드 fetch + 응답 변환
> - page.tsx에서 cookies()로 토큰 읽어 prefetch에 직접 전달
> - Promise.allSettled + shouldDehydrateQuery로 prefetch 실패 안전 처리
> 
> ### 기타
> - proxy.ts 코드 포맷팅 정리
> 
> ## Issue 번호
> S14P21D208-186
> S14P21D208-198
> S14P21D208-224

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-25)
  > ## 코드 리뷰 리포트 - MR #328
  > 
  > **리뷰 대상:** 30개 파일 변경 (387줄 추가, 147줄 삭제)
  > **총 이슈:** 4건
  > 
  > ---
  > 
  > ### CRITICAL (0건)
  > 없음
  > 
  > ### HIGH (0건)
  > 없음
  > 
  > ### MEDIUM (2건)
  > 
  > **1. ReturnChart - bg-white 하드코딩**
  > `ReturnChart.tsx:100` - `bg-white dark:bg-transparent`에서 `bg-white`는 CSS variable token 컨벤션 위반.
  > 수정 제안: `bg-[color:var(--color-bg-primary)]`
  > 
  > **2. ReturnChart - 차트 dot의 stroke="white" 하드코딩**
  > `ReturnChart.tsx:164` - 다크모드에서 배경과 구분 안 될 수 있음.
  > 수정 제안: `stroke="var(--color-bg-primary)"`
  > 
  > ### LOW (2건)
  > 
  > **3. ReturnChart - badge 너비를 문자 수로 추정**
  > `ReturnChart.tsx:84` - `badgeCharWidth = 7.5`로 글자 수 기반 너비 추정은 폰트에 따라 부정확할 수 있음. SVG 특성상 런타임 측정이 어려우므로 현재 방식이 현실적이지만 참고 사항.
  > 
  > **4. PerformanceChartPoint import type 미사용**
  > `ReturnChart.tsx:3` - `import { PerformanceChartPoint }` -> `import type { PerformanceChartPoint }`가 프로젝트 컨벤션에 맞음
  > 
  > ---
  > 
  > ### 총평
  > 
  > 라우트 리네이밍, API 연동, 차트 구현, mock 정리가 일관성 있게 잘 처리되었습니다. getStockBasicInfo의 envelope unwrap 처리가 실서비스/mock 양쪽을 고려한 좋은 구현입니다. 블로킹 이슈 없습니다.
  > 
  > **Recommendation: APPROVE**

---

### !337 · [BE] Fix: S14P21D208-202 의장 포트폴리오 응답 필드 보강

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `fix/be/s14p21d208-202-chairman-portfolio-fields` → `dev-backend`
- 생성: 2026-03-25 · 머지: 2026-03-25
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/337](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/337)

<details><summary>MR 설명</summary>

> ## :page_facing_up: MR 한 줄 요약
> 
> 의장 포트폴리오 API 응답에 보유 수량/현재가/월간 지표를 보강하고 요약 수익률 계산을 조정했습니다.
> 
> ## :technologist: MR 세부 내용
> 
> - `summary.hit_rate`에 기존 적중률 대신 월간 평균 수익률을 담도록 변경했습니다.
> - `HOLDINGS` 응답에 `holding_quantity`를 추가했습니다.
> - `holding_days` 계산 기준을 `ai_portfolio_holdings.buy_date` 기준으로 정리했습니다.
> - `TODAY_TRADES` 응답에 `current_price`, `holding_quantity`를 추가했습니다.
> - `MONTHLY_RETURNS` 응답에 `realized_profit_amount`, `buy_count`, `sell_count`를 추가했습니다.
> - 월간 수익률은 `ai_daily_performance` 기준으로 계산하고, 월간 거래 지표는 `ai_trading_history` 기준으로 집계해 병합했습니다.
> - `ChairmanPortfolioServiceImplTest`를 수정해 holdings, today trades, monthly returns 케이스를 함께 검증했습니다.
> 
> ## :paperclip: Issue 번호
> 
> <!--closed #S14P21D208-202-->

</details>

**리뷰 토론**

- 💬 **정준용** (2026-03-25)
  > 굳

---

### !341 · [FE] Feat: S14P21D208-224 SSR prefetch 인증 쿠키 및 직접 백엔드 fetch 구현

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/fe/portfolio-stock-api` → `dev-frontend`
- 생성: 2026-03-25 · 머지: 2026-03-25
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/341](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/341)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> SSR prefetchQuery에서 인증 토큰을 httpOnly 쿠키로 전달하고, Server Component에서 Route Handler를 거치지 않고 직접 백엔드를 호출하도록 구현
> 
> ## MR 세부 내용
> - proxyAuthRequest에서 accessToken을 httpOnly 쿠키로 저장 (cookies.set과 headers.append 순서 이슈 해결)
> - serverFetch.ts 추가: Server Component 전용 직접 백엔드 fetch + 응답 변환 (chairman flatten, pairTrades, envelope unwrap)
> - page.tsx에서 cookies()로 토큰 읽어 serverGet* 함수에 직접 전달
> - Promise.allSettled + shouldDehydrateQuery로 prefetch 실패 안전 처리
> - proxy.ts 코드 포맷팅 정리
> 
> ## Issue 번호
> S14P21D208-224

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-25)
  > ## 코드 리뷰 리포트 - MR #341
  > 
  > **리뷰 대상:** 4개 파일 변경 (212줄 추가, 13줄 삭제)
  > **총 이슈:** 4건
  > 
  > ---
  > 
  > ### CRITICAL (0건)
  > 없음
  > 
  > ### HIGH (0건)
  > 없음
  > 
  > ### MEDIUM (2건)
  > 
  > **1. serverFetch.ts - NEXT_PUBLIC_API_BASE_URL 사용**
  > `serverFetch.ts:5` - `NEXT_PUBLIC_`는 클라이언트에 노출되는 환경변수. 서버 전용 fetch에서는 서버 전용 환경변수 사용이 보안상 바람직하나, 현재 백엔드 URL이 공개 도메인이라 실질적 위험은 낮음
  > 
  > **2. serverFetch.ts - pairTrades 중복**
  > `serverFetch.ts:73-118` - Route Handler의 `pairTrades.ts`와 동일 로직 중복. camelCase/snake_case 차이로 통합 어렵지만, 향후 변환 로직 변경 시 양쪽 수정 필요. 공통 유틸 분리 또는 원본 참조 주석 권장
  > 
  > ### LOW (2건)
  > 
  > **3. auth/utils.ts - 쿠키 순서 의존성 문서화**
  > appendSetCookieHeader가 마지막에 호출되어야 하는 제약이 proxyAuthRequest 내부 주석에만 기록됨. 함수 JSDoc에도 순서 제약 명시 권장
  > 
  > **4. serverFetch.ts - 에러 메시지 상세 정보 부족**
  > `throw new Error(Server fetch failed: status)` - 디버깅용 URL/response body 포함 권장
  > 
  > ---
  > 
  > ### 총평
  > 
  > SSR prefetch 인증 문제를 깔끔하게 해결했습니다. Route Handler를 거치지 않는 직접 백엔드 fetch, shouldDehydrateQuery 방어, cookies.set/headers.append 순서 이슈 해결 등 핵심 설계 판단이 적절합니다. apiFetch 미수정으로 팀 영향 범위 최소화한 점도 좋습니다.
  > 
  > **Recommendation: APPROVE**

---

### !342 · [AI] Feat: S14P21D208-212 agent_data JSONB에 keyword_id, publisher 필드 추가

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `fix/ai/news-url-normalize` → `dev-ai`
- 생성: 2026-03-25 · 머지: 2026-03-25
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/342](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/342)

<details><summary>MR 설명</summary>

> ## :page_facing_up: MR 한 줄 요약
> 
> news_agent_stock_data JSONB에 keyword_id, publisher 필드를 추가하여 백엔드 keywords API 캐시 연동을 준비합니다.
> 
> ## :technologist: MR 세부 내용
> 
> * `crud.get_news_by_keyword()`: SELECT에 `StockNews.publisher` 추가, 반환 dict에 `publisher` 포함
> * `agent_data_builder.build_stock_agent_data()`: JSONB 출력에 `keyword_id`, `publisher` 필드 추가
> * 기존 JSONB 소비자(debate service, debate worker, export script)는 `.get()` 또는 Pydantic 모델로 접근하므로 영향 없음
> * 과거 데이터 백필은 `run_batch --start --end --save-db`로 실행 예정
> 
> ## :paperclip: Issue 번호
> 
> S14P21D208-212

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-25)
  > ## Medium
  > 
  > 1. DB의 `news_agent_stock_data.top_keywords` JSONB에는 `keyword_id` / `publisher` 가 저장되지만, 뉴스 응답/내보내기 계약은 아직 예전 shape 그대로라서 실제 소비 경로에서는 새 필드가 보이지 않습니다.  
  >    `services/ai/3_ai_server/domains/news/agent_data_builder.py:73-85` 에서는 각 키워드에 `keyword_id`, 각 뉴스에 `publisher` 를 추가해 저장하도록 바뀌었습니다.  
  >    그런데 `services/ai/3_ai_server/domains/news/schemas.py:19-32` 의 `KeywordNewsItem` / `TopKeywordItem` 에는 여전히 이 필드가 없고, `services/ai/3_ai_server/domains/news/service.py:57-69` 와 `services/ai/3_ai_server/scripts/export_news_debate_data.py:95-105` 도 기존 필드만 다시 조합합니다.  
  >    즉 이번 MR만으로는 "DB JSONB에는 들어감"까지는 맞지만, `/ai/news` 응답이나 export 결과에서 새 필드를 실제로 활용하려던 목적이라면 반영이 덜 된 상태입니다.
  > 
  > 이번 머지 결과 기준으로는 그 외에 추가로 blocking 수준의 이슈는 보이지 않았습니다.

---

### !343 · [BE] Fix: S14P21D208-202 search API 인증 정리

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `fix/be/s14p21d208-202-search-auth` → `dev-backend`
- 생성: 2026-03-25 · 머지: 2026-03-25
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/343](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/343)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> search API의 인증 설정을 다른 도메인과 동일한 기준으로 정리했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - `GET /api/search`를 공개 조회 API로 열도록 security 설정을 추가했습니다.
> - 최근검색 API(`/api/search/recent`)는 JWT 기반 인증 사용자 기준으로 동작하도록 수정했습니다.
> - 기존 `X-User-Id` 헤더 의존 로직을 제거하고 `AuthenticatedUserProvider`를 사용하도록 정리했습니다.
> - 검색 조회는 비로그인 상태에서도 가능하고, 최근검색 저장/조회/삭제는 로그인 사용자만 가능하도록 역할을 명확히 맞췄습니다.
> 
> ## 📎 Issue 번호
> <!-- closed #S14P21D208-202 -->

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-25)
  > 로그인 api 개발 전 최초로 만들었던 api라 인증관련이 모두 빠져있었습니다.
  > 
  > `X-User-Id` 헤더 의존 로직을 제거하고 `AuthenticatedUserProvider`를 사용하도록 정리했습니다.

---

### !344 · [BE] Refactor: 관심종목 목록 조회 가짜 SSE → REST GET 변환

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `refactor/be/watchlist-sse-to-rest` → `dev-backend`
- 생성: 2026-03-25 · 머지: 2026-03-25
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/344](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/344)

<details><summary>MR 설명</summary>

> - 기존 one-shot SSE 응답을 일반 REST GET + ApiResponse로 변경
> - 불필요한 ObjectMapper, MediaType, SneakyThrows 등 제거
> - 서비스 로직(Redis 캐시 조회)은 그대로 유지

</details>

**리뷰 토론**

- 💬 **정준용** (2026-03-25)
  > merge result 기준으로는 프런트 통합 관점의 추가 finding은 없었습니다.
  > 
  > 이번 MR은 source branch가 dev-backend보다 뒤처져 있어서 head..target으로 보면 예전 변경들이 같이 섞여 보였지만, 실제 merge result 기준 유입 diff는 WatchlistController.java 1파일입니다. 변경 내용도 /api/users/watchlist를 가짜 SSE에서 일반 JSON GET으로 바꾸는 수준이고, 현재 프런트는 route.ts 에서 이미 백엔드 JSON을 받아 내부용 WatchlistStreamPayload로 변환한 뒤 필요하면 synthetic SSE로 다시 감싸고 있습니다. 실제 소비 쪽도 connectWatchlistStream.ts, useWatchlistStream.ts 처럼 이 프런트 라우트를 통해서만 접근하므로, 현재 C:\SSAFY\S14P21D208\services\frontend 기준 통합 계약은 깨지지 않습니다.
  > 
  > 남는 리스크는 “프런트를 거치지 않고 백엔드 /api/users/watchlist를 직접 text/event-stream으로 호출하던 외부 클라이언트”가 있다면 그쪽은 breaking change라는 점인데, 요청하신 프런트 통합 범위 안에서는 해당 소비 경로를 찾지 못했습니다. 검증은 services/backend 에서 .\mvnw.cmd -q -DskipTests test-compile 1회 통과로 확인했습니다.

---

### !345 · [BE] Feat: S14P21D208-212 종목 키워드 API를 agent_data JSONB + Redis 캐시 방식으로 전면 개편

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `feature/be/watchlist-news-api-refactor` → `dev-backend`
- 생성: 2026-03-25 · 머지: 2026-03-25
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/345](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/345)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 종목 키워드 API를 3테이블 JOIN 방식에서 agent_data JSONB + Redis 캐시 방식으로 전면 개편합니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - StockKeywordData 엔티티 추가: news_agent_stock_data 테이블의 JSONB 데이터를 JPA로 매핑
> - StockKeywordDataRepository 추가: 종목별 최신 report_date 데이터 1건 조회
> - StockKeywordsCacheRepository 추가: Redis 캐시 (24시간 TTL), stock:keywords:{stockId} 키 구조
> - StockServiceImpl.getStockKeywords() 수정: Redis 캐시 → DB fallback → JSONB 파싱 → DTO 변환
> - StockKeywordsCacheScheduler 추가: 장마감(15:30) 이후 5분마다 NEWS_PIPELINE_DONE 신호 폴링, 감지 시 캐시 삭제 후 다음 장마감까지 휴면
> - NewsTotalCountScheduler 수정: 동일한 장마감 후 폴링 방식으로 변경 (기존 20시/21시 cron → 15:30 이후 5분 폴링)
> - StockNewsQueryRepository 삭제: 기존 stock_news + stock_news_map + news_keyword_map 3테이블 JOIN 방식 제거
> - JUnit 테스트 4건 추가: 캐시 히트/캐시 미스+DB 조회/빈 데이터/종목 미존재
> 
> ## 📎 Issue 번호
> S14P21D208-212

</details>

**리뷰 토론**

- 💬 **정준용** (2026-03-25)
  > merge result 기준 실제 유입 diff 8개 파일을 리뷰했고, 확실한 기능 이슈는 위 4건입니다. severity로 나누면 `P1` 3건, `P2` 1건입니다.
  > 
  > - `P1` Redis 장애 시 종목 키워드 API 전체가 500으로 실패합니다.
  >   예상 문제점: 현재 프런트 [StockDetailPageClient.tsx](C:/SSAFY/S14P21D208/services/frontend/src/app/stocks/[ticker]/StockDetailPageClient.tsx#L198) 는 keywords query 에러를 별도 에러 UI 없이 로딩 상태로 취급해서, 실제 사용자 화면에서는 키워드 섹션이 비정상적으로 계속 로딩 중처럼 보일 가능성이 큽니다.
  > - `P1` 뉴스 totalCount 스케줄러가 재기동 이후 당일 DONE 신호를 놓치면 하루 종일 stale count를 유지합니다.
  >   예상 문제점: 무필터 뉴스 목록의 `totalCount`가 실제 기사 수보다 적거나 오래된 값으로 남아 페이지네이션/총건수 표기가 어긋날 수 있습니다.
  > - `P1` 키워드 캐시 무효화 스케줄러도 같은 재기동 문제를 가집니다.
  >   예상 문제점: 뉴스 본문 데이터는 최신인데 종목 상세 키워드/관련 뉴스만 전일 데이터를 보여주는 “부분 stale” 상태가 발생할 수 있습니다.
  > - `P2` grouped JSONB를 flat 뉴스 목록으로 바꾸는 과정에서 dedupe/global sort를 잃었습니다.
  >   예상 문제점: 종목 상세 [StockKeywordsNewsSection.tsx](C:/SSAFY/S14P21D208/services/frontend/src/app/stocks/[ticker]/components/StockKeywordsNewsSection.tsx#L54) 에 동일 기사 중복 노출, 최신 기사 누락처럼 보이는 순서 역전, 동일 `id` key 재사용에 따른 React 렌더링 이상이 생길 수 있습니다.
  > 
  > 추가로 본 리스크도 있습니다. 정식 finding으로는 올리지 않았지만 확인 필요성이 있습니다.
  > 
  > - [StockKeywordDataRepository.java](C:/SSAFY/S14P21D208/.codex-mr345/services/backend/src/main/java/com/sallaemallae/backend/domain/stock/repository/StockKeywordDataRepository.java#L10) 는 `report_date <= today` 가드 없이 가장 큰 `report_date`를 바로 읽습니다. 코드베이스의 다른 `report_date` 기반 조회는 대부분 현재 날짜 이하로 제한하고 있어서, 향후 파이프라인이 다음 거래일 row를 미리 적재하면 이 API만 미래 데이터를 먼저 노출할 가능성이 있습니다.
  > - [StockServiceImpl.java](C:/SSAFY/S14P21D208/.codex-mr345/services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/StockServiceImpl.java#L211) 는 JSONB 파싱 실패 시 빈 응답을 반환하고 그 결과를 그대로 캐시합니다. malformed row나 스키마 불일치가 한 번 발생하면 실제 데이터가 있어도 빈 키워드 응답이 캐시에 고정될 수 있습니다.
  > 
  > 검증은 [services/backend](C:/SSAFY/S14P21D208/.codex-mr345/services/backend) 에서 `.\mvnw.cmd -q "-Dtest=StockKeywordsServiceTest" test` 1회 통과로 확인했습니다. 다만 이번 MR에는 Redis 장애, 스케줄러 재기동 후 signal 재감지, grouped JSONB 중복/정렬 보정 케이스를 잡는 테스트가 없습니다. GitLab MR 페이지는 로그인 리다이렉트라 로컬 `remotes/origin/mr-345-merge` 기준으로 리뷰했습니다.

- 💬 **최규직** (2026-03-25)
  > 최신 `origin/dev-backend` 기준으로 보면, 이번 MR에서 머지 전에 확인해야 할 이슈는 2건입니다.
  > 
  > ## High
  > 
  > 1. `/stocks/{stockId}/keywords` 가 이제 `news_agent_stock_data` 스냅샷에 전적으로 의존하게 되어, 해당 스냅샷이 없거나 JSONB가 한 번만 깨져도 바로 빈 응답으로 떨어집니다.\
  >    `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/StockServiceImpl.java:193-199` 에서 최신 `news_agent_stock_data` 1건만 조회하고, 없으면 바로 `new StockKeywordsResponse(List.of(), List.of())` 를 반환합니다.\
  >    여기에 더해 `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/StockServiceImpl.java:213-219` 에서는 JSONB 파싱 실패도 그대로 빈 응답으로 삼키고 끝냅니다.\
  >    반면 이전 구현은 `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/StockServiceImpl.java:180-192` 처럼 `keywords / stock_news / news_keyword_map` 원본 테이블을 직접 조회했기 때문에, 파생 스냅샷이 없더라도 기본 데이터만 있으면 응답을 만들 수 있었습니다.\
  >    즉 이 MR은 배포 순서상 `news_agent_stock_data` 가 모든 대상 종목에 안정적으로 채워져 있다는 전제가 생기는데, 그 전제가 깨지는 순간 종목 키워드 섹션이 통째로 비게 됩니다. 최소한 기존 live query fallback 이라도 남겨두는 편이 안전합니다.
  > 
  > ## Medium
  > 
  > 1. `news` 배열의 의미가 바뀌어서, 같은 기사가 중복으로 내려오거나 최신순 정렬이 깨질 수 있습니다.\
  >    새 구현은 `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/StockServiceImpl.java:225-254` 에서 키워드별 nested `news` 배열을 그대로 이어붙입니다.\
  >    그런데 이전 구현은 `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/repository/StockNewsQueryRepository.java:25-38` 의 `SELECT DISTINCT ... ORDER BY sn.published_at DESC LIMIT :limit` 로, 키워드가 여러 개여도 중복 기사를 제거한 뒤 전체를 최신순으로 잘라서 내려줬습니다.\
  >    지금 방식대로면 한 기사가 여러 top keyword에 동시에 걸릴 때 `news` 목록에 중복 노출될 수 있고, 키워드 중요도 순서에 따라 더 오래된 뉴스가 더 앞에 보이는 식의 순서 회귀도 생깁니다.
  > 
  > 이번 커밋 범위에서는 그 외에 추가로 blocking 수준의 이슈는 더 보이지 않았습니다.

- 💬 **이혜민** (2026-03-25)
  > ### P1 — agent_data 없을 때 빈 응답
  > 
  > > 수정 완료 (b61d20a)
  > >
  > > `StockNewsQueryRepository`를 복원하고, agent_data가 없거나 JSONB 파싱이 실패하면 기존 `keywords` + `stock_news_map` + `news_keyword_map` 원본 테이블 live query로 fallback하도록 변경했습니다.
  > >
  > > 흐름: Redis 캐시 → agent_data JSONB → live query fallback
  > >
  > > fallback 포함 테스트 3건 추가 (agent_data 없음 / 파싱 실패 / 완전 빈 데이터)
  > 
  > ---
  > 
  > ### Medium — 뉴스 중복/정렬
  > 
  > > AI 워커(`agent_data_builder`)에서 키워드별로 `crud.get_news_by_keyword()`를 개별 호출하고 있고, 각 호출에서 `.distinct()` + `.order_by(desc(published_at))` + `limit=3`으로 조회합니다. 키워드 3개 × 뉴스 3건 = 최대 9건이라 중복 확률이 낮고, 발생해도 1\~2건 수준입니다.
  > >
  > > 또한 fallback 경로에서는 기존 `StockNewsQueryRepository`의 `SELECT DISTINCT ... ORDER BY published_at DESC LIMIT 9` 쿼리를 그대로 사용하므로 중복/정렬 문제가 없습니다.

- 💬 **최규직** (2026-03-25)
  > 최신 `origin/dev-backend` 기준으로 다시 보면, 직전 리뷰에서 말씀드린 `agent_data 없음/파싱 실패 시 빈 응답` 문제는 후속 커밋에서 `live query fallback` 이 추가되어 보완됐습니다. 다만 아직 머지 전에 확인하면 좋을 이슈가 2건 있습니다.
  > 
  > ## Medium
  > 
  > 1. `agent_data` 경로에서는 `news` 배열을 그대로 flatten만 해서, 같은 기사가 중복 노출되거나 최신순 정렬이 깨질 수 있습니다.\
  >    `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/StockServiceImpl.java:255-286` 를 보면 `top_keywords` 안의 각 `news` 배열을 dedup/sort 없이 그대로 `news` 리스트에 붙이고 있습니다.\
  >    반면 기존 fallback 쿼리는 `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/repository/StockNewsQueryRepository.java:25-38` 처럼 `SELECT DISTINCT ... ORDER BY sn.published_at DESC LIMIT :limit` 로 전체 뉴스를 한 번에 최신순 정렬하고 중복을 제거했습니다.\
  >    지금 구현대로면 `agent_data` 에 동일 기사가 여러 키워드에 포함돼 있을 때 `/stocks/{stockId}/keywords` 응답에서도 같은 뉴스가 여러 번 보일 수 있고, 키워드 순서 때문에 더 오래된 뉴스가 앞에 오는 식의 순서 회귀가 남아 있습니다.
  > 2. 새 캐시 스케줄러들은 같은 날 두 번째 `NEWS_PIPELINE_DONE` 신호를 무시해서, 수동 재처리/재적재가 있으면 당일 캐시가 stale 상태로 남을 수 있습니다.\
  >    `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/StockKeywordsCacheScheduler.java:59-80` 과 `services/backend/src/main/java/com/sallaemallae/backend/domain/news/service/NewsTotalCountScheduler.java:57-79` 를 보면, 한 번 신호를 처리해 `todayEvicted` / `todayRefreshed` 가 `true` 가 되면 다음 장마감 전까지는 이후 신호를 아예 보지 않습니다.\
  >    그래서 오후에 한 번 캐시를 비운 뒤, 같은 날 저녁에 뉴스 파이프라인을 다시 돌려 데이터가 바뀌어도 종목 키워드 캐시와 `news:total_count:*` 는 다음 날 장마감 전까지 갱신되지 않습니다. 운영상 "하루 1회만 절대 재처리 없음"이 보장되지 않는다면, 이 플래그는 같은 날 추가 DONE 신호도 반영할 수 있게 완화하는 편이 안전합니다.
  > 
  > 이번 후속 커밋 범위에서는 그 외에 추가로 blocking 수준의 이슈는 더 보이지 않았습니다.

- 💬 **이혜민** (2026-03-25)
  > 수정 완료 (f46c616)
  > 
  > `todayEvicted` / `todayRefreshed` 플래그를 제거하고, `lastProcessedAt` 기반으로만 중복 방지하도록 변경했습니다. 같은 날 파이프라인을 재실행하면 `lastProcessedAt` 이후에 새 `NEWS_PIPELINE_DONE` 신호가 찍히므로, 추가 신호도 정상 반영됩니다.

---

### !347 · [AI] Feat: S14P21D208-225 파이프라인 시그널 API 엔드포인트 구현

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/ai/pipeline-signal-api` → `dev-ai`
- 생성: 2026-03-25 · 머지: 2026-03-25
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/347](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/347)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 3_ai_server에 파이프라인 시그널 발행·상태 관리 API 엔드포인트(POST/PATCH/GET)를 추가한다.
> 
> ## MR 세부 내용
> - `domains/pipeline/` 도메인 신규 생성 (schemas, crud, router)
> - POST /ai/pipeline/signal — 시그널 생성 (PENDING 상태)
> - PATCH /ai/pipeline/signal/{id} — 상태 전이 (PROCESSING/DONE/FAILED)
> - GET /ai/pipeline/signal/latest — 오늘자 최신 시그널 조회
> - 상태 전이 검증 로직 (PENDING→PROCESSING→DONE/FAILED, 위반 시 409)
> - main.py에 pipeline 라우터 등록
> 
> ## Issue 번호
> S14P21D208-225

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-25)
  > ## Code Review Report
  > 
  > **Files Reviewed:** 5 | **Total Issues:** 6
  > 
  > | Severity | Count |
  > |----------|-------|
  > | CRITICAL | 0 |
  > | HIGH | 2 |
  > | MEDIUM | 3 |
  > | LOW | 1 |
  > 
  > ---
  > 
  > ### HIGH (2)
  > 
  > **1. Race condition — `update_signal_status` read-then-update without locking**
  > `crud.py:58-89`
  > 
  > `get_signal()`로 현재 상태를 읽고 Python에서 전이 검증 후 UPDATE하는 TOCTOU 패턴. 동시 요청 시 상태 전이 검증이 우회될 수 있음.
  > 
  > **Fix:** 단일 SQL에서 `WHERE status IN (:allowed)` 조건으로 원자적 검증+업데이트:
  > ```sql
  > UPDATE pipeline_signals
  > SET status = :new_status, ...
  > WHERE id = :signal_id AND status IN (:allowed_statuses)
  > RETURNING ...
  > ```
  > `rowcount == 0`이면 not found vs invalid transition 분기 처리.
  > 
  > ---
  > 
  > **2. Timezone 불일치 — `CURRENT_DATE` (UTC) vs 기존 consumer (KST)**
  > `crud.py:100`
  > 
  > `get_latest_signal`이 `CURRENT_DATE`(EC2=UTC 기준)를 사용하지만, 기존 `4_debate_worker/pipeline_signal_store.py`는 KST 기준 date window로 조회. 00:00~08:59 KST 사이에 결과 불일치 발생.
  > 
  > **Fix:** KST 기준 date window 사용:
  > ```python
  > from zoneinfo import ZoneInfo
  > KST = ZoneInfo('Asia/Seoul')
  > window_start = datetime.combine(date.today(), time.min, tzinfo=KST)
  > ```
  > 
  > ---
  > 
  > ### MEDIUM (3)
  > 
  > **3. `datetime.utcnow()` deprecated (Python 3.12+)**
  > `crud.py:70`
  > 
  > naive datetime 반환. 기존 consumer는 timezone-aware datetime 사용 중.
  > **Fix:** `datetime.now(tz=ZoneInfo('Asia/Seoul'))` 또는 `datetime.now(tz=timezone.utc)` 사용.
  > 
  > **4. `db.commit()` inside crud — 기존 패턴과 불일치**
  > `crud.py:28,89`
  > 
  > 기존 `signal/crud.py`는 crud 내부에서 commit하지 않고 router에서 commit. 트랜잭션 롤백 불가능해짐.
  > **Fix:** `db.commit()`을 router로 이동.
  > 
  > **5. `signal_type` allowlist 미적용**
  > `schemas.py:12-18`
  > 
  > 임의 문자열 허용으로 오타/잘못된 type 삽입 가능.
  > **Fix:** `pattern="^(ML_INFERENCE_DONE|NEWS_PIPELINE_DONE)$"` 또는 Enum 적용 고려.
  > 
  > ---
  > 
  > ### LOW (1)
  > 
  > **6. GET /signal/latest — 200 + null body**
  > `router.py:61`
  > 
  > 시그널 없을 때 200 OK에 null 반환. 204 No Content 또는 404가 REST 관례상 명확.
  > 
  > ---
  > 
  > ### Positive
  > - 모든 엔드포인트에 `verify_internal_api_key` 적용
  > - parameterized query로 SQL injection 방지
  > - 상태 전이 맵 (`_VALID_TRANSITIONS`) 설계 깔끔
  > - 도메인 분리 (signal과 pipeline 분리) 적절
  > 
  > ### Recommendation: **REQUEST CHANGES**
  > HIGH 2건 (race condition, timezone) 수정 후 머지 권장.

---

### !351 · [AI] Feat: S14P21D208-226 ML 추론 파이프라인 시그널 발행 연동

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/ai/ml-pipeline-signal-integration` → `dev-ai`
- 생성: 2026-03-25 · 머지: 2026-03-25
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/351](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/351)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> daily_inference.py에서 추론 시작/진행/완료/실패 시점에 ai_server 시그널 API를 호출하여 ML_INFERENCE_DONE 시그널을 발행한다.
> 
> ## MR 세부 내용
> - post_pipeline_signal() 함수 추가 (POST /ai/pipeline/signal → PENDING 생성, signal_id 반환)
> - patch_pipeline_signal() 함수 추가 (PATCH /ai/pipeline/signal/{id} → PROCESSING/DONE/FAILED 전이)
> - main()에 try/except 패턴으로 시그널 생명주기 통합 (PENDING → PROCESSING → DONE/FAILED)
> - 시그널 API 호출 실패 시에도 추론 자체는 중단되지 않도록 예외 처리
> 
> ## Issue 번호
> S14P21D208-226

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-25)
  > ## Code Review Report
  > 
  > **Files Reviewed:** 1 | **Total Issues:** 2
  > 
  > | Severity | Count |
  > |----------|-------|
  > | CRITICAL | 0 |
  > | HIGH | 0 |
  > | MEDIUM | 1 |
  > | LOW | 1 |
  > 
  > ---
  > 
  > ### MEDIUM (1)
  > 
  > **1. Bare `except Exception` — 기존 패턴과 불일치**
  > `daily_inference.py:320, 338`
  > 
  > 기존 `post_signals()`, `post_portfolio()`는 `requests.exceptions.HTTPError`를 먼저 잡아 응답 본문을 로그에 남기는 2단계 패턴 사용. 새 함수들은 bare `Exception`만 잡아 HTTP 에러 시 응답 본문이 로그에 남지 않아 디버깅이 어려워짐.
  > 
  > **Fix:**
  > ```python
  > except requests.exceptions.HTTPError as e:
  >     log(f"시그널 생성 실패: {e}")
  >     log(f"응답 본문: {e.response.content.decode('utf-8', errors='replace')}")
  >     return None
  > except Exception as e:
  >     log(f"시그널 생성 실패 (추론은 계속 진행): {e}")
  >     return None
  > ```
  > 
  > ---
  > 
  > ### LOW (1)
  > 
  > **2. 섹션 코멘트 `Step 0.5` 네이밍**
  > `daily_inference.py:305`
  > 
  > main()에서 실제 실행 순서는 step 1인데 코드 정의 위치의 코멘트가 `Step 0.5`로 되어 있어 혼동 가능.
  > **Fix:** `# -- 파이프라인 시그널 헬퍼 --` 등으로 변경 고려.
  > 
  > ---
  > 
  > ### Positive
  > - 시그널 생명주기 (PENDING -> PROCESSING -> DONE/FAILED) 정확히 구현
  > - signal_id=None 시 patch 호출 skip하는 non-blocking 설계
  > - try/except/raise 패턴으로 원본 예외 보존하면서 FAILED 상태 보고
  > - 기존 API 호출 패턴(API_BASE_URL, API_KEY, headers, timeout)과 일관성 유지
  > 
  > ### Recommendation: **APPROVE** (optional improvements)

---

### !356 · [FE] fix : S14P21D208-176 검색 모달창 인기 검색어 추가 및 메인페이지 인기검색어 api연동 및 전체종목 hover 재적용

- 작성자: **정준용** · 상태: `merged`
- 브랜치: `fix/fe/search-modal-ui` → `dev-frontend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/356](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/356)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 검색 모달과 검색 API를 추가하고, 메인 페이지 인기 검색과 검색 모달 인기 검색을 동일한 SSE 소스로 통일했으며, 종목 상세 이동/전체 종목 hover 영역까지 함께 정리했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - AppNav에 검색 모달을 연결하고, 기존 프로필 메뉴/프로필 수정 로직과 함께 동작하도록 병합했습니다.
> - 검색 모달에서 종목 자동완성, 뉴스 자동완성, 최근 검색어, 인기 검색 TOP 5를 표시하도록 구현했습니다.
> - 검색 모달 초기 상태에는 최근 검색어 아래에 `/api/stream/stocks/trending` 기반 인기 검색 TOP 5를 노출하도록 추가했습니다.
> - 인기 검색은 rank, 종목명, 등락률을 사용하고, 로고는 추후 공통 작업 전까지 placeholder로 유지했습니다.
> - 검색 모달 전체 탭 뉴스 미리보기 메타 표시는 `언론사 · 날짜` 순서로 정리했습니다.
> - 검색 결과가 특정 탭에만 존재할 때 stale tab 상태 때문에 빈 결과처럼 보이던 문제를 수정해, 현재 결과가 있는 탭으로 자동 fallback 되도록 보완했습니다.
> - 검색 모달의 종목 결과 클릭 시 `/stocks/{stockId}` 상세 페이지로 이동하도록 수정했습니다.
> - 검색 모달의 인기 검색 TOP 5 클릭 시 `/stocks/{stockId}` 상세 페이지로 이동하도록 수정했습니다.
> - 최근 검색어 중 `stockId`가 있는 항목 클릭 시에도 `/stocks/{stockId}` 상세 페이지로 이동하도록 정리했습니다.
> - 뉴스 클릭은 기존처럼 원문 새 탭 열기 동작을 유지했습니다.
> - AppNav 내부 메뉴 이동에서 `window.location.href`로 인해 full reload 되던 흐름을 `router.push`로 복구했습니다.
> - 검색 자동완성 클라이언트는 `/api/search`의 `success/data/error` envelope 응답을 파싱하도록 수정했습니다.
> - 검색 뉴스 응답의 `published_at: null` 계약을 반영해 `publishedAt: string | null`로 타입을 정리하고, null 날짜도 안전하게 렌더링되도록 보완했습니다.
> - `/api/search` route를 추가해 mock 환경에서는 mock autocomplete를 반환하고, mock이 꺼져 있으면 실서버 `/api/search`로 프록시되도록 구성했습니다.
> - `/api/search/recent`, `/api/search/recent/[keyword]` route와 mock store를 추가해 최근 검색어 조회/저장/삭제/전체 삭제가 가능하도록 구현했습니다.
> - 비로그인 상태에서는 최근 검색어 조회/저장 API를 호출하지 않도록 AppNav에서 가드 처리했습니다.
> - `/api/stream/stocks/trending` route를 추가해 mock/실서버 모두 검색 모달과 메인 페이지에서 같은 SSE endpoint를 사용할 수 있게 구성했습니다.
> - 메인 페이지 우측 인기 검색도 기존 `top-stocks` 파생값이 아니라 `/api/stream/stocks/trending` SSE를 사용하도록 변경했습니다.
> - 메인 페이지 인기 검색 표시는 기존과 동일하게 `순위 + 종목명`만 유지했습니다.
> - `gics_sector`가 한글로 내려오는 경우 그대로 표시하고, 영어 GICS sector가 들어오는 경우에만 한국어 라벨 매핑을 적용하도록 보완했습니다.
> - 전체 종목 페이지에서 row hover 배경 범위를 조정해, 순위/종목명뿐 아니라 관심종목 하트 아이콘 영역까지 같은 hover 배경 안에 포함되도록 수정했습니다.
> - hover 배경은 row 내부 컨테이너가 아니라 한 단계 위 `motion.article` 기준으로 적용되도록 정리했습니다.
> - 검증:
>   - `pnpm exec eslint "src/shared/components/AppNav.tsx" "src/shared/ui/SearchModal.tsx" "src/app/home/HomePageClient.tsx" "src/app/home/api/main.ts" "src/app/home/hooks/usePopularSearchesQuery.ts" "src/shared/lib/searchApi.ts" "src/shared/types/search.ts" "src/app/api/search/route.ts" "src/app/api/search/recent/route.ts" "src/app/api/search/recent/[keyword]/route.ts" "src/app/api/stream/stocks/trending/route.ts" "src/shared/lib/mockSearchStore.ts" "src/app/stocks/components/StocksDesktopTable.tsx" "src/app/stocks/components/StocksMobileList.tsx"`
>   - `pnpm build`
> 
> ## 📎 Issue 번호
> S14P21D208-176

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-26)
  > ## MR #356 코드리뷰: 검색 모달 + 인기검색어 SSE + 전체종목 hover
  > 
  > **작성자:** 정준용 | **변경 파일:** 16개 | **브랜치:** `fix/fe/search-modal-ui` → `dev-frontend`
  > 
  > ---
  > 
  > ### 전체 평가: :warning: 기능은 잘 동작하지만 BE 스펙 불일치와 구조 이슈 다수
  > 
  > ---
  > 
  > ## :red_circle: 백엔드 스펙 불일치 (크로스체크)
  > 
  > ### 1. SearchStockItem에 `iconUrl` 필드 누락 (중요도: :red_circle: 높음)
  > 
  > **BE 응답 (`SearchStockItemResponse.java`)**:
  > 
  > ```java
  > record SearchStockItemResponse(
  >     Long id, String ticker, String name,
  >     @JsonProperty("gics_sector") String gicsSector,
  >     @JsonProperty("current_price") Integer currentPrice,
  >     @JsonProperty("fluctuation_rate") BigDecimal fluctuationRate,
  >     @JsonProperty("icon_url") String iconUrl  // ← 있음
  > )
  > ```
  > 
  > **FE 타입 (search.ts):**
  > 
  > ```
  > type SearchStockItem = {
  >   id: number; ticker: string; name: string;
  >   gicsSector: string; currentPrice: number; fluctuationRate: number;
  >   // iconUrl 없음 ❌
  > };
  > ```
  > 
  > → BE는 `icon_url`을 내려주는데 FE 타입에 없어서 아이콘 표시 불가. `iconUrl: string | null` 추가 필요
  > 
  > **2. SearchStockItem.fluctuationRate 타입 불일치 (중요도: :yellow_circle: 중)** BE는 BigDecimal (소수점 정밀도 보장), FE는 number로 Number()로 변환합니다. 이것 자체는 동작하지만, normalizeSearchAutocompleteResponse에서 Number(stock.fluctuationRate ?? 0)으로 처리 시 BE가 null을 보내면 0으로 표시됩니다. 실제 "변동 없음"과 "데이터 없음"을 구분할 수 없습니다.
  > 
  > → `fluctuationRate: number | null`로 처리 권장
  > 
  > **3. SearchNewsItem.publishedAt 타입 불일치 (중요도: :yellow_circle: 중)** BE는 OffsetDateTime → JSON 직렬화 시 "2026-03-26T09:00:00+09:00" 형태인데, FE 타입은 `publishedAt: string | null`로 되어 있어 파싱은 되지만, FE에서 날짜 포매팅 시 타임존을 인지하지 못할 수 있습니다.
  > 
  > → 문제는 아니지만 날짜 표시 로직에서 new Date(publishedAt) 사용 시 확인 필요
  > 
  > **4. RecentSearchItem.stockId 타입 불일치 (중요도: :red_circle: 높음)** **BE 응답 (`SearchRecentItemResponse.java`):**
  > 
  > ```
  > @JsonProperty("stock_id") Long stockId  // Long → null 가능
  > ```
  > 
  > **FE 타입 (search.ts):**
  > 
  > ```
  > stockId: number | null;
  > ```
  > 
  > 이건 타입은 맞지만 **searchedAt 필드가 BE는 OffsetDateTime인데 FE는 string**입니다. 실제 handleRecentSearchClick에서 item.stockId !== null 체크를 하는데, camelizeKeys 변환 후 stockId가 제대로 변환되는지 확인 필요 (snake_case stock_id → stockId).
  > 
  > → mock 환경에서는 camelizeKeys를 거치지만 실서버 프록시 시 envelope 응답의 data 안 필드가 snake_case로 올 수 있음. 실서버 연동 시 camelizeKeys 적용 여부 확인 필수
  > 
  > **5. 검색 API 쿼리 파라미터 불일치 (중요도: :yellow_circle: 중)** FE: `/api/search?q=삼성` BE: `@RequestParam("q") String keyword` :white_check_mark: 일치
  > 
  > 하지만 FE의 프록시 route에서:
  > 
  > ```
  > await fetch(`${getApiBaseUrl()}/api/search${request.nextUrl.search}`, ...)
  > ```
  > 
  > request.nextUrl.search는 ?q=삼성 전체를 전달하므로 OK. 다만 Authorization 헤더를 프록시하지 않고 있습니다. 검색 자체는 인증 불필요하므로 현재는 문제없지만, 향후 인증 기반 검색이 추가되면 문제 발생.
  > 
  > **6. 최근 검색어 API 프록시 미구현 (중요도: :red_circle: 높음)** `/api/search/recent route`는 mock만 구현되어 있고, 실서버 프록시가 없습니다.
  > 
  > ```
  > // route.ts - GET, POST, DELETE 모두 mock only
  > 
  > 
  > export async function GET(request: NextRequest) {
  >   if (!isAuthorized(request)) { ... }
  >   return NextResponse.json(snakelizeKeys(getMockRecentSearches()));
  > }
  > ```
  > 
  > shouldUseMockSearchApi() 분기가 없어서, mock이 꺼져 있어도 항상 mock 데이터를 반환합니다.
  > 
  > → 실서버 환경에서 최근 검색어가 동작하지 않음. `/api/search route`처럼 프록시 분기 추가 필요
  > 
  > ### :yellow_circle: 코드 구조 및 품질 이슈
  > 
  > **7. AppNav 컴포넌트 비대화 (중요도: :yellow_circle: 중)** 검색 관련 상태 7개 + 핸들러 8개 + useEffect 3개가 AppNav에 직접 들어갔습니다. AppNav는 이미 프로필 메뉴, 드로어, 테마 등 많은 책임을 갖고 있어 800줄 이상으로 커질 수 있습니다.
  > 
  > → `useSearchModal()` 커스텀 훅으로 검색 상태/로직 분리 권장
  > 
  > **8. SSE 연결이 검색어 변경마다 재생성 (중요도: :yellow_circle: 중)**
  > 
  > ```
  > useEffect(() => {
  >   if (!isSearchModalOpen || searchKeyword.trim()) {
  >     setIsTrendingStocksLoading(false);
  >     return;
  >   }
  >   // SSE 연결...
  > }, [isSearchModalOpen, searchKeyword]);
  > ```
  > 
  > searchKeyword가 deps에 있어서, 사용자가 검색어를 입력했다가 지울 때마다 SSE 재연결이 발생합니다. 디바운스가 없어 빠른 타이핑 시 불필요한 연결/해제 반복.
  > 
  > → 검색어가 비어있을 때만 연결하는 로직이니 `searchKeyword.trim()`을 별도 state로 관리하거나 디바운스 추가
  > 
  > **9. 인증 체크 중복 (중요도: :green_circle: 낮음)** isAuthorized() 함수가 3개 route 파일에 동일하게 복붙되어 있습니다:
  > 
  > ```
  > function isAuthorized(request: NextRequest) {
  >   return Boolean(request.headers.get("authorization"));
  > }
  > ```
  > 
  > → 공통 유틸로 분리 (이미 portfolio에 ensureMockPortfolioAuthorized 패턴이 있음)
  > 
  > **10. shouldUseMockSearchApi() / getApiBaseUrl() 중복 (중요도: :yellow_circle: 중)** `/api/search/route.ts`와 `/api/stream/stocks/trending/route.ts`에 동일한 헬퍼 4개(isEnabled, isDisabled, shouldUseMock\*, getApiBaseUrl)가 복붙되어 있습니다.
  > 
  > → 공통 유틸로 추출 (portfolio의 utils.ts 패턴 참고)
  > 
  > **11. SignalsMobileList 스타일 이동 부작용 (중요도: :yellow_circle: 중)**
  > 
  > ```
  > // Before: 아이콘 div에 적용
  > 
  > 
  > <div style={{ backgroundColor: signalUi.bg, outlineColor: signalUi.border }}>
  > 
  > // After: 전체 row article에 적용
  > 
  > 
  > <motion.article style={{ backgroundColor: signalUi.bg, outlineColor: signalUi.border }}>
  > ```
  > 
  > 시그널 색상(BUY=초록, SELL=빨강)이 아이콘 배지에서 전체 행 배경으로 바뀌었습니다. 이것이 의도된 디자인 변경인지 확인 필요. 검색 MR과 무관한 시그널 페이지 변경이 섞여 있습니다.
  > 
  > → 의도된 변경이라면 별도 MR로 분리 권장
  > 
  > ### :green_circle: 잘한 점
  > 
  > - envelope 응답 방어적 파싱 — isSearchAutocompleteEnvelope 가드로 mock/실서버 모두 대응
  > - 검색 디바운스 — 180ms setTimeout으로 자동완성 요청 제어
  > - 비로그인 가드 — 최근 검색어 API를 인증 상태에서만 호출
  > - SSE cleanup — useEffect return으로 정상 해제
  > - GICS 한글 바이패스 — 이미 한글이면 매핑 스킵
  > 
  > ## :clipboard: 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | BE 타입 일치 | :x: iconUrl 누락, fluctuationRate null 미처리 |
  > | API 프록시 | :x: 최근검색어 실서버 프록시 없음 |
  > | SSE 연동 | :white_check_mark: trending 정상 |
  > | 검색 로직 | :white_check_mark: 디바운스 + envelope 파싱 |
  > | 코드 구조 | :warning: AppNav 비대화, 헬퍼 중복 |
  > | 무관 변경 혼입 | :warning: SignalsMobileList 스타일 변경 |
  > | 테스트 | :warning: 없음 |
  > 
  > ### 머지 전 필수 수정 사항
  > 
  > 1. **`SearchStockItem`에 `iconUrl: string | null` 추가** — BE 스펙 불일치
  > 2. **`/api/search/recent` route에 실서버 프록시 분기 추가** — mock only라 실서버에서 동작 안 함
  > 3. **SignalsMobileList 스타일 변경이 의도인지 확인** — 시그널 색상이 아이콘→전체행으로 바뀜
  > 
  > ### 머지 후 개선 권장
  > 
  > 4. AppNav에서 검색 로직을 커스텀 훅으로 분리
  > 5. route 헬퍼 함수 공통화
  > 6. SSE 재연결 최적화

---

### !357 · [FE] Refactor: S14P21D208-186 fetch/변환 분리, select 패턴 적용 및 직접 백엔드 통신

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/fe/envelope-unwrap` → `dev-frontend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/357](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/357)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> fetch 함수를 순수하게 분리하고, 데이터 변환을 React Query select로 이동하여 재사용성 확보 및 Route Handler 미경유 직접 백엔드 통신으로 전환
> 
> ## MR 세부 내용
> - fetch 함수(getStockReport/Performance/Trades)를 envelope unwrap만 수행하도록 순수화
> - transformApiResponse.ts 유틸 분리 (chairman flatten, pairTrades, 타입 변환)
> - 훅에서 React Query select로 변환 적용 (캐시에 raw 데이터, 컴포넌트에 변환된 데이터)
> - serverFetch.ts에서 동일 변환 유틸 재사용
> - useBaseUrl true 통일로 Route Handler 미경유, 백엔드 직접 통신
> - pairTrades에 tradeTime 오름차순 정렬 추가 (매매 기간 역전 수정)
> - toLocaleString/toFixed null 방어 처리
> 
> ## Issue 번호
> S14P21D208-186

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-26)
  > ## 코드 리뷰 리포트 - MR #357
  > 
  > **리뷰 대상:** 12개 파일 변경 (224줄 추가, 114줄 삭제)
  > **총 이슈:** 3건
  > 
  > ---
  > 
  > ### CRITICAL (0건)
  > 없음
  > 
  > ### HIGH (0건)
  > 없음
  > 
  > ### MEDIUM (1건)
  > 
  > **1. transformPerformanceResponse - 검증 없는 타입 단언**
  > `transformApiResponse.ts:43-44` - `raw as PerformanceResponse`는 런타임 검증 없음. holding/chart 필드 부재 시 크래시 가능. 최소한 주요 필드 존재 확인 또는 기본값 처리 권장
  > 
  > ### LOW (2건)
  > 
  > **2. fetch 함수 반환 타입 미명시** - 반환 타입이 Promise<unknown>으로 추론됨. select가 변환하므로 동작 문제 없지만, 단독 사용 시 타입 안전성 부재
  > 
  > **3. pairTrades select 내 정렬 비용** - select는 매 렌더마다 실행되므로 정렬 반복. 현재 소규모 데이터라 이슈 없지만 참고
  > 
  > ---
  > 
  > ### 총평
  > 
  > fetch/변환 분리 구조가 깔끔합니다. fetch 함수가 순수하게 envelope unwrap만 수행하고, 변환 유틸이 분리되어 select와 serverFetch 양쪽에서 재사용되는 구조가 좋습니다. pairTrades의 오름차순 정렬로 매매 기간 역전 문제도 해결됨.
  > 
  > **Recommendation: APPROVE**

- 💬 **장호정** (2026-03-26)
  > ## 코드리뷰 MEDIUM 이슈 수정 완료
  > 
  > **MEDIUM #1 — transformPerformanceResponse 타입 단언 제거**
  > 
  > `raw as PerformanceResponse` → 필드별 null 방어 + fallback 기본값 처리로 변경.
  > holding/chart 필드 부재 시에도 크래시하지 않음.
  > 
  > 커밋: `f018542c`

---

### !358 · [FE] Feat: S14P21D208-227 proxy.ts에서 SSR용 accessToken 쿠키 자동 갱신

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/fe/proxy-access-token` → `dev-frontend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/358](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/358)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 배포 환경에서 nginx가 Route Handler를 우회하여 accessToken 쿠키가 설정되지 않는 문제를 proxy.ts(Next.js 16 middleware)에서 해결
> 
> ## MR 세부 내용
> - proxy.ts에서 protected 페이지 접근 시 accessToken 쿠키 존재 여부 확인
> - 쿠키 없으면 refreshToken으로 Spring /api/auth/refresh 호출하여 accessToken 쿠키 발급
> - 이미 쿠키 있으면 갱신 스킵 (매 요청마다 refresh 호출 방지)
> - proxy() 함수를 async로 변경 (Next.js 16 Node.js 런타임 지원)
> 
> ## 배경
> nginx가 /api/* 를 Spring으로 직접 프록시하여 Next.js Route Handler(proxyAuthRequest)가 실행되지 않음.
> 따라서 Route Handler에서 설정하던 accessToken 쿠키가 배포 환경에서 생성되지 않아 SSR prefetch 시 인증 실패.
> proxy.ts는 페이지 요청에 대해 실행되므로 nginx 영향 없이 쿠키 발급 가능.
> 
> ## Issue 번호
> S14P21D208-227

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-26)
  > ## 코드 리뷰 리포트 - MR #358
  > 
  > **리뷰 대상:** 1개 파일 변경 (82줄 추가, 7줄 삭제)
  > **총 이슈:** 3건
  > 
  > ---
  > 
  > ### CRITICAL (0건)
  > 없음
  > 
  > ### HIGH (0건)
  > 없음
  > 
  > ### MEDIUM (2건)
  > 
  > **1. accessToken 쿠키 만료 시 갱신 불가**
  > accessToken 쿠키가 존재하면 즉시 반환하므로, 토큰이 만료되었지만 쿠키가 남아있는 경우 갱신 불가. 현재는 shouldDehydrateQuery가 방어하므로 즉시 문제 없지만, 향후 JWT exp 체크 또는 maxAge 조정 고려.
  > 
  > **2. refresh 실패 시 silent catch**
  > catch 블록이 비어있어 배포 환경 디버깅 어려움. console.error 로깅 추가 권장.
  > 
  > ### LOW (1건)
  > 
  > **3. 쿠키 상수 중복**
  > auth/utils.ts와 동일 상수 정의. Next.js 16 Node.js 런타임이므로 import 가능하지만, proxy.ts 독립성 위해 중복 허용도 합리적.
  > 
  > ---
  > 
  > ### 총평
  > 
  > nginx Route Handler 우회 문제를 proxy.ts에서 깔끔하게 해결. ensureAccessTokenCookie의 early return 패턴이 좋고, 쿠키 존재 시 스킵으로 불필요한 refresh 방지.
  > 
  > **Recommendation: APPROVE**

---

### !359 · [BE] Refactor: S14P21D208-109 메인 API 리팩토링 (top-stocks GET 전환, 관심종목 여부 추가, PORTFOLIO_DONE 신호 기반 갱신)

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `feature/be/watchlist-news-api-refactor` → `dev-backend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/359](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/359)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 메인 페이지 top-stocks API를 GET으로 전환하고, top-stocks/new-signals에 관심종목 여부를 추가하며, 캐시 갱신을 PORTFOLIO_DONE 신호 기반으로 변경
> 
> ## 🧑‍💻 MR 세부 내용
> - `/api/stream/main/top-stocks` SSE → `/api/main/top-stocks` REST GET으로 전환
> - `top-stocks`, `new-signals` 응답에 `is_watchlisted` 필드 추가 (로그인 시 관심종목 여부 반영, 비로그인 시 false)
> - 기존 1분 폴링 스케줄러(`refreshTopStocks`, `refreshNewSignals`) 제거
> - `pipeline_signals` 테이블의 `PORTFOLIO_DONE` 신호 감지 시 1회 일괄 갱신으로 변경 (18:00~09:00, 5분 주기 폴링)
> - 장중(08:50~15:40) 1분마다 분봉 기반 가격·변동률 갱신 스케줄러 추가
> - 캐시(Redis)에는 `isWatchlisted=false`로 저장, 조회 시 유저별 관심종목 매핑 적용
> - 관심종목 매핑 단위 테스트 추가
> 
> ## 📎 Issue 번호
> S14P21D208-109

</details>

**리뷰 토론**

- 💬 **강지석** (2026-03-26)
  > # 코드 리뷰: [BE] Refactor S14P21D208-109 메인 API 리팩토링
  > 
  > > 대상 커밋: `c0fe047`, `fd9f24c`
  > > 브랜치: `feature/be/watchlist-news-api-refactor`
  > > 리뷰 일시: 2026-03-26
  > 
  > ---
  > 
  > ## 변경 요약
  > 
  > | 항목 | 내용 |
  > |------|------|
  > | top-stocks | SSE → REST GET 전환 |
  > | 관심종목 여부 | `isWatchlisted` 필드 추가 (TopStock, NewSignal 모두) |
  > | 갱신 방식 | 매분 폴링 → PORTFOLIO_DONE 신호 기반 갱신 |
  > | 장중 가격 | 분봉 기반 1분마다 가격/변동률 갱신 스케줄러 추가 |
  > 
  > ---
  > 
  > ## 잘한 점
  > 
  > - top-stocks SSE → REST GET 전환: 실시간 스트림이 필요 없는 데이터에 적합한 판단
  > - 캐시에는 `isWatchlisted=false`로 저장, 요청 시 userId 기반 매핑 → 캐시 공유 가능한 구조
  > - PORTFOLIO_DONE 신호 기반 갱신: 매분 무의미한 DB 조회 제거, 이벤트 기반으로 효율화
  > - `refreshPrices()`로 장중 가격만 분리 갱신 → 신호 데이터(순위, 신뢰도) 유지하면서 가격만 업데이트
  > 
  > ---
  > 
  > ## P1 — 버그 가능성 (수정 권장)
  > 
  > ### 1. `IN :stockIds` native query 바인딩 문제
  > 
  > **파일:** `MainStockQueryRepository.java` — `getLatestPrices()`
  > 
  > ```sql
  > WHERE s.id IN :stockIds
  > ```
  > 
  > native query에서 JPA가 리스트 파라미터를 제대로 바인딩 못 할 수 있음.
  > 
  > **수정:**
  > ```sql
  > WHERE s.id IN (:stockIds)
  > ```
  > 
  > ### 2. `getLatestPrices`에서 NPE 가능성
  > 
  > **파일:** `MainStockQueryRepository.java` — `getLatestPrices()`
  > 
  > ```java
  > int price = row.get("close_price", Number.class) != null
  >     ? row.get("close_price", Number.class).intValue() : 0;
  > ```
  > 
  > `COALESCE(m.close_price, d.close_price)`가 둘 다 null이면 위험. `row.get()`을 두 번 호출하지 말고 변수로 추출해야 안전함.
  > 
  > **수정:**
  > ```java
  > Number priceNum = row.get("close_price", Number.class);
  > int price = priceNum != null ? priceNum.intValue() : 0;
  > Number rateNum = row.get("fluctuation_rate", Number.class);
  > float rate = rateNum != null ? rateNum.floatValue() : 0f;
  > ```
  > 
  > ---
  > 
  > ## P2 — 개선 권장
  > 
  > ### 3. `refreshOnPortfolioDone` 폴링 빈도
  > 
  > **파일:** `MainServiceImpl.java`
  > 
  > 18:00~09:00 사이 **15시간 동안 5분마다 폴링** = 하루 180회. 신호 도착 시간대가 특정 범위라면 그 시간대로 좁히거나 `fixedRate`를 늘리는 것 권장.
  > 
  > ### 4. `lastPortfolioDoneAt` 컨테이너 재시작 시 중복 처리
  > 
  > **파일:** `MainServiceImpl.java`
  > 
  > ```java
  > private final AtomicReference<OffsetDateTime> lastPortfolioDoneAt =
  >     new AtomicReference<>(LocalDate.now(...).atStartOfDay(...).toOffsetDateTime());
  > ```
  > 
  > 컨테이너 재시작 시 당일 00:00으로 초기화 → 이미 처리한 PORTFOLIO_DONE 신호를 재감지해서 중복 갱신. 결과적으로 캐시 덮어쓰기라 데이터 손상은 없지만 불필요한 DB + 캐시 작업 발생.
  > 
  > **선택지:**
  > - DB에서 마지막 처리 시각 읽어오기
  > - 멱등성 보장되니 현행 유지 (트레이드오프 인지만 하면 됨)
  > 
  > ### 5. 관심종목 매핑 로직 중복
  > 
  > **파일:** `MainServiceImpl.java`
  > 
  > `applyWatchlistToTopStocks()`, `applyWatchlistToNewSignals()` 두 메서드에서 record 복사 + `isWatchlisted`만 교체하는 패턴이 반복. 현재 규모에서 큰 문제는 아니나, record에 `withWatchlisted(boolean)` 헬퍼를 두면 깔끔해짐.
  > 
  > ### 6. 분봉 fluctuation_rate 의미 차이 ⚠️
  > 
  > **파일:** `MainStockQueryRepository.java` — `getLatestPrices()`
  > 
  > 분봉의 `fluctuation_rate`은 **해당 1분 봉 내 변동률**이지, **전일 대비 변동률이 아님**. 프론트에서 전일 대비를 기대한다면 값이 달라질 수 있음.
  > 
  > **확인 필요:** 프론트가 기대하는 변동률이 전일 대비인지, 현재 봉 기준인지 확인 후 필요 시 쿼리에서 전일 종가 대비로 계산.
  > 
  > ### 7. `refreshPrices`와 `refreshOnPortfolioDone` 동시 실행
  > 
  > 두 스케줄러 모두 `cacheRepository.saveTopStocks()`를 호출. 현재는 시간대가 겹치지 않아 (장중 vs 18시 이후) 실제 race condition은 없으나, 이 전제가 깨지면 문제가 됨. 주석으로 시간대 분리 전제를 명시 권장.
  > 
  > ---
  > 
  > ## 체크리스트
  > 
  > - [x] P1 #1: `IN :stockIds` → `IN (:stockIds)` 수정
  > - [x] P1 #2: `getLatestPrices` NPE 방어 변수 추출
  > - [x] P2 #6: 프론트에서 기대하는 변동률 의미 확인
  > - [ ] (선택) P2 #3: 폴링 시간대/빈도 조정
  > - [ ] (선택) P2 #4: 재시작 중복 처리 대응

- 💬 **이혜민** (2026-03-26)
  > ## 코드 리뷰 반영 (c20a8de)
  > 
  > ### P1 — 수정 완료
  > 
  > - **#1 IN :stockIds 바인딩**: `IN (:stockIds)`로 수정했습니다.
  > - **#2 NPE 방어**: `row.get()` 이중 호출 제거하고 변수로 추출했습니다.
  > 
  > ### P2 — 반영 내역
  > 
  > - **#3 폴링 빈도**: AI 파이프라인 완료 시간대가 아직 확정되지 않아 현행 유지합니다. 확정되면 시간대를 좁히겠습니다.
  > - **#4 재시작 중복 처리**: 멱등성이 보장되므로(캐시 덮어쓰기) 현행 유지합니다.
  > - **#5 관심종목 매핑 중복**: 현재 2개 메서드 규모에서 추상화는 과도하다고 판단하여 현행 유지합니다.
  > - **#6 분봉 변동률**: 전일 종가 대비로 계산하도록 수정했습니다. `(현재가 - 전일종가) / 전일종가 * 100`
  > - **#7 동시 실행**: refreshPrices(장중 08:50~~15:40)와 refreshOnPortfolioDone(18:00~~09:00) 시간대 분리 전제를 주석으로 명시했습니다.

- 💬 **강지석** (2026-03-26)
  > ## 새로 발견된 이슈 (🔴 P1)
  > 
  > `prev` LATERAL JOIN의 `OFFSET 1` 로직이 장중에 틀림
  > ```sql
  > LEFT JOIN LATERAL (
  >     SELECT close_price
  >     FROM stock_prices_daily
  >     WHERE stock_id = s.id
  >     ORDER BY trade_date DESC LIMIT 1 OFFSET 1  -- ← 문제
  > ) prev ON true
  > ```
  > 
  > ### 시나리오 (수요일 장중, 오늘 일봉 아직 없음)
  > 
  > | | d LATERAL (LIMIT 1) | prev LATERAL (OFFSET 1) |
  > |---|---|---|
  > | DB 일봉 | 월, 화만 존재 | 월, 화만 존재 |
  > | 결과 | 화요일 종가 ✅ | 월요일 종가 ❌ (전일은 화요일이어야 함) |
  > 
  > ### 15:35 이후 (오늘 일봉 존재)
  > 
  > | | d LATERAL (LIMIT 1) | prev LATERAL (OFFSET 1) |
  > |---|---|---|
  > | DB 일봉 | 월, 화, 수 | 월, 화, 수 |
  > | 결과 | 수요일 ✅ | 화요일 ✅ 정상 |
  > 
  > > **즉 장중에만 전일 종가가 하루 밀림 → 변동률이 이틀치로 계산됨.**
  > 
  > ### 수정 방법
  > ```sql
  > LEFT JOIN LATERAL (
  >     SELECT close_price
  >     FROM stock_prices_daily
  >     WHERE stock_id = s.id
  >       AND trade_date < CURRENT_DATE
  >     ORDER BY trade_date DESC LIMIT 1
  > ) prev ON true
  > ```
  > 
  > `CURRENT_DATE` 기준으로 오늘 이전 가장 최근 일봉을 가져오면, 오늘 일봉 존재 여부와 무관하게 항상 전일 종가가 정확해짐.

---

### !361 · [BE] Fix: 일봉 누락 자동 복구 서비스 추가 (컨테이너 재시작 대응)

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `fix/be/daily-candle-recovery` → `dev-backend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/361](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/361)

<details><summary>MR 설명</summary>

> - StockPriceDailyRecoveryService: 앱 시작 시 + 매일 16:00/17:00 빠진 일봉을 분봉에서 자동 생성
> - StockPriceMinuteRepository: findByDateRange 쿼리 추가

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-26)
  > ## MR #361 코드리뷰: 일봉 누락 자동 복구 서비스 추가
  > 
  > **작성자:** 강지석 | **변경 파일:** 2개 | **브랜치:** `fix/be/daily-candle-recovery` → `dev-backend`
  > 
  > ---
  > 
  > ### 전체 평가: :white_check_mark: 실용적인 복구 로직
  > 
  > 컨테이너 재시작이나 장애로 누락된 일봉을 분봉 데이터에서 자동 복구하는 방어적 설계입니다.
  > 
  > ---
  > 
  > ### :thumbsup: 좋은 점
  > 
  > 1. **다중 트리거** — 앱 시작 시 + 스케줄(16:00/17:00) 이중 안전장치
  > 2. **주말 제외** — `recentWeekdays()`로 평일만 대상
  > 3. **중복 방지** — `existsByStockIdAndTradeDate()`로 이미 존재하면 스킵
  > 4. **정렬 후 집계** — 시가(first), 종가(last), 고가(max), 저가(min), 거래량(sum) 정확
  > 
  > ---
  > 
  > ### :mag: 개선 제안
  > 
  > **1. `findByDateRange` 대량 조회 시 메모리 이슈 (중요도: :red_circle: 높음)**
  > 
  > 전체 종목 × 7일치 분봉을 한 번에 메모리에 올립니다. 종목 50개 × 하루 380분봉 × 7일 ≈ 133,000건은 괜찮지만, 종목 수가 늘어나면 위험합니다.
  > 
  > → 날짜별로 쿼리를 분리하거나(`recoverDate` 내에서 호출), 혹은 `findByDateRange`에 `stockId IN (...)` 조건 추가 권장
  > 
  > **2. `@Transactional`이 `protected` 메서드에 적용됨 (중요도: :red_circle: 높음)**
  > 
  > `recoverDate()`는 `protected`이고 같은 클래스의 `recover()`에서 호출됩니다. Spring AOP 프록시는 **내부 호출 시 `@Transactional`을 무시**합니다. 따라서 현재 트랜잭션이 적용되지 않습니다.
  > 
  > → 해결 방법:
  > 
  > - `recover()` 자체에 `@Transactional`을 걸거나
  > - `recoverDate()`를 별도 빈으로 분리하거나
  > - `self-injection` 패턴 사용
  > 
  > **3. 공휴일 미처리 (중요도: :yellow_circle: 중)**
  > 
  > 주말은 제외하지만 공휴일(설, 추석, 대체공휴일 등)은 제외하지 않습니다. 공휴일에 분봉 데이터가 없으면 문제없지만, 만약 일부 데이터가 있으면 비정상 일봉이 생성될 수 있습니다.
  > 
  > **4. 등락률 계산 기준 (중요도: :yellow_circle: 중)**
  > 
  > 현재 `(종가 - 시가) / 시가`로 계산하지만, 일반적으로 등락률은 `(종가 - 전일 종가) / 전일 종가`입니다. 다른 일봉 데이터와 기준이 다를 수 있으니 확인이 필요합니다.
  > 
  > **5. `save()` 개별 호출 → `saveAll()` 배치 (중요도: :green_circle: 낮음)**
  > 
  > 루프 안에서 `dailyRepository.save()`를 개별 호출합니다. `saveAll()`로 배치 저장하면 성능이 개선됩니다.
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 비즈니스 로직 | :white_check_mark: |
  > | 트랜잭션 관리 | :x: 내부 호출로 미적용 |
  > | 메모리 안전성 | :warning: 대량 조회 주의 |
  > | 데이터 정합성 | :warning: 등락률 기준 확인 필요 |
  > | 스케줄링 | :white_check_mark: |
  > | 테스트 | :warning: 테스트 코드 없음 |
  > 
  > **2번(`@Transactional` 미적용)**은 머지 전 반드시 수정이 필요합니다. 4번(등락률 기준)도 확인을 권장합니다.

- 💬 **이혜민** (2026-03-26)
  > ## MR #361 코드리뷰 (수정 후): 일봉 누락 자동 복구 서비스
  > 
  > **작성자:** 강지석 | **변경 파일:** 3개 | **브랜치:** `fix/be/daily-candle-recovery` → `dev-backend`
  > 
  > ---
  > 
  > ### 전체 평가: :white_check_mark: 이전 리뷰 지적사항 잘 반영됨
  > 
  > ---
  > 
  > ### :white_check_mark: 수정된 항목
  > 
  > | 이전 지적 | 반영 여부 |
  > |-------|-------|
  > | `@Transactional` 내부 호출 미적용 | :white_check_mark: `@Lazy self` 주입으로 해결 |
  > | 등락률 계산 기준 (시가→전일종가) | :white_check_mark: `prevClose` 기준으로 변경 |
  > | `save()` 개별 호출 | :white_check_mark: `saveAll()` 배치로 변경 |
  > 
  > ---
  > 
  > ### :mag: 잔여 개선 제안
  > 
  > **1. `buildPrevCloseMap` N+1 쿼리 (중요도: :yellow_circle: 중)**
  > 
  > 종목 수만큼 개별 쿼리를 실행합니다 (50개 종목 → 50번 쿼리). 현재 규모에서는 문제없지만, 종목이 늘면 부담될 수 있습니다.
  > 
  > → 커스텀 쿼리로 한 번에 조회하거나, 날짜별 복구 시 해당 날짜의 전일 일봉을 배치로 가져오는 방식 고려
  > 
  > **2. `findByDateRange` 날짜별 분리 미적용 (중요도: :green_circle: 낮음)**
  > 
  > `recover()`에서 날짜별로 `recoverDate()`를 호출하므로, 이미 하루 단위로 분봉을 조회합니다. 이전 리뷰에서 우려했던 7일치 한꺼번에 조회 문제는 구조상 발생하지 않습니다. 해결된 것으로 봅니다.
  > 
  > **3. 테스트 코드 부재 (중요도: :yellow_circle: 중)**
  > 
  > 핵심 로직(`recoverDate`, `computeFluctuationRate`, `recentWeekdays`)에 대한 단위 테스트가 있으면 회귀 방지에 도움됩니다.
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 트랜잭션 관리 | :white_check_mark: (self-injection 적용) |
  > | 등락률 정합성 | :white_check_mark: (전일 종가 기준) |
  > | 배치 저장 | :white_check_mark: (saveAll) |
  > | 쿼리 효율성 | :warning: prevClose N+1 (경미) |
  > | 테스트 | :warning: 없음 |
  > 
  > 머지해도 좋은 수준입니다. 이전 핵심 지적사항이 모두 반영되었습니다.

---

### !362 · [BE] Fix: 관심종목 조회 시 price/signal/confidence null 문제 수정

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `fix/be/watchlist-signal-null` → `dev-backend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/362](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/362)

<details><summary>MR 설명</summary>

> - SignalQueryRepository: 관심종목 전용 findLatestSignalsForStocks() 추가
>   - BUY/SELL 필터 제거 (HOLD/STAY 포함)
>   - 종목별 최신 리포트 조회 (DISTINCT ON)
>   - 관심종목 stockId만 대상 조회
> - UserServiceImpl: getWatchlist()에서 새 메서드 호출로 변경

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-26)
  > ## MR #362 코드리뷰: 관심종목 signal null 문제 수정
  > 
  > **작성자:** 강지석 | **변경 파일:** 2개 | **브랜치:** `fix/be/watchlist-signal-null` → `dev-backend`
  > 
  > ---
  > 
  > ### 전체 평가: :white_check_mark: 원인 파악 정확, 수정 적절
  > 
  > 기존 `findLatestSignalCandidates()`가 BUY/SELL만 필터했기 때문에 HOLD/STAY 종목의 signal이 null로 나오던 문제를 관심종목 전용 쿼리로 분리하여 해결했습니다.
  > 
  > ---
  > 
  > ### :thumbsup: 좋은 점
  > 
  > 1. **기존 쿼리 미수정** — 시그널 목록용 쿼리는 그대로 두고 관심종목 전용 쿼리를 별도 추가하여 영향 범위 최소화
  > 2. **DISTINCT ON 활용** — PostgreSQL 특화 문법으로 종목별 최신 1건을 효율적으로 조회
  > 3. **LATERAL JOIN** — 종목별 최신 일봉을 효율적으로 가져옴
  > 4. **빈 리스트 방어** — `stockIds`가 null/empty일 때 즉시 반환
  > 
  > ---
  > 
  > ### :mag: 개선 제안
  > 
  > **1. `IN (:stockIds)` 대량 파라미터 (중요도: :green_circle: 낮음)**
  > 
  > 관심종목 수가 수백 개 이상이면 `IN` 절이 커질 수 있지만, 일반적으로 관심종목은 소수이므로 현실적으로 문제없습니다.
  > 
  > **2. 기존 `findLatestSignalCandidates()`와 SQL 중복 (중요도: :green_circle: 낮음)**
  > 
  > 두 쿼리가 SELECT/JOIN 구조가 유사합니다. 현재는 필터 조건이 다르므로(BUY/SELL vs 전체, 전체 종목 vs 특정 종목) 분리가 합리적이지만, 향후 유지보수 시 한쪽만 수정하는 실수에 주의가 필요합니다.
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 로직 정확성 | :white_check_mark: |
  > | 쿼리 효율성 | :white_check_mark: (DISTINCT ON + LATERAL) |
  > | 영향 범위 | :white_check_mark: (기존 로직 무변경) |
  > | 방어 코드 | :white_check_mark: |
  > | 테스트 | :warning: 없음 (기존 패턴과 동일) |
  > 
  > 바로 머지해도 좋습니다.

---

### !364 · [BE] Fix: S14P21D208-202 의장 포트폴리오 월간 수익 기준 통일

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `fix/be/s14p21d208-202-report-trade-cycles` → `dev-backend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/364](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/364)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 의장 포트폴리오 월간 수익 카드의 수익률과 수익액 기준을 실현 손익 기준으로 통일했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - `/api/portfolio/chairman?tab=MONTHLY_RETURNS`의 `monthly_return` 계산 기준을 변경했습니다.
> - 기존에는 `ai_daily_performance.daily_return`의 월복리 기준이었고, `realized_profit_amount`는 `SELL` 실현손익 합계라 서로 축이 달랐습니다.
> - 이번 수정으로 `monthly_return`도 월간 `SELL` 실현 손익 기준 수익률로 계산하도록 맞췄습니다.
> - `realized_profit_amount` 필드명은 그대로 유지해 FE 연동 영향이 없도록 했습니다.
> - 월간 실현 수익률 계산을 위해 월별 `realized_cost_amount` 집계를 추가했습니다.
> - `summary.hitRate`도 변경된 월간 수익률 기준을 따라 계산됩니다.
> - Swagger 설명에서 `monthly_return` 의미를 `월간 실현 수익률`로 보정했습니다.
> - 관련 단위 테스트를 새 계산 기준에 맞게 갱신했습니다.
> 
> ## ✅ 변경 후 기준
> - `monthly_return`
>   - 해당 월 `SELL` 거래들의 실현 수익률
>   - 계산식: `realized_profit_amount / realized_cost_amount * 100`
> - `realized_profit_amount`
>   - 해당 월 `SELL` 거래들의 실현 손익 합계
> 
> ## 🧪 테스트
> - `./mvnw -Dtest=ChairmanPortfolioServiceImplTest,ReportServiceImplTest test`
> 
> ## 📎 Issue 번호
> <!-- closed #S14P21D208-202 -->

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-26)
  > ## MR #364 코드리뷰: 의장 포트폴리오 월간 수익 기준 통일
  > 
  > **작성자:** 최규직 | **변경 파일:** 4개 | **브랜치:** `fix/be/s14p21d208-202-report-trade-cycles` → `dev-backend`
  > 
  > ---
  > 
  > ### 전체 평가: :white_check_mark: 깔끔한 기준 통일 리팩토링
  > 
  > 월복리 기반 수익률 → SELL 실현손익 기준 수익률로 계산 축을 통일하여 `monthlyReturn`과 `realizedProfitAmount`가 같은 기준을 사용하게 되었습니다.
  > 
  > ---
  > 
  > ### :thumbsup: 좋은 점
  > 
  > 1. **코드 단순화** — `MonthlyAccumulator` 클래스 제거, `AiDailyPerformance` 의존성 제거로 로직이 크게 간결해짐
  > 2. **단일 데이터 소스** — 쿼리 1개(`findMonthlyTradeMetricRows`)로 월간 수익 전체를 산출
  > 3. **원가 계산 로직** — `trade_amount - realized_profit`으로 원가를 역산하는 방식이 합리적
  > 4. **테스트 갱신** — 새 기준에 맞게 테스트 데이터와 기대값 모두 업데이트
  > 5. **FE 영향 없음** — 필드명 유지로 프론트 변경 불필요
  > 
  > ---
  > 
  > ### :mag: 개선 제안
  > 
  > **1. `realizedProfitAmount` NPE 가능성 (중요도: :yellow_circle: 중)**
  > 
  > `calculateRealizedMonthlyReturn`에서 `row.realizedProfitAmount()`는 null 체크 없이 사용됩니다. `realizedCostAmount`는 null 체크하는데 `realizedProfitAmount`는 하지 않아 일관성이 떨어집니다. COALESCE로 0을 보장하고 있지만, 방어적으로 체크하면 더 안전합니다.
  > 
  > **2. SELL 없는 월은 목록에서 제외됨 (중요도: :yellow_circle: 중)**
  > 
  > 기존에는 `AiDailyPerformance` 기반이라 BUY만 있는 달도 표시되었지만, 이제는 SELL이 있는 달만 `findMonthlyTradeMetricRows`에서 반환됩니다. BUY만 6건 있고 SELL이 0건인 달이 목록에서 아예 빠지는 것이 의도된 동작인지 확인이 필요합니다.
  > 
  > **3. hitRate 계산 기준도 변경됨 (중요도: :green_circle: 낮음)**
  > 
  > 테스트에서 `hitRate` 기대값이 `1.25f → 2.0f`, `1.25f → 3.63f`로 변경되었습니다. hitRate가 실현 수익률 기반 양수 월 비율로 바뀌었다면, Swagger나 문서에도 반영하면 좋습니다.
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 로직 정확성 | :white_check_mark: |
  > | 코드 간결화 | :white_check_mark: (대폭 개선) |
  > | 테스트 | :white_check_mark: (기준 맞게 갱신) |
  > | FE 호환성 | :white_check_mark: |
  > | 데이터 누락 | :warning: SELL 없는 월 미표시 확인 필요 |
  > 
  > 머지해도 좋은 수준입니다. 2번(SELL 없는 월 표시 여부)만 의도 확인하면 됩니다.

---

### !366 · [BE] Feat: S14P21D208-228 종목 아이콘 URL 지원 추가

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `feature/be/watchlist-news-api-refactor` → `dev-backend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/366](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/366)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 종목 아이콘 URL 지원 추가 (DB 컬럼 + 6개 API 응답에 icon_url 필드 추가)
> 
> ## 🧑‍💻 MR 세부 내용
> - V18 Flyway: `stocks` 테이블에 `icon_url` 컬럼 추가
> - `StockIconUrlResolver` 공통 컴포넌트 추가 (DB 상대경로 → MinIO 전체 URL 변환)
> - 다음 API 응답에 `icon_url` 필드 추가:
>   - 전체 종목 리스트 (`StockListItemResponse`)
>   - 관심종목 (`WatchlistItemResponse`)
>   - 의장 포트폴리오 인기종목/보유종목/매매내역 (`ChairmanPortfolioResponse`)
>   - 검색 모달 (`SearchStockItemResponse`)
>   - 알림 (`NotificationItemResponse`)
> - DB에는 상대 경로(`stock-icons/삼성전자_005930.png`)만 저장, 응답 시 `${MINIO_PUBLIC_URL}/assets/` prefix 자동 조합
> 
> ## 📎 Issue 번호
> S14P21D208-228

</details>

**리뷰 토론**

- 💬 **정준용** (2026-03-26)
  > ::code-comment{title="[P1] `StockListItemResponse` 시그니처 변경 후 테스트 픽스처가 갱신되지 않았습니다" body="이번 MR에서 `StockListItemResponse`에 `iconUrl`이 추가되어 생성자 인자가 14개가 됐는데, 기존 `StockApiControllerTest`는 여전히 13개 인자로 `new StockListItemResponse(...)`를 만들고 있습니다. merge result 워크트리에서 `./mvnw.cmd -q -DskipTests test-compile`를 돌리면 `StockApiControllerTest.java:106-107`에서 바로 컴파일이 깨집니다. 프로덕션 코드는 컴파일되더라도 현재 상태로는 테스트 컴파일 단계에서 CI가 막히므로, 관련 테스트 픽스처도 함께 갱신해야 합니다." file="C:/SSAFY/S14P21D208/.codex-mr366/services/backend/src/main/java/com/sallaemallae/backend/domain/stock/dto/StockListItemResponse.java" start=35 end=37 priority=1 confidence=0.99}
  > ::code-comment{title="[P1] `StockTopListServiceImpl` 생성자 변경으로 단위 테스트가 더 이상 컴파일되지 않습니다" body="`StockTopListServiceImpl`에 `StockIconUrlResolver` 의존성이 추가되면서 Lombok 생성자 시그니처가 바뀌었는데, `StockTopListServiceImplTest#createService()`는 아직 예전 5-인자 생성자를 호출하고 있습니다. 같은 `test-compile` 실행에서 `StockTopListServiceImplTest.java:49`가 이 이유로 실패합니다. 아이콘 기능 추가 자체는 괜찮지만, 수동 생성하는 테스트 코드를 같이 고치지 않으면 merge result가 테스트 단계조차 통과하지 못합니다." file="C:/SSAFY/S14P21D208/.codex-mr366/services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/StockTopListServiceImpl.java" start=36 end=41 priority=1 confidence=0.99}
  > 
  > MR 366 merge result 기준으로 확실한 이슈는 `P1` 2건입니다. 둘 다 기능 로직보다 먼저 막히는 수준의 빌드/CI blocker입니다.
  > 
  > 예상 문제점은 아래와 같습니다.
  > 
  > - `StockListItemResponse` 변경 미반영:
  >   기존 스톡 API 컨트롤러 테스트가 컴파일조차 되지 않아서, 이후 실제 회귀 여부를 검증할 테스트 단계로 못 넘어갑니다.
  > - `StockTopListServiceImpl` 생성자 변경 미반영:
  >   탑 종목 서비스 단위 테스트가 전부 막혀서, 이번 MR이 건드린 주식 목록 응답 경로에 대한 회귀 보호막이 사라집니다.
  > 
  > 추가로 통합 관점에서 본 메모도 있습니다.
  > 
  > - 현재 프런트 [getNotifications.ts](C:/SSAFY/S14P21D208/services/frontend/src/app/notifications/api/getNotifications.ts), [getStocks.ts](C:/SSAFY/S14P21D208/services/frontend/src/app/stocks/api/getStocks.ts), [watchlistApi.ts](C:/SSAFY/S14P21D208/services/frontend/src/shared/lib/watchlistApi.ts), [getPortfolio.ts](C:/SSAFY/S14P21D208/services/frontend/src/app/portfolio/api/getPortfolio.ts) 어디에서도 새 `icon_url` 필드를 읽지 않습니다. 그래서 이 MR 단독으로는 사용자 화면 변화가 거의 없고, 현재 프런트 계약을 깨지는 않지만 기능 효과도 바로 노출되지는 않습니다.
  > - merge result 워크트리 `C:\SSAFY\S14P21D208\.codex-mr366\services\backend`에서 `.\mvnw.cmd -q -DskipTests compile`은 통과했고, `.\mvnw.cmd -q -DskipTests test-compile`은 위 2건 때문에 실패했습니다.
  > 
  > 지금 단계에서 우선순위는 테스트 컴파일 복구입니다. 그 다음에야 아이콘 응답 추가가 실제로 안전하게 들어갔다고 볼 수 있습니다.

- 💬 **송민경** (2026-03-26)
  > ## 총평
  > 
  > 이번 MR은 `stocks.icon_url` 컬럼 추가와 함께 알림, 검색, 관심종목, 포트폴리오, 상위 종목 응답에 아이콘 URL을 노출하는 변경입니다. 변경 방향은 명확하고 영향 범위도 비교적 제한적입니다.
  > 
  > 다만 공통 URL 조합 로직이 여러 API에 동시에 전파되는 구조라서, 작은 결함도 다수 엔드포인트 장애로 확산될 수 있습니다. 또한 전체 파일 코드를 기준으로 보면, 이번 변경 외의 기존 로직 중 운영 리스크가 큰 부분도 함께 보입니다. 특히 외부 스토리지 삭제 시점과 관심종목 추가의 동시성 제어는 실제 장애 가능성이 있어 우선 보완이 필요합니다.
  > 
  > ---
  > 
  > ## 반드시 수정해야 할 문제
  > 
  > ### 1. 프로필 이미지 삭제가 트랜잭션보다 먼저 실행되어 DB/스토리지 불일치가 발생할 수 있음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/user/service/UserServiceImpl.java`
  >   - `updateProfile()`
  > - 왜 문제인지
  >   - `fileStorageService.deleteObject(oldImageUrl)`가 DB 변경 커밋 전에 실행됩니다.
  >   - 외부 스토리지 삭제는 DB 트랜잭션에 롤백되지 않기 때문에, 이후 예외가 발생하면 DB에는 기존 URL이 남고 실제 파일은 삭제된 상태가 됩니다.
  >   - 또한 기존 이미지 URL과 새 이미지 URL이 동일해도 삭제를 시도합니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 사용자가 같은 이미지 URL로 프로필만 수정했는데, 현재 사용 중인 이미지가 삭제되어 프로필 이미지가 깨질 수 있습니다.
  >   - MinIO 삭제 성공 후 DB 커밋 전에 예외가 발생하면 DB에는 기존 이미지 경로가 남아 있지만 실제 파일은 없어져 모든 조회에서 broken image가 발생할 수 있습니다.
  > - 개선 방법
  >   - 기존 URL과 신규 URL이 같으면 삭제하지 않도록 분기해야 합니다.
  >   - 스토리지 삭제는 트랜잭션 커밋 이후에 수행하도록 옮기는 것이 안전합니다.
  > - 수정 예시 코드
  > ```java
  > @Transactional
  > public Map<String, Object> updateProfile(Long userId, UserProfileUpdateRequest request) {
  >   User user = userRepository.findById(userId)
  >       .orElseThrow(() -> new BusinessException(UserErrorCode.USER_NOT_FOUND));
  > 
  >   String oldImageUrl = user.getProfileImageUrl();
  >   String newImageUrl = request.profileImageUrl();
  > 
  >   if (newImageUrl != null
  >       && fileStorageService.isMinioUrl(newImageUrl)
  >       && !fileStorageService.verifyObjectExists(newImageUrl)) {
  >     throw new BusinessException(StorageErrorCode.UPLOAD_NOT_VERIFIED);
  >   }
  > 
  >   user.updateProfile(request.nickname(), newImageUrl);
  > 
  >   if (!Objects.equals(oldImageUrl, newImageUrl) && fileStorageService.isMinioUrl(oldImageUrl)) {
  >     TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
  >       @Override
  >       public void afterCommit() {
  >         fileStorageService.deleteObject(oldImageUrl);
  >       }
  >     });
  >   }
  > 
  >   return Map.of("message", "프로필이 수정되었습니다.");
  > }
  > ```
  > 
  > ### 2. 관심종목 최대 개수 제한이 동시 요청에서 깨질 수 있음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/user/service/UserServiceImpl.java`
  >   - `addWatchlist()`
  > - 왜 문제인지
  >   - 현재 로직은 `countByIdUserId()`로 개수를 조회한 뒤 insert를 수행합니다.
  >   - 이 사이에 동시 요청이 들어오면 둘 다 제한 미만으로 판단하고 저장할 수 있습니다.
  >   - 중복 종목은 `DataIntegrityViolationException`으로 막고 있지만, “최대 50개” 제한 자체는 DB 수준에서 보장되지 않습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 사용자가 여러 기기나 빠른 연속 클릭으로 동시에 추가 요청을 보내면 50개를 초과한 관심종목이 저장될 수 있습니다.
  >   - 이후 프론트 화면 개수, 제한 안내, 통계 값이 일관되지 않게 됩니다.
  > - 개선 방법
  >   - 사용자별 관심종목 추가 구간을 직렬화하거나 락을 사용해야 합니다.
  >   - 개수 제한을 애플리케이션 체크에만 맡기지 말고, 최소한 동시성 제어를 추가하는 것이 필요합니다.
  > - 수정 예시 코드
  > ```java
  > @Transactional
  > public WatchlistAddResponse addWatchlist(Long userId, WatchlistCreateRequest request) {
  >   stockRepository.findById(request.stockId())
  >       .orElseThrow(() -> new BusinessException(StockErrorCode.STOCK_NOT_FOUND));
  > 
  >   watchlistRepository.lockByUserId(userId);
  > 
  >   long currentCount = watchlistRepository.countByIdUserId(userId);
  >   if (currentCount >= WATCHLIST_MAX_SIZE) {
  >     throw new BusinessException(UserErrorCode.WATCHLIST_LIMIT_EXCEEDED);
  >   }
  > 
  >   try {
  >     watchlistRepository.save(UserWatchlist.create(userId, request.stockId()));
  >   } catch (DataIntegrityViolationException e) {
  >     throw new BusinessException(UserErrorCode.WATCHLIST_ALREADY_EXISTS);
  >   }
  > 
  >   return new WatchlistAddResponse("관심종목 추가 완료", currentCount + 1);
  > }
  > ```
  > 
  > ---
  > 
  > ## 수정 권장 사항
  > 
  > ### 1. `StockIconUrlResolver`가 입력값을 그대로 이어 붙여 잘못된 URL을 만들 수 있음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/storage/service/StockIconUrlResolver.java`
  > - 왜 문제인지
  >   - 현재 구현은 `publicUrl + "/" + bucket + "/" + iconPath` 형태로 단순 조합합니다.
  >   - `publicUrl` 끝의 `/`, `iconPath` 시작의 `/`, 또는 DB에 절대 URL이 저장되는 경우를 처리하지 않습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 설정값이 `https://cdn.example.com/`이면 `//bucket/...` 같은 URL이 생성될 수 있습니다.
  >   - DB에 절대 URL이 한 번이라도 저장되면 `https://cdn/.../https://...` 같은 잘못된 응답이 여러 API에서 동시에 발생할 수 있습니다.
  > - 개선 방법
  >   - slash normalization을 추가하고, 이미 절대 URL이면 그대로 반환하도록 방어 로직을 넣는 것이 좋습니다.
  > - 수정 예시 코드
  > ```java
  > public String resolve(String iconPath) {
  >   if (iconPath == null || iconPath.isBlank()) {
  >     return null;
  >   }
  >   if (iconPath.startsWith("http://") || iconPath.startsWith("https://")) {
  >     return iconPath;
  >   }
  > 
  >   String normalizedBase = publicUrl.endsWith("/") ? publicUrl.substring(0, publicUrl.length() - 1) : publicUrl;
  >   String normalizedBucket = bucket.startsWith("/") ? bucket.substring(1) : bucket;
  >   String normalizedPath = iconPath.startsWith("/") ? iconPath.substring(1) : iconPath;
  > 
  >   return normalizedBase + "/" + normalizedBucket + "/" + normalizedPath;
  > }
  > ```
  > 
  > ### 2. 알림 목록 조회에 `limit` 상한이 없어 대량 조회 남용에 취약함
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/notification/service/NotificationServiceImpl.java`
  >   - `normalizeLimit()`
  > - 왜 문제인지
  >   - 현재는 `limit <= 0`만 막고 있고 최대 허용치가 없습니다.
  >   - offset/limit 기반 목록 API에서 상한이 없으면 DB 조회량과 응답 직렬화 비용이 과도하게 커질 수 있습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 클라이언트 버그나 악의적 요청으로 매우 큰 `limit`이 들어오면 알림 목록 API 하나만으로도 DB와 앱 서버 부하가 커질 수 있습니다.
  > - 개선 방법
  >   - 명시적인 최대값을 두고 초과 요청은 예외 처리하거나 clamp 하는 것이 안전합니다.
  > - 수정 예시 코드
  > ```java
  > private static final int MAX_LIMIT = 100;
  > 
  > private int normalizeLimit(int limit) {
  >   if (limit <= 0 || limit > MAX_LIMIT) {
  >     throw new BusinessException(NotificationErrorCode.INVALID_NOTIFICATION_LIMIT);
  >   }
  >   return limit;
  > }
  > ```
  > 
  > ### 3. 테스트가 필드 추가 대응 수준이라 URL 변환 실패를 잡지 못함
  > 
  > - 문제 위치
  >   - `services/backend/src/test/java/com/sallaemallae/backend/domain/report/service/ChairmanPortfolioServiceImplTest.java`
  >   - `services/backend/src/test/java/com/sallaemallae/backend/domain/stock/controller/StockApiControllerTest.java`
  >   - `services/backend/src/test/java/com/sallaemallae/backend/domain/stock/service/StockTopListServiceImplTest.java`
  > - 왜 문제인지
  >   - 현재 diff 기준 테스트 수정은 생성자 인자 추가와 mock 주입 보완 수준입니다.
  >   - `resolve()`가 실제로 호출되는지, null/blank/상대경로/절대경로가 어떻게 처리되는지는 검증하지 않습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - URL 조합 로직이 깨져도 테스트는 통과하고, 운영에서만 이미지가 전부 깨지는 문제가 발생할 수 있습니다.
  > - 개선 방법
  >   - 서비스 테스트에서 `stockIconUrlResolver.resolve(...)`의 입력값과 반환값이 응답에 반영되는지 검증하는 케이스를 추가하는 것이 좋습니다.
  > - 수정 예시 코드
  > ```java
  > given(stockIconUrlResolver.resolve("stock-icons/a.png"))
  >     .willReturn("https://cdn.example.com/bucket/stock-icons/a.png");
  > 
  > assertThat(response.items().get(0).iconUrl())
  >     .isEqualTo("https://cdn.example.com/bucket/stock-icons/a.png");
  > ```
  > 
  > ---
  > 
  > ## 있으면 좋은 개선점
  > 
  > ### 1. 아이콘 URL 매핑 로직이 서비스마다 반복되어 유지보수 비용이 커짐
  > 
  > - 문제 위치
  >   - `NotificationServiceImpl`
  >   - `SearchServiceImpl`
  >   - `ChairmanPortfolioServiceImpl`
  >   - `UserServiceImpl`
  >   - `StockTopListServiceImpl`
  > - 왜 문제인지
  >   - 여러 서비스에서 record를 다시 생성하며 `iconUrl`만 치환하고 있습니다.
  >   - DTO 필드가 추가되거나 순서가 바뀌면 일부 서비스에서 누락될 가능성이 있습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 후속 MR에서 DTO 구조가 바뀌었는데 일부 서비스만 수정되어 특정 API만 데이터가 누락되거나 컴파일 오류가 발생할 수 있습니다.
  > - 개선 방법
  >   - 공통 매퍼나 팩토리 메서드로 URL 치환 책임을 한 곳으로 모으면 누락 위험을 줄일 수 있습니다.
  > - 가정이 필요함
  >   - 현재 팀이 record 재생성 패턴을 표준으로 사용하는지는 코드베이스 전반을 더 봐야 확정 가능합니다.
  > 
  > ### 2. `icon_url` 데이터 적재 정책이 코드에서 명확하지 않음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/resources/db/migration/V18__add_icon_url_to_stocks.sql`
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/entity/Stock.java`
  > - 왜 문제인지
  >   - 컬럼은 추가됐지만 어떤 경로로 값이 채워지는지, 상대 경로만 허용하는지, 절대 URL도 허용하는지 코드상 명확하지 않습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 데이터 적재 주체별로 저장 형식이 달라지면 일부 종목은 정상, 일부는 깨진 URL을 반환하는 식의 불일치가 생길 수 있습니다.
  > - 개선 방법
  >   - 적재 책임 주체와 저장 포맷을 명확히 정의하고, 저장 시 검증 규칙을 두는 것이 좋습니다.
  > - 가정이 필요함
  >   - 종목 메타데이터가 별도 배치나 관리자 도구에서 적재된다면 애플리케이션 코드만으로는 완전 판단이 어렵습니다.

- 💬 **이혜민** (2026-03-26)
  > ## 코드 리뷰 반영
  > 
  > ### P1 — 기존 코드 이슈 (별도 이슈 분리 예정)
  > 
  > - **#1 프로필 이미지 삭제 타이밍**: 이번 MR 범위 밖 기존 코드입니다. 별도 이슈로 수정하겠습니다.
  > - **#2 관심종목 동시성**: 마찬가지로 기존 코드입니다. 별도 이슈로 수정하겠습니다.
  > 
  > ### P2 — 수정 완료 (30aa0a8)
  > 
  > - **#1 StockIconUrlResolver 방어 로직**: slash normalization 추가, 절대 URL이면 그대로 반환하도록 수정했습니다.
  > - **#2 알림 limit 상한**: 기존 코드 이슈입니다. 별도 이슈로 수정하겠습니다.
  > - **#3 테스트 보강**: StockIconUrlResolverTest 단위 테스트 6건(null/blank/상대경로/절대URL/trailing slash/leading slash) + StockTopListServiceImplTest에서 resolve() 결과가 응답에 반영되는지 검증하는 통합 테스트 1건 추가했습니다.

- 💬 **강지석** (2026-03-26)
  > # Code Review: [BE] Feat: S14P21D208-228 종목 아이콘 URL 지원 추가
  > 
  > **리뷰 대상 커밋 (4건)**
  > - `59325cf` [BE] Feat: S14P21D208-228 종목 아이콘 URL 지원 추가
  > - `979fe15` [BE] Fix: S14P21D208-228 테스트 픽스처 iconUrl 인자 누락 수정
  > - `905a126` [BE] Fix: S14P21D208-228 dev-backend merge 컨플릭트 해결
  > - `30aa0a8` [BE] Fix: S14P21D208-228 코드 리뷰 반영 — Resolver 방어 로직 및 테스트 보강
  > 
  > **변경 파일**: 34개 (+1,156 / -156)
  > 
  > ---
  > 
  > ## 잘된 점
  > 
  > - **`StockIconUrlResolver` 분리**: DB에 상대 경로 저장, 서비스 레이어에서 Full URL 변환하는 설계가 깔끔함. 스토리지 백엔드 변경 시 마이그레이션 불필요.
  > - **API 전반 반영**: 관심종목, 알림, 검색, Top 종목, 의장 포트폴리오 등 리스트 API에 일관적으로 iconUrl 추가.
  > - **마이그레이션 안전성**: `V18__add_icon_url_to_stocks.sql`이 nullable `VARCHAR(500)` 컬럼 추가로 zero-downtime-safe.
  > - **Resolver 테스트**: null, blank, 절대경로, 상대경로, trailing/leading 슬래시 케이스 모두 커버.
  > 
  > ---
  > 
  > ## P0 — 머지 전 반드시 수정 (블로킹)
  > 
  > ### P0-1: `SearchServiceImplTest`, `SearchResponseJsonTest` 컴파일 에러
  > 
  > **문제 위치**
  > - `services/backend/src/test/.../search/service/SearchServiceImplTest.java`
  > - `services/backend/src/test/.../search/dto/SearchResponseJsonTest.java`
  > 
  > **왜 문제인지**
  > 
  > `SearchStockItemResponse`에 `iconUrl` 필드가 추가되어 생성자 인자가 7개가 됐는데, 두 테스트 파일에서 여전히 6개 인자로 생성하고 있어 컴파일 에러 발생.
  > 
  > ```java
  > // 현재 (6개 인자 — 컴파일 에러)
  > new SearchStockItemResponse(1L, "005930", "삼성전자", "Information Technology", 70300, BigDecimal.valueOf(2.15))
  > 
  > // 수정 (7개 인자)
  > new SearchStockItemResponse(1L, "005930", "삼성전자", "Information Technology", 70300, BigDecimal.valueOf(2.15), "https://cdn.example.com/icons/005930.png")
  > ```
  > 
  > 추가로 `SearchServiceImplTest`에 `@Mock StockIconUrlResolver stockIconUrlResolver;`가 없어서 `@InjectMocks` 주입 시 null → `resolve()` 호출 시 NPE 발생.
  > 
  > **수정 방법**
  > 1. 두 테스트 파일에서 `SearchStockItemResponse` 생성자에 7번째 인자 추가
  > 2. `SearchServiceImplTest`에 `@Mock private StockIconUrlResolver stockIconUrlResolver;` 추가
  > 
  > ---
  > 
  > ### P0-2: `ChairmanPortfolioServiceImplTest`에 `@Mock StockIconUrlResolver` 누락
  > 
  > **문제 위치**
  > - `services/backend/src/test/.../report/service/ChairmanPortfolioServiceImplTest.java`
  > 
  > **왜 문제인지**
  > 
  > `ChairmanPortfolioServiceImpl`이 `StockIconUrlResolver`에 의존하는데, 테스트에 Mock 선언이 없음.
  > 
  > ```java
  > // 현재 (3개 Mock — StockIconUrlResolver 누락)
  > @Mock private AiPortfolioRepository aiPortfolioRepository;
  > @Mock private AiDailyPerformanceRepository aiDailyPerformanceRepository;
  > @Mock private ChairmanPortfolioQueryRepository chairmanPortfolioQueryRepository;
  > @InjectMocks private ChairmanPortfolioServiceImpl chairmanPortfolioService;
  > ```
  > 
  > `toHoldingItem()`, `toPopularSignalItem()` 등에서 `stockIconUrlResolver.resolve()` 호출 시 NPE 발생.
  > 
  > **수정 방법**
  > 
  > ```java
  > @Mock private StockIconUrlResolver stockIconUrlResolver;
  > ```
  > 
  > 추가 후, 필요하면 `when(stockIconUrlResolver.resolve(anyString())).thenReturn("...")` 스텁 설정.
  > 
  > ---
  > 
  > ## P1 — 머지 전 수정 권장
  > 
  > ### P1-1: 종목 상세 DTO에 `iconUrl` 누락
  > 
  > **문제 위치**
  > - `StockDetailResponse.java`
  > - `StockBasicInfoResponse.java`
  > - `StockOverviewResponse.java`
  > 
  > **왜 문제인지**
  > 
  > 리스트 API(검색, 관심종목, Top 종목, 알림, 의장 포트폴리오)에는 모두 `iconUrl`이 추가됐는데, 종목 상세 페이지 DTO에는 빠져있음. 프론트에서 상세 페이지에 아이콘을 렌더링하려면 별도 API 호출이 필요해지는 비일관성 발생.
  > 
  > **수정 방법**
  > 
  > 최소한 `StockOverviewResponse`에 `iconUrl` 필드 추가. `StockServiceImpl`에서 `stockIconUrlResolver.resolve(stock.getIconUrl())` 호출.
  > 
  > ---
  > 
  > ### P1-2: `ChairmanHallOfFameResponse` DTO에 `iconUrl` 누락
  > 
  > **문제 위치**
  > - `ChairmanHallOfFameResponse.java` 내 `HitRateItem`, `ReturnMetricItem`
  > 
  > **왜 문제인지**
  > 
  > `stockId`, `ticker`, `name`이 있는 동일한 구조의 다른 리스트 DTO에는 모두 `iconUrl`이 들어갔는데, Hall of Fame 랭킹 아이템만 빠져있음.
  > 
  > **수정 방법**
  > 
  > `HitRateItem`, `ReturnMetricItem`에 `String iconUrl` 필드 추가 및 쿼리/매핑 로직 수정.
  > 
  > ---
  > 
  > ### P1-3: MR 범위 초과 (Scope Creep)
  > 
  > **왜 문제인지**
  > 
  > "종목 아이콘 URL 추가" MR에 관계없는 대규모 변경이 포함되어 있음:
  > 
  > | 변경 내용 | 관련성 |
  > |-----------|--------|
  > | `PerformanceTradesResponse` trade cycle 로직 (~200줄) | X |
  > | `SearchQueryRepository` CTE 전면 재작성, LIKE 이스케이프 | X |
  > | `ChairmanPortfolioServiceImpl` 월간 수익률 계산 방식 변경 | X |
  > | `StockPriceDailyRecoveryService` 신규 서비스 (~200줄) | X |
  > | `SignalQueryRepository.findLatestSignalsForStocks()` 추가 | X |
  > | `application.properties` 스케줄러 스레드 풀 설정 | X |
  > 
  > 리뷰 부담 증가, 롤백 시 아이콘 기능만 되돌리기 불가. 이미 커밋된 상태이므로 다음부터 기능 단위로 MR 분리 권장.
  > 
  > ---
  > 
  > ## P2 — 개선 사항
  > 
  > ### P2-1: iconUrl resolve 시 record 전체 재생성
  > 
  > **문제 위치**
  > - `NotificationServiceImpl.java` (~59행)
  > - `SearchServiceImpl.java`
  > 
  > **설명**
  > 
  > `iconUrl` 하나 변환하기 위해 record 전체를 새로 생성하는 패턴이 반복됨.
  > 
  > ```java
  > // 현재
  > .map(item -> new NotificationItemResponse(
  >     item.id(), item.notiType(), item.stockName(), item.message(),
  >     item.isRead(), item.createdAt(), item.stockId(),
  >     stockIconUrlResolver.resolve(item.iconUrl())
  > ))
  > ```
  > 
  > **개선 방법**: record에 `withIconUrl(String)` 메서드 추가하거나, repository 매핑 레이어에서 직접 resolve.
  > 
  > ---
  > 
  > ### P2-2: `StockPriceDailyRecoveryService.buildPrevCloseMap()` N+1 쿼리
  > 
  > **문제 위치**
  > - `StockPriceDailyRecoveryService.java` (~274행)
  > 
  > **설명**
  > 
  > ```java
  > for (Long stockId : stockIds) {
  >     dailyRepository.findTopByStockIdAndTradeDateLessThanEqualOrderByTradeDateDesc(stockId, prevDate)
  >         .ifPresent(d -> map.put(stockId, d.getClosePrice()));
  > }
  > ```
  > 
  > 활성 종목 수(~150+)만큼 개별 쿼리 실행. 단일 배치 쿼리로 개선 가능.
  > 
  > ---
  > 
  > ### P2-3: `StockIconUrlResolver` bucket 빈 문자열 미처리
  > 
  > **설명**
  > 
  > `minio.bucket`이 빈 문자열이면 URL에 더블 슬래시 발생: `https://cdn.example.com//stock-icons/test.png`. 설정 오류이긴 하지만 방어 코드 권장.
  > 
  > ---
  > 
  > ### P2-4: iconUrl JSON 직렬화 통합 테스트 부재
  > 
  > **설명**
  > 
  > Resolver 단위 테스트는 있지만, 실제 API 응답에서 `icon_url` 필드가 JSON에 포함되는지 검증하는 통합 테스트가 없음. `SearchResponseJsonTest`가 있으나 P0-1 컴파일 에러 상태.
  > 
  > ---
  > 
  > ## 요약
  > 
  > | 심각도 | 건수 | 핵심 |
  > |--------|------|------|
  > | **P0** | 2 | 테스트 컴파일 에러 + NPE (CI 통과 불가) |
  > | **P1** | 3 | 상세 DTO iconUrl 누락, HallOfFame 누락, MR 범위 초과 |
  > | **P2** | 4 | record 재생성 패턴, N+1 쿼리, bucket 방어, 통합 테스트 |
  > 
  > **P0 2건은 블로킹** — 테스트 컴파일 에러와 NPE이므로 CI 통과가 안 됩니다. 우선 수정 필요.

- 💬 **이혜민** (2026-03-26)
  > ## 코드 리뷰 반영 (1b35f01)
  > 
  > ### P0 — 수정 완료
  > 
  > - **#1 SearchServiceImplTest, SearchResponseJsonTest 컴파일 에러**: StockIconUrlResolver mock 추가, SearchStockItemResponse 생성자 7번째 인자(iconUrl) 추가
  > - **#2 ChairmanPortfolioServiceImplTest StockIconUrlResolver 누락**: @Mock 추가
  > 
  > ### P1
  > 
  > - **#1 종목 상세 DTO iconUrl 누락**: 현재 상세 페이지에서 아이콘 불필요하여 스킵
  > - **#2 HallOfFame iconUrl 누락**: 현재 불필요하여 스킵
  > - **#3 MR 범위 초과**: 인지함. 다음부터 기능 단위로 MR 분리하겠습니다
  > 
  > ### P2
  > 
  > - **#1 record 재생성 패턴**: 현재 규모에서 허용 가능하여 현행 유지
  > - **#2 N+1 쿼리**: 별도 이슈로 개선 예정
  > - **#3 bucket 빈 문자열**: 설정 오류 케이스이며 현행 유지
  > - **#4 통합 테스트 부재**: StockIconUrlResolverTest 단위 테스트로 커버, 추후 보강 검토

---

### !367 · [BE] Fix: S14P21D208-108 search api 응답 보완

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `fix/be/s14p21d208-108-search-api` → `dev-backend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/367](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/367)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> Search API 뉴스 응답에 URL을 추가하고, published_at null 응답을 제외하도록 보완했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - 검색 뉴스 응답 DTO에 `url` 필드를 추가했습니다.
> - 뉴스 검색 쿼리에서 `published_at IS NOT NULL` 조건을 적용해 출간일 null 응답이 내려가지 않도록 수정했습니다.
> - 뉴스 검색 정렬을 `published_at DESC, id DESC`로 보완했습니다.
> - 종목 검색은 먼저 후보를 제한한 뒤 최신 가격을 붙이도록 정리해 불필요한 조회 범위를 줄였습니다.
> - Search 서비스 테스트와 JSON 직렬화 테스트를 추가했습니다.
> 
> ## 📎 Issue 번호
> <!-- closed #108 -->

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-26)
  > ## MR #367 코드리뷰: Search API 응답 보완
  > 
  > **작성자:** 최규직 | **변경 파일:** 4개 | **브랜치:** `fix/be/s14p21d208-108-search-api` → `dev-backend`
  > 
  > ---
  > 
  > ### 전체 평가: :white_check_mark: 품질 높은 수정
  > 
  > 뉴스 url 추가, null 필터링, 쿼리 최적화, 테스트 추가까지 깔끔하게 정리되었습니다.
  > 
  > ---
  > 
  > ### :thumbsup: 좋은 점
  > 
  > 1. **CTE 분리로 쿼리 최적화** — 종목 검색에서 먼저 후보를 LIMIT한 뒤 가격을 조인하여 LATERAL JOIN 범위 축소
  > 2. **뉴스 정렬 보강** — `match_priority → published_at DESC → id DESC`로 관련성 + 최신순 + 안정 정렬
  > 3. **null 방어** — `published_at IS NOT NULL` 필터로 불완전 데이터 제외
  > 4. **테스트 2종 추가** — JSON 직렬화 테스트 + 서비스 로직 테스트 (빈 검색어, trim 처리)
  > 
  > ---
  > 
  > ### :mag: 개선 제안
  > 
  > **1. SQL Injection 방어 확인 (중요도: :yellow_circle: 중)**
  > 
  > `keyword`를 `"%" + keyword + "%"`로 직접 조합하고 있습니다. `setParameter`로 바인딩하므로 SQL Injection은 안전하지만, `%`나 `_` 같은 LIKE 와일드카드 문자가 검색어에 포함되면 의도치 않은 결과가 나올 수 있습니다.
  > 
  > → `keyword.replace("%", "\\%").replace("_", "\\_")` 이스케이프 추가 권장
  > 
  > **2. 뉴스 CTE에 LIMIT 없음 (중요도: :yellow_circle: 중)**
  > 
  > 종목 검색은 CTE 내부에 `LIMIT :stockLimit`이 있지만, 뉴스 검색은 CTE 내부에 LIMIT 없이 외부 `setMaxResults`만 사용합니다. 뉴스 테이블이 커지면 CTE에서 전체 매칭 후 정렬하므로 성능 부담이 생길 수 있습니다.
  > 
  > → CTE 내부에도 합리적인 LIMIT 추가 고려 (또는 현재 규모에서 문제없다면 유지)
  > 
  > **3. 뉴스 검색에 `startsWith` 추가된 의도 (중요도: :green_circle: 낮음)**
  > 
  > 종목 검색의 `startsWith` 우선순위는 자연스럽지만, 뉴스 제목이 검색어로 시작하는 경우를 우선하는 것이 실제로 유의미한 차이를 주는지는 확인해볼 수 있습니다. 해가 되지는 않으므로 유지해도 무방합니다.
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 로직 정확성 | :white_check_mark: |
  > | 쿼리 최적화 | :white_check_mark: (CTE 분리) |
  > | null 방어 | :white_check_mark: |
  > | 테스트 | :white_check_mark: |
  > | LIKE 와일드카드 | :warning: 이스케이프 미처리 |
  > | 대량 데이터 성능 | :warning: 뉴스 CTE 내부 LIMIT 없음 |
  > 
  > 머지해도 좋은 수준입니다. 1번(LIKE 와일드카드 이스케이프)은 간단한 수정이니 반영하면 좋습니다.
  - ↳ **최규직** (2026-03-26)
    > 1. `%`, `_` 와일드카드 이슈는 맞아서 LIKE 검색어 이스케이프는 추가 반영하겠습니다.
    > 2. 뉴스 CTE 내부 LIMIT은 검토했는데, 정렬 전에 후보를 자르면 결과 품질이 바뀔 수 있어 이번 MR에서는 유지하지 않으려 합니다. 실측상 병목은 stock_news 풀스캔이라, 이 부분은 pg_trgm + GIN 인덱스 적용으로 해결하는 방향으로 가져가겠습니다.
    > 3. startsWith 우선순위는 부작용이 크지 않아 일단 유지하겠습니다. 실제 검색 UX 보면서 필요하면 후속 조정하겠습니다.

---

### !369 · [BE] Fix: S14P21D208-202 support DATE buy_date for holding days

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `fix/be/s14p21d208-202-report-trade-cycles` → `dev-backend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/369](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/369)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 의장 포트폴리오 월간 수익 카드 기준을 실현 손익 기준으로 통일하고, HOLDINGS의 `holding_days`가 `null`로 내려오던 문제를 함께 수정했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - `/api/portfolio/chairman?tab=MONTHLY_RETURNS`의 `monthly_return` 계산 기준을 실현 손익 기준으로 변경했습니다.
> - 기존에는 `monthly_return`은 일별 수익률 월복리 기준, `realized_profit_amount`는 월간 실현 손익 합계라 서로 기준이 달랐습니다.
> - 이번 수정으로 `monthly_return`도 월간 `SELL` 거래 기준 실현 수익률로 계산되도록 맞췄습니다.
> - `realized_profit_amount` 필드명은 그대로 유지하여 FE 연동 영향이 없도록 했습니다.
> - 월간 실현 수익률 계산을 위해 월별 `realized_cost_amount` 집계를 추가했습니다.
> - `summary.hitRate`도 변경된 월간 수익률 기준을 따라 계산됩니다.
> - Swagger 설명에서 `monthly_return` 의미를 `월간 실현 수익률`로 보정했습니다.
> - `/api/portfolio/chairman?tab=HOLDINGS`에서 `holding_days`가 전부 `null`로 내려오던 문제를 수정했습니다.
> - 원인은 native query 결과의 `buy_date`가 DB에서 `DATE` 타입으로 내려올 때 `OffsetDateTime` 변환이 되지 않던 점이었습니다.
> - `NativeQueryResultUtils.toOffsetDateTime()`가 `DATE`와 `LocalDate`도 처리하도록 보강했습니다.
> - 관련 테스트를 추가/갱신했습니다.
> 
> ## ✅ 변경 후 기준
> - `monthly_return`
>   - 해당 월 `SELL` 거래들의 실현 수익률
>   - 계산식: `realized_profit_amount / realized_cost_amount * 100`
> - `realized_profit_amount`
>   - 해당 월 `SELL` 거래들의 실현 손익 합계
> - `holding_days`
>   - `buy_date`부터 오늘까지의 보유 일수
>   - `buy_date`가 `DATE` 타입이어도 정상 계산
> 
> ## 🧪 테스트
> - `./mvnw -Dtest=ChairmanPortfolioServiceImplTest,ReportServiceImplTest test`
> - `./mvnw -Dtest=NativeQueryResultUtilsTest,ChairmanPortfolioServiceImplTest test`
> 
> ## 📎 Issue 번호
> <!-- closed #S14P21D208-202 -->

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-26)
  > ## MR #369 코드리뷰: holding_days null 수정 + DATE 타입 지원
  > 
  > **작성자:** 최규직 | **변경 파일:** 2개 | **브랜치:** `fix/be/s14p21d208-202-report-trade-cycles` → `dev-backend`
  > 
  > ---
  > 
  > ### 전체 평가: :white_check_mark: 정확한 원인 파악과 최소 범위 수정
  > 
  > DB의 `DATE` 타입이 `OffsetDateTime`으로 변환되지 않아 `holding_days`가 null이던 문제를 유틸리티 레벨에서 해결하여 다른 곳에서도 동일 문제가 재발하지 않도록 했습니다.
  > 
  > ---
  > 
  > ### :thumbsup: 좋은 점
  > 
  > 1. **근본 원인 수정** — 특정 필드만 패치하지 않고 공통 유틸(`NativeQueryResultUtils`)에서 해결하여 프로젝트 전체에 적용
  > 2. **타입 커버리지** — `java.sql.Date`, `LocalDate`, `OffsetDateTime`, `Timestamp` 4가지 모두 대응
  > 3. **변경 범위 최소** — 2파일, 핵심 로직만 수정
  > 4. **테스트 추가** — `sql.Date` → `OffsetDateTime` 변환 검증
  > 
  > ---
  > 
  > ### :mag: 개선 제안
  > 
  > **1. `LocalDate` 변환 테스트 누락 (중요도: :green_circle: 낮음)**
  > 
  > `sql.Date` 테스트는 있지만 `LocalDate` 입력에 대한 테스트는 없습니다. 한 줄 추가로 커버 가능합니다.
  > 
  > **2. MR 설명에 #364 내용이 중복 포함 (중요도: :green_circle: 참고)**
  > 
  > MR 설명에 월간 수익률 기준 변경 내용이 포함되어 있지만, 실제 diff에는 해당 변경이 없습니다. #364에서 이미 머지된 내용으로 보이며, 설명만 정리하면 좋습니다.
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 로직 정확성 | :white_check_mark: |
  > | 영향 범위 | :white_check_mark: (공통 유틸 보강) |
  > | 테스트 | :white_check_mark: |
  > | 코드 스타일 | :white_check_mark: |
  > 
  > 바로 머지해도 좋습니다.

---

### !370 · [BE] Fix: 코드 리뷰 반영 — 프로필 이미지 삭제 타이밍, 관심종목 동시성, 알림 limit 상한

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `fix/be/code-review-feedback` → `dev-backend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/370](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/370)

<details><summary>MR 설명</summary>

> - 프로필 이미지 삭제를 트랜잭션 커밋 후(afterCommit)로 이동하고 동일 URL 체크 추가
> - 관심종목 추가 시 SELECT FOR UPDATE로 동시 요청 race condition 방지
> - 알림 목록 조회 limit 상한(100) 추가

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-26)
  > ## MR #370 코드리뷰: 코드 리뷰 피드백 반영
  > 
  > **작성자:** 강지석 | **변경 파일:** 3개 | **브랜치:** `fix/be/code-review-feedback` → `dev-backend`
  > 
  > ---
  > 
  > ### 전체 평가: :white_check_mark: 리뷰 피드백을 정확하게 반영
  > 
  > 프로필 이미지 삭제 타이밍, 관심종목 동시성, 알림 limit 상한 세 가지 모두 적절하게 수정되었습니다.
  > 
  > ---
  > 
  > ### :thumbsup: 좋은 점
  > 
  > 1. **afterCommit 패턴** — 트랜잭션 롤백 시 파일이 삭제되는 문제 방지. 동일 URL 체크(`Objects.equals`)도 추가하여 불필요한 삭제 방지
  > 2. **SELECT FOR UPDATE** — 동시 요청으로 관심종목 상한을 초과하는 race condition 방어
  > 3. **limit 상한 추가** — 클라이언트가 과도한 limit을 요청하는 것을 차단
  > 4. **조건 정리** — 프로필 이미지 검증 로직이 들여쓰기 1단계 줄어 가독성 향상
  > 
  > ---
  > 
  > ### :mag: 개선 제안
  > 
  > **1. afterCommit 실패 시 로깅 없음 (중요도: :yellow_circle: 중)**
  > 
  > `fileStorageService.deleteObject()`가 afterCommit에서 예외를 던지면 사용자에게 에러가 전파되지 않아 고아 파일이 남을 수 있습니다. try-catch로 감싸고 로그를 남기면 운영 시 추적이 가능합니다.
  > 
  > ```java
  > @Override
  > public void afterCommit() {
  >     try {
  >         fileStorageService.deleteObject(oldImageUrl);
  >     } catch (Exception e) {
  >         log.warn("이전 프로필 이미지 삭제 실패: {}", oldImageUrl, e);
  >     }
  > }
  > ```
  > 
  > **2. SELECT FOR UPDATE 범위 (중요도: :yellow_circle: 중)**
  > 
  > `COUNT(\*) ... FOR UPDATE`는 해당 사용자의 전체 관심종목 행에 행 락을 겁니다. 동시 요청 방어에는 효과적이지만, 같은 사용자가 동시에 관심종목을 삭제하려는 요청이 있으면 대기가 발생합니다. 현재 규모에서는 문제없지만 인지하고 있으면 좋습니다.
  > 
  > **3. limit 상한 초과 시 예외 vs 클램핑 (중요도: :green_circle: 낮음)**
  > 
  > 현재는 `limit \> 100`이면 예외를 던집니다. 다른 API(normalizeLimit in ReportService 등)에서는 상한을 초과하면 클램핑(Math.min)하는 패턴도 있어, 프로젝트 내 일관성 측면에서 어느 쪽이 맞는지 확인하면 좋습니다.
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 트랜잭션 안전성 | :white_check_mark: (afterCommit) |
  > | 동시성 처리 | :white_check_mark: (FOR UPDATE) |
  > | 입력 검증 | :white_check_mark: (limit 상한) |
  > | 에러 처리 | :warning: afterCommit 예외 로깅 권장 |
  > | 일관성 | :warning: 예외 vs 클램핑 패턴 혼재 |
  > 
  > 머지해도 좋은 수준입니다. 1번(afterCommit 예외 처리)만 추가하면 더 안전합니다.

---

### !371 · [FE] Feat: 포트폴리오 상세 API 개선 및 trade_cycles 전환

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/fe/api-default-params` → `dev-frontend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/371](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/371)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> API 응답 처리 공통 유틸 분리, trade_cycles 전환, 데이터 표시 개선 및 코드리뷰 피드백 반영
> 
> ## MR 세부 내용
> ### API 구조 개선
> - shared/utils/apiResponse.ts 추가 (백엔드 ApiResponse envelope unwrap 공통 유틸)
> - report/trades 훅에 기본 파라미터 추가 (offset=0, limit=6/20)
> - queryKey에 명시적 값으로 캐시 매칭 정확도 개선
> - unwrapApiResponse data null 시 빈 객체 반환 방어 처리
> 
> ### trade_cycles 전환
> - 백엔드 trade_cycles 데이터 직접 사용으로 클라이언트 pairTrades 로직 제거
> - TradeItem 타입에 cycleId/buyCount/sellCount/remainingQuantity/hasPartialSell 추가
> 
> ### 데이터 표시 개선
> - 백테스팅 보유 기간 하드코딩(45일) → API holdingDays 연동
> - bestTrade period 빈 문자열 → buyDate/sellDate 기반 동적 생성
> - 최근 1년 수익률 클라이언트 합산 → performance API averageReturn1y 사용
> - 전체 기간 매매 횟수 아래 시작 연도 표시 (거래없음 fallback)
> - 최고/평균 수익률 소수점 2자리 반올림
> - 위원회 신뢰도 0~1 비율 → 백분율 변환 (Math.round 안전 처리)
> 
> ### 코드리뷰 피드백 반영
> - oneYearReturn → averageReturn1y 네이밍 통일, UI 텍스트 "최근 1년 평균 수익률"로 수정
> - 신뢰도 변환 Math.round로 경계값 안전 처리
> - unwrapApiResponse data null 방어 처리
> 
> ## Issue 번호
> S14P21D208-186

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-26)
  > ## 코드 리뷰 리포트 - MR #371
  > 
  > **리뷰 대상:** 15개 파일 변경 (118줄 추가, 151줄 삭제)
  > **총 이슈:** 3건
  > 
  > ---
  > 
  > ### CRITICAL (0건)
  > 없음
  > 
  > ### HIGH (0건)
  > 없음
  > 
  > ### MEDIUM (1건)
  > 
  > **1. 신뢰도 변환 경계값**
  > confidence <= 1 조건이 정확히 1일 때는 정상(100%)이지만, 1.5 같은 비정상 값이 오면 그대로 표시됨. 현실적 발생 가능성 낮으나 참고.
  > 
  > ### LOW (2건)
  > 
  > **2. oneYearReturn 네이밍 불일치**
  > 필드명은 oneYearReturn인데 실제 값은 averageReturn1y(평균 수익률). UI 텍스트는 "최근 1년 누적 수익률". 세 곳의 의미가 불일치. 향후 필드명 또는 텍스트 정리 권장.
  > 
  > **3. unwrapApiResponse data null 케이스**
  > success: true + data: null인 경우 null이 T로 캐스팅됨. 현재 사용처에서 null 방어 있어 즉시 문제 없음.
  > 
  > ---
  > 
  > ### 총평
  > 
  > pairTrades 60줄 삭제, 공통 유틸 분리, trade_cycles 전환으로 코드가 크게 단순화되었습니다. 하드코딩 값들을 API 데이터로 교체한 점도 좋습니다.
  > 
  > **Recommendation: APPROVE**

---

### !372 · [BE] Fix: S14P21D208-108 search 조건 재정의

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `fix/be/s14p21d208-108-search-api` → `dev-backend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/372](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/372)

<details><summary>MR 설명</summary>

> ## :page_facing_up: MR 한 줄 요약
> 
> Search API를 종목명·ticker·초성 중심으로 재정의하고, 뉴스 검색을 최신 뉴스 목록 방식으로 정리했습니다.
> 
> ## :technologist: MR 세부 내용
> 
> - 종목 검색을 종목명, ticker, 초성 매칭 기준으로 재정의했습니다.
> - 검색 조건에서 gics sector/category 매칭을 제거했습니다.
> - 뉴스 검색을 제목 기준 최신 뉴스 목록 조회로 단순화했습니다.
> - 검색 뉴스 응답에 url 필드를 유지하고 published_at null 데이터는 제외합니다.
> - LIKE 와일드카드 이스케이프를 추가했습니다.
> - stock_news title/snippet trigram 인덱스를 Flyway migration으로 정식화했습니다.
> - 초성 매칭 및 검색 조건 회귀 테스트를 추가했습니다.
> 
> ## :paperclip: Issue 번호
> 
> <!--closed #108-->

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-26)
  > ## MR #372 코드리뷰: search 조건 재정의 + 초성 검색
  > 
  > **작성자:** 최규직 | **변경 파일:** 3개 | **브랜치:** `fix/be/s14p21d208-108-search-api` → `dev-backend`
  > 
  > ---
  > 
  > ### 전체 평가: :warning: 초성 검색은 좋으나 종목 검색 방식 변경에 성능 우려
  > 
  > ---
  > 
  > ### :thumbsup: 좋은 점
  > 
  > 1. **초성 검색 구현** — 한글 초성 추출 + subsequence 매칭으로 `ㅅㅈ` → 삼성전자 검색 가능
  > 2. **우선순위 정렬** — 이름 시작 \> ticker 시작 \> 초성 \> 이름 포함 \> ticker 포함 순으로 직관적
  > 3. **LIKE 와일드카드 이스케이프** — 이전 리뷰 피드백 반영 유지
  > 4. **trigram 인덱스 추가** — 뉴스 검색 성능 향상을 위한 `gin_trgm_ops` 인덱스
  > 5. **테스트** — 초성 추출, subsequence 매칭, 종목 매칭 테스트 커버
  > 
  > ---
  > 
  > ### :mag: 개선 제안
  > 
  > **1. 종목 검색이 전체 테이블을 조회함 (중요도: :red_circle: 높음)**
  > 
  > 기존에는 DB에서 `WHERE ... ILIKE` + `LIMIT`으로 필터링했지만, 변경 후에는 **전체 활성 종목을 조회**한 뒤 Java에서 필터/정렬/limit을 수행합니다.
  > 
  > - 현재 종목 수가 적으면(50\~100개) 문제없지만, 종목이 수천 개로 늘어나면 매 검색마다 전체 종목 + LATERAL JOIN이 실행됨
  > - 초성 검색이 SQL에서 어려우므로 Java 필터가 불가피한 측면이 있지만, 최소한 **가격 조회(LATERAL JOIN)를 필터 후로 이동**하면 개선됩니다
  > 
  > → 방안: 종목 기본 정보만 먼저 전체 조회 + 캐싱 → Java 필터 → 매칭된 종목만 가격 조회
  > 
  > **2. 뉴스 검색에서 snippet 검색 제거됨 (중요도: :yellow_circle: 중)**
  > 
  > 기존에는 `title ILIKE OR snippet ILIKE`이었는데, `title ILIKE`만 남았습니다. 의도된 변경인지 확인이 필요합니다. snippet에 키워드가 있는 뉴스가 검색에서 빠지게 됩니다.
  > 
  > **3. `isSubsequence`가 부분수열 매칭임 (중요도: :yellow_circle: 중)**
  > 
  > `ㅅㅈ`이 삼성전자에 매칭되는 것은 직관적이지만, `ㄱㅈ`도 "삼성**전자**" 의 초성 `ㅅㅅㅈㅈ`에서 `ㅈㅈ`을 subsequence로 매칭하게 됩니다. 의도하지 않은 결과가 나올 수 있습니다.
  > 
  > → subsequence 대신 `startsWith` 또는 `contains`로 변경하면 더 직관적인 결과를 줄 수 있습니다
  > 
  > **4. trigram 인덱스의 extension 의존성 (중요도: :green_circle: 낮음)**
  > 
  > `gin_trgm_ops`는 `pg_trgm` extension이 필요합니다. 주석에 "infra-common에서 관리"라고 적혀있어 인지하고 있는 것으로 보이지만, migration 순서에 따라 실패할 수 있으니 `CREATE EXTENSION IF NOT EXISTS pg_trgm;`을 migration 앞에 넣는 것도 고려할 수 있습니다.
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 초성 검색 기능 | :white_check_mark: |
  > | 정렬 우선순위 | :white_check_mark: |
  > | 종목 검색 성능 | :x: 전체 조회 + LATERAL JOIN |
  > | 뉴스 검색 범위 | :warning: snippet 제거 의도 확인 |
  > | 매칭 정확도 | :warning: subsequence 오매칭 가능 |
  > | 테스트 | :white_check_mark: |
  > 
  > **1번(전체 종목 조회 성능)**은 종목 수 증가 시 문제가 될 수 있어 개선을 권장합니다. 2번(snippet 제거)은 의도 확인이 필요합니다.

- 💬 **이혜민** (2026-03-26)
  > ## MR #372 코드리뷰 (수정 후): search 조건 재정의 + 초성 검색
  > 
  > **작성자:** 최규직 | **변경 파일:** 3개 | **브랜치:** `fix/be/s14p21d208-108-search-api` → `dev-backend`
  > 
  > ---
  > 
  > ### :white_check_mark: 이전 리뷰 대비 변경 사항
  > 
  > | 이전 지적 | 반영 여부 |
  > |-------|-------|
  > | subsequence 오매칭 | :white_check_mark: `startsWith`로 변경 (ㅅㅈ→false, ㅅㅅ→true) |
  > | snippet 검색 제거 의도 | :white_check_mark: MR 설명에 의도 명시 (키워드 테이블 기반으로 전환) |
  > 
  > ---
  > 
  > ### :thumbsup: 좋은 점
  > 
  > 1. **뉴스 검색 방식 개선** — ILIKE 풀스캔 → `news_keyword_map` + `keywords` 테이블 JOIN으로 정확한 키워드 매칭
  > 2. **초성 매칭을 prefix로 변경** — `ㅅㅅ`은 매칭, `ㅅㅈ`은 불매칭으로 직관적
  > 3. **테스트 갱신** — 변경된 매칭 로직에 맞게 기대값 수정
  > 
  > ---
  > 
  > ### :mag: 잔여 개선 제안
  > 
  > **1. 종목 전체 조회 + LATERAL JOIN 성능 (중요도: :yellow_circle: 중)**
  > 
  > 이전 리뷰와 동일하게, 전체 활성 종목을 가격 포함하여 조회한 뒤 Java에서 필터합니다. 현재 종목 수(\~50개)에서는 문제없지만, 확장 시 고려가 필요합니다.
  > 
  > → 종목 수가 고정적이라면 현행 유지해도 무방. 늘어날 계획이 있다면 종목 기본 정보 캐싱 + 매칭 후 가격 조회 방식 권장
  > 
  > **2. 뉴스 키워드 매칭이 정확 일치(`=`)임 (중요도: :yellow_circle: 중)**
  > 
  > `k.name = :keyword`는 정확 일치입니다. 사용자가 "삼성"을 검색하면 키워드가 "삼성전자"인 뉴스는 매칭되지 않습니다. 키워드 테이블의 데이터 구조에 따라 의도대로 동작하는지 확인이 필요합니다.
  > 
  > **3. trigram 인덱스가 현재 사용되지 않음 (중요도: :green_circle: 낮음)**
  > 
  > V19 migration으로 `stock_news`에 trigram 인덱스를 추가하지만, 뉴스 검색이 키워드 테이블 JOIN 방식으로 바뀌면서 `title ILIKE`를 더 이상 사용하지 않습니다. 현재 이 인덱스를 활용하는 쿼리가 없다면 불필요한 인덱스입니다.
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 초성 검색 | :white_check_mark: (prefix 매칭으로 개선) |
  > | 뉴스 검색 | :white_check_mark: (키워드 테이블 기반) |
  > | 정렬 우선순위 | :white_check_mark: |
  > | 종목 검색 성능 | :warning: 전체 조회 (현재 규모 OK) |
  > | 뉴스 키워드 매칭 | :warning: 정확 일치 의도 확인 |
  > | trigram 인덱스 | :warning: 미사용 인덱스 |
  > | 테스트 | :white_check_mark: |
  > 
  > 머지해도 좋은 수준입니다. 2번(키워드 정확 일치)과 3번(미사용 인덱스)만 확인하면 됩니다.

- 💬 **최규직** (2026-03-26)
  > 반영해서 푸시했습니다. 이제 뉴스 검색은 키워드 매핑 exact match를 먼저 쓰고, 결과가 부족하면 기존 title ILIKE 검색으로 fallback합니다: SearchQueryRepository.java (line 66)\
  > 그래서 keywords에 없는 검색어는 제목 검색으로 내려가고, 이때 title용 trigram 인덱스가 실제로 의미를 갖습니다: V19__add_stock_news_trgm_indexes.sql (line 1)
  > 
  > 같이 정리한 내용은 이렇습니다.
  > 
  > * 뉴스 결과 병합은 키워드 결과 우선 + 중복 제거로 처리: SearchQueryRepository.java (line 236)
  > * 초성 매칭은 과매칭 줄이려고 prefix 기준 유지
  > * snippet trigram 인덱스는 더 이상 안 써서 migration에서 제거
  > * 병합 로직 테스트 추가: SearchQueryRepositoryTest.java (line 73)

- 💬 **송민경** (2026-03-26)
  > ## 총평
  > 
  > MR 372는 검색 조건을 재정의하면서 종목 검색을 애플리케이션 레벨 필터링으로 옮기고, 뉴스 검색은 키워드 매핑 우선 + 제목 fallback 구조로 바꾼 변경입니다. 검색 정확도를 높이려는 의도는 이해되지만, 현재 구현은 성능과 검색 품질 측면에서 운영 리스크가 있습니다.
  > 
  > 특히 종목 검색이 DB에서 전체 활성 종목을 매번 읽은 뒤 메모리에서 필터링/정렬되는 구조로 바뀐 점은 데이터가 늘어날수록 비용이 급격히 커질 수 있습니다. 또한 뉴스 검색은 trigram 인덱스를 추가했지만 fallback 조건이 제목만 보도록 축소되면서 기존에 잡히던 결과가 사라질 가능성이 있습니다.
  > 
  > ---
  > 
  > ## 반드시 수정해야 할 문제
  > 
  > ### 1. 종목 검색이 전체 활성 종목을 전부 읽고 메모리에서 필터링하는 구조라 성능 병목이 발생할 수 있음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/search/repository/SearchQueryRepository.java`
  >   - `searchStocks()`
  > - 왜 문제인지
  >   - 기존에는 DB에서 `ILIKE` 조건과 `LIMIT`를 적용했는데, 현재는 `WHERE s.is_active = true ORDER BY s.name`만 걸고 전체 결과를 가져온 뒤 Java stream에서 필터링, 정렬, limit를 수행합니다.
  >   - 이 방식은 검색어가 아주 짧거나 빈번하게 호출될 때 매 요청마다 전체 활성 종목 + 최신 가격 join 결과를 읽게 됩니다.
  >   - 검색 API는 호출 빈도가 높기 때문에, 이 구조는 종목 수가 늘수록 DB I/O와 애플리케이션 메모리/CPU를 동시에 압박합니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 활성 종목 수가 증가하면 검색 한 번마다 불필요한 전체 스캔과 전체 row materialization이 발생해 응답 지연이 커질 수 있습니다.
  >   - 피크 시간대에 검색 요청이 몰리면 DB와 애플리케이션 둘 다 부하가 올라가고, 전체 서비스 응답성이 떨어질 수 있습니다.
  > - 개선 방법
  >   - 초성 검색처럼 DB에서 처리하기 어려운 케이스만 별도 전략으로 두고, 일반적인 이름/ticker prefix 및 contains 검색은 최대한 DB 조건과 limit를 유지하는 편이 안전합니다.
  >   - 최소한 1차 후보군을 DB에서 좁힌 뒤 애플리케이션 정렬을 적용하는 구조로 바꾸는 것이 필요합니다.
  > 
  > ### 2. 뉴스 fallback 검색이 `snippet`을 더 이상 보지 않아 기존 검색 결과가 줄어들 수 있음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/search/repository/SearchQueryRepository.java`
  >   - `searchNewsByTitle()`
  > - 왜 문제인지
  >   - 변경 전에는 `title` 또는 `snippet` 기준으로 검색했는데, 현재 fallback은 `title ILIKE :contains`만 사용합니다.
  >   - MR 설명이 “search 조건 재정의”라고 해도, 이 변경은 단순 성능 개선이 아니라 검색 결과 집합 자체를 줄이는 동작 변경입니다.
  >   - 현재 테스트는 keyword 매핑 우선/중복 제거만 확인하고 있어, `snippet` 제거에 따른 회귀를 잡아주지 못합니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 사용자가 기사 본문 요약에만 포함된 키워드로 검색하면 예전에는 노출되던 뉴스가 이제 완전히 사라질 수 있습니다.
  >   - 프론트나 QA가 “검색 결과가 줄었다”는 회귀를 뒤늦게 발견할 수 있습니다.
  > - 개선 방법
  >   - 이게 의도된 정책 변경이면 명시적으로 합의되어야 하고, 아니면 `snippet` 검색 제거는 재검토가 필요합니다.
  >   - 최소한 title-only로 바꾼 이유와 기대 효과, 허용 가능한 검색 누락 범위를 테스트나 문서로 고정해야 합니다.
  > 
  > ---
  > 
  > ## 수정 권장 사항
  > 
  > ### 1. trigram 인덱스가 추가됐지만 현재 종목 검색 경로에서는 전혀 활용되지 않음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/resources/db/migration/V19__add_stock_news_trgm_indexes.sql`
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/search/repository/SearchQueryRepository.java`
  > - 왜 문제인지
  >   - 이번 마이그레이션은 `stock_news.title`에 대한 trigram 인덱스만 추가합니다.
  >   - 그런데 더 큰 병목 가능성은 종목 검색 쪽이며, 현재 종목 검색은 아예 DB 검색 조건을 포기했기 때문에 인덱스로 최적화할 수 없는 구조가 됐습니다.
  >   - 결과적으로 “뉴스 검색 일부”만 개선되고, 실제 호출량이 더 높은 종목 검색은 오히려 비싸졌을 가능성이 있습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 운영에서는 뉴스 검색보다 종목 자동완성/검색 호출이 훨씬 많을 수 있는데, 병목 지점이 남아 전체 검색 체감 성능이 오히려 나빠질 수 있습니다.
  > - 개선 방법
  >   - 종목 검색 경로도 DB 후보군 축소 전략을 되살리고, 필요 시 종목명/ticker용 인덱스 전략을 별도로 가져가는 편이 좋습니다.
  > 
  > ### 2. 초성 검색 구현은 좋지만, 비한글/혼합 문자열 입력에 대한 동작 정의가 불명확함
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/search/repository/SearchQueryRepository.java`
  >   - `matchesInitialConsonant()`, `extractInitialConsonants()`, `matchesStock()`
  > - 왜 문제인지
  >   - 초성 추출은 한글 음절에 대해서만 처리하고, 공백이 아닌 나머지 문자는 그대로 append 합니다.
  >   - 따라서 영문/숫자/특수문자가 섞인 종목명이나 검색어에서 어떤 결과를 기대하는지 명확하지 않습니다.
  >   - 현재 테스트도 순수 한글 케이스만 검증합니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 종목명에 영문 브랜드나 숫자가 섞인 경우 정렬 우선순위가 의도와 다르게 나올 수 있습니다.
  >   - 검색어에 공백, 영문, 초성이 섞인 경우 사용자 기대와 다른 결과가 나와 검색 품질 이슈로 이어질 수 있습니다.
  > - 개선 방법
  >   - 혼합 입력에 대한 정책을 명시하고, 그 정책을 테스트로 고정하는 것이 좋습니다.
  > 
  > ### 3. 뉴스 검색 merge 전략은 들어갔지만, keyword 매핑 결과와 fallback 결과의 정렬 일관성이 완전히 보장되지는 않음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/search/repository/SearchQueryRepository.java`
  >   - `searchNews()`, `mergeNews()`
  > - 왜 문제인지
  >   - 현재는 keyword 매핑 결과를 무조건 우선하고, 남는 자리를 fallback이 채웁니다.
  >   - 이 구조는 의도적으로 relevance보다 source priority를 택한 것인데, 최신성/정확성보다 “키워드 매핑 유무”가 더 강한 기준이 됩니다.
  >   - 코드상 명시적 정책 설명은 부족하고, 테스트도 dedupe만 검증합니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 더 최신이고 제목 일치도가 높은 뉴스가 있어도, 오래된 keyword 매핑 뉴스가 먼저 노출될 수 있습니다.
  >   - 검색 결과가 사용자가 기대하는 정렬과 달라 품질 이슈로 이어질 수 있습니다.
  > - 개선 방법
  >   - 이것이 의도된 우선순위라면 주석/테스트로 정책을 명확히 남기는 편이 좋습니다.
  > 
  > ---
  > 
  > ## 있으면 좋은 개선점
  > 
  > ### 1. 성능 회귀를 검증하는 테스트가 없음
  > 
  > - 문제 위치
  >   - `services/backend/src/test/java/com/sallaemallae/backend/domain/search/repository/SearchQueryRepositoryTest.java`
  > - 왜 문제인지
  >   - 현재 테스트는 문자열 유틸과 merge 로직 중심입니다.
  >   - 하지만 이번 MR의 핵심 리스크는 검색 정확도뿐 아니라 성능 회귀입니다.
  >   - repository 단위 테스트만으로는 한계가 있더라도, 최소한 검색 조건 변경 전후의 의도는 통합 테스트나 explain 기반 검증으로 보완할 필요가 있습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 테스트는 모두 통과하지만 운영 데이터 규모에서만 검색 응답 시간이 급격히 증가할 수 있습니다.
  > - 개선 방법
  >   - 검색 결과 정확도뿐 아니라 후보군 축소가 제대로 되는지, title-only fallback이 허용 가능한지 검증하는 테스트를 추가하는 것이 좋습니다.
  > 
  > ### 2. `pg_trgm extension is managed by infra-common/base deployment`라는 전제가 코드만으로는 보장되지 않음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/resources/db/migration/V19__add_stock_news_trgm_indexes.sql`
  > - 왜 문제인지
  >   - 마이그레이션은 `gin_trgm_ops` 사용을 전제로 하지만 extension 생성은 하지 않습니다.
  >   - 주석으로 의존성을 설명하고는 있으나, 실제 배포 환경에서 extension이 없으면 마이그레이션이 실패합니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 신규 환경이나 테스트 환경에서 `pg_trgm`이 빠져 있으면 배포 시점에 DB migration이 실패해 서비스 기동이 막힐 수 있습니다.
  > - 개선 방법
  >   - 운영/스테이징/테스트 환경에서 extension 보장 여부를 명확히 확인하거나, 최소한 배포 문서와 환경 검증 절차를 함께 두는 편이 좋습니다.
  > - 가정이 필요함
  >   - 실제 인프라 베이스 이미지/초기화 스크립트에서 `pg_trgm`을 항상 보장한다면 위험도는 낮아집니다. 현재 MR 코드만으로는 확정할 수 없습니다.

---

### !373 · [BE] Feat: S14P21D208-213 실시간 인기 검색 종목 TOP5 SSE API 추가

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `feature/be/trending-stocks` → `dev-backend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/373](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/373)

<details><summary>MR 설명</summary>

> ## :page_facing_up: MR 한 줄 요약
> 
> 검색 횟수 기반 실시간 인기 검색 종목 TOP5 SSE API 추가
> 
> ## :technologist: MR 세부 내용
> 
> - `GET /api/stream/stocks/trending` (SSE) 엔드포인트 추가
> - 유저가 종목을 검색할 때마다 Redis Sorted Set(`TRENDING_STOCKS:{날짜}`)에 검색 횟수 +1
> - TTL 하루로 매일 자동 초기화
> - 1분마다 Redis에서 TOP5 조회 → SSE broadcast
> - 종목 정보는 서버 기동 시 메모리 캐시에 로드하여 DB 조회 최소화
> - parseLong 방어 로직, null stockId 무시 등 안전 처리
> - 단위 테스트 4건 추가
> 
> ## :paperclip: Issue 번호
> 
> S14P21D208-213

</details>

**리뷰 토론**

- 💬 **송민경** (2026-03-26)
  > ## 총평
  > 
  > MR 373은 검색 저장 시 종목별 카운트를 Redis ZSet에 누적하고, 이를 기반으로 인기 검색 종목 TOP5를 SSE로 브로드캐스트하는 기능을 추가한 변경입니다. 구조는 단순하고, Redis 집계와 SSE 전송을 분리한 점은 괜찮습니다.
  > 
  > 다만 운영 관점에서는 아직 그대로 배포하기 위험한 부분이 있습니다. 특히 `stockId`를 신뢰하고 카운트를 올리는 구조, 공개 SSE 엔드포인트의 자원 보호 부재, 서버 기동 시 1회만 적재되는 종목 캐시로 인한 stale data 문제가 큽니다. 테스트도 정상 흐름 위주라, 실제 장애를 만들 수 있는 실패 케이스를 잡아주지 못하고 있습니다.
  > 
  > ---
  > 
  > ## 반드시 수정해야 할 문제
  > 
  > ### 1. 클라이언트가 임의 `stockId`를 보내 인기 검색 순위를 조작할 수 있음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/search/service/SearchServiceImpl.java`
  >   - `saveRecent()`
  > - 왜 문제인지
  >   - `request.stockId()`를 검증 없이 `trendingStockService.incrementSearchCount(request.stockId())`에 전달하고 있습니다.
  >   - 현재 코드상 `stockId`가 실제 존재하는 종목인지, 사용자가 실제 검색 결과에서 선택한 값인지 확인하지 않습니다.
  >   - 그 결과 인기 검색 집계가 “실제 검색된 종목”이 아니라 “클라이언트가 임의로 보낸 숫자”에 의해 오염될 수 있습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 악의적 클라이언트가 존재하지 않는 `stockId`나 특정 종목 ID를 반복 전송하면 Redis ZSet 상위권이 조작됩니다.
  >   - 이후 `TrendingStockService`에서 메모리 캐시에 없는 ID는 필터링되므로, TOP5 API가 5개보다 적은 결과를 반환할 수 있습니다.
  >   - 서비스 지표가 왜곡되면 프론트의 “실시간 인기 검색 종목”이 신뢰할 수 없는 데이터가 됩니다.
  > - 개선 방법
  >   - `saveRecent()`에서 `stockId` 존재 여부를 검증해야 합니다.
  >   - 가능하면 “실제 검색 결과 선택 이벤트”에만 카운트를 올리도록 책임을 분리하는 것이 더 안전합니다.
  > - 수정 예시 코드
  > ```java
  > @Override
  > @Transactional
  > public void saveRecent(Long userId, SearchHistoryRequest request) {
  >   String keyword = normalizeKeyword(request.keyword());
  >   Long stockId = request.stockId();
  > 
  >   searchCacheRepository.saveRecent(userId, keyword, stockId, RECENT_LIMIT);
  > 
  >   if (stockId != null) {
  >     boolean exists = stockRepository.existsById(stockId);
  >     if (exists) {
  >       trendingStockService.incrementSearchCount(stockId);
  >     }
  >   }
  > }
  > ```
  > 
  > ### 2. 공개 SSE 엔드포인트에 연결 수 보호가 없어 리소스 고갈 위험이 있음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/controller/StockApiController.java`
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/TrendingStockService.java`
  > - 왜 문제인지
  >   - `/api/stocks/trending`는 비인증 SSE 엔드포인트이고, 요청마다 `new SseEmitter(5 * 60 * 1000L)`를 생성합니다.
  >   - 코드상 연결 수 제한, IP 단위 rate limit, heartbeat 실패 시 정리 정책은 보이지 않습니다.
  >   - SSE는 요청 1건이 장시간 자원을 점유하므로, 일반 GET API보다 연결 관리가 더 중요합니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 트래픽 급증이나 악의적 다중 접속이 발생하면 emitter 수가 빠르게 누적될 수 있습니다.
  >   - emitter 정리가 충분하지 않거나 upstream 제한이 없다면 메모리 사용량 증가, 응답 지연, 연결 실패가 발생할 수 있습니다.
  > - 개선 방법
  >   - 최소한 API gateway 또는 애플리케이션 레벨에서 rate limit/connection limit를 둬야 합니다.
  >   - emitter 등록 시 상한, heartbeat, 종료 콜백 정리 여부를 보장해야 합니다.
  > - 수정 예시 코드
  > ```java
  > public SseEmitter streamTrending() {
  >     if (sseManager.countEmitters(CHANNEL) >= 1000) {
  >         throw new BusinessException(GlobalErrorCode.TOO_MANY_REQUESTS);
  >     }
  > 
  >     SseEmitter emitter = new SseEmitter(60_000L);
  >     sseManager.addEmitter(CHANNEL, emitter);
  > 
  >     emitter.onCompletion(() -> sseManager.removeEmitter(CHANNEL, emitter));
  >     emitter.onTimeout(() -> sseManager.removeEmitter(CHANNEL, emitter));
  >     emitter.onError(ex -> sseManager.removeEmitter(CHANNEL, emitter));
  > 
  >     sseManager.sendToEmitter(emitter, buildTrendingStocks());
  >     return emitter;
  > }
  > ```
  > - 가정이 필요함
  >   - `SseManager` 내부에서 이미 상한 관리와 정리 로직을 구현했다면 위험도는 낮아집니다. 현재 제공된 코드만으로는 확인되지 않습니다.
  > 
  > ---
  > 
  > ## 수정 권장 사항
  > 
  > ### 1. 종목 메모리 캐시가 서버 기동 시 1회만 로드되어 stale data 위험이 있음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/TrendingStockService.java`
  >   - `initStockCache()`, `buildTrendingStocks()`
  > - 왜 문제인지
  >   - `stockCache`를 `@PostConstruct`에서 한 번만 채우고 이후 갱신하지 않습니다.
  >   - 운영 중 신규 종목 추가, 종목명 변경, 비활성화가 발생해도 반영되지 않습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - Redis에는 최신 종목 ID가 상위권에 있는데 `stockCache`에는 없어서 응답에서 누락됩니다.
  >   - 종목명이 바뀌었는데 인기 검색 API는 이전 이름을 계속 내려줄 수 있습니다.
  > - 개선 방법
  >   - 캐시 미스 발생 시 DB fallback을 두거나, 일정 주기로 캐시를 refresh 하는 쪽이 안전합니다.
  >   - 또는 아예 TOP5 ID만 Redis에서 읽은 뒤 DB에서 batch 조회하는 방식도 검토할 만합니다.
  > - 수정 예시 코드
  > ```java
  > private TrendingStocksResponse buildTrendingStocks() {
  >     Set<String> topStockIds = trendingCacheRepository.getTopStockIds(TOP_LIMIT);
  >     if (topStockIds.isEmpty()) {
  >         return new TrendingStocksResponse(List.of());
  >     }
  > 
  >     List<Long> ids = topStockIds.stream()
  >         .map(this::parseLong)
  >         .filter(Objects::nonNull)
  >         .toList();
  > 
  >     Map<Long, Stock> stockMap = stockRepository.findAllById(ids).stream()
  >         .collect(Collectors.toMap(Stock::getId, Function.identity()));
  > 
  >     List<TrendingStockItemResponse> items = new ArrayList<>();
  >     int rank = 1;
  >     for (Long id : ids) {
  >         Stock stock = stockMap.get(id);
  >         if (stock != null) {
  >             items.add(new TrendingStockItemResponse(rank++, stock.getId(), stock.getName()));
  >         }
  >     }
  >     return new TrendingStocksResponse(items);
  > }
  > ```
  > 
  > ### 2. TTL을 매번 `1일`로 덮어써서 “일별 집계” 의도가 흔들릴 수 있음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/repository/TrendingCacheRepository.java`
  >   - `incrementSearchCount()`
  > - 왜 문제인지
  >   - 주석은 “하루 TTL로 매일 자동 초기화”라고 되어 있지만, 실제 구현은 검색이 발생할 때마다 `Duration.ofDays(1)`로 다시 expire를 겁니다.
  >   - 키 이름은 날짜 단위라 큰 문제는 아니지만, 의도는 “당일 자정까지만 유지”에 더 가까워 보입니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 트래픽이 늦은 시간대에 몰리면 오래된 날짜 키가 다음날 밤까지 남아 있을 수 있습니다.
  >   - Redis 메모리 정리 시점과 운영자가 기대한 “날짜 바뀌면 자연 정리” 시점이 어긋날 수 있습니다.
  > - 개선 방법
  >   - TTL은 “다음 KST 자정까지 남은 시간”으로 설정하는 편이 의도와 더 맞습니다.
  > - 수정 예시 코드
  > ```java
  > public void incrementSearchCount(Long stockId) {
  >     String key = todayKey();
  >     stringRedisTemplate.opsForZSet().incrementScore(key, String.valueOf(stockId), 1);
  >     stringRedisTemplate.expire(key, Duration.between(
  >         ZonedDateTime.now(KST),
  >         LocalDate.now(KST).plusDays(1).atStartOfDay(KST)
  >     ));
  > }
  > ```
  > 
  > ### 3. 트랜잭션 경계가 명시되지 않아 후속 변경 시 부작용이 생길 수 있음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/search/service/SearchServiceImpl.java`
  >   - `saveRecent()`, `deleteRecent()`, `clearRecent()`
  > - 왜 문제인지
  >   - `saveRecent()`는 Redis recent 저장과 인기 검색 카운트 증가를 함께 수행하지만 트랜잭션 의도가 드러나지 않습니다.
  >   - 현재 둘 다 Redis 성격이라 큰 문제는 아닐 수 있어도, 이후 DB 저장이 섞이면 실패 순서에 따라 불일치가 생길 수 있습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 나중에 최근 검색 저장이 DB로 바뀌거나 audit logging이 추가되면 일부만 반영되는 반쪽 성공 상태가 생길 수 있습니다.
  > - 개선 방법
  >   - 지금 단계에서라도 메서드 책임과 실패 허용 정책을 주석 또는 트랜잭션 설계로 명시하는 편이 좋습니다.
  > - 가정이 필요함
  >   - 현재 `SearchCacheRepository`가 전부 Redis 기반이고 best-effort 정책이라면 우선순위는 낮습니다.
  > 
  > ---
  > 
  > ## 있으면 좋은 개선점
  > 
  > ### 1. SSE 최초 전송 실패/파싱 실패/캐시 미스 케이스 테스트가 없음
  > 
  > - 문제 위치
  >   - `services/backend/src/test/java/com/sallaemallae/backend/domain/stock/service/TrendingStockServiceTest.java`
  > - 왜 문제인지
  >   - 현재 테스트는 정상 순위 반환, 빈 결과, null stockId 정도만 검증합니다.
  >   - 실제 운영 리스크는 잘못된 Redis 값, 캐시 미스, emitter 초기 전송 실패 같은 예외 케이스에 있습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - Redis에 `"abc"` 같은 값이 들어오거나, 존재하지 않는 종목 ID가 상위권에 섞여도 테스트는 이를 감지하지 못합니다.
  >   - `streamTrending()`에서 `sendToEmitter()` 실패 시 동작도 보장되지 않습니다.
  > - 개선 방법
  >   - 최소한 다음 케이스를 추가하는 것이 좋습니다.
  >   - invalid ID 파싱 실패
  >   - 캐시에 없는 stockId 포함
  >   - `streamTrending()` 호출 시 즉시 전송 수행 여부
  >   - 컨트롤러 SSE media type 검증
  > - 수정 예시 코드
  > ```java
  > @Test
  > @DisplayName("존재하지 않는 종목 ID는 결과에서 제외한다")
  > void refreshTrending_skipsUnknownStockIds() {
  >     given(trendingCacheRepository.getTopStockIds(5))
  >         .willReturn(new LinkedHashSet<>(List.of("999", "1")));
  > 
  >     trendingStockService.refreshTrending();
  > 
  >     ArgumentCaptor<TrendingStocksResponse> captor = ArgumentCaptor.forClass(TrendingStocksResponse.class);
  >     verify(sseManager).broadcast(eq("trending-stocks"), captor.capture());
  > 
  >     assertThat(captor.getValue().stocks()).hasSize(1);
  >     assertThat(captor.getValue().stocks().get(0).stockId()).isEqualTo(1L);
  > }
  > ```
  > 
  > ### 2. 응답 DTO에 ticker가 없어 프론트 활용성이 제한될 수 있음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/dto/TrendingStockItemResponse.java`
  > - 왜 문제인지
  >   - 현재 응답은 `rank`, `stockId`, `name`만 제공합니다.
  >   - 인기 검색 카드/링크/UI에서 ticker나 iconUrl이 필요한 경우 다시 추가 조회가 필요할 수 있습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 프론트가 실시간 목록 클릭 시 ticker 기반 라우팅 또는 UI 표시를 원하면 별도 조회가 붙어 불필요한 API 호출이 늘어날 수 있습니다.
  > - 개선 방법
  >   - 사용처가 확정됐다면 `ticker`, 필요 시 `iconUrl`까지 같이 내려주는 편이 응답 일관성 측면에서 낫습니다.
  > - 가정이 필요함
  >   - 현재 프론트 요구사항이 `stockId + name`만 필요하다면 당장 수정 필수는 아닙니다.
  > 
  > ### 3. 서비스 클래스가 인터페이스 없이 바로 구현되어 확장 포인트가 좁음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/TrendingStockService.java`
  > - 왜 문제인지
  >   - 지금은 단순하지만, 추후 집계 기준 변경, 비동기 수집, A/B 룰 추가가 생기면 테스트 더블이나 대체 구현 포인트가 제한될 수 있습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 집계 로직이 커졌을 때 컨트롤러/검색 서비스가 구체 구현에 직접 결합되어 변경 비용이 커질 수 있습니다.
  > - 개선 방법
  >   - 규모가 더 커질 가능성이 있다면 인터페이스 분리를 고려할 수 있습니다.
  > - 가정이 필요함
  >   - 현재 프로젝트에서 서비스 인터페이스를 일관되게 쓰지 않는다면 우선순위는 낮습니다.

- 💬 **강지석** (2026-03-26)
  > # 코드 리뷰: 실시간 인기 검색 종목 TOP5 SSE API
  > 
  > ## 전체 평가
  > 
  > 구조가 깔끔합니다. Redis Sorted Set + SSE + SseManager 재사용이 적절하고, 테스트도 잘 작성되어 있습니다.
  > 
  > ---
  > 
  > ## 🔴 반드시 수정 (P0)
  > 
  > ### 1. SseEmitter 클린업 콜백 누락
  > 
  > 📍 `TrendingStockService.java:54-59`
  > 
  > ```java
  > public SseEmitter streamTrending() {
  >     SseEmitter emitter = new SseEmitter(5 * 60 * 1000L);
  >     sseManager.addEmitter(CHANNEL, emitter);
  >     // ← onCompletion, onTimeout, onError 없음
  > ```
  > 
  > 타임아웃/에러 시 emitter가 SseManager 내부 리스트에 좀비로 남습니다. `broadcast()` 시점에 dead emitter가 정리되긴 하지만, 그 사이에 메모리 누수 + 불필요한 전송 시도가 발생합니다.
  > 
  > ```java
  > // 수정안
  > sseManager.addEmitter(CHANNEL, emitter);
  > emitter.onCompletion(() -> sseManager.removeEmitter(CHANNEL, emitter));
  > emitter.onTimeout(() -> sseManager.removeEmitter(CHANNEL, emitter));
  > emitter.onError(e -> sseManager.removeEmitter(CHANNEL, emitter));
  > ```
  > 
  > > 기존 `StockQuoteSseService`, `NotificationSseService` 모두 이 패턴을 사용하고 있습니다.
  > 
  > ---
  > 
  > ## 🟡 권장 수정 (P1)
  > 
  > ### 2. Stock 캐시가 서버 재시작 전까지 갱신 안 됨
  > 
  > 📍 `TrendingStockService.java:45-48`
  > 
  > ```java
  > @PostConstruct
  > void initStockCache() {
  >     stockRepository.findAll().forEach(stock -> stockCache.put(stock.getId(), stock));
  > }
  > ```
  > 
  > 새 종목이 추가/활성화되면 trending에 나타나지 않습니다. `buildTrendingStocks()`에서 캐시 미스 시 DB 폴백을 추가하거나, 하루 1회 캐시 리프레시를 추가하는 게 좋습니다.
  > 
  > ```java
  > // 간단한 폴백 추가안 (buildTrendingStocks 내부)
  > Stock stock = stockCache.get(id);
  > if (stock == null) {
  >     stock = stockRepository.findById(id).orElse(null);
  >     if (stock != null) stockCache.put(id, stock);
  > }
  > ```
  > 
  > ### 3. expire가 매 검색마다 호출됨
  > 
  > 📍 `TrendingCacheRepository.java:29-31`
  > 
  > ```java
  > stringRedisTemplate.opsForZSet().incrementScore(key, String.valueOf(stockId), 1);
  > stringRedisTemplate.expire(key, Duration.ofDays(1));  // 매번 호출
  > ```
  > 
  > 검색이 많아지면 불필요한 Redis roundtrip입니다. 키 이름에 이미 날짜가 포함되어 있으므로(`TRENDING_STOCKS:2026-03-26`), TTL은 키 생성 시 1회만 설정하면 됩니다.
  > 
  > ```java
  > // 수정안: incrementScore 반환값으로 신규 키 판별
  > Double score = stringRedisTemplate.opsForZSet()
  >     .incrementScore(key, String.valueOf(stockId), 1);
  > if (score != null && score == 1.0) {
  >     stringRedisTemplate.expire(key, Duration.ofDays(2)); // 다음날까지 여유
  > }
  > ```
  > 
  > ---
  > 
  > ## 💡 고려사항 (P2)
  > 
  > ### 4. 응답에 ticker, iconUrl 누락
  > 
  > 📍 `TrendingStockItemResponse.java`
  > 
  > ```java
  > public record TrendingStockItemResponse(
  >     int rank, Long stockId, String name
  > )
  > ```
  > 
  > 프론트에서 종목 상세 이동이나 아이콘 표시를 하려면 별도 API 호출이 필요합니다. `ticker`와 `iconUrl`도 내려주면 프론트 작업이 편해집니다.
  > 
  > ### 5. 클라이언트 없어도 1분마다 Redis 조회
  > 
  > 📍 `TrendingStockService.java:73-80`
  > 
  > ```java
  > @Scheduled(fixedRate = 60_000, initialDelay = 5_000)
  > public void refreshTrending() {
  > ```
  > 
  > 구독 중인 SSE 클라이언트가 없어도 매분 Redis 쿼리 + broadcast가 실행됩니다. 치명적이진 않지만, 불필요한 리소스 사용입니다.
  > 
  > ### 6. SSE 타임아웃 5분
  > 
  > 다른 SSE 엔드포인트(`StockQuoteSseService`)는 30분인데 여기만 5분입니다. 프론트에서 자동 재연결 처리가 있다면 괜찮지만, 통일하는 게 좋습니다.
  > 
  > ---
  > 
  > ## ✅ 잘된 점
  > 
  > - Redis Sorted Set이 이 use case에 정확히 맞는 자료구조 선택
  > - `LinkedHashSet`으로 순서 보장
  > - `incrementSearchCount`에서 null 체크
  > - 테스트 4개가 핵심 시나리오를 잘 커버
  > 
  > ---
  > 
  > > **요약:** P0 (emitter 클린업) 하나만 반드시 수정, P1 2건은 권장입니다.

- 💬 **이혜민** (2026-03-26)
  > ## 코드 리뷰 반영 (510db3f)
  > 
  > ### 반드시 수정 — 수정 완료
  > 
  > - **#1 stockId 존재 검증**: `stockRepository.existsById(stockId)` 확인 후에만 카운트 증가
  > - **#2 SSE emitter 리소스 보호**: `onCompletion/onTimeout/onError` 콜백으로 emitter 정리, 타임아웃 60초로 단축
  > 
  > ### 수정 권장 — 수정 완료
  > 
  > - **#1 stale data 방지**: 메모리 캐시 제거, 매번 DB에서 TOP5 종목 조회 (5건이라 부담 없음)
  > - **#2 TTL 자정까지**: `Duration.between(now, 내일 00:00 KST)`로 변경
  > 
  > ### 있으면 좋은 개선 — 부분 반영
  > 
  > - **#1 테스트 보강**: unknown stockId 제외, invalid ID 파싱 실패 케이스 2건 추가 (총 6건)
  > - **#2 ticker 추가**: 현재 프론트 요구사항이 stockId + name만이라 스킵
  > - **#3 인터페이스 분리**: 현재 규모에서 불필요하여 스킵
  > 
  > ### 수정하지 않은 항목
  > 
  > - **트랜잭션 경계**: 현재 전부 Redis 기반 best-effort이므로 현행 유지

- 💬 **정준용** (2026-03-26)
  > ::code-comment{title="[P1] 새 `TrendingStockServiceTest`가 기본 Mockito strictness에서 실패합니다" body="이 테스트 클래스는 `@BeforeEach`에서 항상 `stockRepository.findAll()`과 `stock.getName()` 스텁을 준비한 뒤 `initStockCache()`까지 실행합니다. 그런데 `incrementSearchCount_*` 케이스들은 그 스텁들을 전혀 사용하지 않아서, merge result에서 `./mvnw.cmd -q -Dtest=TrendingStockServiceTest test`를 돌리면 3개 테스트가 `UnnecessaryStubbingException`으로 실패합니다. 지금 상태로는 MR이 추가한 회귀 방지 테스트 자체가 빨간색이므로, 공통 셋업을 필요한 테스트로 옮기거나 lenient 처리 없이 strict mode를 통과하도록 정리해야 합니다." file="C:/SSAFY/S14P21D208/.codex-mr373/services/backend/src/test/java/com/sallaemallae/backend/domain/stock/service/TrendingStockServiceTest.java" start=39 end=49 priority=1 confidence=0.99}
  > ::code-comment{title="[P2] 새 `/api/stocks/trending` SSE는 현재 프런트에서 아무 곳에서도 소비되지 않습니다" body="백엔드에는 실시간 인기 검색 종목 SSE가 추가됐지만, 현재 `dev-frontend` 기준 홈 데이터는 여전히 [route.ts](C:/SSAFY/S14P21D208/services/frontend/src/app/api/main/top-stocks/route.ts#L1)에서 mock을 바로 반환하고 있고, [HomePageClient.tsx](C:/SSAFY/S14P21D208/services/frontend/src/app/home/HomePageClient.tsx#L24)도 그 `topStocks` payload에서 인기 검색어를 파생합니다. 저장소 전체를 봐도 `/api/stocks/trending`를 구독하는 프런트 코드는 없어서, 이 MR의 핵심 endpoint는 merge돼도 사용자 화면에는 전혀 반영되지 않습니다." file="C:/SSAFY/S14P21D208/.codex-mr373/services/backend/src/main/java/com/sallaemallae/backend/domain/stock/controller/StockApiController.java" start=57 end=61 priority=2 confidence=0.97}
  > ::code-comment{title="[P2] 인기 검색 집계가 현재 프런트 검색 흐름과 연결되어 있지 않습니다" body="검색 카운트 증가는 `saveRecent()`에서만 발생하도록 넣었지만, 현재 프런트 검색 UI는 [getSuggestions.ts](C:/SSAFY/S14P21D208/services/frontend/src/app/search/api/getSuggestions.ts#L19)에서 `/api/v1/search/suggestions`만 호출하고, 저장소 안에는 `/api/search/recent`를 호출하는 경로가 없습니다. 즉 현행 프런트 사용 흐름으로는 사용자가 종목을 아무리 검색해도 `trending_stock` 집계가 올라가지 않으므로, 설령 소비 endpoint를 나중에 연결하더라도 실데이터가 계속 비어 있을 가능성이 큽니다." file="C:/SSAFY/S14P21D208/.codex-mr373/services/backend/src/main/java/com/sallaemallae/backend/domain/search/service/SearchServiceImpl.java" start=58 end=62 priority=2 confidence=0.96}
  > 
  > MR 373 merge result 기준으로 확실한 이슈는 위 3건입니다.
  > 
  > 핵심만 정리하면:
  > - 테스트는 현재 빨간색입니다. [TrendingStockServiceTest.java](C:/SSAFY/S14P21D208/.codex-mr373/services/backend/src/test/java/com/sallaemallae/backend/domain/stock/service/TrendingStockServiceTest.java) 하나만 돌려도 `UnnecessaryStubbingException`으로 실패합니다.
  > - 기능은 현재 프런트와 end-to-end로 연결되지 않았습니다. 새 SSE 소비 경로도 없고, 검색 카운트를 올려주는 `/api/search/recent`도 현행 프런트가 호출하지 않습니다.
  > 
  > 검증은 [services/backend](C:/SSAFY/S14P21D208/.codex-mr373/services/backend)에서 `.\mvnw.cmd -q -DskipTests compile` 1회 통과, `.\mvnw.cmd -q -Dtest=TrendingStockServiceTest test` 1회 실패로 확인했습니다. 런타임 로직 자체보다 지금은 “테스트 실패 + 프런트 미연결”이 이 MR의 가장 큰 문제입니다.

- 💬 **최규직** (2026-03-26)
  > 최신 `origin/dev-backend` 기준으로 보면, 이번 MR에서 머지 전에 확인해야 할 이슈는 2건입니다.
  > 
  > ## High
  > 
  > 1. 추가한 `TrendingStockServiceTest` 들은 현재 구현 기준으로 그대로는 실패합니다.\
  >    `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/TrendingStockService.java:59-62` 에서 `refreshTrending()` 는 `sseManager.hasEmitters("trending-stocks")` 가 `true` 일 때만 진행합니다.\
  >    그런데 테스트들은 `services/backend/src/test/java/com/sallaemallae/backend/domain/stock/service/TrendingStockServiceTest.java:52,72,102,120` 에서 `refreshTrending()` 를 호출하면서 `sseManager.hasEmitters(...)` 를 한 번도 stub 하지 않았고, 바로 `broadcast()` 가 호출됐다고 검증합니다 (`:55,75,105,123`).\
  >    Mockito 기본값이면 `hasEmitters()` 는 `false` 이므로 메서드는 초반에 return 하고, 이 테스트들은 전부 실패하게 됩니다.
  > 
  > ## Medium
  > 
  > 1. 비활성 종목도 인기 검색 종목에 집계되고 SSE로 노출될 수 있습니다.\
  >    검색 저장 시점에는 `services/backend/src/main/java/com/sallaemallae/backend/domain/search/service/SearchServiceImpl.java:63-66` 에서 `stockRepository.existsById(stockId)` 만 확인하고 카운트를 올립니다.\
  >    이후 인기 종목 조합도 `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/TrendingStockService.java:79-95` 에서 `stockRepository.findAllById(ids)` 로 그대로 읽어 오고 있습니다.\
  >    그런데 저장소에는 이미 active 조건 메서드가 있습니다 (`services/backend/src/main/java/com/sallaemallae/backend/domain/stock/repository/StockRepository.java:17-20`). 지금 구현대로면 장중/당일에 비활성화된 종목의 기존 카운트가 그대로 노출되거나, 잘못된 요청으로 inactive 종목이 인기 랭킹에 섞일 수 있습니다.

- 💬 **이혜민** (2026-03-26)
  > ## 코드 리뷰 반영 (676c5d9)
  > 
  > ### High — 수정 완료
  > 
  > - 테스트에 `given(sseManager.hasEmitters("trending-stocks")).willReturn(true)` stub 추가
  > - `findAllById` → `findAllByIdInAndIsActiveTrue`로 테스트도 동기화
  > 
  > ### Medium — 수정 완료
  > 
  > - `existsById` → `existsByIdAndIsActiveTrue`로 비활성 종목 카운트 방지
  > - `findAllById` → `findAllByIdInAndIsActiveTrue`로 비활성 종목 응답 제외
  > - `StockRepository`에 `findAllByIdInAndIsActiveTrue` 메서드 추가

---

### !374 · [AI] Fix: S14P21D208-216 catchup 스크립트 GARCH predictions 누락 수정

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `fix/ai/catchup-garch-missing` → `dev-ai`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/374](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/374)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> catchup_inference.py의 save_signals_to_db()에 ml_garch_predictions UPSERT가 누락되어 있던 버그를 수정한다.
> 
> ## MR 세부 내용
> - save_signals_to_db()에 ml_garch_predictions INSERT ON CONFLICT UPSERT 추가
> - garch_vol_5d가 None 또는 NaN인 경우 skip하는 필터링 포함
> - daily_inference(API 경유)의 upsert_garch_predictions()와 동일한 로직
> 
> ## Issue 번호
> S14P21D208-216

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-26)
  > 현재 기준 발견한 핵심 이슈는 1건입니다.
  > 
  > 1. catchup 재실행만으로는 이미 누락된 GARCH row를 복구하지 못합니다. catchup_inference.py (line 91) 에서 재시작 기준을 ml_tft_predictions의 MAX(report_date)로만 잡고, catchup_inference.py (line 698) 에서 그 다음 날짜부터만 처리합니다. 그래서 운영 DB에 TFT/LGBM/Ensemble은 최신 날짜까지 이미 있고 GARCH만 빠진 상태라면, 이 스크립트를 기본 옵션으로 다시 돌려도 missing_dates가 비어 종료됩니다. 즉 이 MR은 “앞으로 저장 누락이 재발하는 것”은 막지만, 이미 생긴 누락을 자동 복구하는 수정은 아닙니다. 최소한 재시작 기준을 ml_garch_predictions까지 함께 보거나, 날짜별로 GARCH row 누락 여부를 검사해서 재처리해야 MR 제목과 실제 효과가 맞습니다.
  > 
  > **Open Questions**
  > 
  > * 운영에서 이 스크립트를 --start로 과거 날짜부터 다시 돌릴 계획이 이미 있는지 확인이 필요합니다. 그 계획이 없다면, 현재 수정만으로는 실제 장애 복구가 끝나지 않습니다.
  > 
  > 변경 자체는 작고 방향도 맞지만, 지금 상태로는 “누락 원인 차단”에 가깝고 “기존 누락 복구”까지는 못 가는 점이 가장 큰 리스크입니다.

- 💬 **장호정** (2026-03-26)
  > ## Code Review Report
  > 
  > **Files Reviewed:** 1 | **Total Issues:** 0
  > 
  > | Severity | Count |
  > |----------|-------|
  > | CRITICAL | 0 |
  > | HIGH | 0 |
  > | MEDIUM | 0 |
  > | LOW | 0 |
  > 
  > ---
  > 
  > ### 변경 내용 확인
  > 
  > `save_signals_to_db()`에 `ml_garch_predictions` UPSERT 블록 추가 (15줄).
  > 
  > - SQL 패턴: 기존 TFT/LGBM/Ensemble과 동일한 `INSERT ... SELECT FROM stocks ... ON CONFLICT DO UPDATE`
  > - 모델 버전: `'garch-v1'` — `daily_inference` API 경유 시 `signal/crud.py:upsert_garch_predictions()`와 동일
  > - NaN 필터링: `garch_vol_5d is not None and not isnan()` — API 경유 시 `if vol_5d is None: continue`와 동등
  > - parameterized query 사용: SQL injection 위험 없음
  > - 배치 위치: LGBM과 Ensemble 사이 — daily_inference의 호출 순서(TFT→LGBM→GARCH→Ensemble→Report)와 일치
  > 
  > ### Positive
  > - 기존 패턴과 완벽히 일관된 구조
  > - NaN 방어 로직이 daily_inference보다 더 견고함 (None + NaN 둘 다 체크)
  > - 실행 검증 완료: catchup 실행 후 ml_garch_predictions 24-25일 각 199건 정상 확인
  > 
  > ### Recommendation: **APPROVE**
  > 
  > 단순 누락 수정이며, 기존 패턴과 동일한 구조. 이슈 없음.

---

### !375 · [BE] Feat: 알림 생성 스케줄러 구현 — 급등락/매매신호/공시 알림 + SSE 실시간 푸시

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `feature/be/notification-scheduler` → `dev-backend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/375](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/375)

<details><summary>MR 설명</summary>

> - NotificationPublishService: 알림 생성 공통 서비스 (StockNotification + UserNotification bulk insert)
> - SurgePlungeAlertScheduler: 30초 주기 급등락(±5%) 감지 및 알림 발행
> - TradeSignalAlertScheduler: 매일 20:00 AI 매매신호 변경 감지 및 알림 발행
> - AnnouncementAlertScheduler: 5분 주기 새 공시(DART) 감지 및 알림 발행
> - NotificationSseService: SSE 실시간 알림 푸시 + /api/notifications/stream 엔드포인트
> - 엔티티 팩토리 메서드 추가 (StockNotification.create, UserNotification.create)
> - 리포지토리 쿼리 추가 (알림 대상 유저 조회, 신호 비교, 새 공시 조회)

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-26)
  > ## MR #375 코드리뷰: 알림 생성 스케줄러 + SSE 실시간 푸시
  > 
  > **작성자:** 강지석 | **변경 파일:** 11개 | **브랜치:** `feature/be/notification-scheduler` → `dev-backend`
  > 
  > ---
  > 
  > ### 전체 평가: :white_check_mark: 기능 구조 잘 잡혀있으나 몇 가지 운영 이슈 확인 필요
  > 
  > 3종 알림(급등락/매매신호/공시) + SSE 실시간 푸시를 체계적으로 구현했습니다.
  > 
  > ---
  > 
  > ### :thumbsup: 좋은 점
  > 
  > 1. **공통 발행 서비스 분리** — `NotificationPublishService`로 알림 생성 + 유저 배포 + SSE 푸시를 한 곳에 집중
  > 2. **엔티티 팩토리 메서드** — `StockNotification.create()`, `UserNotification.create()`로 생성 로직 캡슐화
  > 3. **장 운영시간 체크** — 급등락 스케줄러에서 주말/장외 시간 필터링
  > 4. **기준가 관리** — 알림 발생 시 `lastAlertPriceMap`을 갱신하여 반복 알림 방지
  > 5. **SSE 라이프사이클** — `onCompletion/onTimeout/onError` 모두 등록
  > 
  > ---
  > 
  > ### :mag: 개선 제안
  > 
  > **1. SSE 엔드포인트 경로가 `/api/notifications/stream`임 (중요도: :red_circle: 높음)**
  > 
  > 기존 프로젝트의 SSE 패턴은 `/api/stream/...` 경로를 사용합니다 (예: `/api/stream/stocks/{ticker}/quote`). Nginx/API Gateway에서 `/api/stream/**`에 대해 SSE 설정(버퍼링 비활성화, 타임아웃 연장 등)이 적용되어 있을 가능성이 높으므로, 현재 경로로는 **SSE가 정상 동작하지 않을 수 있습니다**.
  > 
  > → `/api/stream/notifications`로 변경 필요
  > 
  > **2. 급등락 알림 폭주 가능성 (중요도: :red_circle: 높음)**
  > 
  > 30초마다 전 종목을 체크하는데, 한번 ±5% 알림 후 기준가가 현재가로 갱신됩니다. 이후 변동이 계속되면 **같은 종목에 대해 하루에 수십 건**의 알림이 발생할 수 있습니다.
  > 
  > → 종목별 쿨다운(예: 1시간 내 동일 종목 알림 제한) 추가 권장
  > 
  > **3. `lastCheckedAt`이 인메모리 (중요도: :yellow_circle: 중)**
  > 
  > `AnnouncementAlertScheduler`의 `lastCheckedAt`은 서버 재시작 시 `OffsetDateTime.now()`로 초기화됩니다. 재시작 직전에 들어온 공시는 알림이 누락될 수 있습니다. 급등락의 `lastAlertPriceMap`도 동일합니다.
  > 
  > → 현재 규모에서는 수용 가능하지만, Redis 등에 저장하면 더 안정적
  > 
  > **4. `publish()` 내 N+1 SSE 푸시 (중요도: :yellow_circle: 중)**
  > 
  > `for (Long userId : userIds)` 루프에서 개별 `pushToUser()`를 호출합니다. 인기 종목에 관심종목 유저가 많으면 루프가 길어질 수 있습니다.
  > 
  > → 현재 규모에서는 문제없지만, 비동기(`@Async`) 처리를 고려할 수 있습니다
  > 
  > **5. `findPreviousLatestByReportDate` 성능 (중요도: :yellow_circle: 중)**
  > 
  > `WHERE report_date < :reportDate`는 전체 과거 리포트를 대상으로 `DISTINCT ON`을 수행합니다. 리포트가 쌓이면 느려질 수 있습니다.
  > 
  > → `report_date >= :reportDate - interval '7 days'` 같은 범위 제한 추가 권장
  > 
  > **6. `findNotiEnabledUsersByStockIds` 미사용 (중요도: :green_circle: 낮음)**
  > 
  > 배치 조회용 메서드가 추가되었지만 현재 사용하는 곳이 없습니다. 스케줄러에서 종목별 개별 조회 대신 이 메서드를 활용하면 쿼리 수를 줄일 수 있습니다.
  > 
  > **7. 테스트 부재 (중요도: :yellow_circle: 중)**
  > 
  > 3개 스케줄러와 2개 서비스 모두 테스트가 없습니다. 최소한 `NotificationPublishService`와 `SurgePlungeAlertScheduler`의 핵심 로직 단위 테스트를 권장합니다.
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 아키텍처 | :white_check_mark: (스케줄러/서비스 분리) |
  > | SSE 엔드포인트 | :x: `/api/stream/notifications`로 변경 필요 |
  > | 알림 폭주 방어 | :x: 쿨다운 없음 |
  > | 상태 영속성 | :warning: 인메모리 (재시작 시 누락) |
  > | 쿼리 효율 | :warning: 과거 리포트 전체 스캔 |
  > | 테스트 | :warning: 없음 |
  > 
  > **1번(SSE 경로)과 2번(알림 폭주 방어)**은 머지 전 반드시 대응이 필요합니다. 나머지는 운영 안정성 관점에서 점진적으로 개선하면 됩니다.

- 💬 **강지석** (2026-03-26)
  > # 리뷰 피드백 반영 완료
  > 
  > 수정 사항 요약:
  > 
  > | # | 피드백 | 조치 |
  > |---|--------|------|
  > | 1 | SSE 경로 컨벤션 | `/api/stream/notifications`로 이동, `NotificationStreamController` 별도 분리 |
  > | 2 | 급등락 알림 폭주 | 종목별 1시간 쿨다운 추가 (`lastAlertTimeMap`) |
  > | 5 | 리포트 전체 스캔 | `report_date >= :reportDate - 7 days` 범위 제한 |
  > | 6 | 미사용 메서드 | `findNotiEnabledUsersByStockIds` 제거 |
  > | 3,4 | 인메모리/N+1 SSE | 현재 규모 수용 가능 — **skip** |
  > | 7 | 테스트 | 후순위 — **skip** |

- 💬 **이혜민** (2026-03-26)
  > ## MR #375 코드리뷰 (수정 후): 알림 스케줄러 + SSE 실시간 푸시
  > 
  > **작성자:** 강지석 | **변경 파일:** 11개 | **브랜치:** `feature/be/notification-scheduler` → `dev-backend`
  > 
  > ---
  > 
  > ### :white_check_mark: 이전 리뷰 대비 수정 사항
  > 
  > | 이전 지적 | 반영 여부 |
  > |-------|-------|
  > | SSE 엔드포인트 경로 | :white_check_mark: `/api/stream/notifications`로 별도 컨트롤러 분리 |
  > | 급등락 알림 폭주 | :white_check_mark: 1시간 쿨다운 (`COOLDOWN_MILLIS`) 추가 |
  > | `findPreviousLatestByReportDate` 전체 스캔 | :white_check_mark: `>= :reportDate - INTERVAL '7 days'` 범위 제한 추가 |
  > | `findNotiEnabledUsersByStockIds` 미사용 | :white_check_mark: 제거됨 |
  > 
  > ---
  > 
  > ### :mag: 잔여 개선 제안
  > 
  > **1. `lastCheckedAt` 인메모리 (중요도: :yellow_circle: 중)**
  > 
  > 이전과 동일하게 서버 재시작 시 직전 공시 알림 누락 가능. 현재 규모에서는 수용 가능하지만 인지 필요.
  > 
  > **2. `countByUserIdForUpdate` 서브쿼리 변경 (중요도: :green_circle: 참고)**
  > 
  > `SELECT COUNT(*) FROM (SELECT 1 ... FOR UPDATE) sub`로 변경되었습니다. 서브쿼리 안에서 `FOR UPDATE`가 걸리므로 행 락은 동일하게 동작합니다. PostgreSQL에서 정상 작동하나, 의도를 주석으로 남기면 유지보수에 도움됩니다.
  > 
  > **3. 테스트 부재 (중요도: :yellow_circle: 중)**
  > 
  > 여전히 스케줄러/서비스 테스트가 없습니다. 쿨다운 로직(`isInCooldown`) 등은 단위 테스트로 검증하기 좋은 대상입니다.
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | SSE 엔드포인트 | :white_check_mark: (`/api/stream/notifications`) |
  > | 알림 폭주 방어 | :white_check_mark: (1시간 쿨다운) |
  > | 쿼리 효율 | :white_check_mark: (7일 범위 제한) |
  > | 상태 영속성 | :warning: 인메모리 (경미) |
  > | 테스트 | :warning: 없음 |
  > 
  > 이전 핵심 지적사항이 모두 반영되었습니다. 머지해도 좋은 수준입니다.

---

### !376 · [BE] Fix: 관심종목 추가 500 에러 수정 — COUNT + FOR UPDATE PostgreSQL 호환

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `fix/be/watchlist-count-for-update` → `dev-backend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/376](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/376)

<details><summary>MR 설명</summary>

> PostgreSQL에서 SELECT COUNT(*) ... FOR UPDATE는 aggregate 함수와
> 행 잠금 동시 사용 불가. 서브쿼리로 행 잠금 후 외부에서 COUNT하도록 변경.

</details>

**리뷰 토론**

- 💬 **정준용** (2026-03-26)
  > 지라이슈 어디갔어요
  > mr 도 안지키고 나한테 뭐라하더니만 슬프다

---

### !378 · [BE] Fix: S14P21D208-109 top-stocks 쿼리 최적화 (22초 → 0.1초)

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `fix/be/top-stocks-query-optimization` → `dev-backend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/378](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/378)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> top-stocks 캐시 미스 시 DB 쿼리를 22초 → 0.1초로 최적화
> 
> ## 🧑‍💻 MR 세부 내용
> - 기존: 200개 종목 × LATERAL JOIN으로 `MAX(report_date)` 서브쿼리 200번 반복 실행 → 22초
> - 변경: CTE `latest_reports`에서 `DISTINCT ON`으로 종목별 최신 리포트를 1회 추출 후 Hash Join → 0.1초
> - `stock_prices_daily` LATERAL도 리포트 있는 종목(124건)만 실행하여 추가 절감
> - Redis 캐시 히트 시에는 영향 없음 (캐시 미스/서버 재시작 직후 첫 요청에만 효과)
> 
> ## 📎 Issue 번호
> S14P21D208-109

</details>

**리뷰 토론**

- 💬 **최규직** (2026-03-26)
  > 최신 `origin/dev-backend` 기준으로 보면, 이번 MR은 `MainStockQueryRepository#getTopTenStocksToday()` 쿼리를 `LATERAL` 반복 조회에서 `CTE + DISTINCT ON` 방식으로 바꾼 변경이고, 머지 전에 막아야 할 동작 회귀는 현재 기준으로 보이지 않았습니다.
  > 
  > ## No Findings
  > 
  > 1. 기존 쿼리와 결과 의미는 유지된 상태로 보입니다.\
  >    `services/backend/src/main/java/com/sallaemallae/backend/domain/main/repository/MainStockQueryRepository.java:46-71` 를 보면,\
  >    `latest_date` 로 기준 `report_date` 를 잡은 뒤 `latest_reports` 에서 종목별 최신 report 1건만 고르고, 이후 active 종목과 최근 일봉 가격을 붙여 `debate_confidence DESC` 로 TOP 10을 자릅니다.\
  >    이전 구현이 각 종목마다 `LATERAL` 로 하던 일을 한 번에 모아서 처리하는 형태로 바뀐 것이고, `report_date`, 종목별 최신 1건, active 종목 필터, 가격 fallback 기준은 그대로 유지됩니다.
  > 
  > ## Residual Risk
  > 
  > 1. 이번 리뷰는 정적 검토 기준입니다.\
  >    성능 개선 MR인 만큼, 머지 전에는 운영과 유사한 데이터셋에서 `EXPLAIN ANALYZE` 한 번만 비교해서 실제로 `latest_reports` CTE가 기대대로 인덱스를 타는지만 확인하면 충분해 보입니다.

---

### !379 · [BE] Fix: S14P21D208-202 holding_days 날짜 변환 타입 보강

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `fix/be/s14p21d208-202-holding-days-null-v2` → `dev-backend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/379](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/379)

<details><summary>MR 설명</summary>

> ## :page_facing_up: MR 한 줄 요약
> 
> 의장 포트폴리오 `holding_days`가 null로 내려오던 날짜 변환 타입 누락을 보정했습니다.
> 
> ## :technologist: MR 세부 내용
> 
> - native query 결과의 날짜/시간 값을 `OffsetDateTime`으로 변환하는 유틸에 `LocalDateTime`, `Instant` 처리를 추가했습니다.
> - `/api/portfolio/chairman?tab=HOLDINGS`에서 `ai_portfolio_holdings.buy_date`가 런타임 타입에 따라 null로 해석되던 문제를 수정했습니다.
> - 관련 유틸 테스트를 보강해 `Date`, `LocalDateTime`, `Instant` 케이스를 검증했습니다.
> 
> ## :paperclip: Issue 번호
> 
> <!--closed #S14P21D208-202-->

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-26)
  > ## MR #379 코드리뷰: holding_days 날짜 변환 타입 보강
  > 
  > **작성자:** 최규직 | **변경 파일:** 2개 | **브랜치:** `fix/be/s14p21d208-202-holding-days-null-v2` → `dev-backend`
  > 
  > ---
  > 
  > ### 전체 평가: :white_check_mark: 깔끔한 보강
  > 
  > #369에서 `Date`/`LocalDate`를 추가한 데 이어, `LocalDateTime`/`Instant`까지 커버하여 native query 날짜 변환 유틸이 완성도 높아졌습니다.
  > 
  > ---
  > 
  > ### :thumbsup: 좋은 점
  > 
  > 1. **타입 커버리지 완성** — `OffsetDateTime`, `Instant`, `LocalDateTime`, `LocalDate`, `Date`, `Timestamp` 6가지 모두 대응
  > 2. **테스트 충실** — 각 타입별 변환 + 시간대(KST) 정확성 검증
  > 3. **변경 범위 최소** — 유틸 1개 + 테스트 1개, 핵심만 수정
  > 
  > ---
  > 
  > ### :mag: 개선 제안
  > 
  > 없습니다. 바로 머지해도 좋습니다.
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 로직 정확성 | :white_check_mark: |
  > | 테스트 | :white_check_mark: |
  > | 영향 범위 | :white_check_mark: (공통 유틸 보강) |
  > 
  > 머지 승인합니다.

---

### !381 · [FE] Feat: S14P21D208-229 포트폴리오 상세 관심종목 버튼 및 투자금 계산기 구현

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/fe/portfolio-watchlist-calculator` → `dev-frontend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/381](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/381)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 포트폴리오 상세페이지에 관심종목/알림 설정 버튼과 투자금 계산기 PerformanceMetrics 연동 구현
> 
> ## MR 세부 내용
> ### 관심종목 및 알림 설정
> - StockDetailHeader에 관심종목 토글 + 알림 설정 버튼 구현
> - useStockWatchlistControls 훅 재사용 (stocks 페이지와 동일 패턴)
> - 관심종목 해제 시 알림 자동 해제, 비로그인 시 인증 요구
> - overviewData.id를 stockDbId로 전달
> 
> ### 투자금 계산기
> - InvestmentCalculator 상태를 PortfolioStockDetailClient로 lift up
> - 투자금 입력 시 총 평가 손익/보유 수량/투자 원금 동적 재계산
> - 입력 없으면 API 원본 데이터 유지
> - useState를 조건부 return 앞으로 이동하여 훅 순서 보장
> 
> ## Issue 번호
> S14P21D208-229

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-26)
  > ## 코드 리뷰 리포트 - MR #381
  > 
  > **리뷰 대상:** 3개 파일 변경 (90줄 추가, 19줄 삭제)
  > **총 이슈:** 2건
  > 
  > ---
  > 
  > ### CRITICAL (0건)
  > 없음
  > 
  > ### HIGH (0건)
  > 없음
  > 
  > ### MEDIUM (1건)
  > 
  > **1. stockDbId=0 시 불필요한 API 호출**
  > overview 로딩 중 stockDbId=0으로 useStockWatchlistControls(0) 호출 -> getWatchlistStatus(0) API 요청 발생 가능.
  > 수정 제안: stockDbId가 0이면 스켈레톤 표시 또는 enabled: false 처리.
  > 
  > ### LOW (1건)
  > 
  > **2. 투자금 계산 부동소수점**
  > Math.round로 정수화하므로 실용적 문제 없음. 큰 금액 시 1원 오차 가능. 참고.
  > 
  > ---
  > 
  > ### 총평
  > 
  > 기존 useStockWatchlistControls 재사용으로 일관된 패턴. state lift up 깔끔하고 훅 순서 보장 처리됨.
  > 
  > **Recommendation: APPROVE**

---

### !384 · [BE] Feat: S14P21D208-213 trending 응답에 가격/변동률/iconUrl 추가 및 Redis 캐싱

- 작성자: **이혜민** · 상태: `merged`
- 브랜치: `feature/be/trending-stocks` → `dev-backend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/384](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/384)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 실시간 인기 검색 종목 TOP5 SSE API 추가 (검색 횟수 기반, Redis 캐싱, 가격/변동률/아이콘 포함)
> 
> ## 🧑‍💻 MR 세부 내용
> - `GET /api/stream/stocks/trending` (SSE) 엔드포인트 추가
> - 유저가 종목을 검색할 때마다 Redis Sorted Set에 검색 횟수 +1 (활성 종목만, TTL 당일 자정)
> - 1분마다 Redis에서 TOP5 조회 → DB에서 종목 정보 + 최신 일봉 가격 매핑 → Redis 응답 캐시 저장(TTL 2분) → SSE broadcast
> - SSE 연결 시 응답 캐시에서 즉시 전송 (캐시 미스 시 DB 조회 후 저장)
> - 구독 클라이언트 없으면 broadcast 스킵 (`SseManager.hasEmitters` 추가)
> - SSE emitter 클린업 콜백 (onCompletion/onTimeout/onError)
> - `streamMarketIndex`, `streamCategories`에도 emitter 클린업 콜백 추가
> - stockId 존재 + 활성 검증 후에만 카운트 증가
> - 응답: `rank`, `stock_id`, `name`, `price`, `fluctuation_rate`, `icon_url`
> - 단위 테스트 7건
> 
> ## 📎 Issue 번호
> S14P21D208-213

</details>

**리뷰 토론**

- 💬 **강지석** (2026-03-26)
  > # 코드 리뷰 결과
  > 
  > ## 잘 된 부분
  > 
  > - **깔끔한 책임 분리:** `TrendingCacheRepository` (Redis) → `TrendingStockService` (비즈니스 로직) → `SseManager` (SSE 관리) 구조가 명확함
  > - **SSE lifecycle 관리:** `onCompletion`/`onTimeout`/`onError` 콜백이 일관되게 등록되어 있음
  > - **Redis 방어 코드:** null 체크, `LinkedHashSet`으로 순서 보장, 파싱 실패 graceful 처리
  > - **hasEmitters 최적화:** 구독자 없으면 스케줄러가 Redis+DB 조회 스킵
  > - **테스트 커버리지:** 5개 테스트로 핵심 시나리오 커버
  > 
  > ---
  > 
  > ## CRITICAL (반드시 수정)
  > 
  > ### 1. 응답 DTO에 가격/변동률/iconUrl 누락
  > 
  > 피처 타이틀이 **"trending 응답에 가격/변동률/iconUrl 추가"**인데, `TrendingStockItemResponse`에는 `(rank, stockId, name)`만 있음.
  > 
  > ```java
  > // 현재
  > public record TrendingStockItemResponse(int rank, Long stockId, String name) {}
  > 
  > // 필요한 필드
  > // - currentPrice (또는 price)
  > // - fluctuationRate
  > // - iconUrl
  > ```
  > 
  > 같은 프로젝트의 `SearchStockItemResponse`, `TopStockItemResponse`는 이미 이 필드들을 포함하고 있음. 의도적 deferred라면 명시적으로 문서화 필요.
  > 
  > ### 2. SearchServiceImplTest에 새 mock 선언 누락
  > 
  > `SearchServiceImpl`에 `TrendingStockService`, `StockRepository` 2개 의존성이 추가됐는데, 기존 테스트에 `@Mock` 선언이 없음. `@InjectMocks`가 null을 주입하게 되어, `saveRecent` 관련 테스트 추가 시 NPE 발생.
  > 
  > ```java
  > // 추가 필요
  > @Mock private TrendingStockService trendingStockService;
  > @Mock private StockRepository stockRepository;
  > ```
  > 
  > ---
  > 
  > ## IMPORTANT (수정 권장)
  > 
  > ### 3. TTL race condition — score == 1.0 휴리스틱의 한계
  > 
  > `TrendingCacheRepository.incrementSearchCount()`:
  > 
  > - 첫 번째 종목 검색 시 `score == 1.0`으로 TTL 설정 → 정상
  > - 그런데 `ZINCRBY` 성공 후 `EXPIRE` 실패하면 (네트워크 순단) 키가 영원히 남는 메모리 누수 위험
  > - `expire`를 무조건 호출하거나 Lua script로 atomic하게 처리하는 것이 더 안전
  > 
  > ### 4. saveRecent에서 불필요한 DB 조회 가능성
  > 
  > `stockRepository.existsByIdAndIsActiveTrue(stockId)`를 매 검색 저장마다 호출하는데, `buildTrendingStocks`에서 이미 `findAllByIdInAndIsActiveTrue`로 비활성 종목을 필터링함. 매번 DB를 치는 게 인기 카운트 정확성 대비 비용이 큰지 검토 필요.
  > 
  > ### 5. streamTrending() 메서드 테스트 없음
  > 
  > SSE 연결 초기화 로직(`streamTrending`)에 대한 테스트가 없음. emitter 생성, 콜백 등록, 초기 데이터 전송을 검증하는 테스트 추가 권장.
  > 
  > ---
  > 
  > ## Suggestions (선택)
  > 
  > | # | 내용 |
  > |---|------|
  > | 6 | `TrendingStocksResponse`에도 `@JsonNaming` 추가 (다른 DTO와 일관성) |
  > | 7 | SSE emitter 생성 패턴이 3곳에 중복 → `SseManager.createEmitter(channel, timeout, data)` 추출 고려 |
  > | 8 | `initialDelay = 5_000`이 다른 스케줄러와 겹침 → 부팅 시 DB 커넥션 풀 경합 가능 |
  > | 9 | `stockId != null` 이중 체크 (`SearchServiceImpl` + `TrendingStockService`) — 방어적이긴 하나 중복 |
  > 
  > ---
  > 
  > ## 요약
  > 
  > | 등급 | 건수 |
  > |------|------|
  > | **Critical** | 2 (DTO 필드 누락, 테스트 mock 누락) |
  > | **Important** | 3 (TTL race, 불필요한 DB hit, streamTrending 테스트 없음) |
  > | **Suggestion** | 4 |
  > 
  > 핵심 아키텍처(Redis Sorted Set + SSE broadcast + 스케줄 갱신)는 견고하고 기존 패턴을 잘 따르고 있습니다. **Critical 2건 — 특히 피처 타이틀에 명시된 가격/변동률/iconUrl 필드 누락 확인 후 머지하시면 됩니다.**

- 💬 **송민경** (2026-03-26)
  > ## 총평
  > 
  > MR 384는 기존 인기 검색 종목 SSE 응답에 `price`, `fluctuationRate`, `iconUrl`를 추가하고, 완성된 응답 자체를 Redis에 캐싱해서 신규 SSE 연결 시 즉시 내려주도록 개선한 변경입니다. 응답 풍부화와 최초 연결 지연 감소라는 목적은 분명합니다.
  > 
  > 다만 현재 구현은 “실시간” 응답이라는 이름에 비해 캐시 일관성과 최신성 보장이 약합니다. 특히 응답 캐시가 검색 카운트 변경과 연결되지 않아 신규 구독자가 직전 캐시를 그대로 받는 구조이고, 일부 실패 케이스는 테스트로 고정되어 있지 않습니다. 운영 관점에서는 캐시 최신성 정책과 장애 시 동작을 더 명확히 해야 합니다.
  > 
  > ---
  > 
  > ## 반드시 수정해야 할 문제
  > 
  > ### 1. 검색 카운트가 바뀌어도 응답 캐시를 무효화하지 않아 신규 SSE 연결이 stale 데이터를 받을 수 있음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/TrendingStockService.java`
  >   - `streamTrending()`
  >   - `incrementSearchCount()`
  >   - `refreshTrending()`
  > - 왜 문제인지
  >   - `streamTrending()`는 먼저 `TrendingStockCacheRepository.getTrending()`에서 응답 캐시를 읽고, 캐시가 있으면 DB 재계산 없이 그대로 전송합니다.
  >   - 그런데 검색 발생 시 호출되는 `incrementSearchCount()`는 순위 집계용 ZSet만 증가시키고, 응답 캐시는 무효화하지 않습니다.
  >   - 그 결과 새로운 검색 이벤트가 누적되어도, 다음 스케줄 갱신 전까지 새로 접속한 SSE 구독자는 이전 응답 캐시를 그대로 받을 수 있습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 특정 종목 검색량이 급증해 실제 순위가 바뀌었는데, 사용자가 그 사이 SSE 화면에 진입하면 이전 TOP5와 이전 가격/아이콘 조합을 받게 됩니다.
  >   - 기능 이름은 “실시간 인기 검색 종목”인데 실제로는 최대 1분 이상 stale한 데이터를 보여주게 되어 사용자 신뢰가 떨어질 수 있습니다.
  > - 개선 방법
  >   - 검색 카운트 증가 시 응답 캐시를 즉시 삭제하거나, 최소한 캐시 최신성 정책을 더 짧고 명확하게 가져가는 것이 필요합니다.
  >   - “신규 연결은 항상 최신 계산값”, “기존 연결은 스케줄 브로드캐스트”처럼 정책을 분리하는 것도 방법입니다.
  > 
  > ### 2. 응답 캐시 역직렬화 실패 시 손상된 캐시를 제거하지 않아 같은 오류가 반복될 수 있음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/repository/TrendingStockCacheRepository.java`
  >   - `getTrending()`
  > - 왜 문제인지
  >   - 역직렬화 실패 시 현재는 경고 로그만 남기고 `Optional.empty()`를 반환합니다.
  >   - 하지만 Redis에 손상된 JSON이 그대로 남아 있으면, 다음 요청에서도 같은 역직렬화 예외가 반복됩니다.
  >   - 결국 새 연결이 들어올 때마다 동일한 warn 로그가 누적되고, 매번 DB 재계산 경로를 타게 됩니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 배포 중 DTO 구조 변경이나 외부 Redis 데이터 오염으로 캐시 JSON이 깨졌을 때, 신규 SSE 연결마다 동일한 역직렬화 실패가 반복됩니다.
  >   - 로그가 과도하게 쌓이고, 캐시가 사실상 비활성화된 상태로 DB 조회가 계속 발생할 수 있습니다.
  > - 개선 방법
  >   - 역직렬화 실패 시 해당 캐시 키를 제거해서 다음 요청부터는 정상적인 fresh build + save 경로로 복구되게 하는 편이 안전합니다.
  > 
  > ---
  > 
  > ## 수정 권장 사항
  > 
  > ### 1. 캐시 TTL 2분과 스케줄 1분의 조합은 최신성보다 편의성에 치우쳐 있어 의도를 더 분명히 해야 함
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/repository/TrendingStockCacheRepository.java`
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/TrendingStockService.java`
  > - 왜 문제인지
  >   - 스케줄 갱신 주기는 1분인데 응답 캐시 TTL은 2분입니다.
  >   - 정상적으로는 스케줄이 계속 캐시를 덮어쓰므로 큰 문제는 없지만, 스케줄 장애나 일시 정지 시 캐시는 더 오래 남습니다.
  >   - 현재 설정만 보면 “실시간 응답”보다 “연결 지연 완화용 최근 스냅샷”에 더 가까운 동작입니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 스케줄 실행이 일시적으로 실패하면 신규 SSE 연결이 2분 동안 오래된 캐시를 계속 받을 수 있습니다.
  >   - 운영자가 체감하는 장애는 작아 보여도, 사용자 입장에서는 순위와 가격이 갱신되지 않는 현상으로 보일 수 있습니다.
  > - 개선 방법
  >   - TTL과 갱신 주기의 관계를 명확히 설계하고, stale 허용 범위를 코드 주석이나 문서에 분명히 남기는 것이 좋습니다.
  > 
  > ### 2. 가격/변동률 조회 결과가 null일 때의 API 의미가 테스트와 문서에 충분히 고정되어 있지 않음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/service/TrendingStockService.java`
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/dto/TrendingStockItemResponse.java`
  > - 왜 문제인지
  >   - `StockPriceDaily`가 없으면 `price`, `fluctuationRate`는 null로 내려갑니다.
  >   - 동작 자체는 합리적일 수 있지만, 클라이언트 입장에서는 “종목은 있는데 가격은 없음”이 어떤 상태를 뜻하는지 불명확할 수 있습니다.
  >   - 현재 테스트는 일부 null 케이스를 확인하지만, API 계약으로서 의미를 드러내지는 않습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 프론트가 null을 미처 처리하지 못하면 실시간 인기 검색 UI에서 가격 렌더링 오류가 발생할 수 있습니다.
  >   - 특정 종목만 가격 없이 내려오면 사용자 입장에서는 데이터 품질 문제처럼 보일 수 있습니다.
  > - 개선 방법
  >   - null 허용 필드의 의미를 API 문서나 DTO 주석으로 명확히 하거나, 프론트와 합의된 fallback 값을 갖는지 확인하는 것이 좋습니다.
  > 
  > ### 3. 응답 DTO가 풍부해졌지만 여전히 ticker가 없어 프론트 활용성이 제한될 수 있음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/dto/TrendingStockItemResponse.java`
  > - 왜 문제인지
  >   - 이번 MR에서 `price`, `fluctuationRate`, `iconUrl`는 추가됐지만 `ticker`는 여전히 없습니다.
  >   - 인기 검색 목록은 보통 상세 페이지 이동, 실시간 시세 연결, 식별자 표시에 ticker가 자주 필요합니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 프론트가 ticker 기반 라우팅이나 표시를 원하면 추가 API 호출이 필요해지고, 결국 이 SSE 응답만으로 화면을 완성하지 못할 수 있습니다.
  > - 개선 방법
  >   - 실제 사용처가 ticker를 필요로 하는지 확인하고, 필요하다면 응답 계약에 포함시키는 편이 일관성 측면에서 유리합니다.
  > - 가정이 필요함
  >   - 현재 프론트가 `stockId`만으로 충분하다면 우선순위는 낮습니다.
  > 
  > ---
  > 
  > ## 있으면 좋은 개선점
  > 
  > ### 1. `streamTrending()`의 cache miss 경로 테스트가 없음
  > 
  > - 문제 위치
  >   - `services/backend/src/test/java/com/sallaemallae/backend/domain/stock/service/TrendingStockServiceTest.java`
  > - 왜 문제인지
  >   - 현재 테스트는 cache hit 시 DB 조회 없이 즉시 전송되는 케이스는 검증합니다.
  >   - 하지만 cache miss 시 `buildTrendingStocks()` 수행 후 캐시 저장, emitter 전송까지 이어지는 핵심 경로는 직접 검증하지 않습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - 캐시가 비어 있는 실제 운영 초기 상태에서만 발생하는 버그가 테스트에서 빠질 수 있습니다.
  > - 개선 방법
  >   - cache miss 시 fresh build, save, send가 모두 수행되는지 검증하는 테스트를 추가하는 것이 좋습니다.
  > 
  > ### 2. Redis 직렬화/역직렬화 실패에 대한 복구 동작 테스트가 없음
  > 
  > - 문제 위치
  >   - `services/backend/src/main/java/com/sallaemallae/backend/domain/stock/repository/TrendingStockCacheRepository.java`
  >   - `services/backend/src/test/java/com/sallaemallae/backend/domain/stock/service/TrendingStockServiceTest.java`
  > - 왜 문제인지
  >   - 캐시 저장소는 직렬화/역직렬화 실패를 로그만 남기고 흡수합니다.
  >   - 이런 best-effort 전략 자체는 가능하지만, 실패 시 서비스가 어떤 fallback을 보장하는지는 테스트로 고정돼 있지 않습니다.
  > - 실제 장애로 이어질 수 있는 시나리오
  >   - ObjectMapper 설정 변경이나 Redis 오염이 발생했을 때 신규 SSE 연결이 어떤 경로를 타는지 불명확해질 수 있습니다.
  > - 개선 방법
  >   - 최소한 캐시 실패 시에도 fresh build/send가 보장되는지, 실패 로그 이후 재시도 동작이 안정적인지 테스트로 남기는 것이 좋습니다.

---

### !385 · [BE] Fix: S14P21D208-202 support DATE published_at in search

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `fix/be/search-published-at` → `dev-backend`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/385](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/385)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> search API 뉴스 응답의 `published_at`이 `null`로 내려오던 문제를 날짜 타입 변환 보강으로 수정했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - search 뉴스 응답에서 `published_at`이 비어 내려오는 현상을 수정했습니다.
> - 원인은 native query 결과의 `published_at`이 DB에서 `DATE`/`LocalDate` 계열로 내려올 때, search repository 내부 변환 로직이 `OffsetDateTime`과 `Timestamp`만 처리하던 점이었습니다.
> - `SearchQueryRepository`의 날짜 변환 로직이 `DATE`와 `LocalDate`도 정상적으로 `OffsetDateTime`으로 변환하도록 보강했습니다.
> - 이 수정으로 `published_at`이 `OffsetDateTime`, `Timestamp`, `DATE`, `LocalDate` 어떤 형태로 내려와도 응답에 정상 직렬화됩니다.
> - 기존 search 관련 다른 변경은 포함하지 않고, 이번 `published_at` fix만 분리해 반영했습니다.
> 
> ## ✅ 변경 후 기준
> - `published_at`
>   - DB 결과가 `OffsetDateTime` / `Timestamp` / `DATE` / `LocalDate` 중 어떤 타입이더라도 정상 변환
>   - search 뉴스 응답에서 더 이상 `null`로 누락되지 않음
> 
> ## 🧪 테스트
> - `./mvnw -Dtest=SearchServiceImplTest,SearchResponseJsonTest,NativeQueryResultUtilsTest test`
> 
> ## 📎 Issue 번호
> <!-- closed #S14P21D208-202 -->

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-26)
  > ## MR #385 코드리뷰: search published_at DATE 타입 지원
  > 
  > **작성자:** 최규직 | **변경 파일:** 1개 | **브랜치:** `fix/be/search-published-at` → `dev-backend`
  > 
  > ---
  > 
  > ### 전체 평가: :white_check_mark: 문제없음, 단 공통 유틸 활용 권장
  > 
  > ---
  > 
  > ### :mag: 개선 제안
  > 
  > **1. `NativeQueryResultUtils.toOffsetDateTime()` 재사용 (중요도: :yellow_circle: 중)**
  > 
  > #369, #379에서 `NativeQueryResultUtils`에 `Date`/`LocalDate`/`LocalDateTime`/`Instant` 변환을 이미 추가했습니다. `SearchQueryRepository`가 자체 `toOffsetDateTime()`을 갖고 있어 **동일 로직이 두 곳에 중복**됩니다.
  > 
  > → `SearchQueryRepository`의 `toOffsetDateTime()`을 `NativeQueryResultUtils.toOffsetDateTime()`으로 대체하면 향후 타입 추가 시 한 곳만 수정하면 됩니다
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 로직 정확성 | :white_check_mark: |
  > | 변경 범위 | :white_check_mark: (최소) |
  > | 코드 중복 | :warning: 공통 유틸과 동일 로직 중복 |
  > 
  > 머지해도 좋지만, 공통 유틸 활용으로 중복을 제거하면 더 좋습니다.

---

### !387 · [AI] Fix: S14P21D208-204 daily pipeline ML 완료 신호 체크 추가

- 작성자: **최규직** · 상태: `merged`
- 브랜치: `fix/ai/s14p21d208-204-daily-ml-signal` → `dev-ai`
- 생성: 2026-03-26 · 머지: 2026-03-26
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/387](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/387)

<details><summary>MR 설명</summary>

> ## :page_facing_up: MR 한 줄 요약
> 
> daily debate/portfolio 오케스트레이션 시작 조건에 ML 파이프라인 완료 신호 체크를 추가했습니다.
> 
> ## :technologist: MR 세부 내용
> 
> - 기존에는 `NEWS_PIPELINE_DONE`만 확인하고 일일 토론/포트폴리오 작업을 시작했는데, 이제 `ML_PIPELINE_DONE`도 함께 확인하도록 수정했습니다.
> - `NEWS_PIPELINE_DONE`와 `ML_PIPELINE_DONE`이 모두 `DONE`인 경우에만 debate 단계를 시작합니다.
> - debate 완료 시 `DEBATE_PIPELINE_DONE`, portfolio 완료 시 `PORTFOLIO_PIPELINE_DONE`를 기록하는 기존 흐름은 유지했습니다.
> - `ML DONE`이 없으면 debate/portfolio가 모두 실행되지 않는 테스트 케이스를 추가하고, 기존 테스트들도 새 조건에 맞게 보정했습니다.
> 
> ## :paperclip: Issue 번호
> 
> <!--closed #S14P21D208-204-->

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-26)
  > ## MR #387 코드리뷰: daily pipeline ML 완료 신호 체크 추가
  > 
  > **작성자:** 최규직 | **변경 파일:** 2개
  > 
  > ---
  > 
  > ### 전체 평가: :white_check_mark: 소비자 측 로직은 완벽, 생산자 측 확인 필요
  > 
  > ---
  > 
  > ### :pushpin: ML 담당자에게 요청 필요
  > 
  > `2_ml_pipeline`에 `ML_PIPELINE_DONE` 신호를 `pipeline_signals` 테이블에 INSERT하는 코드가 현재 없습니다. 이 MR 머지 전/후로 ML 파이프라인 담당 개발자에게 **완료 시 `ML_PIPELINE_DONE(status=DONE)` 신호 기록 코드 추가**를 반드시 요청해주세요. 없으면 daily debate/portfolio가 영원히 스킵됩니다.
  > 
  > ---
  > 
  > ### :mag: 개선 제안
  > 
  > **1. 신호 순서 의존성 미문서화 (중요도: :yellow_circle: 중)**
  > 
  > 현재 파이프라인 의존 체인: NEWS_PIPELINE_DONE + ML_PIPELINE_DONE → DEBATE_PIPELINE_DONE → PORTFOLIO_PIPELINE_DONE
  > 
  > NEWS와 ML은 AND 조건인데, ML이 NEWS 이후에 실행되는지 병렬인지 코드만으로는 알 수 없습니다. 순서 체크가 단순 `exists_done_for_date`이므로 순서 무관하게 동작하긴 하지만, README나 주석에 파이프라인 흐름도 추가를 권장합니다.
  > 
  > **2. 에러 메시지 구분 (중요도: :green_circle: 낮음)**
  > 
  > NEWS 없음과 ML 없음 모두 동일한 로그 패턴을 사용합니다:
  > 
  > ```python
  > logger.info("당일 %s 신호 없음 | report_date=%s | 스킵", ...)
  > 운영 모니터링 시 어떤 선행 파이프라인이 미완료인지 한눈에 파악하기 좋도록, 두 조건을 동시에 체크하고 누락된 신호 목록을 한 줄로 로깅하는 것도 고려할 수 있습니다.
  > ```
  > 
  > ---
  > 
  > ### :white_check_mark: 잘한 점
  > 
  > - 변경 범위 최소화 (오케스트레이터 3줄 추가 + 테스트 보정)
  > - ML 신호 없는 경우 debate/portfolio 모두 미실행 검증하는 새 테스트 케이스 추가
  > - 기존 7개 테스트 모두 ML 신호 추가하여 일관성 유지
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 로직 정확성 | :white_check_mark: |
  > | 신호 생산자 | :warning: ML 담당자에게 추가 요청 필요 |
  > | 테스트 | :white_check_mark: |
  > | 문서화 | :warning: 파이프라인 흐름도 없음 |
  > | 코드 스타일 | :white_check_mark: |
  > 
  > ML 신호 기록 코드만 확보되면 머지해도 좋습니다.

---

### !394 · [BE] Fix: 알림 타입 SURGE_PLUNGE를 SURGE/PLUNGE로 분리 및 SSE에 createdAt 추가

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `fix/be/split-surge-plunge-noti-type` → `dev-backend`
- 생성: 2026-03-27 · 머지: 2026-03-27
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/394](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/394)

<details><summary>MR 설명</summary>

> - NotifyType enum: SURGE_PLUNGE → SURGE + PLUNGE 분리
> - NotificationTab: SURGE 탭에서 SURGE, PLUNGE 두 타입 묶어서 조회 (IN절)
> - SurgePlungeAlertScheduler: 급등/급락 방향에 따라 SURGE/PLUNGE 구분 저장
> - NotificationSseService: SSE 푸시 응답에 createdAt 필드 추가
> - Flyway V20: 기존 SURGE_PLUNGE 데이터를 title 기반으로 SURGE/PLUNGE 마이그레이션

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-27)
  > ## MR #394 코드리뷰: SURGE_PLUNGE → SURGE/PLUNGE 분리 + SSE createdAt
  > 
  > **작성자:** 강지석 | **변경 파일:** 8개 | **브랜치:** `fix/be/split-surge-plunge-noti-type` → `dev-backend`
  > 
  > ---
  > 
  > ### 전체 평가: :white_check_mark: 깔끔한 리팩토링, 마이그레이션도 적절
  > 
  > ---
  > 
  > ### :thumbsup: 좋은 점
  > 
  > 1. **NotificationTab을 List으로 확장** — SURGE 탭에서 SURGE+PLUNGE를 IN절로 조회하는 설계가 향후 타입 추가에도 유연
  > 2. **Flyway 마이그레이션** — 기존 `SURGE_PLUNGE` 데이터를 title 기반(`%급락%`)으로 분류하여 무손실 마이그레이션
  > 3. **SSE에 createdAt 추가** — FE에서 시간 표시 가능
  > 4. **테스트 보정** — 컨트롤러 테스트 데이터도 새 타입에 맞게 수정
  > 
  > ---
  > 
  > ### :mag: 개선 제안
  > 
  > **1. 마이그레이션 title 기반 분류의 엣지 케이스 (중요도: :yellow_circle: 중)**
  > 
  > ```sql
  > UPDATE stock_notifications SET noti_type = 'PLUNGE'
  > WHERE noti_type = 'SURGE_PLUNGE' AND title LIKE '%급락%';
  > 
  > UPDATE stock_notifications SET noti_type = 'SURGE'
  > WHERE noti_type = 'SURGE_PLUNGE';
  > ```
  > 
  > 순서 보장 덕분에 로직은 맞지만, title에 "급락" 키워드가 없는 급락 알림이 있었다면 SURGE로 잘못 분류됩니다. 현재 `SurgePlungeAlertScheduler`의 title 형식이 `"{종목명} 급락 알림"`이므로 실질적 문제는 없어 보이지만, 혹시 수동 생성된 데이터가 있다면 주의.
  > 
  > **2. SSE createdAt이 `OffsetDateTime.toString()` 형식 (중요도: :green_circle: 낮음)**
  > 
  > ```java
  > String createdAt = stockNoti.getCreatedAt().toString();
  > ```
  > 
  > OffsetDateTime.toString()은 2026-03-27T15:30:00+09:00 형태인데, 나노초가 있으면 2026-03-27T15:30:00.123456789+09:00처럼 길어질 수 있습니다. FE에서 new Date()로 파싱 가능하긴 하지만, 다른 API 응답과 포맷 일관성을 위해 ISO formatter 사용도 고려할 수 있습니다.
  > 
  > **3. FE 알림 타입 크로스체크 (중요도: :yellow_circle: 중)**
  > 
  > NotifyType.PLUNGE의 responseValue가 "PLUNGE"인데, FE에서 알림 탭 필터나 아이콘 매핑에 "PLUNGE" 타입을 처리하는 코드가 있는지 확인 필요합니다. 기존에 "SURGE"만 처리하고 있었다면 PLUNGE 알림이 표시되지 않을 수 있습니다.
  > 
  > → 프론트엔드 엔지니어에게 notiType: "PLUNGE" 케이스 추가 필요 여부 전달
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 로직 정확성 | :white_check_mark: |
  > | 마이그레이션 | :white_check_mark: (순서 보장 OK) |
  > | 하위 호환성 | :warning: FE에서 PLUNGE 타입 처리 확인 필요 |
  > | SSE 응답 | :white_check_mark: (createdAt 추가) |
  > | 테스트 | :white_check_mark: |
  > | 코드 스타일 | :white_check_mark: |
  > 
  > FE 측 PLUNGE 타입 대응만 확인되면 바로 머지해도 좋습니다.

- 💬 **최규직** (2026-03-27)
  > 최신 `origin/dev-backend` 기준으로 보면, 이번 MR에서 머지 전에 확인해야 할 이슈는 1건입니다.
  > 
  > ## High
  > 
  > 1. `SURGE_PLUNGE` 를 enum에서 바로 제거해서, 롤링 배포나 mixed-version 환경에서는 새 서버가 기존 타입을 읽는 순간 알림 조회가 깨질 수 있습니다.\
  >    `services/backend/src/main/java/com/sallaemallae/backend/domain/notification/enumtype/NotifyType.java:3-7` 에서 `SURGE_PLUNGE` 가 완전히 사라졌고,\
  >    `services/backend/src/main/java/com/sallaemallae/backend/domain/notification/repository/NotificationQueryRepository.java:161-165` 는 DB 값을 그대로 `NotifyType.valueOf(value)` 로 역직렬화합니다.\
  >    MR 안에 데이터 치환 migration(`services/backend/src/main/resources/db/migration/V20__split_surge_plunge_noti_type.sql:1-7`)은 들어가 있지만, 이건 **기존 row를 한 번 업데이트하는 것뿐**이라서 배포 도중 구버전 인스턴스가 `SURGE_PLUNGE` 를 계속 쓰는 상황까지 막아주지는 못합니다.\
  >    즉 새 버전이 먼저 뜨거나, 롤링 중에 구버전 scheduler/worker가 `SURGE_PLUNGE` row를 하나라도 더 적재하면, 새 버전의 알림 목록 조회는 `NotifyType.valueOf("SURGE_PLUNGE")` 에서 바로 `IllegalArgumentException` 으로 터질 수 있습니다.\
  >    최소한 과도기 동안은 `NotifyType` 에 `SURGE_PLUNGE` alias 를 남겨두거나, `toResponseType()` 에서 legacy 값을 `SURGE`/`PLUNGE` 로 안전하게 매핑하는 방어 로직이 있어야 배포가 안전합니다.
  > 
  > 이번 MR 범위에서는 그 외에 추가로 blocking 수준의 이슈는 더 보이지 않았습니다.

- 💬 **정준용** (2026-03-27)
  > 주요 이슈는 2건입니다.
  > 
  > [P1] 데이터 마이그레이션이 제목 문자열에 의존해서 기존 SURGE_PLUNGE를 분류합니다. V20__split_surge_plunge_noti_type.sql (line 1)
  > [P2] 이번 MR의 핵심 변경인 PLUNGE 분기와 SURGE 탭의 다중 타입 조회가 테스트로 검증되지 않습니다. NotificationControllerTest.java (line 223)
  > 추가로 MR head를 별도 worktree로 띄워 NotificationControllerTest를 실행해 보려 했는데, 현재 테스트 부트스트랩은 MR과 무관하게 StockPriceDailyRecoveryService가 빈 H2 스키마의 stocks를 조회하면서 먼저 실패해서 이 스위트로는 변경 검증이 어려웠습니다.

---

### !395 · [FE] Feat: S14P21D208-230 과거 토론 기록 모달 및 품질 개선

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/fe/portfolio-past-discussions` → `dev-frontend`
- 생성: 2026-03-27 · 머지: 2026-03-27
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/395](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/395)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 과거 토론 기록 모달 구현, 달력 뷰 추가, 수익률 부호/색상 동적 처리, 품질 이슈 일괄 수정
> 
> ## MR 세부 내용
> ### 과거 토론 기록 모달 (S14P21D208-230)
> - PastDiscussionsModal 2단계 구조 (연도별 목록 → 상세 토론 뷰)
> - 연도 헤딩 + 좌우 화살표로 연도 이동
> - 달력 아이콘 버튼으로 캘린더 패널 토글 (리포트 있는 날짜에 signal/신뢰도 표시)
> - 날짜 리스트 + 달력 날짜 클릭 시 상세 토론 보기
> - CommitteeDiscussion에 reports prop 추가 및 모달 연결
> - report API limit 1000으로 변경
> - 모달 높이 h-[85vh] 고정
> 
> ### 코드리뷰 피드백 반영
> - CommitteeChat.tsx 공통 컴포넌트 분리 (Avatar/ChatBubble/AVATAR_MAP 중복 제거)
> - calendarYear 초기값 하드코딩 → new Date().getFullYear()
> - handlePrevMonth/handleNextMonth stale state → updater 패턴 수정
> 
> ### 품질 이슈 일괄 수정 (10건)
> - ReturnChart 차트 색상 음수 시 파란색 동적 전환
> - BacktestResults 최고/평균 수익률 부호/색상 동적 처리
> - calcBacktest 매도 없을 때 Best Trade fallback 안전 처리 ("거래 없음")
> - oneYearTradeCount 1년 이내 매도 거래만 필터
> - 투자금 계산기 PnL을 실제 보유 수량 기준으로 재계산
> - TradeHistory returnRate null 방어 처리
> - 수익 실현/BEST 배지 스타일 구분 (중립 vs 빨간색)
> - BacktestResults 연도 하드코딩 → 동적 생성
> - CommitteeChat bubbleRadius dead branch 제거
> 
> ### 기타
> - 종목 상세정보 보기 버튼 Link(/stocks/{stockId}) 연결
> 
> ## Issue 번호
> S14P21D208-230

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-27)
  > ## 코드 리뷰 리포트 - MR #395
  > 
  > **리뷰 대상:** 4개 파일 변경 (496줄 추가, 2줄 삭제)
  > **총 이슈:** 4건
  > 
  > ---
  > 
  > ### CRITICAL (0건)
  > 없음
  > 
  > ### HIGH (0건)
  > 없음
  > 
  > ### MEDIUM (2건)
  > 
  > **1. Avatar/ChatBubble/AVATAR_MAP 중복**
  > PastDiscussionsModal과 CommitteeDiscussion에 Avatar, ChatBubble, AVATAR_MAP 코드가 완전히 중복. 공통 컴포넌트로 분리 권장.
  > 
  > **2. report API limit 1000 성능 우려**
  > 현재 데이터 적어 문제없지만, 장기 운영 시 종목당 수백~수천 건 시 응답 크기 증가. 향후 무한 스크롤 또는 연도별 lazy loading 고려.
  > 
  > ### LOW (2건)
  > 
  > **3. calendarYear 초기값 하드코딩**
  > useState(2026) → useEffect에서 reset되므로 실질적 문제 없지만 new Date().getFullYear()가 더 안전.
  > 
  > **4. handlePrevMonth/handleNextMonth stale state**
  > setCalendarYear 후 calendarYear 참조가 이전 렌더 값. updater 패턴 또는 useEffect 동기화 권장.
  > 
  > ---
  > 
  > ### 총평
  > 
  > 2단계 모달 + 달력 뷰 구조 깔끔. 달력 날짜에 signal/신뢰도 표시 + 클릭 연동 직관적. ESC 계층 처리도 잘 됨.
  > 
  > **Recommendation: APPROVE**

- 💬 **장호정** (2026-03-27)
  > ## 코드 리뷰 리포트 - MR #395 (최종)
  > 
  > **리뷰 대상:** 8개 파일 변경 (536줄 추가, 96줄 삭제)
  > **총 이슈:** 1건
  > 
  > ---
  > 
  > ### CRITICAL / HIGH / MEDIUM
  > 없음
  > 
  > ### LOW (1건)
  > 
  > **1. PastDiscussionsModal 파일 크기 (429줄)**
  > 단일 파일에 CalendarPanel, buildMembers 등 포함. 현재 가독성 괜찮지만 기능 추가 시 CalendarPanel 분리 고려.
  > 
  > ---
  > 
  > ### 이전 리뷰 이슈 해결 확인
  > - ReturnChart 색상 동적 전환 OK
  > - calcBacktest fallback 안전 처리 OK
  > - oneYearTradeCount 1년 필터 OK
  > - 투자금 PnL 계산 정확도 OK
  > - TradeHistory null 방어 + 배지 구분 OK
  > - CommitteeChat dead branch 제거 OK
  > - BacktestResults 연도 동적 OK
  > - 공통 컴포넌트 분리 OK
  > - stale state 수정 OK
  > 
  > 코드 품질이 크게 개선되었습니다.
  > 
  > **Recommendation: APPROVE**

---

### !396 · [BE] Fix: TRADE_SIGNAL을 SIGNAL_BUY/SIGNAL_SELL로 분리 및 FE 응답값 정렬

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `fix/be/split-surge-plunge-noti-type` → `dev-backend`
- 생성: 2026-03-27 · 머지: 2026-03-27
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/396](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/396)

<details><summary>MR 설명</summary>

> - NotifyType: TRADE_SIGNAL → SIGNAL_BUY + SIGNAL_SELL 분리
> - responseValue를 FE 기대값에 맞춤 (BUY, SELL, SURGE, PLUNGE, ANNOUNCEMENT)
> - TradeSignalAlertScheduler: BUY/SELL만 알림 발송, HOLD/STAY는 skip
> - NotificationTab.SIGNAL: SIGNAL_BUY + SIGNAL_SELL 묶어서 조회
> - Flyway V20: 기존 TRADE_SIGNAL 데이터를 message 기반으로 SIGNAL_BUY/SIGNAL_SELL 마이그레이션
> - 레거시 방어: TRADE_SIGNAL → BUY로 안전 매핑

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-27)
  > ## MR #396 코드리뷰: TRADE_SIGNAL → SIGNAL_BUY/SIGNAL_SELL 분리
  > 
  > **작성자:** 강지석 | **변경 파일:** 6개 | **브랜치:** `fix/be/split-surge-plunge-noti-type` → `dev-backend`
  > 
  > ---
  > 
  > ### 전체 평가: :white_check_mark: #394와 동일 패턴, 일관성 있는 확장
  > 
  > ---
  > 
  > ### :thumbsup: 좋은 점
  > 
  > 1. **HOLD/STAY 알림 스킵** — `toNotifyType`에서 null 반환으로 불필요한 알림 제거
  > 2. **레거시 방어** — `toResponseType`에서 `TRADE_SIGNAL` → `BUY` 안전 매핑
  > 3. **마이그레이션 순서 보장** — SELL 먼저 분류 후 나머지를 BUY로 처리
  > 4. **responseValue를 FE 기대값으로 통일** — `BUY`, `SELL`, `SURGE`, `PLUNGE`, `ANNOUNCEMENT`
  > 
  > ---
  > 
  > ### :mag: 개선 제안
  > 
  > **1. 알림 메시지 조사 어색 (중요도: :yellow_circle: 중)**
  > 
  > 테스트 데이터에서 확인: "삼성전자 AI 매매신호가 매수으로 변경되었습니다." `매수 + 으로` → **"매수으로"** 가 어색합니다. `매도`는 `매도으로`가 됩니다.
  > 
  > → `"으로"` 대신 `"로"` 사용하거나 `signalText + " 신호로 변경되었습니다."` 형태로 수정 권장
  > 
  > **2. 마이그레이션 message 기반 분류 엣지 케이스 (중요도: :green_circle: 낮음)**
  > 
  > ```sql
  > WHERE noti_type = 'TRADE_SIGNAL' AND message LIKE '%매도%';
  > ```
  > 
  > 기존 `formatSignalChange`가 `"매수 → 매도"` 형태였으므로, BUY→SELL 변경 알림은 message에 "매도"가 포함되어 SIGNAL_SELL로 정상 분류됩니다. 반대로 SELL→BUY 변경 알림도 "매도"가 포함(`매도 → 매수`)되어 **SIGNAL_SELL로 잘못 분류**될 수 있습니다.
  > 
  > → 현재 데이터 양이 적다면 큰 문제는 아니지만, 정확도가 필요하면 `message LIKE '%매도으로%'` 또는 title 기반 분류 고려
  > 
  > **3. FE 크로스체크 (중요도: :yellow_circle: 중)**
  > 
  > responseValue가 기존 `"SIGNAL"` → `"BUY"` / `"SELL"`로 바뀌었습니다. FE에서 SSE 수신 시 `notiType === "SIGNAL"` 로 처리하던 부분이 있다면 동작하지 않습니다.
  > 
  > → 프론트엔드 엔지니어에게 `notiType: "BUY" | "SELL"` 케이스 대응 필요 여부 전달
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 로직 정확성 | :white_check_mark: |
  > | 마이그레이션 | :warning: SELL→BUY 변경 알림이 SIGNAL_SELL로 분류될 수 있음 |
  > | 메시지 문법 | :warning: "매수으로" 조사 어색 |
  > | 하위 호환성 | :warning: FE에서 BUY/SELL 타입 처리 확인 필요 |
  > | 테스트 | :white_check_mark: |
  > | 코드 스타일 | :white_check_mark: |
  > 
  > 조사 수정 + FE 측 대응 확인되면 머지해도 좋습니다.

---

### !397 · [BE] Fix: V20 체크섬 복원 및 TRADE_SIGNAL 마이그레이션을 V21로 분리

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `fix/be/split-surge-plunge-noti-type` → `dev-backend`
- 생성: 2026-03-27 · 머지: 2026-03-27
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/397](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/397)

<details><summary>MR 설명</summary>

> - V20: 이미 배포된 원본(SURGE_PLUNGE 분리만)으로 복원하여 체크섬 불일치 해결
> - V21: TRADE_SIGNAL → SIGNAL_BUY/SIGNAL_SELL 마이그레이션 분리
> - 기존("매도으로") + 신규("매도로") 메시지 포맷 모두 처리

</details>

**리뷰 토론**

- 💬 **이혜민** (2026-03-27)
  > ## MR #397 코드리뷰: V20 체크섬 복원 + TRADE_SIGNAL 마이그레이션 V21 분리
  > 
  > **작성자:** 강지석 | **변경 파일:** 2개 | **브랜치:** `fix/be/split-surge-plunge-noti-type` → `dev-backend`
  > 
  > ---
  > 
  > ### 전체 평가: :warning: 체크섬 분리는 올바르나, 핵심 피드백이 반영되지 않음
  > 
  > ---
  > 
  > ### :white_check_mark: 개선된 점
  > 
  > 1. **V20 체크섬 복원** — 이미 배포된 V20을 원본으로 되돌려 체크섬 불일치 해결
  > 2. **V21 분리** — TRADE_SIGNAL 마이그레이션을 별도 파일로 분리하여 롤백 용이
  > 3. **메시지 포맷 양쪽 대응** — `'%매도으로%'` OR `'%매도로%'` 둘 다 처리
  > 
  > ---
  > 
  > ### :red_circle: 이전 피드백 미반영 사항
  > 
  > **1. 마이그레이션 오분류 문제가 여전함 (중요도: :red_circle: 높음)**
  > 
  > 이전 리뷰에서 지적한 핵심 문제가 그대로입니다:
  > 
  > ```sql
  > UPDATE stock_notifications SET noti_type = 'SIGNAL_SELL'
  > WHERE noti_type = 'TRADE_SIGNAL'
  >   AND (message LIKE '%매도으로%' OR message LIKE '%매도로%');
  > ```
  > 
  > 기존 `formatSignalChange` 메시지 형식은 `"매도 → 매수"` 였으므로, **SELL→BUY 변경 알림**(최종 신호 BUY)의 message에도 "매도"가 포함됩니다.
  > 
  > - `"삼성전자 AI 매매신호가 매도 → 매수으로 변경되었습니다."` → `'%매도으로%'` 매칭 → **SIGNAL_SELL로 잘못 분류** :x:
  > 
  > → "최종 신호가 무엇인지" 기준으로 분류해야 합니다. 예: `message LIKE '%매수으로 변경%' OR message LIKE '%매수로 변경%'` → SIGNAL_BUY, 나머지 → SIGNAL_SELL
  > 
  > **2. HOLD/STAY 전환 알림 누락 문제 미언급 (중요도: :yellow_circle: 중)**
  > 
  > #396의 `TradeSignalAlertScheduler`에서 HOLD/STAY → null 반환으로 알림을 스킵하는 변경이 있었는데, 이 MR에서는 해당 부분에 대한 후속 조치가 없습니다.
  > 
  > → 의도적으로 HOLD/STAY 알림을 제거하는 것이 맞다면 MR 설명에 명시 필요. 아니라면 #396 수정 필요.
  > 
  > ---
  > 
  > ### 요약
  > 
  > | 항목 | 판정 |
  > |----|----|
  > | 체크섬 복원 | :white_check_mark: |
  > | 마이그레이션 분리 | :white_check_mark: |
  > | 오분류 방지 | :x: SELL→BUY 변경 알림이 여전히 SIGNAL_SELL로 분류됨 |
  > | HOLD/STAY 알림 | :warning: 의도 확인 필요 |
  > 
  > 마이그레이션 SQL의 분류 기준을 "최종 신호" 기반으로 수정한 후 머지를 권장합니다.

---

### !398 · [BE] Fix: 알림 created_at null 응답 수정 - toOffsetDateTime 타입 변환 보강

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `fix/be/split-surge-plunge-noti-type` → `dev-backend`
- 생성: 2026-03-27 · 머지: 2026-03-27
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/398](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/398)

<details><summary>MR 설명</summary>

> - PostgreSQL 네이티브 쿼리가 timestamptz를 LocalDateTime으로 반환하는 케이스 처리
> - 최종 폴백으로 toString() 파싱 추가

</details>

**리뷰 토론**

- 💬 **정준용** (2026-03-27)
  > 1. 이미 배포된 Flyway V21 파일을 직접 수정하면 안 됩니다.
  > - 문제:
  >   `V21__split_trade_signal_noti_type.sql`은 이미 `dev-backend`에 있는 마이그레이션 파일인데, 이번 MR에서 그 내용을 직접 바꾸고 있습니다.
  > - 왜 위험한가:
  >   현재 설정이 `spring.flyway.validate-on-migrate=true`라서, 기존 V21이 이미 적용된 환경에서는 체크섬이 달라져서 다음 배포 때 백엔드가 기동 실패할 수 있습니다.
  > - 어떻게 해야 하나:
  >   V21 파일을 수정하지 말고, 수정 내용은 `V22` 같은 새 마이그레이션 파일로 추가해야 합니다.
  > 
  > 2. 기존 HOLD/STAY 거래신호를 전부 SELL로 이관하면 안 됩니다.
  > - 문제:
  >   지금 SQL은 `매수`로 판별되지 않은 나머지 `TRADE_SIGNAL`을 전부 `SIGNAL_SELL`로 바꾸고 있습니다.
  > - 왜 위험한가:
  >   기존 거래신호 알림에는 최종 신호가 `HOLD`나 `STAY`인 경우도 있을 수 있어서, 그런 과거 알림까지 전부 `SELL`로 바뀌면 잘못된 탭에 노출됩니다.
  > - 어떻게 해야 하나:
  >   `HOLD`, `STAY`를 따로 판별할 수 있게 처리하거나, 정확히 분류할 수 없는 데이터는 섣불리 `SELL`로 몰지 말고 그대로 두는 편이 안전합니다.
  > 
  > 한 줄 총평:
  > - 이 MR은 `created_at` 파싱 보완 자체는 괜찮아 보이지만, 마이그레이션 파일 수정 방식이 배포를 깨뜨릴 수 있고, 과거 알림 데이터도 잘못 분류할 가능성이 있어서 그대로 머지하면 위험합니다.

---

### !401 · [FE] Feat: S14P21D208-231 report detail debate process refactor

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/fe/report-edit` → `dev-frontend`
- 생성: 2026-03-27 · 머지: 2026-03-27
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/401](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/401)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 리포트 디테일 페이지 토론 프로세스를 Figma 기반으로 개편하여 TTS 효율화, 의견 제출서 요약 카드, 회의록 보기 기능 추가
> 
> ## MR 세부 내용
> - 토론 API fetch/hook을 순수 fetch + select 패턴으로 분리하고 unwrapApiResponse 공통 유틸 적용
> - 위원 발언 파싱 구조 변경: 의견 첫 문장만 TTS 재생(~54->~9개), 근거/리스크/실행은 의견 제출서 요약 카드로 텍스트 표시
> - TTS 데이터와 UI 표시 데이터 분리: 의장 신호 및 summary 본문 내 영어 단어를 TTS용 한국어로 변환
> - 회의록 보기 버튼 추가: TTS 없이 전체 토론 내용을 즉시 확인 가능
> - 백엔드 agent name 매핑 보완
> - AgentStatement 타입 및 transformDebateResponse 유틸 추가
> 
> ## Issue 번호
> S14P21D208-231

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-27)
  > ## Code Review -- MR !401
  > 
  > **[FE] Feat: S14P21D208-231 리포트 디테일 토론 프로세스 개선**
  > 
  > **Files Reviewed:** 9
  > **Total Issues:** 5
  > 
  > ### By Severity
  > - CRITICAL: 0
  > - HIGH: 0
  > - MEDIUM: 3
  > - LOW: 2
  > 
  > ---
  > 
  > ### Stage 1 -- Spec Compliance
  > 
  > The MR description specifies:
  > 1. Debate API fetch/hook refactoring (pure fetch + select pattern) -- **Covered.** getDebateReports.ts now returns raw data, useDebateReportsQuery.ts uses React Query select with transformDebateResponse.
  > 2. Speech parsing restructured (opinion-only TTS, basis/risk/action as text cards) -- **Covered.** parseAgentStatement replaces parseSpeechSegments; StatementDetailCard renders details.
  > 3. TTS data vs UI display data separation (English signals to Korean for TTS) -- **Covered.** formatSignalForTts and replaceEnglishSignalsForTts handle conversion.
  > 4. 회의록 보기 button -- **Covered.** showTranscriptOnly state toggle in ReportDebateSection.tsx.
  > 5. Backend agent name mapping fix -- **Covered.** 차트 위원 and 뉴스 위원 added to speakerIdByAgentName.
  > 6. New AgentStatement type and transformDebateResponse utility -- **Covered.**
  > 
  > **Spec compliance: PASS**
  > 
  > ---
  > 
  > ### Stage 2 -- Code Quality & Security
  > 
  > **LSP Diagnostics:** All 9 modified files report zero errors, warnings, or hints.
  > 
  > **Security:** No hardcoded secrets, no injection vectors, no XSS risks found. encodeURIComponent is correctly used for the stockId path parameter. Auth is delegated to apiFetch with withAuth: true.
  > 
  > ---
  > 
  > ### Issues
  > 
  > #### [MEDIUM] Untyped API return loses type safety across the fetch-select boundary
  > **File:** src/app/report/api/getDebateReports.ts:14-22
  > 
  > **Issue:** apiFetch is called without a type parameter and the return of unwrapApiResponse is unknown. This means useQuery queryFn returns Promise unknown, and select: transformDebateResponse receives unknown. While transformDebateResponse defensively handles unknown, the query data typing relies entirely on the select return type. If someone removes select or reuses getDebateReports elsewhere, they get unknown with no compiler guidance.
  > 
  > **Fix:** Add a generic parameter to apiFetch or to unwrapApiResponse, or type the function return explicitly.
  > 
  > ---
  > 
  > #### [MEDIUM] Hardcoded hex colors break dark mode convention
  > **File:** src/app/report/components/ReportDebateSection.tsx:303-312, 337
  > 
  > **Issue:** StatementDetailCard uses hardcoded hex colors for badge styles (#eff6ff, #2563eb, #fef2f2, #dc2626, #f0fdf4, #16a34a) and text (#374151). Per the project conventions, colors should use CSS variable tokens (--color-*). These hardcoded values will not adapt to dark mode.
  > 
  > **Fix:** Replace hex values with CSS variable tokens from theme.css.
  > 
  > ---
  > 
  > #### [MEDIUM] replaceEnglishSignalsForTts regex fragility with double-space edge case
  > **File:** src/app/report/components/DebateSection.tsx:298-304
  > 
  > **Issue:** The STRONG_BUY regex uses ? (zero or one separator), so STRONG  BUY (double space) would not match and would fall through to the BUY replacement, producing STRONG  매수.
  > 
  > **Fix:** Make the pattern more robust with one or more separators, or consolidate into a single pass using a replacement map.
  > 
  > ---
  > 
  > #### [LOW] Type assertion on untrusted data in transformDebateResponse
  > **File:** src/app/report/utils/transformDebateResponse.ts:37
  > 
  > **Issue:** (reports as UpstreamReport[]).map(...) asserts the array elements match UpstreamReport without validation. If the backend sends a differently shaped object, report.date could be undefined.
  > 
  > **Fix:** Add a fallback for report.date: date: report.date ?? "". The other fields already have fallbacks.
  > 
  > ---
  > 
  > #### [LOW] Index-based React key in list rendering
  > **File:** src/app/report/components/ReportDebateSection.tsx:336
  > 
  > **Issue:** key using array index is a minor anti-pattern. Since detail items are static per render (no reordering), this is functionally acceptable.
  > 
  > **Fix:** If detail items have unique text, use the text as key instead.
  > 
  > ---
  > 
  > ### Positive Observations
  > 
  > - Clean separation of TTS data from UI display data. parseAgentStatement is well-structured and testable.
  > - Good use of React Query select pattern to keep the fetch layer pure.
  > - Defensive null checks throughout.
  > - encodeURIComponent used correctly on user-derived path segments.
  > - Agent name mapping additions are backward-compatible with existing names.
  > - The showTranscriptOnly toggle is a clean UX addition with proper conditional rendering.
  > 
  > ---
  > 
  > ### Recommendation
  > 
  > **APPROVE** (with suggestions)
  > 
  > No CRITICAL or HIGH severity issues found. The three MEDIUM issues are non-blocking improvements related to type safety, dark mode compliance, and regex robustness. The code is well-structured, the spec is fully implemented, and there are no security concerns. I recommend addressing the hardcoded color issue (MEDIUM) before merging to maintain dark mode consistency across the app.
  > 
  > ---
  > *Review by Claude Code (Opus 4.6)*

---

### !407 · [FE] fix : S14P21D208-133 회원/약관/인증 흐름과 종목 상세 차트·실적 표시를 정리

- 작성자: **정준용** · 상태: `merged`
- 브랜치: `fix/fe/total-ui-api` → `dev-frontend`
- 생성: 2026-03-28 · 머지: 2026-03-28
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/407](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/407)

<details><summary>MR 설명</summary>

> ## :page_facing_up: MR 한 줄 요약
> 
> 회원/약관/인증 흐름과 종목 상세 차트·실적 표시를 정리하고, 전체 종목 정렬 탭과 메인/헤더 이동 UX를 함께 보완했습니다.
> 
> ## :technologist: MR 세부 내용
> 
> - 프로필 메뉴에 비밀번호 변경 모달을 추가했습니다.
> - 비밀번호 변경은 `/api/users/profile/password` `PUT` 연동으로 처리되며, 기존 인증/디바이스 아이디 흐름을 그대로 사용합니다.
> - 비밀번호 변경 폼은 백엔드 정책 기준으로 validation을 적용했습니다.
> - 현재 비밀번호 입력란은 시각적 validation과 체크/X 아이콘 없이 단순 입력만 받도록 정리했습니다.
> - 새 비밀번호/새 비밀번호 확인 입력에는 validation 상태에 따라 체크/X 아이콘이 표시되도록 구현했습니다.
> - 새 비밀번호가 유효해 체크 표시가 뜨면 안내 문구는 숨기고, 에러일 때만 에러 문구가 보이도록 수정했습니다.
> - 회원가입 비밀번호 validation도 비밀번호 변경 모달과 동일한 기준과 UI 흐름으로 통일했습니다.
> - 비밀번호 정책과 validation 아이콘은 공통 유틸/공통 컴포넌트로 분리했습니다.
> - 프로필 수정 성공 시 `프로필 수정이 완료되었습니다.` alert를 추가했습니다.
> - 비밀번호 변경 성공 후 세션을 정리하고 다시 로그인하도록 흐름을 연결했습니다.
> - 회원가입/소셜 회원가입에 약관 상세 모달을 추가했습니다.
> - `서비스 이용약관`, `개인정보 처리방침`, `투자 면책 고지` 클릭 시 각 정책 상세를 `/api/policy/terms`, `/api/policy/privacy`, `/api/policy/disclaimer`로 조회해 모달에 표시하도록 구현했습니다.
> - 약관 상세 모달에서 `동의합니다`를 누르면 원래 회원가입 모달로 돌아가면서 해당 항목이 체크되도록 연결했습니다.
> - 이메일 회원가입과 소셜 회원가입 모두 필수 약관 3개 동의가 있어야 완료되도록 통일했습니다.
> - 이메일 회원가입 인증 코드 요청 성공 후 `확인` 버튼 왼쪽에 5분 타이머가 표시되도록 추가했습니다.
> - 인증 코드 요청 버튼은 요청 후 `재요청`으로 바뀌고, 인증 완료 후에는 `인증완료` 상태로 다시 누를 수 없도록 수정했습니다.
> - 인증 코드 유효시간이 만료되면 인증 확인이 막히고, 재요청 후 다시 진행하도록 정리했습니다.
> - 로그인 전용 페이지(`/auth/login`)에서는 전역 로그인 모달이 겹쳐 뜨지 않도록 `GlobalAuthModal`에 경로 예외 처리를 추가했습니다.
> - 헤더 데스크톱 구간에서 로그인 버튼이 2줄로 줄바꿈되던 문제를 수정했습니다.
> - 로그인 버튼은 줄바꿈 없이 유지하고, 같은 구간에서는 검색창이 먼저 줄어들도록 AppNav 폭을 조정했습니다.
> - 메인 페이지 `오늘의 살래 TOP10` 카드/리스트 클릭 시 `/stocks/{stockId}` 종목 상세로 이동하도록 변경했습니다.
> - `새롭게 포착된 매수/매도 포인트` 리스트는 인증 후 `/report/{stockId}`로 이동하도록 유지했습니다.
> - 종목 상세 캔들 차트에도 마지막 종가 배지가 보이도록 보조 line series의 `endLabel`을 추가했습니다.
> - 종목 상세 분기 실적은 `4분기`가 연간 누적값으로 내려오는 계약을 반영해, `Q4 = 연간 - Q1 - Q2 - Q3`로 보정하도록 수정했습니다.
> - 이 보정값은 분기 실적 표와 차트에 공통으로 적용됩니다.
> - 전체 종목 페이지 메인 타이틀 `실시간 발견`은 `Heading/lg` 토큰 기준 스타일로 조정했습니다.
> - 전체 종목 정렬 탭에 `등락률` 탭을 추가했습니다.
> - `등락률` 탭 선택 시 프런트는 `RETURN` metric을 사용하고, 백엔드에는 `sort=CHANGE`로 요청이 나가도록 연결했습니다.
> 
> ## :white_check_mark: 코드리뷰 반영
> 
> - 로그인 페이지와 전역 로그인 모달이 동시에 보이던 인증 UX 회귀를 수정했습니다.
> - 분기 실적 `4Q`가 연간 누적으로 잘못 보이던 데이터 해석 문제를 수정했습니다.
> - 캔들 차트에서 누락되던 마지막 종가 라벨을 복구했습니다.
> - 회원가입과 비밀번호 변경의 비밀번호 검증 로직을 공통화해 정책 불일치 가능성을 줄였습니다.
> - 이메일 인증 요청 후 타이머/재요청/완료 상태를 분리해 실제 가입 흐름과 맞췄습니다.
> - 전체 종목 정렬 탭과 백엔드 `sort=CHANGE` 계약을 맞췄습니다.
> 
> ## :mag_right: 검증
> 
> - `pnpm exec eslint "src/app/auth/signup/components/SignupCard.tsx" "src/app/auth/signup/terms/components/TermsSignupCard.tsx" "src/app/home/components/SignalPointsSection.tsx" "src/app/home/components/TopStocksSection.tsx" "src/app/stocks/[ticker]/components/StockPriceChart.tsx" "src/app/stocks/[ticker]/utils/stockDetailFormatters.ts" "src/app/stocks/StocksPageClient.tsx" "src/app/stocks/components/StocksSortTabs.tsx" "src/shared/components/AppNav.tsx" "src/shared/components/GlobalAuthModal.tsx" "src/shared/components/nav/PasswordChangeModal.tsx" "src/shared/lib/userProfileApi.ts" "src/shared/lib/passwordValidation.ts" "src/shared/ui/PasswordValidationStatusIcon.tsx" "src/shared/types/policy.ts" "src/shared/lib/policyApi.ts" "src/shared/hooks/usePolicyDetailQuery.ts" "src/app/auth/signup/components/PolicyDetailModal.tsx" "src/app/auth/signup/components/RequiredTermsSection.tsx" "src/app/auth/signup/components/policyTerms.ts" "src/app/api/policy/utils.ts" "src/app/api/policy/terms/route.ts" "src/app/api/policy/privacy/route.ts" "src/app/api/policy/disclaimer/route.ts"`
> - `pnpm exec tsc --noEmit --pretty false`
> - `pnpm build`
> 
> ## :paperclip: Issue 번호
> 
> S14P21D208-133

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-28)
  > ## Code Review -- MR !407
  > 
  > **[FE] fix : S14P21D208-133 회원/약관/인증 흐름과 종목 상세 차트·실적 표시를 정리**
  > 
  > **Files Reviewed:** 25
  > **Total Issues:** 7
  > 
  > ### By Severity
  > - CRITICAL: 0
  > - HIGH: 1
  > - MEDIUM: 4
  > - LOW: 2
  > 
  > ---
  > 
  > ### Stage 1 -- Spec Compliance
  > 
  > The MR title says it cleans up auth/terms/signup flows and stock detail chart/earnings display. The changes match this scope:
  > 
  > 1. **Policy/terms agreement flow** -- New policy API routes, policy detail modal, required-terms section with "agree" action -- all properly wired into the signup card. PASS.
  > 2. **Password change modal** -- Replaces the placeholder alert with a full modal + validation + API call. PASS.
  > 3. **Stock price chart** -- Replaces markLine with an invisible line series + endLabel for the latest-close badge. PASS.
  > 4. **Quarterly financials normalization** -- Q4 cumulative-to-standalone conversion logic added. PASS.
  > 5. **Navigation behavior changes** -- TopStocksSection now routes to /stocks/{id} instead of /report/{id}, SignalPointsSection adds clickable items routing to /report/{id} (with auth gate). PASS.
  > 6. **GlobalAuthModal** -- Auto-closes login modal when already on /auth/login. PASS.
  > 7. **Minor UI tweaks** -- heading size, label text, search bar responsive widths, RETURN tab in rankings. PASS.
  > 
  > **Stage 1 verdict: PASS** -- all changes align with the stated purpose.
  > 
  > ---
  > 
  > ### Stage 2 -- Code Quality Issues
  > 
  > #### [HIGH] Duplicate validation logic called redundantly
  > **File:** src/shared/components/nav/PasswordChangeModal.tsx (lines ~155-165 and ~176-188)
  > **Issue:** validatePasswordPolicy and validatePasswordConfirmation are called **three times** with the same arguments: once in useMemo for display, once to compute canSubmit, and once inside handleSubmit. The canSubmit and handleSubmit calls duplicate the memoized values and re-instantiate the same string options each render.
  > **Fix:** Reuse the memoized newPasswordError and newPasswordConfirmError values for canSubmit and handleSubmit instead of calling the validation functions again.
  > 
  > ---
  > 
  > #### [MEDIUM] Password change: alert shown after navigation may be swallowed
  > **File:** src/shared/components/AppNav.tsx (line ~297)
  > **Issue:** handleSavePassword calls router.push("/") then window.alert(...) then showLoginModal(). Since router.push triggers a client-side navigation that re-renders the tree, the subsequent window.alert and showLoginModal may execute in a partially unmounted context. The alert is synchronous so it blocks rendering, but it creates a confusing UX where the user sees the old page behind the alert.
  > **Fix:** Show the alert or a toast **before** router.push, or use a callback/effect after navigation completes.
  > 
  > ---
  > 
  > #### [MEDIUM] Hardcoded fallback API URL in policy utils
  > **File:** src/app/api/policy/utils.ts (line ~87)
  > **Issue:** getApiBaseUrl() falls back to "https://j14d208.p.ssafy.io" when NEXT_PUBLIC_API_BASE_URL is not set. This embeds a deployment-specific domain in source code.
  > **Fix:** Either throw an error when the env var is missing (fail-fast), or use a constant imported from a central config file that already has this fallback, so it is defined in one place.
  > 
  > ---
  > 
  > #### [MEDIUM] Hardcoded termsId-to-PolicyKind mapping is fragile
  > **File:** src/app/auth/signup/components/policyTerms.ts (lines 10-16)
  > **Issue:** The mapping { 1: "terms", 2: "privacy", 3: "disclaimer" } assumes the backend will always assign these exact IDs. If the backend changes IDs or adds new terms, this silently breaks. The same IDs are duplicated in REQUIRED_SIGNUP_TERMS and the mock data in utils.ts.
  > **Fix:** Derive the mapping from the backend response (e.g., by term type) rather than by numeric ID, or at minimum add a comment noting this coupling and consider making the terms list fetched from an API.
  > 
  > ---
  > 
  > #### [MEDIUM] onClose not wrapped in useCallback -- may cause unnecessary effect re-runs
  > **File:** src/shared/components/nav/PasswordChangeModal.tsx (line ~130) and src/app/auth/signup/components/PolicyDetailModal.tsx (line ~225)
  > **Issue:** Both modals include onClose in the dependency array of useEffect that adds/removes event listeners. If the parent creates a new function reference on each render (e.g., an inline arrow), the effect will run on every render -- removing and re-adding the keydown listener and toggling body overflow.
  > **Fix:** Either wrap onClose in useCallback at the call site, or use useRef inside the modal to hold the latest onClose and remove it from the dep array.
  > 
  > ---
  > 
  > #### [LOW] unknown | UserProfileApiEnvelope<unknown> type union is meaningless
  > **File:** src/shared/lib/userProfileApi.ts (line ~52)
  > **Issue:** unknown | X simplifies to unknown in TypeScript, making the generic parameter documentation-only. The type annotation provides no compile-time safety.
  > **Fix:** Use a concrete type or discriminated union, e.g. UserProfileApiEnvelope<{ message?: string }>.
  > 
  > ---
  > 
  > #### [LOW] CloseIcon component duplicated across two files
  > **File:** src/shared/components/nav/PasswordChangeModal.tsx and src/app/auth/signup/components/PolicyDetailModal.tsx
  > **Issue:** Identical CloseIcon SVG component is defined in both modals. Minor DRY violation.
  > **Fix:** Extract to a shared icon component in src/shared/ui/ or use an existing icon library import.
  > 
  > ---
  > 
  > ### LSP Diagnostics
  > All locally available modified files passed TypeScript diagnostics with zero errors. New files on the source branch could not be checked locally but the diff shows correct typing patterns consistent with the project conventions.
  > 
  > ### Positive Observations
  > - Good accessibility: modals have proper aria-label attributes, Escape key handling, and focus management.
  > - Password validation is thorough (length, complexity, email inclusion, consecutive chars).
  > - The quarterly financials normalization logic (cumulative Q4 to standalone) is well-structured.
  > - Proper use of event.stopPropagation() on the watchlist heart button inside clickable rows.
  > - Clean separation of concerns with RequiredTermsSection, PolicyDetailModal, and policyTerms.ts.
  > 
  > ### Recommendation
  > **COMMENT** -- No critical or blocking issues. The HIGH-severity duplicate validation is worth addressing for maintainability but is not a correctness bug. The MEDIUM items are improvements that can be addressed in a follow-up. Overall this is solid, well-structured work.

- 💬 **장호정** (2026-03-28)
  > ## 코드 리뷰 리포트
  > 
  > **검토 파일 수:** 25
  > **총 이슈 수:** 7
  > 
  > ---
  > 
  > ### CRITICAL (0)
  > 없음
  > 
  > ### HIGH (1)
  > 
  > **1. 비밀번호 검증 로직 3중 중복 호출**
  > - 파일: `src/shared/components/nav/PasswordChangeModal.tsx`
  > - 문제: `validatePasswordPolicy`와 `validatePasswordConfirmation`이 `useMemo`(표시용), `canSubmit`(버튼 활성화), `handleSubmit`(제출 시) 세 곳에서 동일 인자로 호출됨
  > - 수정: memoized된 `newPasswordError`, `newPasswordConfirmError` 값을 재사용하세요
  > 
  > ### MEDIUM (4)
  > 
  > **1. 비밀번호 변경: alert가 네비게이션 후 표시되어 UX 혼란**
  > - 파일: `src/shared/components/AppNav.tsx` (~297행)
  > - 문제: `handleSavePassword`가 `router.push("/")` → `window.alert(...)` → `showLoginModal()` 순서로 호출. alert가 이전 페이지에서 블로킹됨
  > - 수정: alert를 `router.push` 전에 표시하거나, 네비게이션 완료 후 콜백/effect 사용
  > 
  > **2. 정책 유틸에 하드코딩된 폴백 API URL**
  > - 파일: `src/app/api/policy/utils.ts` (~87행)
  > - 문제: `getApiBaseUrl()`이 `"https://j14d208.p.ssafy.io"`로 폴백 — 배포 환경 특정 도메인이 소스코드에 포함됨
  > - 수정: 환경변수 미설정 시 에러를 발생시키거나, 중앙 설정에서 폴백값을 import
  > 
  > **3. termsId → PolicyKind 매핑이 취약**
  > - 파일: `src/app/auth/signup/components/policyTerms.ts` (10-16행)
  > - 문제: `{ 1: "terms", 2: "privacy", 3: "disclaimer" }` 매핑이 백엔드 고정 ID에 의존. 여러 파일에 ID가 중복됨
  > - 수정: 숫자 ID 대신 백엔드 응답의 약관 타입 기반으로 매핑 도출
  > 
  > **4. onClose가 useCallback으로 감싸지지 않아 불필요한 effect 재실행 가능**
  > - 파일: `PasswordChangeModal.tsx` (~130행), `PolicyDetailModal.tsx` (~225행)
  > - 문제: 두 모달 모두 useEffect 의존성 배열에 `onClose` 포함. 부모가 매 렌더마다 새 참조를 전달하면 effect가 매번 실행됨
  > - 수정: 호출 측에서 `onClose`를 `useCallback`으로 감싸거나, 모달 내부에서 `useRef` 사용
  > 
  > ### LOW (2)
  > 
  > **1. `unknown | UserProfileApiEnvelope<unknown>` 유니온 타입이 무의미**
  > - 파일: `src/shared/lib/userProfileApi.ts` (~52행)
  > - 수정: `UserProfileApiEnvelope<{ message?: string }>` 등 구체적 타입 사용
  > 
  > **2. CloseIcon 컴포넌트가 두 파일에 중복 정의**
  > - 파일: `PasswordChangeModal.tsx`, `PolicyDetailModal.tsx`
  > - 수정: `src/shared/ui/`에 공용 아이콘 컴포넌트로 추출
  > 
  > ---
  > 
  > ### 권고: **COMMENT**
  > 
  > CRITICAL이나 블로킹 이슈 없음. HIGH 심각도의 검증 중복 호출은 유지보수성 개선을 위해 수정 권장하나 정확성 버그는 아님. MEDIUM 항목들은 후속 작업에서 개선 가능. 전반적으로 잘 구조화된 작업입니다.

---

### !408 · [BE] Feat: 알림 이메일 발송 기능 추가

- 작성자: **강지석** · 상태: `merged`
- 브랜치: `feature/be/notification-email` → `dev-backend`
- 생성: 2026-03-28 · 머지: 2026-03-28
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/408](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/408)

<details><summary>MR 설명</summary>

> - EmailService에 HTML 이메일 발송 메서드(sendHtmlEmail) 추가
> - WatchlistRepository에 이메일 수신 동의 유저 조회 쿼리 추가
> - NotificationEmailService 생성: 알림 유형별 HTML 본문 생성 + 비동기 발송
> - NotificationPublishService.publish()에 이메일 발송 연결
> - 급등/급락(빨강/파랑), AI 매매신호, 공시(초록) 유형별 색상 구분

</details>

**리뷰 토론**

- 💬 **강지석** (2026-03-28)
  > - Critical (반드시 수정)
  > 
  >   - 1. @EnableAsync 누락
  > 
  >   - 애플리케이션 클래스에 @EnableAsync가 없으면 모든 @Async 어노테이션이 무시됩니다. 즉
  >   - sendNotificationEmails()가 publish()의 @Transactional 안에서 동기 실행되어 이메일 발송 중 DB
  >   - 커넥션을 계속 점유합니다. @EnableAsync를 메인 클래스나 별도 AsyncConfig에 추가해야 합니다.
  > 
  >   - 2. XSS / HTML 인젝션 취약점
  > 
  >    - title, message가 String.formatted()로 HTML에 직접 삽입됩니다. 외부 소스(DART 공시 등)에서 온
  >    - 데이터에 HTML 태그가 포함될 수 있어 이메일 본문에 피싱 링크/폼이 주입될 수 있습니다.
  >  ```
  >   // 수정: Spring의 HtmlUtils 사용
  >   import org.springframework.web.util.HtmlUtils;
  >   // ...
  >   String safeTitle = HtmlUtils.htmlEscape(title);
  >   String safeMessage = HtmlUtils.htmlEscape(message);
  > ```
  >   ---
  >   - Important (수정 권장)
  > 
  >    - 3. 이중 @Async 문제
  > 
  >   - sendNotificationEmails()에 @Async → 내부에서 호출하는 sendHtmlEmail()에도 @Async. @EnableAsync 적용
  >   시 각 이메일이 별도 스레드로 dispatch되어 로그가 실제 발송 전에 찍힙니다. 외부 메서드만 @Async로
  >   하고 내부 발송은 동기로 호출하는 게 명확합니다.
  > 
  >   - 4. 같은 stockId로 DB 쿼리 2번
  > 
  >   - publish()에서 findNotiEnabledUserIdsByStockId → findEmailOptInUserEmailsByStockId 순서로 같은 종목에
  >    대해 2번 조회합니다. 하나의 쿼리로 userId + email + isEmailOptIn을 함께 가져오면 DB 부하를 줄일 수
  >   있습니다.
  > 
  >   - 5. 대량 발송 시 보호 장치 없음
  > 
  >   - 인기 종목의 관심 유저가 수천 명이면 for 루프에서 SMTP 서버에 부하가 집중됩니다. 배치 사이즈 제한이나
  >    rate throttle을 고려해야 합니다.
  > 
  >   ---
  >   - Suggestions (개선하면 좋은 점)
  > 
  >   - "공시 바로가기" 버튼 텍스트가 모든 알림 유형에 하드코딩 — notiType에 따라 분기하거나
  >   ANNOUNCEMENT만 링크 렌더링
  >   - 색상/라벨 매핑에 대한 parameterized 테스트 추가하면 더 견고
  >   - INACTIVE/WITHDRAWN 유저 시나리오를 repository 테스트에 추가

---

### !411 · [FE] fix : S14P21D208-133 프로필 이미지 업로드를 presigned URL 방식으로 연동하고, 포트폴리오/섹터 표시에서 dev-frontend 대비 의미 불일치와 UI 오류를 함께 정리

- 작성자: **정준용** · 상태: `merged`
- 브랜치: `fix/fe/total-ui-api` → `dev-frontend`
- 생성: 2026-03-29 · 머지: 2026-03-29
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/411](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/411)

<details><summary>MR 설명</summary>

> ## 📄 MR 한 줄 요약
> 프로필 이미지 업로드를 presigned URL 방식으로 연동하고, 포트폴리오/섹터 표시에서 dev-frontend 대비 의미 불일치와 UI 오류를 함께 정리했습니다.
> 
> ## 🧑‍💻 MR 세부 내용
> - 프로필 수정에 presigned URL 기반 프로필 이미지 업로드를 추가했습니다.
> - `/api/storage/presigned-url` 발급 후 MinIO에 직접 PUT 업로드하고, 이후 `/api/users/profile`에 `profileImageUrl`을 전달하도록 연결했습니다.
> - mock 환경에서도 동일한 흐름을 확인할 수 있도록 `/api/storage/mock-upload`, `/api/storage/mock-file`, mock storage store를 추가했습니다.
> - 프로필 수정 모달에서 이미지 선택 시 미리보기를 보여주고, 파일 형식/용량 검증을 추가했습니다.
> - 잘못된 파일을 선택해도 실제 업로드 파일이 없는 경우 닉네임 저장은 가능하도록 submit 조건을 정리했습니다.
> - 신규 가입 유저의 `profile_image_url`이 `null` 또는 `/images/default-profile.png`인 경우 기본 프로필 이미지를 `/icons/SSAL_LAB_ICON.png`로 통일했습니다.
> - 이 기본 이미지 정규화는 인증 응답 파싱, 세션 복원, 헤더 프로필, 프로필 수정 모달에 공통 적용했습니다.
> 
> - 로그인 전용 페이지(`/auth/login`)에서는 전역 로그인 모달이 겹쳐 뜨지 않도록 예외 처리를 추가했습니다.
> - 프로필 수정 성공 시 `프로필 수정이 완료되었습니다.` alert를 추가했습니다.
> 
> - 포트폴리오 현재 보유 종목 정렬 UI 구현을 위해 @radix-ui/react-popover 의존성을 추가했습니다.
> - 정렬 기본값인 `수익률 내림차순`이 드롭다운 목록 맨 위에 보이도록 순서를 조정했습니다.
> - 모바일 `오늘 매매 내역` 카드는 `현재가`를 왼쪽 종목 정보 영역으로, `성과`는 오른쪽 가격 블록에 유지하도록 배치를 정리했습니다.
> - `오늘 매매 내역` 데스크톱 리스트에서는 종목코드를 제거하고, `매도가 5,070원` / `매수가 ...`가 한 줄에 보이도록 정리했습니다.
> - `오늘 매매 내역`에는 종목 아이콘을 추가했고, `SELL`일 때는 매도가와 매입가를 구분해서 보이도록 표시를 보완했습니다.
> - 포트폴리오 hero의 `평균 월간 수익률`은 실제 `monthlyReturns` 평균값을 사용하도록 수정했습니다.
> - hero의 `평균 월간 수익률`, `전날 대비 수익률`은 모두 `+` 빨강, `-` 파랑 규칙을 따르도록 맞췄습니다.
> - 월간 수익률 보드에서 `0/null` 값은 막대가 보이지 않도록 수정했습니다.
> 
> - 뉴스 페이지 페이지네이션 이동 시 쿼리 리렌더링으로 `1페이지`로 돌아가던 문제를 수정했습니다.
> - `최신 뉴스`, `관심 주식` 뉴스 목록 쿼리에 `placeholderData`를 적용해 페이지 전환 중에도 이전 데이터를 유지하도록 변경했습니다.
> - 뉴스 페이지의 비인증 영역 실패 메시지는 `인증이 필요합니다.` 대신 서버 연결 안내 문구로 정리했습니다.
> 
> - 전체 종목과 주요 섹터 표시는 섹터 내부 구분자만 `/` 대신 `·`를 사용하도록 정리했습니다.
> - `047040 / 건설 · 인프라`, `친환경 · 탄소` 형식으로 표시되며, 티커와 섹터 사이 `/`는 유지됩니다.
> - 전체 종목 정렬 탭에 `등락률` 탭을 추가했고, 선택 시 백엔드에는 `sort=CHANGE`로 요청되도록 연결했습니다.
> - 전체 종목 헤더의 `수익률` 문구도 `등락률`로 맞췄습니다.
> - 모바일 전체 종목 리스트에서 `거래대금`, `거래량` 탭 선택 시 해당 값이 보이도록 수정했습니다.
> - 데스크톱 전체 종목 헤더 정렬 간격도 행 구조에 맞게 조정했습니다.
> 
> ## ✅ 코드리뷰 반영
> - presigned URL 요청 body가 백엔드 계약과 일치하도록 raw JSON body로 전송되게 수정했습니다.
> - 프로필 이미지 preview object URL revoke 타이밍을 보완했습니다.
> - mock presigned 응답의 `uploadUrl`과 `fileUrl`을 분리했습니다.
> - 섹터 구분자 포맷 함수 중복을 공통 유틸로 정리했습니다.
> - 포트폴리오 hero 라벨과 실제 값 의미 불일치를 수정했습니다.
> - 뉴스 페이지 페이지네이션이 리렌더링으로 1페이지로 튀는 문제를 수정했습니다.
> 
> ## 🔎 검증
> - `pnpm exec eslint ...`
> - `pnpm exec tsc --noEmit --pretty false`
> - `pnpm build`
> 
> ## 📎 Issue 번호
> S14P21D208-133

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-29)
  > ## 코드 리뷰 리포트 — MR !411
  > 
  > **검토 파일 수:** 18 (pnpm-lock.yaml, package.json 제외한 실질 코드 파일)
  > **총 이슈:** 7
  > 
  > ### 심각도별 분류
  > - **CRITICAL:** 0
  > - **HIGH:** 1
  > - **MEDIUM:** 4
  > - **LOW:** 2
  > 
  > ---
  > 
  > ### Stage 1: 스펙 준수 검증
  > 
  > MR 설명에 명시된 요구사항을 모두 점검했습니다.
  > 
  > | 요구사항 | 충족 여부 |
  > |---|---|
  > | Presigned URL 기반 프로필 이미지 업로드 | O |
  > | Mock 환경 대응 (mock-upload, mockStorageStore) | O |
  > | 프로필 수정 모달 미리보기 및 파일 검증 | O |
  > | 잘못된 파일 선택 시 닉네임 저장 가능 | O |
  > | 기본 프로필 이미지 정규화 (인증/세션/헤더/모달 공통) | O |
  > | 평균 월간 수익률 계산 수정 | O |
  > | 0/null 막대 미표시 | O |
  > | 섹터 구분자 `/` → `·` 변경 | O |
  > 
  > 스펙 준수 상태: **PASS**
  > 
  > ---
  > 
  > ### Stage 2: 코드 품질 검토
  > 
  > #### [HIGH] 프로필 이미지 업로드 시 presigned URL을 자동 camelCase 변환하는 문제
  > **파일:**  (새 코드 라인 ~createProfileImagePresignedUrl 함수)
  > **이슈:** 는 의 자동 snake_case→camelCase 변환을 적용합니다. presigned URL 요청 body의 , , 가 에 의해 , , 로 변환되어 백엔드에 전달됩니다. 백엔드가 snake_case를 기대한다면 문제없지만, 만약 camelCase를 기대하는 경우 업로드 실패로 이어집니다. 또한 응답에서 , 은 이미 camelCase로 변환된 값입니다. 실제 백엔드 API 계약을 확인해 주세요.
  > **수정 권장:** 백엔드 API 스펙을 확인하고, 필요 시  대신 raw 를 사용하거나 변환을 비활성화하는 옵션을 검토해 주세요.
  > 
  > ---
  > 
  > #### [MEDIUM] mock storage가 in-memory Map으로 서버 재시작 시 데이터 유실
  > **파일:** 
  > **이슈:** 는 서버 메모리에 저장되므로, Next.js dev 서버가 HMR이나 재시작될 때 업로드된 mock 이미지가 모두 사라집니다. mock 전용이므로 치명적이지는 않지만, 디버깅 시 혼란을 줄 수 있습니다.
  > **수정 권장:** mock 전용이라는 점을 주석으로 명시하고, 필요하다면 파일 시스템 기반 임시 저장소를 고려해 주세요. 현재 수준으로도 수용 가능합니다.
  > 
  > ---
  > 
  > #### [MEDIUM] URL.createObjectURL 누수 방지 로직의 edge case
  > **파일:** { is a shell keyword (새 useEffect, selectedProfileImagePreviewUrl)
  > **이슈:** 을 cleanup에서 호출하는 것은 좋은 패턴입니다. 다만, 사용자가 파일을 여러 번 바꿀 경우 이전 preview URL은 컴포넌트가 re-render될 때 revoke되지만,  호출과 effect cleanup 사이에 미세한 타이밍 차이가 있을 수 있습니다. 현재 구현은 대부분의 경우 안전하지만, 더 안전한 방법은 새 URL 생성 전에 이전 URL을 즉시 revoke하는 것입니다.
  > **수정 권장:**
  > 
  > 
  > ---
  > 
  > #### [MEDIUM] presigned-url route에서 uploadUrl과 fileUrl이 동일한 값
  > **파일:** 
  > **이슈:** mock 환경에서 과 이 완전히 동일한 URL로 생성됩니다. 실제 MinIO/S3 환경에서는 upload URL(PUT용 서명 URL)과 file URL(공개 접근 URL)이 다릅니다. mock이 실제 동작과 다르면 프로덕션 전환 시 예기치 않은 버그가 발생할 수 있습니다.
  > **수정 권장:** mock 환경의 의도적 단순화라면 주석으로 명시해 주세요. 예: 
  > 
  > ---
  > 
  > #### [MEDIUM] HoldingsSortDropdown 컴포넌트의 파일 위치
  > **파일:**  (약 85줄)
  > **이슈:** 은 독립적인 UI 컴포넌트(Radix Popover + Motion 애니메이션)로,  내부에 인라인으로 정의되어 있습니다. 이 파일이 이미 500줄 이상인 점을 고려하면 별도 파일로 분리하는 것이 유지보수에 유리합니다.
  > **수정 권장:** 로 분리를 검토해 주세요.
  > 
  > ---
  > 
  > #### [LOW] BOM 문자 제거
  > **파일:** 
  > **이슈:** 기존 파일에 UTF-8 BOM 문자()가 있었는데, 이번 변경에서 제거되었습니다. 좋은 정리입니다.
  > **수정 권장:** 없음 (칭찬).
  > 
  > ---
  > 
  > #### [LOW] 섹터 구분자 변환 함수 중복
  > **파일:**  및 
  > **이슈:** 와  함수가 동일한 정규식 을 사용합니다.
  > **수정 권장:** 공통 유틸 함수로 통합하거나, 한쪽에서 다른 쪽을 import하도록 정리해 주세요.
  > 
  > ---
  > 
  > ### 긍정적 포인트
  > 
  > 1. ** 유틸 생성:** 기본 프로필 이미지 정규화를 한 곳에서 관리하는  패턴이 깔끔합니다. 레거시 경로도 Set으로 관리하여 확장이 용이합니다.
  > 2. **파일 검증 이중 안전장치:** 클라이언트(모달)와 서버(presigned-url route) 양쪽에서 파일 타입/용량 검증을 수행합니다.
  > 3. **월간 수익률 0/null 처리:**  분기를 통해 의미 없는 막대가 표시되지 않도록 적절히 처리했습니다.
  > 4. ** 시그니처 변경:** 파일과 닉네임을 하나의 payload 객체로 묶어 확장성을 확보했습니다.
  > 
  > ---
  > 
  > ### 최종 권고
  > 
  > **COMMENT**
  > 
  > CRITICAL/HIGH 이슈 1건(자동 케이스 변환 관련)은 실제 백엔드 API 계약에 따라 문제가 없을 수 있으므로 확인 후 판단이 필요합니다. 나머지는 코드 품질 개선 제안입니다. 전반적으로 잘 구조화된 변경이며, 위 사항들을 확인/반영 후 병합을 권장합니다.

---

### !414 · [FE] Feat: S14P21D208-231 report detail debate process full improvement

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/fe/report-edit` → `dev-frontend`
- 생성: 2026-03-29 · 머지: 2026-03-29
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/414](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/414)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 리포트 디테일 페이지의 토론 프로세스를 Figma 기반으로 전면 개편 — TTS 효율화, 모바일 반응형, 다크모드 대응, SSR prefetch 적용
> 
> ## MR 세부 내용
> - 토론 API fetch/hook을 순수 fetch + select 패턴으로 리팩토링 (unwrapApiResponse 공통 유틸 적용)
> - 위원 발언 TTS를 의견 첫 문장만 재생하도록 변경 (~54->~9개)
> - 근거/리스크/실행을 의견 제출서 요약 카드(Figma 기반)로 텍스트 표시
> - 회의록 보기 버튼 추가 (TTS 없이 전체 내용 즉시 확인)
> - TTS 데이터와 UI 표시 데이터 분리 (영어 신호->한국어 변환, summary 내 BUY/HOLD 치환)
> - 거래 내역 trade_cycles 직접 사용으로 전환 (pairTrades 우회)
> - SSR prefetch 4개 API 병렬 적용 (basicInfo, debate, performance, trades)
> - useStockOverviewQuery -> useStockBasicInfoQuery 전환 (API 호출 2->1개)
> - 모바일 반응형 UI 전면 개선 (Hero, 의장 분석, 토론 섹션, 컨트롤 버튼 아이콘 대체)
> - 의장 분석 다크모드 대응 (useTheme 인라인 스타일)
> - 토론 섹션 다크모드 색상 고정 (테마 변수->고정값)
> - 일시정지 시 위원 talking GIF 멈춤
> - 포트폴리오 보기 버튼 /portfolio/${stockId} 링크 연결
> - 코드 리뷰 이슈 반영 (CSS 변수 토큰, regex 수정, date fallback)
> - report 페이지 코드 스타일 portfolio 패턴 통일 (staleTime, 데드코드 제거, 유틸 추출)
> 
> ## Issue 번호
> S14P21D208-231

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-29)
  > ## 코드 리뷰 - MR !414
  > 
  > **리뷰 파일:** 17개
  > **총 이슈:** 5개
  > 
  > ### 심각도별 요약
  > - CRITICAL: 1 (반드시 수정)
  > - HIGH: 1 (수정 권장)
  > - MEDIUM: 2 (검토 권장)
  > - LOW: 1 (선택 사항)
  > 
  > ---
  > 
  > ### 이슈 목록
  > 
  > #### [CRITICAL] serverFetch.ts — stockId URL 인젝션 가능성
  > **파일:** `src/app/report/api/serverFetch.ts:41,50,58,71`
  > 
  > **문제:** `serverGetDebateReports`, `serverGetInvestmentPerformance`, `serverGetTradeHistory`, `serverGetStockBasicInfo` 함수에서 `stockId`를 `encodeURIComponent` 없이 URL 경로에 직접 삽입하고 있습니다. 클라이언트 측 `getTradeHistory.ts`에서는 `encodeURIComponent(stockId.trim())`을 사용하고 있지만, 서버 측 prefetch에서는 누락되어 있습니다. 악의적인 stockId 값 (예: `../admin`)이 경로 조작(path traversal)을 유발할 수 있습니다.
  > 
  > **수정 방안:**
  > ```typescript
  > // 모든 serverGet* 함수에서 stockId를 인코딩
  > `/api/report/${encodeURIComponent(stockId)}/performance/trades`
  > ```
  > 
  > ---
  > 
  > #### [HIGH] serverFetch.ts — 하드코딩된 fallback URL
  > **파일:** `src/app/report/api/serverFetch.ts:7`
  > 
  > **문제:** `getBackendBaseUrl()`에서 `NEXT_PUBLIC_API_BASE_URL`이 없을 때 `"https://j14d208.p.ssafy.io"`로 fallback합니다. 이는 개발 환경 URL이 프로덕션 코드에 하드코딩된 것으로, 환경이 바뀌면 의도치 않은 백엔드로 요청이 전달될 수 있습니다.
  > 
  > **수정 방안:** fallback URL을 제거하고, 환경 변수가 설정되지 않은 경우 명시적으로 에러를 throw하거나, 별도의 서버 전용 환경 변수(`API_BASE_URL` 등)를 사용하세요.
  > ```typescript
  > const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  > if (!configured) throw new Error('NEXT_PUBLIC_API_BASE_URL is not configured');
  > ```
  > 
  > ---
  > 
  > #### [MEDIUM] useTradeHistory.ts — `as` 캐스팅으로 인한 타입 안전성 우회
  > **파일:** `src/app/report/hooks/useTradeHistory.ts:10-11`
  > 
  > **문제:** `transformTradesResponse`에서 `raw as Record<string, unknown>` 및 `tradeCycles as TradeHistoryItem[]`으로 이중 캐스팅하고 있습니다. API 응답 구조가 변경되면 런타임에 잘못된 데이터가 타입 검증 없이 전달됩니다. 또한 `getTradeHistory`가 `unwrapApiResponse` 후 `unknown`을 반환하면서 `select`에서 다시 변환하는 이중 처리 구조가 됩니다.
  > 
  > **수정 방안:** 최소한 `tradeCycles` 배열 요소에 대한 런타임 검증(예: 첫 번째 요소의 `buyDate` 필드 존재 여부 확인)을 추가하거나, Zod 같은 스키마 검증 라이브러리를 사용하세요.
  > 
  > ---
  > 
  > #### [MEDIUM] getTradeHistory.ts — limit=0일 때 query parameter 누락
  > **파일:** `src/app/report/api/getTradeHistory.ts:7`
  > 
  > **문제:** `if (limit)` 조건으로 limit을 설정하는데, `limit=0`인 경우 falsy로 평가되어 query parameter에 포함되지 않습니다. offset도 동일한 문제가 있습니다 (`offset=0`일 때 누락). 현재 기본값이 `offset=0, limit=100`이므로 실사용에서는 문제가 적지만, 명시적으로 0을 전달하는 경우 의도와 다르게 동작합니다.
  > 
  > **수정 방안:**
  > ```typescript
  > params.set("offset", String(offset));
  > params.set("limit", String(limit));
  > ```
  > 또는 조건을 `if (offset !== undefined)`로 변경하세요.
  > 
  > ---
  > 
  > #### [LOW] TradeHistoryItem.status 타입 완화
  > **파일:** `src/app/report/types/report.ts:84`
  > 
  > **문제:** `status: "HOLDING" | "CLOSED"`에서 `status: string`으로 변경했습니다. 이로 인해 status 값에 대한 컴파일 타임 보호가 사라집니다. `buildHitCountCaption`에서는 `sellDate` 기반으로 필터링하도록 변경했지만, 다른 곳에서 status를 사용하는 코드가 있을 경우 예기치 않은 값이 들어올 수 있습니다.
  > 
  > **수정 방안:** 백엔드에서 새로운 status 값이 추가되었다면 union 타입을 확장하세요.
  > ```typescript
  > status: "HOLDING" | "CLOSED" | "PENDING" | string; // 또는 구체적인 값 추가
  > ```
  > 
  > ---
  > 
  > ### 긍정적인 부분
  > - SSR prefetch를 `Promise.allSettled`로 병렬 처리하여, 하나의 API 실패가 전체 페이지를 블로킹하지 않는 좋은 패턴입니다.
  > - `useStockOverviewQuery` -> `useStockBasicInfoQuery` 전환으로 API 호출 수를 줄인 점이 좋습니다.
  > - 데드 코드 제거 (hidden div의 `signalLabel`/`createdAt`)가 깔끔합니다.
  > - 유틸 함수(`formatters.ts`)를 별도 파일로 추출한 것은 재사용성과 테스트 용이성 측면에서 좋은 개선입니다.
  > - 모바일 반응형 대응 (아이콘 버튼, 반응형 크기)이 체계적으로 적용되어 있습니다.
  > - 다크모드에서 `--color-text-base` 대신 `--color-white`로 고정하여 어두운 배경 위 텍스트 가독성 문제를 해결한 점이 적절합니다.
  > - `shouldDehydrateQuery`로 성공한 쿼리만 dehydrate하는 것이 올바른 접근입니다.
  > 
  > ---
  > 
  > ### 결론: **REQUEST CHANGES**
  > 
  > CRITICAL 이슈(`serverFetch.ts`의 stockId 인코딩 누락)는 반드시 수정이 필요합니다. 서버 측에서 사용자 입력을 URL에 직접 삽입하는 것은 보안상 위험합니다. HIGH 이슈(하드코딩된 URL)도 가능하면 함께 수정해 주세요.
  > 
  > 전체적으로 리팩토링 방향과 SSR prefetch 적용이 잘 이루어져 있으며, 위 이슈들만 해결되면 머지 가능합니다.

---

### !421 · [FE] Feat: S14P21D208-232 TTS fallback and debate control stabilization

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/fe/tts-improvement` → `dev-frontend`
- 생성: 2026-03-30 · 머지: 2026-03-30
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/421](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/421)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> TTS API 실패 시에도 토론이 텍스트 기반 타이밍으로 정상 진행되도록 개선하고, 라운드 점프 컨트롤 안정성 수정
> 
> ## MR 세부 내용
> - TTS 실패 시 텍스트 길이 기반 대기 시간으로 fallback (80ms/글자, 최소 1.5초)
> - TTS 준비 실패 시 블로킹 없이 토론 진행 허용
> - preload 개별 항목 실패 시 다음 항목으로 계속 진행
> - 실제 존재하는 라운드만 R1/R2/R3 버튼 조건부 표시
> - 같은 라운드 재점프 시 먹통 현상 수정 (phase 리셋 후 재진입)
> 
> ## Issue 번호
> S14P21D208-232

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-30)
  > ## 코드 리뷰 - MR !421: TTS fallback 및 토론 컨트롤 안정화
  > 
  > **리뷰 파일:** 1개 (DebateSection.tsx)
  > **발견 이슈:** 5개
  > 
  > ### 심각도별 요약
  > - CRITICAL: 0
  > - HIGH: 1 (수정 권장)
  > - MEDIUM: 3 (검토 권장)
  > - LOW: 1 (선택사항)
  > 
  > ---
  > 
  > ### 이슈 목록
  > 
  > #### [HIGH] `requestAnimationFrame` 콜백 미정리 - 컴포넌트 언마운트 시 메모리 누수 및 상태 업데이트 위험
  > **파일:** `DebateSection.tsx:755-757`
  > 
  > **문제:** `jumpToDebateIndex`에서 `requestAnimationFrame`을 사용하여 `setPhase("debate")`를 호출하지만, 반환된 frame ID를 저장하지 않으며 `cancelAnimationFrame`으로 정리하지도 않습니다. 사용자가 빠르게 라운드 버튼을 연속 클릭하거나, rAF 콜백 실행 전에 컴포넌트가 언마운트되면:
  > 1. 언마운트된 컴포넌트에 `setPhase`가 호출되어 React 경고 발생 가능
  > 2. 연속 클릭 시 이전 rAF 콜백이 취소되지 않아 의도치 않은 phase 전환 발생 가능
  > 
  > **수정 제안:**
  > ```tsx
  > // ref 추가
  > const jumpRafRef = useRef<number>(0);
  > 
  > const jumpToDebateIndex = (startIndex: number) => {
  >   cancelAnimationFrame(jumpRafRef.current);
  >   interruptPlayback();
  >   setPhase("ready");
  >   setDebateStartIndex(startIndex);
  >   setActiveSpeechIndex(Math.max(startIndex - 1, -1));
  >   jumpRafRef.current = requestAnimationFrame(() => {
  >     setPhase("debate");
  >   });
  > };
  > 
  > // cleanup useEffect 추가
  > useEffect(() => {
  >   return () => cancelAnimationFrame(jumpRafRef.current);
  > }, []);
  > ```
  > 
  > ---
  > 
  > #### [MEDIUM] `phase="ready"` 순간 노출에 의한 UI 깜빡임 가능성
  > **파일:** `DebateSection.tsx:751`
  > 
  > **문제:** `setPhase("ready")`가 동기적으로 호출된 후 `requestAnimationFrame`으로 `setPhase("debate")`가 호출되므로, React가 중간에 "ready" 상태로 렌더링할 수 있습니다. "ready" phase에서 표시되는 UI(예: 시작 버튼, 초기 화면 등)가 한 프레임 동안 깜빡일 수 있습니다.
  > 
  > **수정 제안:** `flushSync`를 사용하거나, 점프 중임을 나타내는 별도 플래그(`isJumping` ref)를 두어 "ready" phase 렌더링 시 해당 UI를 숨기는 방법을 고려해 주세요. 또는 `queueMicrotask`를 사용하면 rAF보다 더 빠르게 실행되어 깜빡임을 최소화할 수 있습니다:
  > ```tsx
  > setPhase("ready");
  > setDebateStartIndex(startIndex);
  > setActiveSpeechIndex(Math.max(startIndex - 1, -1));
  > queueMicrotask(() => setPhase("debate"));
  > ```
  > 단, `queueMicrotask`는 React 배칭에 의해 같은 렌더에 병합될 수 있으므로 실제 테스트로 useEffect 재트리거 여부를 확인해야 합니다.
  > 
  > ---
  > 
  > #### [MEDIUM] fallback 타이밍의 `signal.aborted` 미확인
  > **파일:** `DebateSection.tsx:992-995`
  > 
  > **문제:** TTS catch 블록에서 fallback으로 넘어갈 때, `signal.aborted` 여부를 확인하지 않습니다. TTS 실패가 abort에 의한 것이 아닌 경우에만 fallback으로 진행해야 하는데, 현재 코드는 abort가 아닌 다른 DOMException(예: `NotAllowedError`, `NotSupportedError`)일 때도 fallback을 실행합니다. 이 자체는 의도된 동작일 수 있지만, abort 후 불필요한 타이머가 실행될 수 있는 경로가 존재합니다.
  > 
  > **수정 제안:** fallback 진입 전에 `signal.aborted` 체크를 추가하면 더 안전합니다:
  > ```tsx
  > if (signal.aborted) return false;
  > const fallbackMs = Math.max(1500, trimmedText.length * FALLBACK_MS_PER_CHAR);
  > await waitForMs(fallbackMs, signal);
  > ```
  > `waitForMs` 내부에서도 signal을 처리하고 있으므로 치명적이지는 않지만, 불필요한 타이머 생성을 방지할 수 있습니다.
  > 
  > ---
  > 
  > #### [MEDIUM] preload 실패 시 `isTtsReady`가 `true`로 설정됨
  > **파일:** `DebateSection.tsx:499-501`
  > 
  > **문제:** preload에서 일부 항목이 실패해도 (`allSucceeded = false`) 루프 완료 후 `setIsTtsReady(true)`를 호출합니다. `isTtsReady`라는 이름은 "모든 TTS가 준비되었다"는 의미인데, 실제로는 일부만 준비된 상태에서도 `true`가 됩니다. 이로 인해 `handleStart`에서 `isTtsReady`가 이미 `true`이므로 preload를 다시 시도하지 않고 바로 진행합니다.
  > 
  > **수정 제안:** 변수명을 `isTtsPreloadComplete`처럼 의미를 명확히 하거나, 부분 실패 시에는 별도 상태(예: `isTtsPartiallyReady`)를 두어 UI에서 사용자에게 음성이 일부 누락될 수 있음을 알리는 것을 고려해 주세요.
  > 
  > ---
  > 
  > #### [LOW] `handleReplay`의 가드 제거
  > **파일:** `DebateSection.tsx:743-745`
  > 
  > **문제:** 기존에 `allTtsItems.length` 및 `isTtsReady` 체크가 있었으나 모두 제거되었습니다. TTS fallback이 있으므로 기능적으로 문제는 없지만, `allTtsItems`가 비어있을 때(데이터 자체가 없을 때)도 `handleStart`가 호출되어 비디오 재생부터 시작됩니다. 데이터가 없는 경우의 방어 로직이 필요한지 확인해 주세요.
  > 
  > **수정 제안:**
  > ```tsx
  > const handleReplay = async () => {
  >   if (!allTtsItems.length) return; // 데이터 없으면 조기 반환
  >   await handleStart();
  > };
  > ```
  > 
  > ---
  > 
  > ### 긍정적 평가
  > 
  > - **TTS fallback 전략이 잘 설계되었습니다.** `playTtsAudio` 내부에서 try-catch 후 텍스트 길이 기반 타이밍으로 graceful하게 전환하는 구조가 깔끔합니다.
  > - **preload 개별 실패 처리가 적절합니다.** 하나의 항목 실패가 전체를 차단하지 않도록 개선한 점이 좋습니다.
  > - **라운드 버튼 조건부 렌더링**은 데이터 기반으로 올바르게 구현되었습니다. `roundStartIndexes.has(N)` 체크가 정확합니다.
  > - **LSP 진단 결과:** 타입 에러 없음 (clean)
  > 
  > ---
  > 
  > ### 최종 판정: **COMMENT**
  > 
  > CRITICAL 이슈는 없으나, `requestAnimationFrame` 미정리(HIGH)는 프로덕션에서 edge case 버그를 유발할 수 있으므로 수정을 권장합니다. 나머지 MEDIUM 이슈들은 현재 동작에 치명적이지 않지만 코드 견고성을 높이기 위해 검토해 주시면 좋겠습니다.

---

### !426 · [FE] Feat: S14P21D208-233 debate mute feature with persistent settings

- 작성자: **장호정** · 상태: `merged`
- 브랜치: `feature/fe/debate-enhancement` → `dev-frontend`
- 생성: 2026-03-30 · 머지: 2026-03-30
- 원본: [https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/426](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/426)

<details><summary>MR 설명</summary>

> ## MR 한 줄 요약
> 위원회 심층 토론에 음소거 버튼을 추가하고 zustand persist로 설정을 영속화하여 페이지 이동 시에도 유지
> 
> ## MR 세부 내용
> - 음소거 토글 버튼 추가 (모바일: 아이콘, 데스크톱: 텍스트)
> - TTS 오디오, BGM, 인트로 영상 모두 음소거 대상
> - zustand persist로 debate-settings localStorage 영속화
> - playTtsAudio/BGM 재생 시 매번 store에서 isMuted 동기화
> - 라운드 점프, 최종판결 이동 시에도 음소거 상태 유지
> 
> ## Issue 번호
> S14P21D208-233

</details>

**리뷰 토론**

- 💬 **장호정** (2026-03-30)
  > ## Code Review - MR !426: Debate Mute Feature
  > 
  > **리뷰 파일:** 2개
  > **전체 이슈:** 4개
  > 
  > ### 심각도별 분류
  > - CRITICAL: 0
  > - HIGH: 0
  > - MEDIUM: 2
  > - LOW: 2
  > 
  > ---
  > 
  > ### Stage 1: 스펙 준수 확인
  > 
  > 스펙 요구사항 (음소거 토글 + persist + 모든 오디오 소스 커버)이 전반적으로 잘 구현되어 있습니다.
  > 
  > - Zustand store with persist: 정확하게 구현됨
  > - TTS, BGM, 인트로 영상 모두 음소거 대상으로 포함됨
  > - 라운드 점프, 최종판결 이동 시 음소거 상태 유지됨
  > - 모바일/데스크톱 UI 분기 처리 완료
  > 
  > ### Stage 2: 코드 품질
  > 
  > **LSP 진단:** 두 파일 모두 타입 에러 없음 (통과)
  > 
  > ---
  > 
  > ### 이슈 목록
  > 
  > **[MEDIUM] Audio 초기화 시 isMuted 미적용**
  > 
  > 파일: `DebateSection.tsx:428-432`
  > 
  > `new Audio()` 생성 시점에 `isMuted` 상태가 적용되지 않습니다. 이후 `useEffect([isMuted])`가 동기화하지만, 컴포넌트 마운트 시 `useEffect` 실행 순서에 따라 짧은 시간 동안 소리가 날 수 있습니다 (persist에서 `isMuted: true`로 복원된 경우).
  > 
  > ```ts
  > // 현재 코드
  > audioRef.current = new Audio();
  > bgmAudioRef.current = new Audio(debateBgmSrc);
  > 
  > // 개선 제안: 생성 직후 muted 설정
  > audioRef.current = new Audio();
  > audioRef.current.muted = useDebateSettingsStore.getState().isMuted;
  > bgmAudioRef.current = new Audio(debateBgmSrc);
  > bgmAudioRef.current.muted = useDebateSettingsStore.getState().isMuted;
  > ```
  > 
  > ---
  > 
  > **[MEDIUM] useEffect와 getState() 혼용으로 인한 일관성 부족**
  > 
  > 파일: `DebateSection.tsx:475, 988`
  > 
  > `isMuted`를 React state로 구독하면서(`useDebateSettingsStore((s) => s.isMuted)`), 동시에 `useDebateSettingsStore.getState().isMuted`로도 읽고 있습니다. 두 방식이 혼재하면 유지보수 시 혼란을 줄 수 있습니다.
  > 
  > 현재 `getState()` 사용은 비동기 콜백 내에서 최신 값을 읽기 위한 의도적인 패턴으로 보이며 기능적으로 문제는 없지만, 이유를 명확히 하기 위해 주석을 추가하는 것을 권장합니다.
  > 
  > ```ts
  > // 예시: 비동기 콜백에서 최신 mute 상태를 읽기 위해 getState() 사용
  > audioRef.current.muted = useDebateSettingsStore.getState().isMuted;
  > ```
  > 
  > ---
  > 
  > **[LOW] 음소거 버튼에 aria-label 누락**
  > 
  > 파일: `DebateSection.tsx:1252-1268`
  > 
  > 모바일에서는 아이콘만 표시되므로 스크린 리더 사용자를 위해 `aria-label`이 필요합니다.
  > 
  > ```tsx
  > <button
  >   type="button"
  >   onClick={toggleMute}
  >   aria-label={isMuted ? "음소거 해제" : "음소거"}
  >   className="..."
  > >
  > ```
  > 
  > ---
  > 
  > **[LOW] `setMuted` 액션 미사용**
  > 
  > 파일: `debateSettingsStore.ts:7`
  > 
  > `setMuted` 액션이 정의되어 있지만 현재 사용되는 곳이 없습니다. 향후 확장을 위한 것이라면 문제 없으나, 불필요하다면 YAGNI 원칙에 따라 제거를 고려해 주세요.
  > 
  > ---
  > 
  > ### 긍정적인 점
  > 
  > - Zustand persist 패턴이 깔끔하고 정확합니다
  > - 선택자를 개별 속성 단위로 분리하여 불필요한 리렌더링을 방지한 점이 좋습니다 (`(s) => s.isMuted`, `(s) => s.toggleMute`)
  > - `video.muted = isMuted` (JSX prop)과 `handleStart` 내 동기화가 모두 처리되어 있습니다
  > - BGM play 재개 시 `getState()` 활용도 적절합니다
  > 
  > ---
  > 
  > ### 최종 판정: **APPROVE (조건부)**
  > 
  > CRITICAL/HIGH 이슈가 없으므로 승인합니다. MEDIUM 이슈 2건(Audio 초기화 시 muted 적용, 주석 보완)은 가능하면 반영해 주시면 좋겠습니다.

---

## 전체 MR 목록

| MR | 제목 | 작성자 | 브랜치 | 상태 | 생성일 | 리뷰 |
|---:|------|--------|--------|:----:|--------|:---:|
| [!1](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/1) | Test | 정준용 | `test`→`master` | merged | 2026-02-26 |  |
| [!2](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/2) | [INFRA] S14P21D208-93 프론트 페이지기반 보일러플레이트 정렬 | 최규직 | `feature/fe/frontend-bootstrap`→`dev-frontend` | merged | 2026-03-04 |  |
| [!3](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/3) | [INFRA] S14P21D208-20,21,92 로컬 인프라 + 백엔드 보일러플레이트 정렬 | 최규직 | `feature/be/infra-backend-bootstrap`→`dev-backend` | merged | 2026-03-04 |  |
| [!4](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/4) | [INFRA] dev-backend 공통 인프라/보일러플레이트 동기화 (93,19,22) | 최규직 | `feature/be/infra-sync-dev-backend`→`dev-backend` | merged | 2026-03-04 |  |
| [!5](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/5) | [INFRA] dev-frontend 공통 인프라/보일러플레이트 동기화 (20,21,92,19,22) | 최규직 | `feature/fe/infra-sync-dev-frontend`→`master` | merged | 2026-03-04 |  |
| [!6](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/6) | [INFRA] dev-ai 공통 인프라/보일러플레이트 동기화 (20,21,92,93,19,22) | 최규직 | `feature/ai/infra-sync-dev-ai`→`dev-ai` | merged | 2026-03-04 |  |
| [!7](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/7) | [INFRA] S14P21D208-22 master 임시 README 운영 가이드 반영 | 최규직 | `feature/readme-temp-master-22`→`master` | merged | 2026-03-05 |  |
| [!8](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/8) | [INFRA] Refactor: S14P21D208-92 BE 컨벤션 기준 구조 정렬 | 최규직 | `feature/be/api-domain-grouping`→`dev-backend` | merged | 2026-03-05 |  |
| [!9](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/9) | [AI] Add: S14P21D208-92 AI 보일러플레이트 구조 생성 | 최규직 | `feature/ai/boilerplate-structure`→`dev-ai` | merged | 2026-03-05 |  |
| [!10](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/10) | [BE] Add: S14P21D208-85 DB 초기화 스크립트 및 전체 Entity 정비 | 이혜민 | `feature/be/db-init-schema`→`dev-backend` | merged | 2026-03-06 |  |
| [!11](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/11) | [BE] Fix: 로컬 개발 환경 인프라 설정 수정 | 강지석 | `fix/be/infra-local-dev`→`dev-backend` | merged | 2026-03-06 |  |
| [!12](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/12) | [BE] Feat: S14P21D208-108 Search API 5종 구현 | 최규직 | `feature/be/search-api-108`→`dev-backend` | merged | 2026-03-06 |  |
| [!13](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/13) | [BE] Feat: S14P21D208-94 뉴스 API 4종 구현 및 글로벌 예외 처리 정비 | 이혜민 | `feature/be/news-api`→`dev-backend` | merged | 2026-03-06 |  |
| [!14](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/14) | 공통 헤더 구현중 | 정준용 | `feature/fe/header`→`dev-frontend` | merged | 2026-03-06 |  |
| [!15](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/15) | [BE] Fix: S14P21D208-94 관심종목 뉴스 서비스 레이어 user 도메인 분리 | 이혜민 | `fix/be/watchlist-news-layer`→`dev-backend` | closed | 2026-03-06 |  |
| [!16](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/16) | [BE] Fix: S14P21D208-94 관심종목 서비스 레이어 user 도메인 분리 | 이혜민 | `fix/be/watchlist-news-layer`→`dev-backend` | merged | 2026-03-06 |  |
| [!17](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/17) | [BE] Feat: S14P21D208-28 인증 인프라 구축 | 강지석 | `feature/be/auth-infra`→`dev-backend` | merged | 2026-03-06 |  |
| [!18](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/18) | [BE] Feat: S14P21D208-94 트렌딩 키워드 Redis Sorted Set 기반으로 전환 | 이혜민 | `fix/be/watchlist-news-layer`→`dev-backend` | merged | 2026-03-06 |  |
| [!19](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/19) | [AI] 주식 데이터 수집 파이프라인 구현 | 장호정 | `feature/ai/stock-data-pipeline`→`dev-ai` | merged | 2026-03-09 |  |
| [!20](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/20) | [AI] Build: S14P21D208-116 데이터 파이프라인 개발 환경 자동화 구성 | 장호정 | `feature/ai/stock-data-pipeline`→`dev-ai` | merged | 2026-03-09 |  |
| [!21](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/21) | [AI] Feat: S14P21D208-74,75 LightGBM 피처 엔지니어링 및 학습 파이프라인 구현 | 장호정 | `feature/ai/stock-ml-pipeline`→`dev-ai` | merged | 2026-03-09 |  |
| [!22](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/22) | [INFRA] Build: S14P21D208-29,30,32 EC2 인프라 구조 분리 및 자동 배포 기반 정리 | 최규직 | `feature/infra/ec2-cicd-setup`→`dev-backend` | merged | 2026-03-09 |  |
| [!23](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/23) | [INFRA] Build: S14P21D208-29,30,32 dev-frontend 공통 인프라 구조 및 배포 설정 동기화 | 최규직 | `feature/infra/sync-dev-frontend`→`dev-frontend` | merged | 2026-03-09 |  |
| [!24](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/24) | [INFRA] Build: S14P21D208-29,30,32 dev-ai 공통 인프라 구조 및 배포 설정 동기화 | 최규직 | `feature/infra/sync-dev-ai`→`dev-ai` | merged | 2026-03-09 |  |
| [!25](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/25) | [AI] Add: S14P21D208-111 FastAPI 추론 서버 보일러플레이트 구성 | 이혜민 | `feature/ai/ai-server-boilerplate`→`dev-ai` | merged | 2026-03-09 |  |
| [!26](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/26) | [FE] Feat: S14P21D208-59 메인 페이지 및 헤더 토큰/구조 정리 | 정준용 | `feature/fe/main-ui`→`dev-frontend` | merged | 2026-03-09 | 💬1 |
| [!27](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/27) | [INFRA] Build: S14P21D208-32 CI checkout 기반 EC2 배포 경로 및 base 수동 실행 보정 | 최규직 | `feature/infra/ec2-cicd-setup`→`dev-backend` | merged | 2026-03-09 |  |
| [!28](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/28) | [INFRA] Build: S14P21D208-32 dev-frontend EC2 배포 경로 및 base 수동 실행 보정 | 최규직 | `feature/infra/sync-dev-frontend-base-fix`→`dev-frontend` | merged | 2026-03-09 |  |
| [!29](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/29) | [INFRA] Build: S14P21D208-32 dev-ai EC2 배포 경로 및 base 수동 실행 보정 | 최규직 | `feature/infra/sync-dev-ai-base-fix`→`dev-ai` | merged | 2026-03-09 |  |
| [!30](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/30) | [BE] Feat: S14P21D208-97 인증 및 세션 관리 구현 | 강지석 | `feature/be/auth-session-management`→`dev-backend` | merged | 2026-03-09 |  |
| [!31](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/31) | [INFRA] Build: S14P21D208-32 gateway nginx 도메인 라우팅 및 develop 포트 분리 | 최규직 | `feature/infra/ec2-cicd-setup`→`dev-backend` | merged | 2026-03-09 |  |
| [!32](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/32) | [INFRA] Build: S14P21D208-32 gateway nginx 도메인 라우팅 및 develop 포트 분리 | 최규직 | `feature/infra/sync-dev-frontend-base-fix`→`dev-frontend` | merged | 2026-03-09 |  |
| [!33](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/33) | [INFRA] Build: S14P21D208-32 gateway nginx 도메인 라우팅 및 develop 포트 분리 | 최규직 | `feature/infra/sync-dev-ai-base-fix`→`dev-ai` | merged | 2026-03-09 |  |
| [!34](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/34) | [INFRA] Build: S14P21D208-32 gateway nginx 단일 도메인 라우팅 구조 정리 | 최규직 | `feature/infra/ec2-cicd-setup`→`dev-backend` | merged | 2026-03-09 |  |
| [!35](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/35) | [INFRA] Build: S14P21D208-32 gateway nginx 단일 도메인 라우팅 구조 정리 | 최규직 | `feature/infra/sync-dev-frontend-base-fix`→`dev-frontend` | merged | 2026-03-09 |  |
| [!36](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/36) | [INFRA] Build: S14P21D208-32 gateway nginx 단일 도메인 라우팅 구조 정리 | 최규직 | `feature/infra/sync-dev-ai-base-fix`→`dev-ai` | merged | 2026-03-09 |  |
| [!37](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/37) | [AI] Feat: S14P21D208-118 rclone 기반 데이터 동기화 전환 | 장호정 | `feature/ai/rclone-sync`→`dev-ai` | merged | 2026-03-09 |  |
| [!38](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/38) | [AI] Fix: S14P21D208-122 vkospi 컬럼 제거 (VIX로 대체) | 장호정 | `feature/ai/remove-vkospi`→`dev-ai` | merged | 2026-03-09 |  |
| [!39](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/39) | [BE] Feat: S14P21D208-95 이메일 회원가입 구현 | 강지석 | `feature/be/email-signup`→`dev-backend` | merged | 2026-03-09 | 💬1 |
| [!40](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/40) | [BE] Fix: S14P21D208-32 backend healthcheck 인증 예외 보정 | 최규직 | `feature/infra/ec2-cicd-setup`→`dev-backend` | merged | 2026-03-09 |  |
| [!41](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/41) | [AI] Build: S14P21D208-32 AI 서버 Dockerfile 추가 | 최규직 | `feature/infra/sync-dev-ai-base-fix`→`dev-ai` | merged | 2026-03-09 |  |
| [!42](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/42) | [AI] Build: S14P21D208-32 AI 서버 Dockerfile 및 psycopg2 빌드 의존성 보정 | 최규직 | `feature/infra/sync-dev-ai-base-fix`→`dev-ai` | merged | 2026-03-09 |  |
| [!43](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/43) | [BE] Feat: S14P21D208-109 메인 도메인 API 4개 구현 | 이혜민 | `feature/be/main-api`→`dev-backend` | merged | 2026-03-09 | 💬2 |
| [!44](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/44) | [AI] Feat: S14P21D208-77,78 LSTM 시퀀스 생성 및 섹터별 모델 학습 구현 | 장호정 | `feature/ai/stock-lstm-pipeline`→`dev-ai` | merged | 2026-03-10 |  |
| [!45](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/45) | [AI] Feat: S14P21D208-76 GARCH 변동성 모델 자동 피팅 구현 | 장호정 | `feature/ai/stock-garch-pipeline`→`dev-ai` | merged | 2026-03-10 |  |
| [!46](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/46) | [FE] Build: S14P21D208-32 prefix 기반 dev-frontend env 주입 구조 정리 | 최규직 | `feature/infra/sync-dev-frontend-base-fix`→`dev-frontend` | merged | 2026-03-10 |  |
| [!47](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/47) | [AI] Feat: S14P21D208-79 스태킹 앙상블 메타 모델 학습 구현 | 장호정 | `feature/ai/stock-ensemble-pipeline`→`dev-ai` | merged | 2026-03-10 |  |
| [!48](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/48) | [FE] Build: S14P21D208-32 infra-common 기반 dev-frontend env 주입 구조 정리 | 최규직 | `feature/infra/sync-dev-frontend-base-fix`→`dev-frontend` | merged | 2026-03-10 |  |
| [!49](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/49) | [AI] Feat: S14P21D208-80 계층적 통합 패킷 구성 모듈 구현 | 장호정 | `feature/ai/stock-integration-packet`→`dev-ai` | merged | 2026-03-10 |  |
| [!50](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/50) | [AI] Build: S14P21D208-32 infra-common 기반 CI 템플릿 참조 전환 | 최규직 | `feature/infra/sync-dev-ai-base-fix`→`dev-ai` | merged | 2026-03-10 |  |
| [!51](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/51) | [BE] Build: S14P21D208-32 infra-common 기반 CI 템플릿 참조 전환 | 최규직 | `feature/infra/ec2-cicd-setup`→`dev-backend` | merged | 2026-03-10 |  |
| [!52](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/52) | [BE] Feat: S14P21D208-98 비밀번호 찾기(재설정) 및 비밀번호 변경 구현 | 강지석 | `feature/be/password-management`→`dev-backend` | merged | 2026-03-10 |  |
| [!53](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/53) | [BE] Chore: S14P21D208-32 infra-common 참조 전환 및 backend 기본 DB 설정 정리 | 최규직 | `feature/infra/ec2-cicd-setup`→`dev-backend` | merged | 2026-03-10 |  |
| [!54](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/54) | [AI] Refactor: S14P21D208-32 단일 APP_DB 계약으로 로컬 infra 정리 | 최규직 | `feature/infra/sync-dev-ai-base-fix`→`dev-ai` | merged | 2026-03-10 |  |
| [!55](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/55) | [FE] Refactor: S14P21D208-32 단일 APP_DB 계약으로 로컬 infra 정리 | 최규직 | `feature/infra/sync-dev-frontend-base-fix`→`dev-frontend` | merged | 2026-03-10 |  |
| [!56](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/56) | [BE] Refactor: S14P21D208-32 최신 dev-backend 기준 로컬 infra DB 계약 단일화 | 최규직 | `feature/infra/ec2-cicd-setup`→`dev-backend` | merged | 2026-03-10 |  |
| [!57](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/57) | [FE] Feat:  S14P21D208-33 AI 매매신호 페이지 구현 | 정준용 | `feature/fe/signalpage-ui`→`dev-frontend` | merged | 2026-03-10 |  |
| [!58](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/58) | [BE] Refactor: S14P21D208-15 DB 스키마 단일화 및 ML 테이블 분리 & Feat: S14P21D208-15 SQL 스키마 기준 Entity 동기화 | 이혜민 | `feature/be/schema-ml-table-split`→`dev-backend` | merged | 2026-03-10 |  |
| [!59](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/59) | [AI] Feat: S14P21D208-82 재무 팩터 생성 모듈 구현 | 장호정 | `feature/ai/stock-fundamental-factor`→`dev-ai` | merged | 2026-03-10 | 💬2 |
| [!60](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/60) | [BE] Fix: S14P21D208-15 네이티브 쿼리 테이블/컬럼명 스키마 변경 반영 | 이혜민 | `feature/be/schema-ml-table-split`→`dev-backend` | merged | 2026-03-10 |  |
| [!61](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/61) | [BE] Feat: S14P21D208-27 키워드 임베딩 테이블 및 pgvector 확장 추가 | 이혜민 | `feature/be/keyword-embedding`→`dev-backend` | merged | 2026-03-10 |  |
| [!62](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/62) | [BE] Feat: S14P21D208-95 소셜 로그인 구현 | 강지석 | `feature/be/oauth-login`→`dev-backend` | merged | 2026-03-10 | 💬1 |
| [!63](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/63) | [BE] Build: S14P21D208-32 Flyway baseline migration 도입 | 최규직 | `feature/infra/ec2-cicd-setup`→`dev-backend` | merged | 2026-03-11 |  |
| [!64](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/64) | [BE] Build: S14P21D208-32 Flyway baseline migration 도입 및 init 스키마 정리 | 최규직 | `feature/infra/ec2-cicd-setup`→`dev-backend` | merged | 2026-03-11 |  |
| [!65](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/65) | [BE] Feat: S14P21D208-99 Redis 기반 Rate Limiting 구현 | 강지석 | `feature/be/rate-limiting`→`dev-backend` | merged | 2026-03-11 |  |
| [!66](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/66) | [AI] Feat: S14P21D208-83 Walk-Forward Validation 검증 프레임워크 구현 | 장호정 | `feature/ai/stock-walk-forward-validation`→`dev-ai` | merged | 2026-03-11 |  |
| [!67](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/67) | [BE] Refactor: S14P21D208-99 에러 응답 하드코딩 제거 및 미사용 에러코드 정리 | 강지석 | `feature/be/error-code-cleanup`→`dev-backend` | merged | 2026-03-11 |  |
| [!68](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/68) | [AI] Feat: S14P21D208-126 LightGBM 모델 성능 개선 | 장호정 | `feature/ai/stock-lgbm-tuning`→`dev-ai` | merged | 2026-03-11 | 💬1 |
| [!69](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/69) | [AI] Refactor: S14P21D208-126 코드 리뷰 피드백 반영 | 장호정 | `fix/ai/stock-lgbm-review-fixes`→`dev-ai` | merged | 2026-03-11 |  |
| [!70](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/70) | [BE] Feat: S14P21D208-124 REPORT 관련 API 구현 | 최규직 | `feature/be/report-api-002-005`→`dev-backend` | merged | 2026-03-11 | 💬3 |
| [!71](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/71) | [FE] Feat: S14P21D208-90 종목 리스트 UI 구현 | 정준용 | `feature/fe/stocklist-ui`→`dev-frontend` | closed | 2026-03-11 | 💬1 |
| [!72](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/72) | [BE] Feat: S14P21D208-95 약관 API 및 DB 연동 구현 | 강지석 | `feature/be/policy-terms`→`dev-backend` | merged | 2026-03-11 | 💬1 |
| [!73](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/73) | [AI] Feat: S14P21D208-128 Streamlit 데이터 파이프라인 대시보드 구현 | 장호정 | `feature/ai/streamlit-dashboard`→`dev-ai` | merged | 2026-03-11 | 💬2 |
| [!74](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/74) | [FE] Feat: S14P21D208-90 종목 리스트 UI 구현-코드리뷰 반영 | 정준용 | `feature/fe/stocklist-ui`→`dev-frontend` | merged | 2026-03-11 |  |
| [!75](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/75) | [BE] Feat: S14P21D208-123 FS-NOTI 알림 API 구현 | 최규직 | `feature/be/notification-api`→`dev-backend` | merged | 2026-03-11 | 💬1 |
| [!76](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/76) | [BE] Fix: term_type VARCHAR(20) 길이 초과 오류 수정 | 강지석 | `hotfix/be/fix-term-type-varchar`→`dev-backend` | merged | 2026-03-11 |  |
| [!77](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/77) | [FE] fix : S14P21D208-60  S14P21D208-33 S14P21D208-91 전체 에러 수정 | 정준용 | `feature/fe/scraplist-ui`→`dev-frontend` | merged | 2026-03-11 |  |
| [!78](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/78) | [FE] feat : S14P21D208-34 로그인-model-ui 구현 | 정준용 | `feature/fe/login-modal-ui`→`dev-frontend` | merged | 2026-03-11 |  |
| [!79](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/79) | [FE] fix : S14P21D208-34 로그인-model-ui auth api 연동 | 정준용 | `feature/fe/login-modal-ui`→`dev-frontend` | merged | 2026-03-11 |  |
| [!80](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/80) | [FE] fix : S14P21D208-34 로그인-model-ui auth api 연동-fix2 | 정준용 | `feature/fe/login-modal-ui`→`dev-frontend` | merged | 2026-03-11 |  |
| [!81](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/81) | [AI] Refactor: S14P21D208-130 ai_server 독립 실행 환경 구성 | 장호정 | `refactor/ai/standalone-server`→`dev-ai` | merged | 2026-03-12 |  |
| [!82](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/82) | [AI] Fix: S14P21D208-132 CI/CD 파이프라인 의존성 충돌 해결 | 장호정 | `fix/ai/requirements-dependency-conflict`→`dev-ai` | merged | 2026-03-12 |  |
| [!83](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/83) | [BE] Fix: S14P21D208-109 메인 페이지 API 401 인증 오류 수정 | 이혜민 | `fix/be/main-api-permit-all`→`dev-backend` | merged | 2026-03-12 |  |
| [!84](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/84) | [BE] Feat: S14P21D208-109 메인 페이지 테스트용 더미 데이터 API 추가 | 이혜민 | `fix/be/main-api-permit-all`→`dev-backend` | merged | 2026-03-12 |  |
| [!85](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/85) | [BE] Feat: S14P21D208-134 관심종목 추가/제거 API 구현 | 강지석 | `feature/be/watchlist-api`→`dev-backend` | merged | 2026-03-12 | 💬1 |
| [!86](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/86) | [BE] Fix: S14P21D208-109 테스트 API SSE 방식으로 변경 | 이혜민 | `fix/be/main-api-permit-all`→`dev-backend` | merged | 2026-03-12 |  |
| [!87](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/87) | [BE] Feat: 관심종목 상태 조회 및 알림 토글 API 구현 | 강지석 | `feature/be/watchlist-status-toggle`→`dev-backend` | merged | 2026-03-12 | 💬1 |
| [!88](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/88) | [BE] Fix: S14P21D208-109 SSE 초기 데이터 미전송 수정 및 안정성 개선 | 이혜민 | `fix/be/main-api-permit-all`→`dev-backend` | merged | 2026-03-12 |  |
| [!89](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/89) | [FE] feat : S14P21D208-59  S14P21D208-136  mainpage-test-api 및 stock-detail-ui 구현 후 코드리뷰 반영 | 정준용 | `feature/fe/stock-detail-ui`→`dev-frontend` | merged | 2026-03-12 | 💬1 |
| [!90](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/90) | [BE] Fix: S14P21D208-109 SSE 초기 데이터 즉시 flush 및 환율 API URL 수정 | 이혜민 | `fix/be/sse-initial-flush`→`dev-backend` | merged | 2026-03-13 |  |
| [!91](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/91) | [INFRA] Fix: S14P21D208-32 SSE 엔드포인트 추가 | 최규직 | `feature/S14P21D208-32-sse-nginx-buffering`→`infra-common` | merged | 2026-03-13 |  |
| [!92](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/92) | [INFRA] Build: S14P21D208-32 TimescaleDB base postgres 이미지 및 확장 초기화 추가 | 최규직 | `feature/S14P21D208-32-timescaledb-base`→`infra-common` | merged | 2026-03-13 |  |
| [!93](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/93) | [INFRA] Fix: S14P21D208-32 /api/stream SSE nginx 라우팅 추가 | 최규직 | `feature/be/S14P21D208-32-sse-stream-prefix`→`dev-backend` | merged | 2026-03-13 |  |
| [!94](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/94) | [INFRA] Fix: S14P21D208-32 /api/stream SSE nginx 라우팅 추가 | 최규직 | `feature/fe/S14P21D208-32-sse-stream-prefix`→`dev-frontend` | merged | 2026-03-13 |  |
| [!95](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/95) | [INFRA] Fix: S14P21D208-32 TimescaleDB postgres 이미지 Alpine 빌드 호환성 수정 | 최규직 | `fix/S14P21D208-32-timescaledb-alpine-build`→`infra-common` | merged | 2026-03-13 |  |
| [!96](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/96) | [BE] Fix: S14P21D208-109 SSE 엔드포인트를 /api/stream/ 경로로 변경 | 이혜민 | `fix/be/sse-initial-flush`→`dev-backend` | merged | 2026-03-13 |  |
| [!97](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/97) | [INFRA] Fix: S14P21D208-32 TimescaleDB preload 설정 추가 | 최규직 | `fix/S14P21D208-32-timescaledb-alpine-build`→`infra-common` | merged | 2026-03-13 |  |
| [!98](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/98) | [AI] Feat: S14P21D208-142 EC2 스케줄러 서비스 배포 추가 | 장호정 | `feature/infra/add-scheduler-service`→`infra-common` | merged | 2026-03-13 |  |
| [!99](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/99) | [INFRA] Fix: S14P21D208-32 SSE nginx chunked encoding 비활성화 추가 | 최규직 | `feature/S14P21D208-32-sse-nginx-buffering`→`infra-common` | merged | 2026-03-13 |  |
| [!100](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/100) | [INFRA] Fix: S14P21D208-32 SSE nginx chunked encoding 비활성화 추가 | 최규직 | `feature/be/S14P21D208-32-sse-stream-prefix`→`dev-backend` | merged | 2026-03-13 |  |
| [!101](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/101) | [INFRA] Fix: S14P21D208-32 SSE nginx chunked encoding 비활성화 추가 | 최규직 | `feature/fe/S14P21D208-32-sse-stream-prefix`→`dev-frontend` | merged | 2026-03-13 |  |
| [!102](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/102) | [AI] Feat: S14P21D208-107 뉴스 기사 중복 제거 및 광고성 기사 필터링 | 이혜민 | `feature/ai/news-data-pipeline`→`dev-ai` | merged | 2026-03-13 |  |
| [!103](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/103) | [AI] Feat: S14P21D208-143 스케줄러 기동 시 초기 데이터 동기화 추가 | 장호정 | `feature/ai/scheduler-startup-sync`→`dev-ai` | merged | 2026-03-13 |  |
| [!104](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/104) | [FE] fix: S14P21D208-59 메인 sse test 엔드포인트 수정 | 정준용 | `fix/fe/mainpage`→`dev-frontend` | merged | 2026-03-13 |  |
| [!105](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/105) | [AI] Feat: S14P21D208-146 파이프라인 rclone Drive 동기화 통합 | 장호정 | `feature/ai/rclone-pipeline-sync`→`dev-ai` | merged | 2026-03-13 | 💬1 |
| [!106](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/106) | [BE] Feat: S14P21D208-145 알림 설정 조회/변경 API 구현 | 강지석 | `feature/be/notification-settings`→`dev-backend` | merged | 2026-03-13 | 💬1 |
| [!107](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/107) | [BE] Fix: S14P21D208-109 SSE 초기 데이터 즉시 전송 및 테스트 컨트롤러 개선 | 이혜민 | `fix/be/sse-buffer-flush`→`dev-backend` | merged | 2026-03-13 | 💬2 |
| [!108](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/108) | [AI] Refactor: S14P21D208-147 EC2 데이터 파이프라인 서비스 정리 | 장호정 | `feature/infra/add-data-volume`→`infra-common` | merged | 2026-03-13 |  |
| [!109](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/109) | [BE] Fix: S14P21D208-32 Swagger /api 경로 및 접근 허용 수정 | 최규직 | `feature/be/S14P21D208-32-swagger-api-path`→`dev-backend` | merged | 2026-03-13 |  |
| [!110](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/110) | [BE] Feat: S14P21D208-148 로그인 사용자 정보 조회 API (GET /api/auth/me) 구현 | 강지석 | `feature/be/auth-me`→`dev-backend` | merged | 2026-03-13 |  |
| [!111](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/111) | S14P21D208-139 한투 api 연동 | 정준용 | `feature/be/stock`→`dev-backend` | merged | 2026-03-13 | 💬6 |
| [!112](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/112) | [BE] Fix: S14P21D208-109 SSE broadcast 시 AsyncRequestNotUsableException 처리 | 이혜민 | `fix/be/sse-buffer-flush`→`dev-backend` | merged | 2026-03-13 |  |
| [!113](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/113) | [BE] Chore: S14P21D208-23 로컬 개발 환경 설정 추가 | 이혜민 | `fix/be/sse-buffer-flush`→`dev-backend` | merged | 2026-03-13 |  |
| [!114](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/114) | [AI] Feat: S14P21D208-147 stock-scheduler 데이터 영속 볼륨 추가 | 장호정 | `feature/infra/add-stock-data-volume`→`infra-common` | merged | 2026-03-14 |  |
| [!115](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/115) | [Infra] Feat: S14P21D208-152 뉴스 스케줄러 컨테이너 배포 설정 추가 | 이혜민 | `feature/infra/news-scheduler-deploy`→`infra-common` | merged | 2026-03-16 |  |
| [!116](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/116) | [FE] Refactor: S14P21D208-177 theme.css 디자인 토큰 구조 정리 | 송민경 | `feature/fe/theme_token`→`dev-frontend` | merged | 2026-03-16 | 💬1 |
| [!117](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/117) | [AI] Feat: S14P21D208-115 뉴스 도메인 API 응답 포맷 표준화 | 이혜민 | `feature/ai/news-data-pipeline`→`dev-ai` | merged | 2026-03-16 |  |
| [!118](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/118) | [FE] feat : S01P21D208-144 포트폴리오 UI 구현 | 정준용 | `feature/fe/portfoilo`→`dev-frontend` | merged | 2026-03-16 | 💬1 |
| [!119](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/119) | [AI] Feat: S14P21D208-154 S14P21D208-155 S14P21D208-156 S14P21D208-158 S14P21D208-159 토론 배치 API 및 로컬 워커 구현 | 최규직 | `feature/ai/debate-worker`→`dev-ai` | merged | 2026-03-16 | 💬1 |
| [!120](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/120) | [BE] Feat: S14P21D208-160 디바이스 세션 관리 구현 | 강지석 | `feature/be/device-session`→`dev-backend` | merged | 2026-03-16 | 💬2 |
| [!121](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/121) | [AI] Feat: TFT v2 앙상블 모델 마이그레이션 및 프로덕션 베이스라인 구축 | 장호정 | `feature/ai/stock-tft-prediction`→`dev-ai` | merged | 2026-03-16 | 💬1 |
| [!122](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/122) | [BE] Feat: S14P21D208-161 Step-up 인증 구현 | 강지석 | `feature/be/step-up-auth`→`dev-backend` | closed | 2026-03-16 | 💬1 |
| [!123](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/123) | [INFRA] Fix: S14P21D208-32 Swagger HTTPS 프록시 헤더 보존 | 최규직 | `fix/S14P21D208-32-swagger-forwarded-proto`→`infra-common` | merged | 2026-03-16 |  |
| [!124](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/124) | [BE] Fix: S14P21D208-32 Swagger 프록시 스킴 인식 보정 | 최규직 | `fix/be/S14P21D208-32-swagger-forwarded-proto`→`dev-backend` | merged | 2026-03-16 |  |
| [!125](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/125) | [FE] feat : S14P21D208-178 뉴스 리스트 페이지 ui구현 | 정준용 | `feature/fe/news-ui`→`dev-frontend` | merged | 2026-03-16 | 💬1 |
| [!126](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/126) | [BE] Fix: CORS 허용 Origin에 배포 도메인 추가 | 강지석 | `fix/be/cors-deploy-origin`→`dev-backend` | merged | 2026-03-16 |  |
| [!127](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/127) | [FE] S14P21D208-176 검색 모달 및 mock search API 구현 | 송민경 | `feature/fe/search-modal-ui`→`dev-frontend` | merged | 2026-03-16 | 💬1 |
| [!128](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/128) | [AI] Fix: S14P21D208-152 news-scheduler 컨테이너 크래시 수정 - schedule 패키지 누락 추가 | 이혜민 | `feature/ai/news-data-pipeline`→`dev-ai` | merged | 2026-03-16 |  |
| [!129](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/129) | [BE] Add: S14P21D208-179 TFT 전환 및 앙상블 포트폴리오 DB 마이그레이션 V5 | 장호정 | `feature/be/tft-ensemble-schema`→`dev-backend` | merged | 2026-03-16 |  |
| [!130](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/130) | [INFRA] Build: S14P21D208-93 프론트 페이지기반 보일러플레이트 정렬 | 강지석 | `fix/infra/missing-env-vars`→`dev-backend` | closed | 2026-03-17 |  |
| [!131](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/131) | [INFRA] Fix: Spring 컨테이너에 누락된 환경변수 전달 추가 | 강지석 | `fix/infra/missing-env-vars`→`infra-common` | merged | 2026-03-17 |  |
| [!132](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/132) | [BE] Add: S14P21D208-110 KOSPI200 종목 데이터 시드 및 Stock 엔티티 컬럼 추가 | 이혜민 | `feature/be/seed-kospi200-stocks`→`dev-backend` | merged | 2026-03-17 |  |
| [!133](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/133) | [BE] Fix: JSON 응답 필드를 snake_case로 변환 | 강지석 | `fix/be/snake-case-dto`→`dev-backend` | merged | 2026-03-17 |  |
| [!134](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/134) | [INFRA] Chore: S14P21D208-32 deploy env 주입선 정리 | 최규직 | `fix/S14P21D208-32-infra-common-env-wiring`→`infra-common` | merged | 2026-03-17 |  |
| [!135](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/135) | [INFRA] Chore: S14P21D208-32 dev-frontend 중복 infra 제거 | 최규직 | `fix/S14P21D208-32-dev-frontend-infra-cleanup`→`dev-frontend` | merged | 2026-03-17 |  |
| [!136](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/136) | [INFRA] Chore: S14P21D208-32 dev-backend 중복 infra 제거 | 최규직 | `fix/S14P21D208-32-dev-backend-infra-cleanup`→`dev-backend` | merged | 2026-03-17 |  |
| [!137](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/137) | [AI] Fix: S14P21D208-180 파이프라인 외부 API timeout 미설정 수정 | 장호정 | `feature/ai/stock-pipeline-timeout`→`dev-ai` | merged | 2026-03-17 |  |
| [!138](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/138) | [INFRA] Chore: S14P21D208-32 dev-ai 중복 infra 제거 | 최규직 | `fix/S14P21D208-32-dev-ai-infra-cleanup`→`dev-ai` | merged | 2026-03-17 |  |
| [!139](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/139) | [BE] Fix: S14P21D208-109 네이버 시장 지수 API URL 수정 및 장외 시간 호출 방지 | 이혜민 | `fix/be/naver-market-index-url`→`dev-backend` | merged | 2026-03-17 |  |
| [!140](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/140) | [INFRA] Build: S14P21D208-32 PostgreSQL SSH 터널용 루프백 포트 노출 | 최규직 | `fix/S14P21D208-32-postgres-loopback-port`→`infra-common` | merged | 2026-03-17 |  |
| [!141](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/141) | [BE] Fix: 비밀번호 정책 완화 (대문자/특수문자 필수 제거) | 강지석 | `fix/be/password-policy-relax`→`dev-backend` | merged | 2026-03-17 |  |
| [!142](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/142) | [INFRA] Build: S14P21D208-32 Docker Compose KST 시간대 기본값 적용 | 최규직 | `fix/S14P21D208-32-kst-timezone`→`infra-common` | merged | 2026-03-17 |  |
| [!143](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/143) | [AI] Fix: S14P21D208-110 DB 비밀번호 특수문자(@) URL 인코딩 처리 | 이혜민 | `fix/ai/db-password-encoding`→`dev-ai` | merged | 2026-03-17 |  |
| [!144](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/144) | [INFRA] Fix: S14P21D208-32 dev-ai compose 중복 volumes 정리 | 최규직 | `fix/S14P21D208-32-kst-yaml-fix`→`infra-common` | merged | 2026-03-17 |  |
| [!145](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/145) | [AI] Fix: S14P21D208-110 백필 적재 시 동일 뉴스 내 중복 키워드 방지 | 이혜민 | `fix/ai/backfill-duplicate-keyword`→`dev-ai` | merged | 2026-03-17 |  |
| [!146](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/146) | [BE] Feat: S14P21D208-110 키워드 클러스터링 테이블 추가 | 이혜민 | `feature/be/keyword-clusters`→`dev-backend` | merged | 2026-03-17 |  |
| [!147](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/147) | [AI] Feat: S14P21D208-110 키워드 클러스터링 구현 | 이혜민 | `feature/ai/keyword-clustering`→`dev-ai` | merged | 2026-03-17 |  |
| [!148](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/148) | [BE] fix : S14P21D208-139 한투 api 컨트롤러 및 엔드포인트 수정 | 정준용 | `feature/be/stock`→`dev-backend` | merged | 2026-03-17 | 💬1 |
| [!149](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/149) | [BE] Fix: Swagger UI Authorization 헤더 중복 입력 제거 | 강지석 | `fix/be/swagger-auth-header`→`dev-backend` | merged | 2026-03-17 |  |
| [!150](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/150) | [FE] fix : S14P21D208-182 회원가입 UI 수정 | 정준용 | `feature/fe/signup-ui`→`dev-frontend` | merged | 2026-03-17 |  |
| [!151](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/151) | [BE] Feat: S14P21D208-124, S14P21D208-157 리포트/포트폴리오/시그널 API 구현 | 최규직 | `feature/be/S14P21D208-124-157-report-signal-api`→`dev-backend` | merged | 2026-03-17 | 💬1 |
| [!152](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/152) | [AI] Fix: S14P21D208-122 vkospi 컬럼 제거 (VIX로 대체) | 이혜민 | `fix/ai/backfill-oom-optimization`→`dev-ai` | merged | 2026-03-17 |  |
| [!153](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/153) | [BE] Fix: 비밀번호 재설정 시 정책 검증 실패해도 인증 토큰 유지 | 강지석 | `fix/be/reset-password-token-preserve`→`dev-backend` | merged | 2026-03-17 |  |
| [!154](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/154) | [BE] fix : S14P21D208-139 KIS 30건 기준으로 정리하고, fallback 시에도 현재가/등락률이 비지 않도록 KIS quote 보강을 추가 | 정준용 | `feature/be/stock`→`dev-backend` | merged | 2026-03-17 | 💬1 |
| [!155](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/155) | [BE] Fix: 이메일 발송 Rate Limit 완화 (3회 → 5회/시간) | 강지석 | `fix/be/email-rate-limit`→`dev-backend` | merged | 2026-03-17 |  |
| [!156](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/156) | [INFRA] Fix: S14P21D208-32 배포 전 자원 점검 및 Mattermost 사유 알림 추가 | 최규직 | `feature/infra/S14P21D208-32-deploy-resource-guard`→`infra-common` | merged | 2026-03-17 |  |
| [!157](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/157) | [AI] Fix: S14P21D208-152 Docker 크롤링 의존성 누락 수정 (lxml, pykrx) | 이혜민 | `fix/ai/backfill-oom-optimization`→`dev-ai` | merged | 2026-03-17 |  |
| [!158](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/158) | [BE] Fix: Swagger 스키마가 Jackson SNAKE_CASE 네이밍 전략을 반영하도록 ModelResolver 설정 | 강지석 | `fix/be/swagger-snake-case`→`dev-backend` | merged | 2026-03-17 |  |
| [!159](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/159) | [BE] Delete: 미사용 /api/auth/status 엔드포인트 제거 | 강지석 | `feature/be/remove-auth-status`→`dev-backend` | merged | 2026-03-17 |  |
| [!160](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/160) | [FE] feat : S14P21D208-34 프론트 소셜 로그인 흐름을 백엔드 계약에 맞게 재구성 | 정준용 | `fix/fe/login-OAUTH`→`dev-frontend` | merged | 2026-03-17 |  |
| [!161](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/161) | [INFRA] Fix: 프론트엔드 OAuth 환경변수를 build.args로 전달 | 강지석 | `fix/infra/frontend-oauth-build-args`→`infra-common` | merged | 2026-03-17 |  |
| [!162](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/162) | [FE] Fix: Dockerfile에 OAuth 환경변수 ARG 추가 | 강지석 | `fix/fe/dockerfile-oauth-args`→`dev-frontend` | merged | 2026-03-17 |  |
| [!163](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/163) | [BE] Feat: S14P21D208-115 파이프라인 신호 테이블 추가 (pipeline_signals) | 이혜민 | `feature/be/pipeline-signals`→`dev-backend` | merged | 2026-03-17 |  |
| [!164](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/164) | [FE] feat : S14P21D208-34 헤더 디바이스 아이디 추가 | 정준용 | `fix/fe/login-OAUTH`→`dev-frontend` | merged | 2026-03-17 |  |
| [!165](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/165) | [BE] Feat: S14P21D208-115 pipeline_signals 재시도 카운트 컬럼 추가 | 이혜민 | `feature/be/pipeline-signals`→`dev-backend` | merged | 2026-03-17 |  |
| [!166](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/166) | [FE] fix : S14P21D208-34 oauth-api-body-request-fix | 정준용 | `fix/fe/login-OAUTH`→`dev-frontend` | merged | 2026-03-17 |  |
| [!167](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/167) | [BE] Delete: SocialAccount 미사용 provider별 팩토리 메서드 제거 | 강지석 | `feature/be/oauth-cleanup`→`dev-backend` | merged | 2026-03-17 |  |
| [!168](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/168) | [FE] feat : S14P21D208-34 OAuth 회원가입 후 약관 동의 UI 모달 추가 | 정준용 | `fix/fe/login-OAUTH`→`dev-frontend` | merged | 2026-03-18 |  |
| [!169](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/169) | Draft: Feature/be/oauth cleanup | 강지석 | `feature/be/oauth-cleanup`→`dev-backend` | closed | 2026-03-18 |  |
| [!170](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/170) | [BE] Refactor: DTO 패키지를 request/response로 분리 | 강지석 | `refactor/be/dto-refactor`→`dev-backend` | merged | 2026-03-18 |  |
| [!171](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/171) | [BE] Fix: WatchlistServiceImplTest DTO import 경로 수정 | 강지석 | `refactor/be/dto-refactor`→`dev-backend` | merged | 2026-03-18 |  |
| [!172](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/172) | [AI] Fix: S14P21D208-110 스케줄러에서 키워드 추출 단계 분리 | 이혜민 | `fix/ai/scheduler-remove-keyword-step`→`dev-ai` | merged | 2026-03-18 |  |
| [!173](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/173) | [AI] Fix: S14P21D208-152 워커 폴링 시간 조정 및 크롤링 타임아웃 2시간 확장 | 이혜민 | `fix/ai/scheduler-remove-keyword-step`→`dev-ai` | merged | 2026-03-18 |  |
| [!174](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/174) | [AI] Feat: S14P21D208-181 재무 데이터 rclone 최적화 및 볼륨 자동 복구 | 장호정 | `feature/ai/stock-pipeline-cleanup`→`dev-ai` | merged | 2026-03-18 |  |
| [!175](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/175) | [AI] Fix: S14P21D208-110 크롤러 published_at NULL 버그 수정 및 복구 스크립트 | 이혜민 | `fix/ai/fix-null-published-at`→`dev-ai` | merged | 2026-03-18 |  |
| [!176](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/176) | [AI] Fix: S14P21D208-110 NULL 복구 스크립트 n.news.naver.com URL 지원 | 이혜민 | `fix/ai/fix-null-published-at`→`dev-ai` | merged | 2026-03-18 |  |
| [!177](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/177) | [AI] Feat: S14P21D208-181 재무 데이터 볼륨 감지 로그 보완 | 장호정 | `feature/ai/stock-pipeline-cleanup`→`dev-ai` | merged | 2026-03-18 |  |
| [!178](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/178) | [FE] fix : S14P21D208-59 test->api 변경 | 정준용 | `fix/fe/mainpage-test-out`→`dev-frontend` | merged | 2026-03-18 |  |
| [!179](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/179) | [AI] Fix: S14P21D208-32 news router 임시 비활성화로 dev-ai 부팅 복구 | 최규직 | `fix/ai/debate-api-bootstrap`→`dev-ai` | merged | 2026-03-18 |  |
| [!180](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/180) | [AI] Fix: S14P21D208-32 DB URL 특수문자 인코딩 보정 | 최규직 | `fix/ai/db-url-encoding`→`dev-ai` | merged | 2026-03-18 |  |
| [!181](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/181) | [AI] Fix: S14P21D208-155 debate inputs TFT 전환 | 최규직 | `fix/ai/debate-inputs-tft`→`dev-ai` | merged | 2026-03-18 |  |
| [!182](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/182) | [AI] Feat: 앙상블 시그널 파이프라인 및 백필 데이터 생성 | 장호정 | `feature/ai/ensemble-signal-pipeline`→`dev-ai` | merged | 2026-03-19 |  |
| [!183](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/183) | [AI] Fix: S14P21D208-152 크롤링 성능 개선 및 GPU OOM 수정 | 이혜민 | `fix/ai/crawl-perf-gpu-oom`→`dev-ai` | merged | 2026-03-19 |  |
| [!184](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/184) | [BE] Feat: S14P21D208-139 한투 api 연동 | 정준용 | `feature/be/stock`→`dev-backend` | merged | 2026-03-19 | 💬1 |
| [!185](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/185) | [BE] Refactor: 약관 목록 API 제거 및 Swagger 문서 추가 | 강지석 | `refactor/be/policy-cleanup`→`dev-backend` | merged | 2026-03-19 |  |
| [!186](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/186) | [BE] fix :  S14P21D208-139 배포 실패  해결 | 정준용 | `feature/be/stock`→`dev-backend` | merged | 2026-03-19 |  |
| [!187](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/187) | [AI] S14P21D208-159,168 ai_debate_reports 기반 의장 포트폴리오 생성 배치 추가 | 최규직 | `feature/ai/S14P21D208-159-168-chairman-sync`→`dev-ai` | merged | 2026-03-19 |  |
| [!188](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/188) | [INFRA] fix : KIS 환경변수 추가 | 정준용 | `fix/infra/backend-kis-build-args`→`infra-common` | merged | 2026-03-19 |  |
| [!189](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/189) | [BE] Fix: S14P21D208-124, S14P21D208-157 의장 최종결정 기준 signal/portfolio/main 정렬 | 최규직 | `feature/be/S14P21D208-159-chairman-sync`→`dev-backend` | merged | 2026-03-19 |  |
| [!190](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/190) | [BE] fix : S14P21D208-149 DB 마이그레이션 수정 | 정준용 | `feature/be/stock`→`dev-backend` | merged | 2026-03-19 |  |
| [!191](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/191) | [AI] Feat: S14P21D208-117 뉴스 디베이트 데이터 API 및 배치 스크립트 | 이혜민 | `feature/ai/news-debate-data`→`dev-ai` | merged | 2026-03-19 | 💬2 |
| [!192](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/192) | [FE] fix : S14P21D208-136 헤더에 디바이스 추가 | 정준용 | `fix/fe/stocklist`→`dev-frontend` | merged | 2026-03-19 |  |
| [!193](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/193) | [FE] Feat: S14P21D208-183 포트폴리오 종목 상세페이지 UI 및 디자인 토큰 적용 | 장호정 | `feature/fe/portfolio-stock-detail`→`dev-frontend` | merged | 2026-03-19 |  |
| [!194](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/194) | [BE] fix : S14P21D208-149 프론트 요청에 따른 api 수정 | 정준용 | `feature/be/stock`→`dev-backend` | merged | 2026-03-19 |  |
| [!195](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/195) | [BE] Feat: S14P21D208-117 종목별 뉴스 에이전트 데이터 테이블 추가 | 이혜민 | `feature/be/news-agent-data`→`dev-backend` | merged | 2026-03-19 |  |
| [!196](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/196) | [AI] Feat: S14P21D208-117 종목별 뉴스 에이전트 데이터 생성 + DB/Redis 저장 | 이혜민 | `feature/ai/news-debate-data`→`dev-ai` | merged | 2026-03-19 | 💬2 |
| [!197](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/197) | [Infra] Feat: 백엔드 MinIO 환경변수 추가 | 강지석 | `feature/infra/add-minio-backend-env`→`infra-common` | merged | 2026-03-19 |  |
| [!198](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/198) | Revert "Merge branch 'feature/infra/add-minio-backend-env' into 'infra-common'" | 강지석 | `revert-8d6ee0a4`→`infra-common` | merged | 2026-03-19 |  |
| [!199](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/199) | [BE] Add: S14P21D208-185 stock_financials UNIQUE 제약 조건 마이그레이션 추가 | 장호정 | `feature/be/stock-financials-unique-constraint`→`dev-backend` | merged | 2026-03-19 |  |
| [!200](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/200) | [Infra] Feat: 백엔드 MinIO 환경변수 추가 | 강지석 | `feature/infra/minio-backend-env`→`infra-common` | merged | 2026-03-19 |  |
| [!201](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/201) | [FE] Fix: S14P21D208-183 의장 말풍선 다크모드 텍스트 색상 수정 | 장호정 | `feature/fe/portfolio-stock-detail`→`dev-frontend` | merged | 2026-03-19 |  |
| [!202](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/202) | [BE] Feat: application.properties에 MinIO 환경변수 참조 추가 | 강지석 | `feature/be/minio-properties`→`dev-backend` | merged | 2026-03-19 |  |
| [!203](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/203) | [BE] fix : S14P21D208-149 Redis기반 top-list 캐시추가 | 정준용 | `feature/be/stock`→`dev-backend` | closed | 2026-03-19 | 💬2 |
| [!204](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/204) | [AI] Fix: 키워드 배치 중복 방지 및 에이전트 데이터 SQL 수정 | 이혜민 | `fix/ai/keyword-batch-dedup`→`dev-ai` | merged | 2026-03-19 |  |
| [!205](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/205) | [BE] Feat: S14P21D208-98 MinIO presigned URL 기반 프로필 이미지 업로드 구현 | 강지석 | `feature/be/minio-profile-upload`→`dev-backend` | merged | 2026-03-19 |  |
| [!206](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/206) | Revert "Merge branch 'feature/be/minio-profile-upload' into 'dev-backend'" | 강지석 | `revert-aa9b42eb`→`dev-backend` | merged | 2026-03-19 |  |
| [!207](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/207) | [BE] Feat: S14P21D208-98 MinIO presigned URL 기반 프로필 이미지 업로드 구현 | 강지석 | `feature/be/minio-profile-upload`→`dev-backend` | closed | 2026-03-19 |  |
| [!208](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/208) | [BE] Feat: S14P21D208-98 MinIO presigned URL 기반 프로필 이미지 업로드 구현 | 강지석 | `feature/be/minio-profile-upload-v2`→`dev-backend` | merged | 2026-03-19 | 💬2 |
| [!209](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/209) | [AI] Feat: S14P21D208-117 백필 일별 크롤링 모드 및 CSV 배치 프로세서 추가 | 이혜민 | `feature/ai/backfill-daily-crawl`→`dev-ai` | merged | 2026-03-19 |  |
| [!210](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/210) | [BE] Docs: WatchlistController Swagger 어노테이션 추가 | 강지석 | `feature/be/watchlist-swagger`→`dev-backend` | merged | 2026-03-19 |  |
| [!211](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/211) | [INFRA] Fix: S14P21D208-32 dev-ai 배포 안정화 | 최규직 | `fix/infra/S14P21D208-32-dev-ai-deploy-stability`→`infra-common` | merged | 2026-03-19 | 💬2 |
| [!212](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/212) | [BE] Fix: S14P21D208-109 메인 페이지 LATERAL JOIN 글로벌 MAX 버그 수정 | 이혜민 | `fix/be/main-query-lateral-join`→`dev-backend` | merged | 2026-03-19 | 💬2 |
| [!213](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/213) | [FE] fix : S14P21D208-34 S14P21D208-90 프록시 정리 및 라우트 설정 및 리뷰 | 정준용 | `fix/fe/stocklist`→`dev-frontend` | merged | 2026-03-19 |  |
| [!214](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/214) | [FE] fix : S14P21D208-34 ci 실패 수정 | 정준용 | `fix/fe/stocklist`→`dev-frontend` | merged | 2026-03-19 |  |
| [!215](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/215) | [FE] Feat: S14P21D208-187 MSW(Mock Service Worker) 세팅 | 장호정 | `feature/fe/msw-setup`→`dev-frontend` | merged | 2026-03-19 | 💬1 |
| [!216](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/216) | [AI] Refactor: S14P21D208-152 뉴스 크롤링 파이프라인 최적화 — 종목별 즉시 DB 적재 + 키워드 워커 병렬 처리 | 이혜민 | `refactor/ai/news-pipeline-optimize`→`dev-ai` | merged | 2026-03-19 |  |
| [!217](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/217) | [BE] Fix: S14P21D208-32 DB timezone migration 추가 | 최규직 | `fix/be/S14P21D208-32-db-timezone-migration`→`dev-backend` | merged | 2026-03-19 |  |
| [!218](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/218) | [FE] Refactor: S14P21D208-188 페이지 컴포넌트 mock 직접 import 제거 | 장호정 | `feature/fe/msw-mock-migration`→`dev-frontend` | merged | 2026-03-20 | 💬1 |
| [!219](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/219) | [BE] Feat: KOSPI 200 실시간 시세 갱신 스케줄러 및 종목 리스트 통합 | 강지석 | `feature/be/stock-realtime-quote-refresh`→`dev-backend` | merged | 2026-03-20 |  |
| [!220](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/220) | [BE] Feat: 시세 갱신 스케줄러에 거래시간대 체크 적용 | 강지석 | `feature/be/stock-quote-scheduler-trading-hours`→`dev-backend` | merged | 2026-03-20 |  |
| [!221](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/221) | [BE] Feat: SectorFilter를 프론트 21개 카테고리에 맞게 확장 | 강지석 | `feature/be/sector-filter-21-categories`→`dev-backend` | merged | 2026-03-20 |  |
| [!222](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/222) | [BE] Fix: 섹터 필터 복수 선택 지원 및 응답 gicsSector를 category로 변경 | 강지석 | `feature/be/sector-filter-21-categories`→`dev-backend` | merged | 2026-03-20 |  |
| [!223](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/223) | [BE] Perf: Redis MGET으로 종목 시세 일괄 조회 최적화 | 강지석 | `feature/be/sector-filter-21-categories`→`dev-backend` | merged | 2026-03-20 |  |
| [!224](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/224) | [FE] Fix: S14P21D208-189 ProtectedPage SSE 차단 문제 수정 | 장호정 | `feature/fe/protected-page-sse-fix`→`dev-frontend` | closed | 2026-03-20 |  |
| [!225](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/225) | [BE] Perf: Redis 캐시 히트 시 DB 일봉 쿼리 skip | 강지석 | `fix/be/stock-list-skip-db-when-cached`→`dev-backend` | merged | 2026-03-20 |  |
| [!226](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/226) | [BE] Perf: 종목 일봉 조회 쿼리 최적화 - 상관 서브쿼리 제거 | 강지석 | `fix/be/stock-list-skip-db-when-cached`→`dev-backend` | merged | 2026-03-20 |  |
| [!227](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/227) | [FE] feat : S14P21208-34 S14P21208-90 로그인 및 헤더 프로필 모달 추가 | 정준용 | `fix/fe/stocklist`→`dev-frontend` | merged | 2026-03-20 |  |
| [!228](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/228) | [FE] feat : S14P21208-90  전체 종목 리스트 화면 에러 수정 | 정준용 | `fix/fe/stocklist`→`dev-frontend` | merged | 2026-03-20 |  |
| [!229](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/229) | [BE] Perf: 시세 갱신 스케줄러 주기 60초 → 30초로 단축 | 강지석 | `feature/be/scheduler-interval-30s`→`dev-backend` | merged | 2026-03-20 |  |
| [!230](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/230) | [AI] Fix: S14P21D208-152 pykrx 로깅 버그 우회 | 이혜민 | `refactor/ai/news-pipeline-optimize`→`dev-ai` | merged | 2026-03-20 |  |
| [!231](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/231) | [BE] Fix: S14P21D208-32 MinIO presigned endpoint 분리 및 프로필 업로드 대응 | 최규직 | `fix/be/s14p21d208-32-minio-profile-upload`→`dev-backend` | merged | 2026-03-20 |  |
| [!232](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/232) | [INFRA] Fix: S14P21D208-32 gateway MinIO PUT 업로드 대응 및 backend env 연결 | 최규직 | `fix/infra/s14p21d208-32-minio-gateway-upload`→`infra-common` | merged | 2026-03-20 |  |
| [!233](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/233) | [INFRA] Fix: S14P21D208-32 gateway API/SSE rate limit 기준 조정 | 최규직 | `fix/infra/s14p21d208-32-gateway-upload-and-rate-limit`→`infra-common` | merged | 2026-03-20 |  |
| [!234](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/234) | [AI] Feat: 주식 데이터 파이프라인 정리 및 펀더멘탈 지표 프로세서 구현 | 장호정 | `feature/ai/stock-pipeline-cleanup`→`dev-ai` | merged | 2026-03-20 | 💬1 |
| [!235](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/235) | [FE] fix : S14P21D208-141 포트폴리오 구현 | 정준용 | `fix/fe/stocklist`→`dev-frontend` | merged | 2026-03-20 |  |
| [!236](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/236) | [BE] Feat: S14P21D208-94 뉴스 API permitAll 추가 | 이혜민 | `feature/be/news-permit-all`→`dev-backend` | merged | 2026-03-20 |  |
| [!237](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/237) | [BE] Feat: S14P21D208-94 뉴스 목록 조회 published_at NULL 필터링 | 이혜민 | `feature/be/news-permit-all`→`dev-backend` | merged | 2026-03-20 |  |
| [!238](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/238) | [AI] Feat: S14P21D208-117 백필 일별 크롤링 모드 및 CSV 배치 프로세서 추가 | 이혜민 | `feature/ai/sentiment-pipeline`→`dev-ai` | merged | 2026-03-20 |  |
| [!239](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/239) | [AI] Feat: S14P21D208-152 감성 분석 FinBERT 단독 모드로 변경 (Gemini 제거) | 이혜민 | `feature/ai/sentiment-pipeline`→`dev-ai` | merged | 2026-03-20 |  |
| [!240](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/240) | [AI] Fix: S14P21D208-152 pykrx 거래일 검증 제거 | 이혜민 | `refactor/ai/news-pipeline-optimize`→`dev-ai` | merged | 2026-03-20 |  |
| [!241](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/241) | [AI] Fix: S14P21D208-152 fetch_html euc-kr 인코딩 수동 디코딩 | 이혜민 | `refactor/ai/news-pipeline-optimize`→`dev-ai` | merged | 2026-03-20 |  |
| [!242](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/242) | [AI] Refactor: S14P21D208-152 뉴스 크롤링 데스크탑으로 이전 | 이혜민 | `refactor/ai/news-pipeline-optimize`→`dev-ai` | merged | 2026-03-20 | 💬2 |
| [!243](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/243) | [AI] Feat: S14P21D208-124 의장 포트폴리오 회계 컬럼 계약 추가 | 최규직 | `feature/ai/S14P21D208-159-chairman-contract`→`dev-ai` | merged | 2026-03-20 | 💬1 |
| [!244](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/244) | [BE] Feat: S14P21D208-124 의장 포트폴리오 회계 계약 선반영 | 최규직 | `feature/be/S14P21D208-159-chairman-contract`→`dev-backend` | merged | 2026-03-20 | 💬1 |
| [!245](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/245) | [AI] Fix: S14P21D208-94 뉴스 파이프라인에 published_at NULL 배치 복구 추가 | 이혜민 | `fix/ai/null-published-at-recovery`→`dev-ai` | merged | 2026-03-20 | 💬1 |
| [!246](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/246) | [AI] Fix: S14P21D208-152 네이버 금융 크롤링 Referer 헤더 추가 및 종목명 오타 수정 | 이혜민 | `fix/ai/naver-finance-referer`→`dev-ai` | merged | 2026-03-20 |  |
| [!247](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/247) | [FE] fix : S14P21D208-178 뉴스 리스트 api 연동 및 많이 찾는 뉴스 키워드 api 연동 | 정준용 | `fix/fe/news-list-ui`→`dev-frontend` | merged | 2026-03-21 |  |
| [!248](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/248) | [AI] Fix: S14P21D208-115 Settings extra 필드 허용으로 .env 호환성 수정 | 이혜민 | `fix/ai/settings-extra-ignore`→`dev-ai` | merged | 2026-03-21 |  |
| [!249](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/249) | [AI] Feat: S14P21D208-94 agent_data_builder 종목별 배치 실행 지원 | 이혜민 | `feature/ai/agent-data-stock-filter`→`dev-ai` | merged | 2026-03-21 |  |
| [!250](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/250) | [AI] Refactor: S14P21D208-115 에이전트 데이터 Redis 저장 제거 및 워커 무한루프 방지 | 이혜민 | `refactor/ai/worker-redis-removal-loop-fix`→`dev-ai` | merged | 2026-03-21 |  |
| [!251](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/251) | [AI] Feat: S14P21D208-124 의장 백테스팅 replay 및 debate worker 백필 연동 | 최규직 | `feature/ai/S14P21D208-124-replay-worker`→`dev-ai` | merged | 2026-03-21 |  |
| [!252](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/252) | [AI] Fix: S14P21D208-124 news agent 모델 중복 선언 제거 | 최규직 | `feature/ai/S14P21D208-124-replay-worker`→`dev-ai` | merged | 2026-03-21 |  |
| [!253](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/253) | [AI] Fix: S14P21D208-124 debate 공용 테이블 중복 매핑 보정 | 최규직 | `feature/ai/S14P21D208-124-replay-worker`→`dev-ai` | merged | 2026-03-21 |  |
| [!254](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/254) | [AI] Fix: S14P21D208-124 공용 테이블 extend_existing 추가 보정 | 최규직 | `feature/ai/S14P21D208-124-replay-worker`→`dev-ai` | merged | 2026-03-21 |  |
| [!255](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/255) | Fix/fe/news list ui | 정준용 | `fix/fe/news-list-ui`→`dev-frontend` | merged | 2026-03-21 |  |
| [!256](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/256) | [AI] Fix: S14P21D208-124 debate latest 기준 및 worker 토론 안정화 | 최규직 | `feature/ai/S14P21D208-124-replay-worker`→`dev-ai` | merged | 2026-03-21 |  |
| [!257](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/257) | [AI] Fix: S14P21D208-190 스케줄러 파이프라인 실행 후 메모리 미해제 수정 | 장호정 | `fix/ai/S14P21D208-190-scheduler-memory-leak`→`dev-ai` | merged | 2026-03-22 | 💬1 |
| [!258](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/258) | [AI] Feat: S14P21D208-191 파이프라인 완료 시그널 파일 생성 | 장호정 | `feature/ai/pipeline-completion-signal`→`dev-ai` | merged | 2026-03-22 | 💬1 |
| [!259](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/259) | [AI] Feat: S14P21D208-191 ML 추론 시 파이프라인 시그널 확인 | 장호정 | `feature/ai/ml-pipeline-signal-consumer`→`dev-ai` | merged | 2026-03-22 | 💬1 |
| [!260](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/260) | [AI] Fix: S14P21D208-152 임베딩 모델 싱글턴 로딩 및 agent_data_builder import 경로 수정 | 이혜민 | `fix/ai/embed-singleton-ticker-import`→`dev-ai` | merged | 2026-03-22 |  |
| [!261](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/261) | [BE] Fix: S14P21D208-94 뉴스 목록 조회 publishedAt null 반환 수정 | 이혜민 | `fix/be/news-published-at-null`→`dev-backend` | merged | 2026-03-22 | 💬5 |
| [!262](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/262) | [BE] Feat: TimescaleDB 시세 파이프라인 구축 및 봉 타입 중심 API 리팩터링 | 강지석 | `feature/be/stock-price-timescaledb-pipeline`→`dev-backend` | merged | 2026-03-22 |  |
| [!263](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/263) | [BE] Feat: 시간외 단일가 API 분기 및 주봉/월봉/년봉 자동 집계 스케줄러 | 강지석 | `feature/be/stock-price-timescaledb-pipeline`→`dev-backend` | merged | 2026-03-22 |  |
| [!264](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/264) | [BE] Feat: 관심종목 목록 조회 API에 가격/시그널 데이터 추가 | 강지석 | `feature/be/watchlist-enrich-price-signal`→`dev-backend` | merged | 2026-03-22 |  |
| [!265](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/265) | [BE] Fix: MinIO presigned URL이 내부 주소로 생성되는 문제 수정 | 강지석 | `feature/be/watchlist-enrich-price-signal`→`dev-backend` | merged | 2026-03-22 |  |
| [!266](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/266) | [BE] Fix: MinIO presigned URL 생성 504 에러 수정 | 강지석 | `feature/be/watchlist-enrich-price-signal`→`dev-backend` | merged | 2026-03-22 |  |
| [!267](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/267) | [FE] fix : S14P21D208-178 뉴스페이지 탭 에러 해결 | 정준용 | `fix/fe/news-list-ui`→`dev-frontend` | merged | 2026-03-22 |  |
| [!268](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/268) | [FE] feat : S14P21D208-192 알림 페이지 UI구현 및 수정 | 정준용 | `feat/fe/notification`→`dev-frontend` | merged | 2026-03-22 |  |
| [!269](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/269) | [INFRA] Fix: S14P21D208-32 nginx stale upstream 방지용 런타임 conf 경로 분리 | 최규직 | `fix/infra/s14p21d208-32-nginx-runtime-config`→`infra-common` | merged | 2026-03-22 |  |
| [!270](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/270) | [INFRA] Fix: S14P21D208-32 app nginx stale config 방지용 runtime conf 분리 및 reload 공통화 | 최규직 | `fix/infra/s14p21d208-32-nginx-runtime-config`→`infra-common` | merged | 2026-03-22 |  |
| [!271](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/271) | [INFRA] Fix: S14P21D208-32 dev-ai nginx mount drift 감지 추가 | 최규직 | `fix/infra/s14p21d208-32-nginx-runtime-config`→`infra-common` | merged | 2026-03-22 | 💬1 |
| [!272](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/272) | [BE] Fix: S14P21D208-109 메인 시그널 조회 기준 report_date로 변경 | 이혜민 | `fix/be/main-signals-report-date`→`dev-backend` | merged | 2026-03-22 | 💬4 |
| [!273](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/273) | [AI] Fix: S14P21D208-124 worker LLM 응답 복구 및 언어 검증 보강 | 최규직 | `feature/ai/S14P21D208-124-replay-worker`→`dev-ai` | merged | 2026-03-22 |  |
| [!274](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/274) | [AI] Add: S14P21D208-193 DART 정기공시 메타데이터 수집기 | 장호정 | `feature/ai/collect-announcements`→`dev-ai` | merged | 2026-03-23 | 💬1 |
| [!275](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/275) | [AI] Feat: S14P21D208-194 재무/공시 DB 적재를 파이프라인에 통합 | 장호정 | `feature/ai/loaders-pipeline-integration`→`dev-ai` | merged | 2026-03-23 | 💬1 |
| [!276](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/276) | [BE] Feat: S14P21D208-195, S14P21D208-196 종목 상세 stock, overview API 구현 | 최규직 | `feature/be/S14P21D208-195-196-stock-apis`→`dev-backend` | merged | 2026-03-23 | 💬2 |
| [!277](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/277) | [BE] Fix: S14P21D208-157 명예의 전당 TOP 5 개수 및 필드명 정리 | 최규직 | `fix/be/S14P21D208-157-hall-of-fame-top5`→`dev-backend` | merged | 2026-03-23 |  |
| [!278](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/278) | [FE] fix : S14P21D208-141 api  재연동하고, 명예의 전당/상단 지표/테마 토큰 추가 | 정준용 | `fix/fe/stocklist`→`dev-frontend` | merged | 2026-03-23 |  |
| [!279](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/279) | [BE] Fix: 종목 상세 API 경로 파라미터를 stockId에서 ticker로 변경 | 강지석 | `feature/be/stock-api-ticker-support`→`dev-backend` | merged | 2026-03-23 |  |
| [!280](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/280) | [BE] Fix: S14P21D208-159 의장 포트폴리오 signal summary 집계 기준 보정 | 최규직 | `fix/be/S14P21D208-159-chairman-signal-summary`→`dev-backend` | merged | 2026-03-23 |  |
| [!281](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/281) | [BE] Fix: 관심종목 목록 조회 API를 SSE 응답으로 변경 | 강지석 | `feature/be/stock-api-ticker-support`→`dev-backend` | merged | 2026-03-23 |  |
| [!282](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/282) | [BE] Fix: 관심종목 SSE 응답 비동기 전송으로 변경 | 강지석 | `feature/be/stock-api-ticker-support`→`dev-backend` | merged | 2026-03-23 |  |
| [!283](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/283) | [AI] Add: S14P21D208-216 누락 기간 일괄 추론 캐치업 스크립트 | 장호정 | `feature/ai/ml-pipeline-signal-consumer`→`dev-ai` | merged | 2026-03-23 | 💬1 |
| [!284](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/284) | [FE] Feat: S14P21D208-186 포트폴리오 상세 API 연동 | 장호정 | `feature/fe/portfolio-stock-api`→`dev-frontend` | merged | 2026-03-23 | 💬2 |
| [!285](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/285) | [BE] Feat: S14P21D208-215 뉴스 목록 조회 기간 필터 및 totalCount 추가 | 이혜민 | `feature/be/news-date-filter-totalcount`→`dev-backend` | merged | 2026-03-23 | 💬2 |
| [!286](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/286) | [BE] Fix: 관심종목 SSE 응답에서 ApiResponse 래핑 제거 | 강지석 | `feature/be/stock-api-ticker-support`→`dev-backend` | merged | 2026-03-23 |  |
| [!287](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/287) | [BE] Fix: 관심종목 SSE를 단발성 ResponseEntity로 변경 | 강지석 | `feature/be/stock-api-ticker-support`→`dev-backend` | merged | 2026-03-23 |  |
| [!288](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/288) | [BE] Fix: prices/stream SSE 401 에러 수정 및 Swagger 태그 정리 | 강지석 | `fix/be/stock-stream-auth-swagger`→`dev-backend` | merged | 2026-03-23 |  |
| [!289](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/289) | [BE] Refactor: 분봉 데이터를 KIS REST API 기반으로 전환 및 SSE 구독 생명주기 관리 | 강지석 | `feature/be/stock-minute-rest-sse-lifecycle`→`dev-backend` | merged | 2026-03-23 |  |
| [!290](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/290) | [BE] Refactor: /quote를 SSE로 전환하고 /prices/stream 삭제 | 강지석 | `feature/be/quote-sse-consolidation`→`dev-backend` | merged | 2026-03-23 |  |
| [!291](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/291) | [BE] Fix: S14P21D208-215 startDateTime null 파라미터 타입 추론 실패 수정 | 이혜민 | `feature/be/news-date-filter-totalcount`→`dev-backend` | merged | 2026-03-24 | 💬1 |
| [!292](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/292) | [BE] Fix: S14P21D208-215 뉴스 목록 조회 성능 개선 인덱스 추가 | 이혜민 | `feature/be/news-date-filter-totalcount`→`dev-backend` | merged | 2026-03-24 |  |
| [!293](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/293) | [BE] Refactor: API 경로 정리 — REST/SSE 엔드포인트 분리 | 강지석 | `feature/be/api-route-cleanup`→`dev-backend` | merged | 2026-03-24 |  |
| [!294](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/294) | [BE] Feat: 분봉 데이터를 DB 기반으로 전환 — 스케줄러 저장 + DB 조회 | 강지석 | `feature/be/api-route-cleanup`→`dev-backend` | merged | 2026-03-24 |  |
| [!295](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/295) | [AI] Fix: S14P21D208-218 뉴스 URL 정규화로 종목별 중복 저장 방지 | 이혜민 | `fix/ai/news-url-normalize`→`dev-ai` | merged | 2026-03-24 | 💬2 |
| [!296](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/296) | [BE] Fix: 분봉 스케줄러 디버그 로그 추가 | 강지석 | `feature/be/api-route-cleanup`→`dev-backend` | merged | 2026-03-24 |  |
| [!297](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/297) | [AI] Fix: S14P21D208-217 엔드포인트 /ai prefix 통일 | 장호정 | `feature/ai/endpoint-refactor`→`dev-ai` | merged | 2026-03-24 |  |
| [!298](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/298) | [BE] Fix: 분봉 스케줄러 개선 — @Transactional 범위 축소, fullLoad 제거 | 강지석 | `feature/be/api-route-cleanup`→`dev-backend` | merged | 2026-03-24 |  |
| [!299](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/299) | [AI] Fix: S14P21D208-219 데일리 추론 파이프라인 통합 버그 수정 | 장호정 | `feature/ai/inference-server-integration-test`→`dev-ai` | merged | 2026-03-24 | 💬1 |
| [!300](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/300) | [AI] Fix: S14P21D208-152 파이프라인 완료 신호 status DONE으로 변경 | 이혜민 | `fix/ai/news-url-normalize`→`dev-ai` | merged | 2026-03-24 |  |
| [!301](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/301) | [BE] Fix: S14P21D208-202 시그널 API 카테고리 및 시가총액 추가 | 최규직 | `fix/be/s14p21d208-202-signals-market-cap`→`dev-backend` | merged | 2026-03-24 |  |
| [!302](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/302) | [BE] Feat: S14P21D208-218 뉴스 전체 기사 수 Redis 캐싱 | 이혜민 | `feature/be/news-redis-total-count`→`dev-backend` | merged | 2026-03-24 | 💬4 |
| [!303](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/303) | [BE] Fix: 분봉 조회 시 KIS 응답의 영업일자(stck_bsop_date) 사용 | 강지석 | `feature/be/api-route-cleanup`→`dev-backend` | merged | 2026-03-24 |  |
| [!304](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/304) | [BE] Fix: S14P21D208-202 시그널 API 시가총액 필터 추가 | 최규직 | `fix/be/s14p21d208-202-signals-market-cap`→`dev-backend` | merged | 2026-03-24 | 💬1 |
| [!305](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/305) | [BE] Fix: prices 엔드포인트 candleType 파라미터를 snake_case(candle_type)로 변경 | 강지석 | `feature/be/api-route-cleanup`→`dev-backend` | merged | 2026-03-24 |  |
| [!306](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/306) | [BE] Fix: S14P21D208-218 캐시 miss 시 DB fallback 결과 Redis에 저장 + 테스트 추가 | 이혜민 | `feature/be/news-redis-total-count`→`dev-backend` | merged | 2026-03-24 | 💬2 |
| [!307](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/307) | [BE] Fix: SSE 엔드포인트에서 GlobalExceptionHandler ApiResponse 직렬화 오류 수정 | 강지석 | `feature/be/fix-sse-exception-handler`→`dev-backend` | merged | 2026-03-24 |  |
| [!308](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/308) | [FE] Feat: S14P21D208-197 report 상세 페이지 및 토론/TTS/성과 시각화 기능 구현 | 송민경 | `feature/fe/discussion-ui`→`dev-frontend` | merged | 2026-03-24 | 💬5 |
| [!309](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/309) | [BE] Fix: S14P21D208-220 S14P21D208-221 S14P21D208-222 report API 응답 및 검증 보정 | 최규직 | `fix/be/report-api-220-221-222`→`dev-backend` | merged | 2026-03-24 | 💬2 |
| [!310](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/310) | [AI] Feat: S14P21D208-218 기존 stock_news URL 정규화 마이그레이션 스크립트 추가 | 이혜민 | `fix/ai/news-url-normalize`→`dev-ai` | merged | 2026-03-24 | 💬5 |
| [!311](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/311) | [FE] fix : S14P21D208-136 종목 상세 api 수정 | 정준용 | `fix/fe/portfolio-ui`→`dev-frontend` | merged | 2026-03-24 | 💬2 |
| [!312](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/312) | [BE] Fix: SSE quote 초기 시세 실패 시 스트림 유지하도록 변경 | 강지석 | `feature/be/fix-sse-exception-handler`→`dev-backend` | merged | 2026-03-24 |  |
| [!313](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/313) | [BE] Fix: SSE quote 종목명 null일 때 ConcurrentHashMap NPE 방지 | 강지석 | `feature/be/fix-sse-exception-handler`→`dev-backend` | merged | 2026-03-24 |  |
| [!314](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/314) | [BE] Fix: SSE 콜백 덮어쓰기로 WebSocket 구독 해제 안 되는 버그 수정 | 강지석 | `feature/be/fix-sse-exception-handler`→`dev-backend` | merged | 2026-03-24 |  |
| [!315](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/315) | [AI] Fix: S14P21D208-218 마이그레이션 STEP5 검증 쿼리 수정 | 이혜민 | `fix/ai/news-url-normalize`→`dev-ai` | merged | 2026-03-24 |  |
| [!316](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/316) | [BE] Perf: S14P21D208-218 뉴스 쿼리 GROUP BY url 서브쿼리 제거 | 이혜민 | `feature/be/news-redis-total-count`→`dev-backend` | merged | 2026-03-24 | 💬2 |
| [!317](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/317) | [BE] Refactor: 종목 상세 API 경로 변수 ticker → stockId로 변경 | 강지석 | `feature/be/stock-api-stockid-path`→`dev-backend` | merged | 2026-03-24 |  |
| [!318](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/318) | [BE] Refactor: 종목 기본 정보, 주가 차트 API 경로 변수 ticker → stockId로 변경 | 강지석 | `feature/be/stock-api-stockid-path`→`dev-backend` | merged | 2026-03-24 |  |
| [!319](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/319) | [BE] Feat: S14P21D208-214 관심종목 뉴스 API 리팩토링 | 이혜민 | `feature/be/watchlist-news-api-refactor`→`dev-backend` | merged | 2026-03-24 | 💬2 |
| [!320](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/320) | [AI] Feat: S14P21D208-201 S14P21D208-204 daily debate-portfolio pipeline orchestrator 추가 | 최규직 | `feature/ai/daily-pipeline-orchestrator`→`dev-ai` | merged | 2026-03-24 | 💬2 |
| [!321](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/321) | [FE] Feat: S14P21D208-223 MSW node server 설정 및 report mock 분기 제거 | 장호정 | `feature/fe/msw-server-setup`→`dev-frontend` | merged | 2026-03-24 | 💬1 |
| [!322](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/322) | [BE] Fix: 시간외 단일가 API 제거, 항상 정규장 종가 기준 시세 캐시 유지 | 강지석 | `feature/be/stock-api-stockid-path`→`dev-backend` | merged | 2026-03-24 |  |
| [!323](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/323) | [FE] Refactor: S14P21D208-223 코드리뷰 피드백 반영 dead code 제거 | 장호정 | `feature/fe/msw-server-setup`→`dev-frontend` | merged | 2026-03-24 |  |
| [!324](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/324) | [FE] fix : S14P21D208-133 path-variablestockId 수정 | 정준용 | `fix/fe/portfolio-ui`→`dev-frontend` | merged | 2026-03-24 |  |
| [!325](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/325) | [FE] fix : S14P21D208-133 CI 에러  수정 | 정준용 | `fix/fe/portfolio-ui`→`dev-frontend` | merged | 2026-03-24 |  |
| [!326](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/326) | [BE] Fix: S14P21D208-202 의장 포트폴리오 전일 수익률 보정 | 최규직 | `fix/be/chairman-portfolio-yesterday-return`→`dev-backend` | merged | 2026-03-24 | 💬2 |
| [!327](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/327) | [AI] Docs: S14P21D208-152 뉴스 파이프라인 README 전면 업데이트 | 이혜민 | `docs/ai/news-pipeline-readme-update`→`dev-ai` | merged | 2026-03-24 |  |
| [!328](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/328) | [FE] Feat: S14P21D208-186,198,224 포트폴리오 상세페이지 API 연동, 차트 구현, SSR 인증 쿠키 | 장호정 | `feature/fe/portfolio-stock-api`→`dev-frontend` | merged | 2026-03-24 | 💬1 |
| [!329](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/329) | [FE] fix : S14P21D208-141 포트폴리오 말 ui     정 | 정준용 | `fix/fe/portfolio-ui`→`dev-frontend` | merged | 2026-03-24 |  |
| [!330](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/330) | [FE] fix : S14P21D208-136 종목 상세 관심종목 추가 | 정준용 | `fix/fe/portfolio-ui`→`dev-frontend` | merged | 2026-03-24 |  |
| [!331](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/331) | [AI] Fix: S14P21D208-194 psycopg2-binary 의존성 누락 수정 | 장호정 | `fix/ai/psycopg2-dependency`→`dev-ai` | merged | 2026-03-25 |  |
| [!332](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/332) | [BE] Fix: SSE quote cleanup 중복 실행으로 재구독 안 되는 버그 수정 | 강지석 | `fix/be/sse-quote-double-cleanup`→`dev-backend` | merged | 2026-03-25 |  |
| [!333](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/333) | [BE] Fix: broadcast에서 dead emitter 감지 시 cleanup 콜백 직접 실행 | 강지석 | `fix/be/sse-quote-double-cleanup`→`dev-backend` | merged | 2026-03-25 |  |
| [!334](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/334) | [AI] Fix: S14P21D208-194 psycopg2-binary 의존성 변경 | 장호정 | `fix/ai/psycopg2-dependency`→`dev-ai` | merged | 2026-03-25 |  |
| [!335](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/335) | [AI] Fix: S14P21D208-201 중복 debate 타겟 선행 스킵 추가 | 최규직 | `fix/ai/s14p21d208-201-debate-target-skip`→`dev-ai` | merged | 2026-03-25 |  |
| [!336](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/336) | [BE] Fix: UNSUBSCRIBE ACK가 재구독의 pendingFuture를 가로채는 race condition 수정 | 강지석 | `fix/be/sse-quote-double-cleanup`→`dev-backend` | merged | 2026-03-25 |  |
| [!337](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/337) | [BE] Fix: S14P21D208-202 의장 포트폴리오 응답 필드 보강 | 최규직 | `fix/be/s14p21d208-202-chairman-portfolio-fields`→`dev-backend` | merged | 2026-03-25 | 💬1 |
| [!338](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/338) | [FE] fix : S14P21D208-60 뉴스 페이지의 관심종목 뉴스 연동 수정 | 정준용 | `fix/fe/api-connect`→`dev-frontend` | merged | 2026-03-25 |  |
| [!339](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/339) | [BE] Fix: S14P21D208-202 의장 포트폴리오 시그널 집계 보정 | 최규직 | `fix/be/s14p21d208-202-chairman-portfolio-fields`→`dev-backend` | merged | 2026-03-25 |  |
| [!340](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/340) | [BE] Chore: Access Token 만료 시간 15분 → 1시간으로 변경 | 강지석 | `chore/be/extend-access-token-expiration`→`dev-backend` | merged | 2026-03-25 |  |
| [!341](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/341) | [FE] Feat: S14P21D208-224 SSR prefetch 인증 쿠키 및 직접 백엔드 fetch 구현 | 장호정 | `feature/fe/portfolio-stock-api`→`dev-frontend` | merged | 2026-03-25 | 💬1 |
| [!342](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/342) | [AI] Feat: S14P21D208-212 agent_data JSONB에 keyword_id, publisher 필드 추가 | 이혜민 | `fix/ai/news-url-normalize`→`dev-ai` | merged | 2026-03-25 | 💬1 |
| [!343](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/343) | [BE] Fix: S14P21D208-202 search API 인증 정리 | 최규직 | `fix/be/s14p21d208-202-search-auth`→`dev-backend` | merged | 2026-03-25 | 💬1 |
| [!344](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/344) | [BE] Refactor: 관심종목 목록 조회 가짜 SSE → REST GET 변환 | 강지석 | `refactor/be/watchlist-sse-to-rest`→`dev-backend` | merged | 2026-03-25 | 💬1 |
| [!345](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/345) | [BE] Feat: S14P21D208-212 종목 키워드 API를 agent_data JSONB + Redis 캐시 방식으로 전면 개편 | 이혜민 | `feature/be/watchlist-news-api-refactor`→`dev-backend` | merged | 2026-03-25 | 💬5 |
| [!346](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/346) | [FE] fix: S14P21D208-87 error 수정 | 정준용 | `fix/fe/porfolio-detail-error`→`dev-frontend` | merged | 2026-03-25 |  |
| [!347](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/347) | [AI] Feat: S14P21D208-225 파이프라인 시그널 API 엔드포인트 구현 | 장호정 | `feature/ai/pipeline-signal-api`→`dev-ai` | merged | 2026-03-25 | 💬1 |
| [!348](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/348) | [AI] Fix: S14P21D208-225 코드 리뷰 이슈 수정 | 장호정 | `feature/ai/pipeline-signal-api`→`dev-ai` | merged | 2026-03-25 |  |
| [!349](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/349) | [FE] Fix: S14P21D208-186 배포 환경 API 응답 envelope unwrap 처리 | 장호정 | `feature/fe/envelope-unwrap`→`dev-frontend` | merged | 2026-03-25 |  |
| [!350](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/350) | [FE] Fix: S14P21D208-186 배포 환경 toLocaleString undefined 크래시 수정 | 장호정 | `feature/fe/envelope-unwrap`→`dev-frontend` | merged | 2026-03-25 |  |
| [!351](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/351) | [AI] Feat: S14P21D208-226 ML 추론 파이프라인 시그널 발행 연동 | 장호정 | `feature/ai/ml-pipeline-signal-integration`→`dev-ai` | merged | 2026-03-25 | 💬1 |
| [!352](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/352) | [BE] Fix: S14P21D208-202 종목 성과 API 수익률 계산 보정 | 최규직 | `fix/be/s14p21d208-202-report-performance-return`→`dev-backend` | merged | 2026-03-25 |  |
| [!353](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/353) | [FE] Fix: S14P21D208-186 배포 환경 null/undefined 크래시 방어 처리 | 장호정 | `feature/fe/envelope-unwrap`→`dev-frontend` | merged | 2026-03-25 |  |
| [!354](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/354) | [BE] Feat: S14P21D208-212 키워드 응답 구조를 키워드별 뉴스 중첩 방식으로 변경 | 이혜민 | `feature/be/watchlist-news-api-refactor`→`dev-backend` | merged | 2026-03-25 |  |
| [!355](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/355) | [FE] fix : S14P21D208-133 포트폴리오/관심종목/종목상세/메인 페이지를 실서버 계약과 화면 요구사항에 맞게 정리 | 정준용 | `fix/fe/total-api`→`dev-frontend` | merged | 2026-03-25 |  |
| [!356](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/356) | [FE] fix : S14P21D208-176 검색 모달창 인기 검색어 추가 및 메인페이지 인기검색어 api연동 및 전체종목 hover 재적용 | 정준용 | `fix/fe/search-modal-ui`→`dev-frontend` | merged | 2026-03-26 | 💬1 |
| [!357](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/357) | [FE] Refactor: S14P21D208-186 fetch/변환 분리, select 패턴 적용 및 직접 백엔드 통신 | 장호정 | `feature/fe/envelope-unwrap`→`dev-frontend` | merged | 2026-03-26 | 💬2 |
| [!358](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/358) | [FE] Feat: S14P21D208-227 proxy.ts에서 SSR용 accessToken 쿠키 자동 갱신 | 장호정 | `feature/fe/proxy-access-token`→`dev-frontend` | merged | 2026-03-26 | 💬1 |
| [!359](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/359) | [BE] Refactor: S14P21D208-109 메인 API 리팩토링 (top-stocks GET 전환, 관심종목 여부 추가, PORTFOLIO_DONE 신호 기반 갱신) | 이혜민 | `feature/be/watchlist-news-api-refactor`→`dev-backend` | merged | 2026-03-26 | 💬3 |
| [!360](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/360) | Revert: [FE] S14P21D208-227 proxy.ts accessToken 쿠키 자동 갱신 되돌림 | 장호정 | `revert/fe/proxy-access-token`→`dev-frontend` | merged | 2026-03-26 |  |
| [!361](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/361) | [BE] Fix: 일봉 누락 자동 복구 서비스 추가 (컨테이너 재시작 대응) | 강지석 | `fix/be/daily-candle-recovery`→`dev-backend` | merged | 2026-03-26 | 💬2 |
| [!362](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/362) | [BE] Fix: 관심종목 조회 시 price/signal/confidence null 문제 수정 | 강지석 | `fix/be/watchlist-signal-null`→`dev-backend` | merged | 2026-03-26 | 💬1 |
| [!363](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/363) | [BE] Feat: S14P21D208-202 report trades cycle 응답 추가 | 최규직 | `fix/be/s14p21d208-202-report-trade-cycles`→`dev-backend` | merged | 2026-03-26 |  |
| [!364](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/364) | [BE] Fix: S14P21D208-202 의장 포트폴리오 월간 수익 기준 통일 | 최규직 | `fix/be/s14p21d208-202-report-trade-cycles`→`dev-backend` | merged | 2026-03-26 | 💬1 |
| [!365](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/365) | [BE] Fix: 스케줄러 스레드 풀 크기 1→4 설정 (분봉 수집 중단 방지) | 강지석 | `fix/be/scheduler-thread-starvation`→`dev-backend` | merged | 2026-03-26 |  |
| [!366](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/366) | [BE] Feat: S14P21D208-228 종목 아이콘 URL 지원 추가 | 이혜민 | `feature/be/watchlist-news-api-refactor`→`dev-backend` | merged | 2026-03-26 | 💬5 |
| [!367](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/367) | [BE] Fix: S14P21D208-108 search api 응답 보완 | 최규직 | `fix/be/s14p21d208-108-search-api`→`dev-backend` | merged | 2026-03-26 | 💬2 |
| [!368](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/368) | [INFRA] Fix: S14P21D208-108 search api pg_trgm 준비 | 최규직 | `fix/infra/s14p21d208-108-search-api`→`infra-common` | merged | 2026-03-26 |  |
| [!369](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/369) | [BE] Fix: S14P21D208-202 support DATE buy_date for holding days | 최규직 | `fix/be/s14p21d208-202-report-trade-cycles`→`dev-backend` | merged | 2026-03-26 | 💬1 |
| [!370](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/370) | [BE] Fix: 코드 리뷰 반영 — 프로필 이미지 삭제 타이밍, 관심종목 동시성, 알림 limit 상한 | 강지석 | `fix/be/code-review-feedback`→`dev-backend` | merged | 2026-03-26 | 💬1 |
| [!371](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/371) | [FE] Feat: 포트폴리오 상세 API 개선 및 trade_cycles 전환 | 장호정 | `feature/fe/api-default-params`→`dev-frontend` | merged | 2026-03-26 | 💬1 |
| [!372](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/372) | [BE] Fix: S14P21D208-108 search 조건 재정의 | 최규직 | `fix/be/s14p21d208-108-search-api`→`dev-backend` | merged | 2026-03-26 | 💬4 |
| [!373](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/373) | [BE] Feat: S14P21D208-213 실시간 인기 검색 종목 TOP5 SSE API 추가 | 이혜민 | `feature/be/trending-stocks`→`dev-backend` | merged | 2026-03-26 | 💬6 |
| [!374](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/374) | [AI] Fix: S14P21D208-216 catchup 스크립트 GARCH predictions 누락 수정 | 장호정 | `fix/ai/catchup-garch-missing`→`dev-ai` | merged | 2026-03-26 | 💬2 |
| [!375](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/375) | [BE] Feat: 알림 생성 스케줄러 구현 — 급등락/매매신호/공시 알림 + SSE 실시간 푸시 | 강지석 | `feature/be/notification-scheduler`→`dev-backend` | merged | 2026-03-26 | 💬3 |
| [!376](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/376) | [BE] Fix: 관심종목 추가 500 에러 수정 — COUNT + FOR UPDATE PostgreSQL 호환 | 강지석 | `fix/be/watchlist-count-for-update`→`dev-backend` | merged | 2026-03-26 | 💬1 |
| [!377](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/377) | [FE] fix : S14P21D208-133 메인 페이지 홈 데이터 연동과 관심종목 처리 구조를 서버 스펙에 맞게 정리하고, 홈/포트폴리오 UI 배치를 함께 보정 | 정준용 | `fix/fe/total-api`→`dev-frontend` | merged | 2026-03-26 |  |
| [!378](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/378) | [BE] Fix: S14P21D208-109 top-stocks 쿼리 최적화 (22초 → 0.1초) | 이혜민 | `fix/be/top-stocks-query-optimization`→`dev-backend` | merged | 2026-03-26 | 💬1 |
| [!379](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/379) | [BE] Fix: S14P21D208-202 holding_days 날짜 변환 타입 보강 | 최규직 | `fix/be/s14p21d208-202-holding-days-null-v2`→`dev-backend` | merged | 2026-03-26 | 💬1 |
| [!380](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/380) | [BE] Fix: SSE 알림 푸시 시 읽지 않은 알림 수(unreadCount) 포함 | 강지석 | `fix/be/sse-unread-count`→`dev-backend` | merged | 2026-03-26 |  |
| [!381](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/381) | [FE] Feat: S14P21D208-229 포트폴리오 상세 관심종목 버튼 및 투자금 계산기 구현 | 장호정 | `feature/fe/portfolio-watchlist-calculator`→`dev-frontend` | merged | 2026-03-26 | 💬1 |
| [!382](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/382) | [BE] Fix: S14P21D208-228 StockIconUrlResolver에서 bucket 중복 제거 | 이혜민 | `fix/be/icon-url-resolver-bucket-fix`→`dev-backend` | merged | 2026-03-26 |  |
| [!383](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/383) | [INFRA] Fix: S14P21D208-203 gateway assets 경로를 minio 내부 네트워크로 전환 | 최규직 | `fix/infra/minio-assets-gateway-route`→`infra-common` | merged | 2026-03-26 |  |
| [!384](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/384) | [BE] Feat: S14P21D208-213 trending 응답에 가격/변동률/iconUrl 추가 및 Redis 캐싱 | 이혜민 | `feature/be/trending-stocks`→`dev-backend` | merged | 2026-03-26 | 💬2 |
| [!385](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/385) | [BE] Fix: S14P21D208-202 support DATE published_at in search | 최규직 | `fix/be/search-published-at`→`dev-backend` | merged | 2026-03-26 | 💬1 |
| [!386](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/386) | [FE] fix : S14P21D208-133 메인페이지 모바일 화면 top10 배경 순서 변경 | 정준용 | `fix/fe/total-api`→`dev-frontend` | merged | 2026-03-26 |  |
| [!387](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/387) | [AI] Fix: S14P21D208-204 daily pipeline ML 완료 신호 체크 추가 | 최규직 | `fix/ai/s14p21d208-204-daily-ml-signal`→`dev-ai` | merged | 2026-03-26 | 💬1 |
| [!388](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/388) | [FE] fix : S14P21D208-133 종목상세 UI 수정 | 정준용 | `fix/fe/total-api`→`dev-frontend` | merged | 2026-03-26 |  |
| [!389](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/389) | [FE] fix : S14P21D208-133 종목 로고 연동 | 정준용 | `fix/fe/total-api`→`dev-frontend` | merged | 2026-03-26 |  |
| [!390](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/390) | [FE] fix : S14P21D208-133 관심종목 hover 범위  수정 | 정준용 | `fix/fe/total-api`→`dev-frontend` | merged | 2026-03-26 |  |
| [!391](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/391) | [BE] Fix: S14P21D208-202 unify search published_at datetime conversion | 최규직 | `fix/be/search-published-at`→`dev-backend` | merged | 2026-03-27 |  |
| [!392](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/392) | [FE] Feat: ABOUT 페이지 소개 섹션 UI 및 콘텐츠 구조 개선 | 송민경 | `feature/fe/aboutpage-ui`→`dev-frontend` | merged | 2026-03-27 |  |
| [!393](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/393) | [BE] Fix: S14P21D208-202 signals category keyword filter 적용 | 최규직 | `fix/be/s14p21d208-202-signal-filters`→`dev-backend` | merged | 2026-03-27 |  |
| [!394](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/394) | [BE] Fix: 알림 타입 SURGE_PLUNGE를 SURGE/PLUNGE로 분리 및 SSE에 createdAt 추가 | 강지석 | `fix/be/split-surge-plunge-noti-type`→`dev-backend` | merged | 2026-03-27 | 💬3 |
| [!395](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/395) | [FE] Feat: S14P21D208-230 과거 토론 기록 모달 및 품질 개선 | 장호정 | `feature/fe/portfolio-past-discussions`→`dev-frontend` | merged | 2026-03-27 | 💬2 |
| [!396](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/396) | [BE] Fix: TRADE_SIGNAL을 SIGNAL_BUY/SIGNAL_SELL로 분리 및 FE 응답값 정렬 | 강지석 | `fix/be/split-surge-plunge-noti-type`→`dev-backend` | merged | 2026-03-27 | 💬1 |
| [!397](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/397) | [BE] Fix: V20 체크섬 복원 및 TRADE_SIGNAL 마이그레이션을 V21로 분리 | 강지석 | `fix/be/split-surge-plunge-noti-type`→`dev-backend` | merged | 2026-03-27 | 💬1 |
| [!398](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/398) | [BE] Fix: 알림 created_at null 응답 수정 - toOffsetDateTime 타입 변환 보강 | 강지석 | `fix/be/split-surge-plunge-noti-type`→`dev-backend` | merged | 2026-03-27 | 💬1 |
| [!399](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/399) | [BE] Fix: 개별 알림 읽음 처리 엔드포인트 경로 수정 | 강지석 | `fix/be/split-surge-plunge-noti-type`→`dev-backend` | merged | 2026-03-27 |  |
| [!400](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/400) | [FE] fix : S14P21D208-133 알림 페이지 bulk 액션을 서버 스펙에 맞게 body 기반으로 정리 | 정준용 | `fix/fe/total-api-ui`→`dev-frontend` | merged | 2026-03-27 |  |
| [!401](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/401) | [FE] Feat: S14P21D208-231 report detail debate process refactor | 장호정 | `feature/fe/report-edit`→`dev-frontend` | merged | 2026-03-27 | 💬1 |
| [!402](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/402) | [FE] fix : S14P21D208-133 포트폴리오 적중률 -> 월간 수익률 수정 | 정준용 | `fix/fe/total-ui-api`→`dev-frontend` | merged | 2026-03-28 |  |
| [!403](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/403) | [FE] fix : S14P21D208-133 파비콘 및 웹 문구 수정 | 정준용 | `fix/fe/total-ui-api`→`dev-frontend` | merged | 2026-03-28 |  |
| [!404](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/404) | [BE] Fix: S14P21D208-202 support DATE published_at in search | 최규직 | `fix/be/s14p21d208-202-chairman-portfolio`→`dev-backend` | closed | 2026-03-28 |  |
| [!405](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/405) | [BE] Fix: S14P21D208-202 chairman portfolio trade metrics 개선 | 최규직 | `fix/be/s14p21d208-202-chairman-portfolio`→`dev-backend` | merged | 2026-03-28 |  |
| [!406](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/406) | [BE] Fix: S14P21D208-202 chairman portfolio test compile 오류 수정 | 최규직 | `fix/be/s14p21d208-202-chairman-portfolio-build`→`dev-backend` | merged | 2026-03-28 |  |
| [!407](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/407) | [FE] fix : S14P21D208-133 회원/약관/인증 흐름과 종목 상세 차트·실적 표시를 정리 | 정준용 | `fix/fe/total-ui-api`→`dev-frontend` | merged | 2026-03-28 | 💬2 |
| [!408](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/408) | [BE] Feat: 알림 이메일 발송 기능 추가 | 강지석 | `feature/be/notification-email`→`dev-backend` | merged | 2026-03-28 | 💬1 |
| [!409](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/409) | [BE] Fix: S14P21D208-196 종목 리스트 등락률 정렬 기준 수정 | 최규직 | `fix/be/stocks-fluctuation-order`→`dev-backend` | merged | 2026-03-28 |  |
| [!410](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/410) | [BE] Test: 알림 발행 테스트용 엔드포인트 추가 | 강지석 | `feature/be/notification-email`→`dev-backend` | merged | 2026-03-29 |  |
| [!411](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/411) | [FE] fix : S14P21D208-133 프로필 이미지 업로드를 presigned URL 방식으로 연동하고, 포트폴리오/섹터 표시에서 dev-frontend 대비 의미 불일치와 UI 오류를 함께 정리 | 정준용 | `fix/fe/total-ui-api`→`dev-frontend` | merged | 2026-03-29 | 💬1 |
| [!412](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/412) | [BE] Fix: presigned URL file_url 이중 경로 수정 | 강지석 | `feature/be/notification-email`→`dev-backend` | merged | 2026-03-29 |  |
| [!413](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/413) | [BE] Feat: 알림 이메일 유형별 발송 전략 분리 | 강지석 | `feature/be/notification-email`→`dev-backend` | merged | 2026-03-29 |  |
| [!414](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/414) | [FE] Feat: S14P21D208-231 report detail debate process full improvement | 장호정 | `feature/fe/report-edit`→`dev-frontend` | merged | 2026-03-29 | 💬1 |
| [!415](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/415) | [CHORE] Chore: S14P21D208-203 master 통합 브랜치 검증 및 정리 | 최규직 | `integration/master-ready-20260329`→`master` | merged | 2026-03-29 |  |
| [!416](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/416) | [DOCS] Docs: S14P21D208-203 README 정식 문서화 | 최규직 | `integration/master-ready-20260329`→`master` | merged | 2026-03-29 |  |
| [!417](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/417) | [BE] Fix: presigned URL record 역직렬화 실패 수정 | 강지석 | `feature/be/notification-email`→`dev-backend` | merged | 2026-03-29 |  |
| [!418](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/418) | [BE] Fix: presigned URL file_url 이중 슬래시 제거 | 강지석 | `feature/be/notification-email`→`dev-backend` | merged | 2026-03-29 |  |
| [!419](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/419) | [BE] Fix: presigned URL 서명 Host 불일치로 MinIO 403 수정 | 강지석 | `feature/be/notification-email`→`dev-backend` | merged | 2026-03-29 |  |
| [!420](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/420) | [BE] Fix: presignedMinioClient region 명시로 네트워크 조회 생략 | 강지석 | `feature/be/notification-email`→`dev-backend` | merged | 2026-03-29 |  |
| [!421](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/421) | [FE] Feat: S14P21D208-232 TTS fallback and debate control stabilization | 장호정 | `feature/fe/tts-improvement`→`dev-frontend` | merged | 2026-03-30 | 💬1 |
| [!422](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/422) | [DOCS] Docs: 시연 시나리오 문서 및 스크린샷 추가 | 이혜민 | `feature/exec-scenario`→`master` | merged | 2026-03-30 |  |
| [!423](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/423) | [EXEC] 빌드/배포 가이드, 외부 서비스 정보, DB 스키마 문서 추가 | 강지석 | `feature/exec-docs`→`master` | merged | 2026-03-30 |  |
| [!424](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/424) | [FE] fix : S14P21D208-133 포트폴리오 및 로그아웃시 리액트 캐시 삭제 | 정준용 | `fix/fe/total-ui-api`→`dev-frontend` | merged | 2026-03-30 |  |
| [!425](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/425) | [FE] fix : S14P21D208-133 전체 종목 페이지 초기 로딩 UX 개선 | 정준용 | `fix/fe/total-ui-api`→`dev-frontend` | merged | 2026-03-30 |  |
| [!426](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/426) | [FE] Feat: S14P21D208-233 debate mute feature with persistent settings | 장호정 | `feature/fe/debate-enhancement`→`dev-frontend` | merged | 2026-03-30 | 💬1 |
| [!427](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/427) | [FE] Feat: S14P21D208-233 debate mute and TTS client direct call | 장호정 | `feature/fe/debate-enhancement`→`dev-frontend` | merged | 2026-03-30 |  |
| [!428](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/428) | [FE] fix : S14P21D208-133 종목 상세페이지 배당 섹션 제거 | 정준용 | `fix/fe/stockdetail-ui`→`dev-frontend` | merged | 2026-03-30 |  |
| [!429](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/429) | [FE] Build: Dockerfile ElevenLabs TTS env ARG injection | 장호정 | `feature/fe/debate-enhancement`→`dev-frontend` | merged | 2026-03-30 |  |
| [!430](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/430) | [DOCS] README 팀원 역할 및 작업 내역 추가 | 강지석 | `docs/readme-update-roles`→`master` | merged | 2026-04-03 |  |
| [!431](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/431) | [DOCS] README 팀원 역할 및 작업 내역 추가 | 정준용 | `docs/read-me-update-roles`→`master` | merged | 2026-04-06 |  |
| [!432](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/432) | [DOCS] README 이미지 경로 추가, 송민경 작업 내역 및 노션 링크 추가 | 강지석 | `docs/readme-update-images-and-roles`→`master` | merged | 2026-04-06 |  |
| [!433](https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21D208/-/merge_requests/433) | [DOCS] README 주요 기능 섹션 번호 추가 및 간격 개선 | 강지석 | `docs/readme-update-images-and-roles`→`master` | merged | 2026-04-07 |  |
