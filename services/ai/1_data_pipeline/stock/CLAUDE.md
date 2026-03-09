# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Environment

- **Python**: 3.14.x (가상환경 `.venv/` 사용)
- **OS**: Windows 11, shell: Git Bash (Unix 경로 문법 사용)
- **데이터 저장소**: 로컬 디스크 `./data` (기본값), rclone으로 Google Drive 동기화 지원 (`.env`의 `BASE_PATH`로 오버라이드)
- **활성화**: `source .venv/Scripts/activate` (Git Bash 기준)

패키지 설치 시 반드시 `--only-binary :all:` 플래그 사용 (Python 3.14은 소스 컴파일 대부분 미지원).

## .env 필수 키

```
BASE_PATH=./data                        # 선택 (기본값: ./data, Docker: /data)
DART_API_KEY=...                        # 재무 데이터 수집 필수
FRED_API_KEY=...                        # kr_bond_3y 수집 (미설정 시 건너뜀)
KRX_USER_ID=...                         # 수급 수집 (pykrx KRX 세션) 필수
KRX_PASSWORD=...                        # 수급 수집 (pykrx KRX 세션) 필수
KIS_API_KEY=...                         # 수급 수집 (KIS API, 대체 수집기) 선택
KIS_SECRET_KEY=...                      # 수급 수집 (KIS API, 대체 수집기) 선택
RCLONE_REMOTE=gdrive:kospi200-project   # rclone 동기화 대상 (선택)
RCLONE_AUTO_SYNC=false                  # 파이프라인 실행 후 자동 동기화 (선택)
```

## Common Commands

```bash
# 가상환경 활성화
source .venv/Scripts/activate

# 전체 파이프라인 (초기 수집 ~1~2시간)
python pipeline.py --mode initial
python pipeline.py --mode incremental
python pipeline.py --mode incremental --skip-features
python pipeline.py --mode incremental --skip-validation

# 개별 수집기 실행
python collectors/collect_ohlcv.py --initial
python collectors/collect_ohlcv.py --incremental
python collectors/collect_supply_demand_krx.py --initial    # pykrx KRX 세션 방식 (파이프라인 사용)
python collectors/collect_supply_demand_krx.py --incremental
python collectors/collect_supply_demand.py --initial        # KIS Open API 방식 (대체 수집기)
python collectors/collect_supply_demand.py --incremental
python collectors/collect_macro.py --initial
python collectors/collect_macro.py --incremental
python collectors/collect_financial.py --recent 8           # 최근 8분기

# 베이스 피처 생성 (범용, processors/ 담당)
python processors/build_base_features.py

# 데이터 품질 검증
python validators/data_quality.py

# 자동 스케줄러 (매 거래일 16:30 실행)
python scheduler.py
python scheduler.py --run-now   # 즉시 1회 실행

# Drive 폴더 구조 초기화 (최초 1회)
python setup_drive.py
```

## 코드베이스 범위

**이 코드베이스는 데이터 수집 및 범용 피처 가공을 담당합니다.** ML 모델 학습·추론은 별도 저장소에서 담당합니다.

- **범위 내**: `collectors/`, `processors/`, `validators/`, `pipeline.py`, `scheduler.py`
- **범위 외**: `features/` 디렉토리 (build_lgbm_features, build_lstm_sequences, build_garch_returns) — 존재하지만 이 코드베이스에서 유지보수하지 않음

## Architecture

### 데이터 흐름

```
[수집] collectors/ → raw/ (Parquet)
         ↓
[가공] processors/ → processed/base_features/ (Parquet, MultiIndex: date+ticker)
         ↓
[검증] validators/ → 품질 리포트 (JSON)
```

전체 실행은 `pipeline.py`가 조율하며, `scheduler.py`가 매일 자동 실행한다.

### config.py — 중앙 경로 관리

모든 경로 상수(`RAW_OHLCV_PATH`, `RAW_SUPPLY_PATH`, 등)는 `config.py`에 정의되고 `.env`의 `BASE_PATH`에서 파생된다. 새 경로가 필요하면 `config.py`에 추가한다.

- `BASE_PATH` 기본값: `G:/kospi200-project` (`.env`로 오버라이드)
- Google Colab 환경 자동 감지 (`IS_COLAB`), Colab 기본값: `/content/drive/MyDrive/kospi200-project`
- API 키: `DART_API_KEY`, `FRED_API_KEY`, `KRX_USER_ID`, `KRX_PASSWORD`, `KIS_API_KEY`, `KIS_API_SECRET`

### 저장 포맷 — Parquet per Ticker

| 데이터 | 경로 | 파일명 | 내용 |
|--------|------|--------|------|
| OHLCV | `raw/ohlcv/` | `{ticker}.parquet` | 종목별 전체 이력 (2015~, ~2700행) |
| 수급 | `raw/supply_demand/` | `{ticker}.parquet` | 외국인/기관/개인 순매수 + 누적 |
| 매크로 | `raw/macro/` | `{indicator}.parquet` | 지수·환율·금리 단일 시계열 |
| 재무 | `raw/financial/` | `{ticker}_{YYYYMMDD}.parquet` | **날짜 포함** — Point-in-Time 보장 |
| 베이스 피처 | `processed/base_features/` | `base_features.parquet` | MultiIndex: date + ticker |

