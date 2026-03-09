# my_stock_system

AI 파트 보일러플레이트입니다.

## 아키텍처

```
services/ai/
├── shared_resources/          # 공통 리소스 (모든 모듈에서 참조)
│   ├── core/
│   │   ├── base.py            # SQLAlchemy declarative Base
│   │   └── db.py              # DB 엔진 & 세션 팩토리
│   └── domains/
│       ├── stock/models.py    # 종목 ORM 모델
│       ├── news/models.py     # 뉴스 ORM 모델
│       └── finance/models.py  # 재무 ORM 모델
│
├── 1_data_pipeline/           # 데이터 수집 파이프라인
│   ├── stock/                 # 주식 데이터 수집
│   │   ├── collectors/        # OHLCV, 재무제표, 수급, 섹터 등 수집기
│   │   ├── processors/        # 피처 엔지니어링
│   │   ├── validators/        # 데이터 품질 검증
│   │   ├── utils/             # KIS API, KRX 세션, Drive 유틸
│   │   ├── pipeline.py        # 수집 파이프라인 오케스트레이터
│   │   └── scheduler.py       # 스케줄러
│   └── news/                  # 뉴스 크롤링
│       └── spider.py
│
├── 2_ml_pipeline/             # 모델 학습 파이프라인
│   ├── domains/
│   │   ├── stock/             # 주가 예측 모델
│   │   └── news/              # 뉴스 감성 분석 모델
│   ├── features/              # 학습용 피처 빌드
│   ├── models/                # LightGBM 등 학습기
│   └── main_train.py          # 학습 진입점
│
└── 3_ai_server/               # FastAPI 추론 서버
    ├── main.py                # 앱 진입점 (lifespan, 라우터 등록)
    ├── core/
    │   ├── config.py          # pydantic-settings 기반 설정
    │   ├── exceptions.py      # 공통 예외 핸들러
    │   └── logger.py          # 공통 로거 설정
    └── domains/
        ├── stock/             # 종목 추론 API
        │   ├── router.py      # POST /stock/infer
        │   ├── service.py     # 비즈니스 로직
        │   ├── schemas.py     # Request/Response DTO
        │   └── crud.py        # DB 쿼리
        ├── news/              # 뉴스 감성 분석 API
        │   ├── router.py      # POST /news/infer
        │   ├── service.py
        │   ├── schemas.py
        │   └── crud.py
        └── finance/           # 재무 분석 API
            ├── router.py      # POST /finance/infer
            ├── service.py
            ├── schemas.py
            └── crud.py
```

## 데이터 흐름

```
[외부 데이터 소스] → 1_data_pipeline → [DB/Storage]
                                            ↓
                                      2_ml_pipeline → [학습된 모델]
                                                           ↓
                     [Spring Boot] ← 3_ai_server ← [모델 로딩 & 추론]
```

1. **1_data_pipeline**: 외부 API(KIS, KRX 등)와 웹 크롤링으로 주식/뉴스 데이터를 수집하여 DB에 저장
2. **2_ml_pipeline**: 수집된 데이터로 피처를 빌드하고 모델을 학습
3. **3_ai_server**: 학습된 모델을 로딩하여 FastAPI로 추론 API를 제공, Spring Boot 백엔드에서 호출

## 3_ai_server 내부 요청 흐름

```
Client (Spring Boot)
  │
  ▼
router.py       ← 요청 수신, 입력 검증 (Pydantic schema)
  │                 Depends(get_session)으로 DB 세션 주입
  ▼
service.py      ← 비즈니스 로직 처리 (모델 추론, 데이터 가공)
  │                 필요시 crud.py 호출
  ▼
crud.py         ← DB 쿼리 (SQLAlchemy ORM)
  │                 shared_resources의 모델 사용
  ▼
schemas.py      ← Request/Response DTO 정의
                   router ↔ service 간 데이터 전달 규격
```

- **router.py**: FastAPI 엔드포인트 정의. 클라이언트 요청을 받아 `schemas.py`의 Request 모델로 자동 검증한 뒤 `service.py`에 위임
- **service.py**: 핵심 비즈니스 로직. ML 모델 추론, 외부 API 호출, 데이터 후처리 등을 수행. DB 접근이 필요하면 `crud.py`를 호출
- **crud.py**: DB CRUD 전담. `shared_resources`의 ORM 모델과 세션을 사용하여 쿼리 실행
- **schemas.py**: Pydantic 기반 Request/Response DTO. 입력 유효성 검증(`Field` 제약조건)과 응답 직렬화를 담당

## 모듈별 설명

- `shared_resources`: 모든 모듈이 공유하는 DB 연결, ORM 모델 정의. 각 모듈에서 `from shared_resources.core.db import get_session` 형태로 사용
- `1_data_pipeline`: 크롤링/수집 파이프라인. stock(주식 데이터), news(뉴스 데이터) 도메인별로 분리
- `2_ml_pipeline`: 모델 학습 파이프라인. LightGBM 기반 주가 예측, 뉴스 감성 분석 등
- `3_ai_server`: FastAPI 서빙 서버. 도메인별 router → service → crud 계층 구조

## 공통 기능

### 로거
`core/logger.py`에서 공통 로거를 제공합니다. 각 모듈에서 아래처럼 사용:
```python
from core.logger import logger

logger.info("메시지")
logger.warning("경고")
```
- 포맷: `2026-03-09 14:01:19 | INFO    | ai_server | 메시지`
- 기본 레벨: `INFO` (환경변수 `DEBUG=true` 시 `DEBUG`로 전환)

### Health Check
- `GET /health` → `{"status": "OK"}`
- 서버 상태 확인용 엔드포인트

### 예외 처리
`core/exceptions.py`에서 공통 예외 핸들러를 등록합니다.
- `BusinessException(400)`: 비즈니스 로직 예외
- `NotFoundException(404)`: 리소스 없음
- `UnauthorizedException(401)`: 인증 실패
- 미처리 예외 → 500 응답 (`서버 내부 오류가 발생했습니다.`)
