# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Environment

- **Python**: 3.14.x (가상환경 `.venv/` 사용)
- **OS**: Windows 11, shell: Git Bash (Unix 경로 문법 사용)
- **활성화**: `source .venv/Scripts/activate`

패키지 설치 시 반드시 `--only-binary :all:` 플래그 사용 (Python 3.14은 소스 컴파일 대부분 미지원).

## Commands

```bash
# 가상환경 활성화
source .venv/Scripts/activate

# 의존성 설치
pip install --only-binary :all: -r requirements.txt

# 모델 학습 실행
python main_train.py
# → artifacts/stock_price_model.joblib, artifacts/news_sentiment_model.joblib 생성

# AI 서버 실행 (추론 서빙, 3_ai_server에서)
cd ../3_ai_server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Architecture

### 전체 AI 파이프라인 구조

```
services/ai/
├── shared_resources/    공통 DB 모델 (SQLAlchemy ORM) — Stock, StockPrice, StockNews, StockFinancial
├── 1_data_pipeline/     데이터 수집 · 피처 가공 · 품질 검증 (별도 CLAUDE.md 참조)
├── 2_ml_pipeline/       모델 학습 파이프라인 ← 현재 코드베이스
└── 3_ai_server/         FastAPI 추론 서버
```

### 2_ml_pipeline 내부 구조

```
main_train.py                          학습 오케스트레이터 (진입점)
domains/
├── stock/price_predictor.py           주가 예측 모델 학습 (train_price_predictor)
└── news/sentiment_analyzer.py         뉴스 감성 분석 모델 학습 (train_sentiment_analyzer)
artifacts/                             (gitignored) 학습된 모델 산출물 (.joblib)
```

### 데이터 흐름

```
[1_data_pipeline] raw/ → processed/base_features/  (Parquet, MultiIndex: date+ticker)
        ↓
[2_ml_pipeline]  base_features 로드 → 모델 학습 → artifacts/*.joblib 저장
        ↓
[3_ai_server]    artifacts 로드 (lifespan) → FastAPI 엔드포인트로 추론 서빙
```

- 학습 데이터 원본은 `1_data_pipeline`이 생성한 Parquet 파일 (Google Drive `G:/kospi200-project/` 또는 `.env`의 `BASE_PATH`)
- 모델 산출물은 `artifacts/` 디렉토리에 joblib 포맷으로 저장
- `3_ai_server`가 시작 시 `app.state.models`에 모델을 로드하여 `/stock/infer`, `/news/infer`, `/finance/*` 엔드포인트로 서빙

### 공유 리소스

- **DB 연결**: `shared_resources/core/db.py` — `AI_DB_URL` 환경변수 (기본값: `postgresql+psycopg2://app_dev_user:change_me_dev@localhost:5432/app_dev`)
- **ORM 모델**: `shared_resources/domains/` — Stock, StockPrice, StockNews, StockFinancial
- **Base**: `shared_resources/core/base.py` — SQLAlchemy DeclarativeBase

### 추론 서버 엔드포인트 (3_ai_server)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/health` | 헬스 체크 |
| POST | `/stock/infer` | 주가 예측 (signal, confidence) |
| POST | `/news/infer` | 뉴스 감성 분석 (sentiment, score) |
| * | `/finance/*` | 재무 분석 |

### 도메인 모듈 패턴 (3_ai_server)

각 도메인(`stock`, `news`, `finance`)은 동일한 구조를 따른다:
- `router.py` — FastAPI 라우터 (API 엔드포인트)
- `service.py` — 비즈니스 로직 (추론 호출)
- `schemas.py` — Pydantic 요청/응답 스키마

## .env 필수 키

```
AI_DB_URL=postgresql+psycopg2://...    # DB 연결 (기본값 있음, 로컬 개발 시 생략 가능)
BASE_PATH=G:/kospi200-project          # 학습 데이터 경로 (1_data_pipeline과 공유)
```

## Known Constraints

- **현재 스켈레톤**: `price_predictor.py`와 `sentiment_analyzer.py`는 더미 구현 (텍스트 파일 쓰기). 실제 모델 학습 로직 구현 필요.
- **ML 프레임워크**: scikit-learn 기반. `ta` 라이브러리 사용 (pandas-ta는 Python 3.14 미지원, numba 의존).
- **artifacts/ 디렉토리**: `.gitignore`에 등록됨. 모델 파일은 커밋 대상이 아님.
- **setuptools < 81 필요**: `pkg_resources` 호환성 (1_data_pipeline과 동일).

## Commit Convention

```
[AI] {Type}: {Jira-Key} {설명}
```

예시: `[AI] Feat: S14P21D208-72 데이터 수집 파이프라인 조율 구현`