재무 데이터만 파일명에 수집 날짜가 포함된다 (백테스트 미래정보 누출 방지).

### 증분 업데이트 패턴

`utils/drive_utils.py`의 `get_last_date(path)` → `_next_day(last_date)`로 시작일 결정 → `fetch_*()` 호출 → 기존 DataFrame과 `pd.concat` + `drop_duplicates` + `sort_index` → `save_parquet()`.

### collectors/

- `collect_ohlcv.py`: KOSPI 200 종목 목록은 **Naver Finance 스크래핑**으로 획득 (`_fetch_kospi200_from_naver`). KRX API는 세션 인증 필요로 직접 호출 불가. pykrx `get_index_portfolio_deposit_file` → `get_market_ticker_list` 순으로 폴백.
- `collect_supply_demand_krx.py`: **파이프라인 사용 버전.** pykrx + KRX 세션 인증으로 수급 수집. `utils/krx_session.py`의 `ensure_krx_session()`으로 pykrx 내부 `webio.Post.read/Get.read`를 monkeypatch하여 인증된 세션 주입. OHLCV와 동일 기간 수집.
- `collect_supply_demand.py`: **대체 수집기 (KIS Open API).** `utils/kis_client.py`의 `KISClient`로 OAuth2 토큰 관리. `FHKST01010900` TR_ID로 30 거래일 단위 역방향 페이징. SUPPLY_START_DATE부터 수집.
- `collect_macro.py`: yfinance(7개) + pykrx(2개) + FRED API(1개, `kr_bond_3y`). FRED 키 미설정 시 `kr_bond_3y` 건너뜀.
- `collect_financial.py`: DART API로 분기 재무제표 수집. `corp_code` 조회 후 재무제표 요청. ETF 등 재무제표 없는 종목은 `status=100` 경고 후 건너뜀 (정상 동작).

### processors/

모델 구조와 무관하게 다른 모델에도 쓸 수 있는 **범용 피처**를 생성합니다.
타겟 레이블은 포함하지 않으며, ML 모델 담당 저장소에서 별도 생성합니다.

- `build_base_features.py`: OHLCV + 수급 + 매크로 + 메타 피처를 결합하여 `processed/base_features/base_features.parquet`로 저장. 섹터 조회는 캐시(`sector_mapping.json`) → pykrx → DART 순으로 시도. 시가총액 순위는 FinanceDataReader 기반.

### features/ (유지보수 범위 외)

- `build_lgbm_features.py`: 기술적 지표는 `ta` 라이브러리 사용 (pandas-ta는 Python 3.14 미지원). `RSIIndicator`, `MACD`, `BollingerBands`, `SMAIndicator` 활용.
- `build_lstm_sequences.py`, `build_garch_returns.py`: OHLCV 파일 목록에서 종목을 자동 수집.

### utils/

- `drive_utils.py`: `save_parquet`, `load_parquet`, `get_last_date`, `file_is_valid`, `ensure_dir` — 모든 I/O는 이 모듈을 통한다.
- `logger.py`: `LOGS_PATH` 마운트 실패 시 콘솔 전용으로 자동 폴백 (OSError 처리). 로그 파일 90일 자동 삭제.
- `krx_session.py`: pykrx에 인증 세션을 주입. `inject_pykrx_session()`으로 monkeypatch, `login_krx()`로 data.krx.co.kr 로그인 (중복 로그인 `CD011` 자동 재시도). `ensure_krx_session(user_id, password)`가 두 작업을 한 번에 수행.
- `kis_client.py`: KIS Open API 경량 클라이언트. OAuth2 토큰 자동 갱신 (만료 60초 전). 모듈 수준 싱글턴 패턴.

## Known Constraints

- **pandas-ta 사용 금지**: numba 의존으로 Python 3.14 미지원. `ta` 라이브러리로 대체.
- **setuptools < 81 필요**: `pkg_resources` 제공. `requirements.txt`에 고정.
- **pykrx 딜레이**: `PYKRX_DELAY = 0.5초` (config.py). API 과부하 방지용.
- **KRX 세션 인증**: 2026-02-27부터 pykrx 수급 수집에 KRX 로그인 필수. `.env`에 `KRX_USER_ID`, `KRX_PASSWORD` 설정 필요.
- **DART API**: `corp_code` 조회 실패(`status=100`)는 ETF/ETN의 정상 동작. 실제 오류(`status=010` 등)와 구분.
- **FRED API**: 키 미설정(`your_fred_api_key_here`) 시 `kr_bond_3y` 수집 건너뜀.
- **KIS API 페이징**: `FHKST01010900` 엔드포인트는 종료일 기준 최근 30 거래일만 반환. 시작일 파라미터가 무시되므로 역방향 페이징 필요.
