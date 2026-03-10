"""
features/build_fundamental_factors.py
KOSPI 200 기본적 팩터 생성 모듈.

입력:
  RAW_FINANCIAL_PATH/{ticker}_{YYYYQ#}_{YYYYMMDD}.parquet  — 분기별 DART 재무데이터
  RAW_FUNDAMENTAL_PATH/{ticker}.parquet                    — 일별 pykrx 기본값 (PER, PBR 등)
  RAW_UNIVERSE_PATH/sector_mapping.json                    — GICS 섹터 매핑

출력:
  PROCESSED_FUNDAMENTAL_PATH/{ticker}_{YYYYMMDD}.parquet   — 종목별 팩터 파일
  PROCESSED_FUNDAMENTAL_PATH/fundamental_factors_{YYYYMMDD}.parquet  — 전체 통합 파일

팩터:
  PBR, PER, ROE, ROA, 부채비율(debt_ratio), 영업이익률(operating_margin),
  매출성장률(revenue_growth_qoq) 및 각 팩터의 섹터 내 z-score

Point-in-Time 처리:
  as_of_date 필드를 사용하여 참조일 기준 가장 최근 분기 데이터만 사용 (look-ahead bias 방지)

Python 3.10+ 호환, Google Colab 동작 지원.
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd

from config import (
    RAW_FINANCIAL_PATH,
    RAW_FUNDAMENTAL_PATH,
    RAW_UNIVERSE_PATH,
    PROCESSED_FUNDAMENTAL_PATH,
    PARQUET_COMPRESSION,
)
from utils.logger import setup_logger

warnings.filterwarnings("ignore", category=FutureWarning)

logger = setup_logger(__name__)

# ---------------------------------------------------------------------------
# 팩터 컬럼 목록
# ---------------------------------------------------------------------------
FACTOR_COLS: list[str] = [
    "per",
    "pbr",
    "roe",
    "roa",
    "debt_ratio",
    "operating_margin",
    "revenue_growth_qoq",
]

ZSCORE_COLS: list[str] = [f"{c}_zscore" for c in FACTOR_COLS]


# ---------------------------------------------------------------------------
# 유틸리티 헬퍼
# ---------------------------------------------------------------------------

def _to_float(value: object) -> float:
    """
    object 타입 값을 float으로 안전하게 변환합니다.
    None, 빈 문자열, 변환 불가 문자열은 NaN을 반환합니다.
    """
    if value is None:
        return float("nan")
    if isinstance(value, float):
        return value
    if isinstance(value, (int, np.integer)):
        return float(value)
    try:
        return float(str(value).strip())
    except (ValueError, TypeError):
        return float("nan")


def _safe_divide(numerator: float, denominator: float) -> float:
    """0 나눗셈을 방지하며 나눗셈을 수행합니다. 분모가 0이면 NaN 반환."""
    if denominator == 0 or np.isnan(denominator) or np.isnan(numerator):
        return float("nan")
    return numerator / denominator


# ---------------------------------------------------------------------------
# 섹터 매핑 로드
# ---------------------------------------------------------------------------

def _load_sector_map() -> dict[str, str]:
    """
    sector_mapping.json에서 종목별 GICS 섹터를 로드합니다.

    Returns:
        {ticker: gics_sector} 딕셔너리
    """
    sector_file = RAW_UNIVERSE_PATH / "sector_mapping.json"
    if not sector_file.exists():
        logger.warning("[SECTOR] sector_mapping.json 없음: %s — 모두 'Unknown'으로 처리합니다.", sector_file)
        return {}

    try:
        with open(sector_file, encoding="utf-8") as f:
            data = json.load(f)
        ticker_data = data.get("tickers", {})
        sector_map = {
            ticker: info.get("gics_sector", "Unknown")
            for ticker, info in ticker_data.items()
        }
        logger.info("[SECTOR] 섹터 매핑 로드 완료 (%d 종목)", len(sector_map))
        return sector_map
    except Exception as exc:
        logger.warning("[SECTOR] sector_mapping.json 로드 실패: %s — 모두 'Unknown'으로 처리합니다.", exc)
        return {}


# ---------------------------------------------------------------------------
# DART 분기 재무데이터 로드 (Point-in-Time)
# ---------------------------------------------------------------------------

def _load_dart_financial(ticker: str, reference_date: pd.Timestamp) -> pd.Series | None:
    """
    분기별 DART 재무 파일을 로드하고, 참조일 기준 가장 최근 분기 데이터를 반환합니다.

    Point-in-Time 보장: as_of_date <= reference_date 인 레코드만 사용합니다.

    Returns:
        가장 최근 분기 데이터의 Series, 또는 데이터 없음 시 None
    """
    fin_files = sorted(RAW_FINANCIAL_PATH.glob(f"{ticker}_*.parquet"))
    if not fin_files:
        return None

    records: list[pd.Series] = []
    for fpath in fin_files:
        try:
            df = pd.read_parquet(fpath)
        except Exception as exc:
            logger.debug("[DART] %s 로드 실패: %s", fpath.name, exc)
            continue

        if df.empty:
            continue

        for _, row in df.iterrows():
            # as_of_date가 참조일 이하인 레코드만 포함 (Point-in-Time)
            as_of_raw = row.get("as_of_date", None)
            if as_of_raw is None:
                continue
            try:
                as_of = pd.Timestamp(str(as_of_raw))
            except Exception:
                continue

            if as_of > reference_date:
                continue

            records.append(row)

    if not records:
        return None

    # DataFrame으로 변환 후 (fiscal_year, fiscal_quarter) 기준 최신 레코드 선택
    fin_df = pd.DataFrame(records)

    # fiscal_year, fiscal_quarter를 숫자로 변환
    fin_df["fiscal_year"] = pd.to_numeric(fin_df["fiscal_year"], errors="coerce")
    fin_df["fiscal_quarter"] = pd.to_numeric(fin_df["fiscal_quarter"], errors="coerce")
    fin_df = fin_df.dropna(subset=["fiscal_year", "fiscal_quarter"])

    if fin_df.empty:
        return None

    fin_df = fin_df.sort_values(["fiscal_year", "fiscal_quarter"], ascending=True)
    return fin_df.iloc[-1]


# ---------------------------------------------------------------------------
# pykrx 기본값 로드 (PER, PBR — 일별 데이터)
# ---------------------------------------------------------------------------

def _load_pykrx_fundamental(ticker: str, reference_date: pd.Timestamp) -> dict[str, float]:
    """
    일별 pykrx 기본값 파일에서 참조일 기준 최신 PER/PBR/BPS/EPS를 반환합니다.

    Returns:
        {"per": float, "pbr": float, "bps": float, "eps": float} — 값 없으면 NaN
    """
    result: dict[str, float] = {
        "per": float("nan"),
        "pbr": float("nan"),
        "bps": float("nan"),
        "eps": float("nan"),
    }

    fpath = RAW_FUNDAMENTAL_PATH / f"{ticker}.parquet"
    if not fpath.exists():
        return result

    try:
        df = pd.read_parquet(fpath)
    except Exception as exc:
        logger.debug("[PYKRX] %s 로드 실패: %s", fpath.name, exc)
        return result

    if df.empty:
        return result

    df.index = pd.to_datetime(df.index)
    df = df.sort_index()

    # 참조일 이하 데이터 중 가장 최근 날짜
    avail = df[df.index <= reference_date]
    if avail.empty:
        return result

    latest = avail.iloc[-1]

    for col in ["per", "pbr", "bps", "eps"]:
        if col in latest.index:
            val = latest[col]
            result[col] = _to_float(val)

    return result


# ---------------------------------------------------------------------------
# 단일 종목 팩터 계산
# ---------------------------------------------------------------------------

def _compute_ticker_factors(
    ticker: str,
    reference_date: pd.Timestamp,
) -> dict[str, object] | None:
    """
    단일 종목의 기본적 팩터를 계산합니다.

    Returns:
        팩터 딕셔너리 또는 데이터 부족 시 None
    """
    # 1. DART 분기 재무데이터 로드 (Point-in-Time)
    dart_row = _load_dart_financial(ticker, reference_date)

    # 2. pykrx 기본값 로드
    pykrx = _load_pykrx_fundamental(ticker, reference_date)

    # 데이터가 전혀 없으면 None 반환
    if dart_row is None and all(np.isnan(v) for v in pykrx.values()):
        return None

    # 3. DART에서 재무 수치 추출
    if dart_row is not None:
        revenue = _to_float(dart_row.get("revenue", None))
        operating_income = _to_float(dart_row.get("operating_income", None))
        net_income = _to_float(dart_row.get("net_income", None))
        total_assets = _to_float(dart_row.get("total_assets", None))
        total_equity = _to_float(dart_row.get("total_equity", None))
        dart_debt_ratio = _to_float(dart_row.get("debt_ratio", None))
        dart_roe = _to_float(dart_row.get("roe", None))
        fiscal_year = _to_float(dart_row.get("fiscal_year", None))
        fiscal_quarter = _to_float(dart_row.get("fiscal_quarter", None))

        # revenue_growth_qoq: 이전 분기 대비 매출 성장률
        # (동일 파일에 이전 분기가 없으므로 NaN으로 처리; 다중 분기 로직은 별도 함수에서)
        revenue_growth_qoq = _compute_revenue_growth_qoq(ticker, reference_date)
    else:
        revenue = operating_income = net_income = float("nan")
        total_assets = total_equity = dart_debt_ratio = dart_roe = float("nan")
        fiscal_year = fiscal_quarter = float("nan")
        revenue_growth_qoq = float("nan")

    # 4. PER, PBR: pykrx 우선 (DART는 대부분 None)
    per = pykrx["per"]
    pbr = pykrx["pbr"]

    # 5. ROE 계산: DART roe 필드 우선, 없으면 net_income / total_equity * 100
    if not np.isnan(dart_roe):
        roe = dart_roe
    else:
        roe = _safe_divide(net_income, total_equity) * 100

    # 6. ROA: net_income / total_assets * 100
    roa = _safe_divide(net_income, total_assets) * 100

    # 7. 부채비율: DART 직접 제공 우선, 없으면 계산
    if not np.isnan(dart_debt_ratio):
        debt_ratio = dart_debt_ratio
    else:
        total_debt = total_assets - total_equity
        debt_ratio = _safe_divide(total_debt, total_equity) * 100

    # 8. 영업이익률: operating_income / revenue * 100
    operating_margin = _safe_divide(operating_income, revenue) * 100

    return {
        "ticker": ticker,
        "date": reference_date.strftime("%Y-%m-%d"),
        "per": per,
        "pbr": pbr,
        "roe": roe,
        "roa": roa,
        "debt_ratio": debt_ratio,
        "operating_margin": operating_margin,
        "revenue_growth_qoq": revenue_growth_qoq,
        "fiscal_year": fiscal_year,
        "fiscal_quarter": fiscal_quarter,
    }


def _compute_revenue_growth_qoq(ticker: str, reference_date: pd.Timestamp) -> float:
    """
    분기별 DART 재무 파일에서 직전 2개 분기 매출을 이용하여 QoQ 성장률을 계산합니다.

    Returns:
        revenue_growth_qoq (%) 또는 NaN
    """
    fin_files = sorted(RAW_FINANCIAL_PATH.glob(f"{ticker}_*.parquet"))
    if not fin_files:
        return float("nan")

    records: list[dict] = []
    for fpath in fin_files:
        try:
            df = pd.read_parquet(fpath)
        except Exception:
            continue

        if df.empty:
            continue

        for _, row in df.iterrows():
            as_of_raw = row.get("as_of_date", None)
            if as_of_raw is None:
                continue
            try:
                as_of = pd.Timestamp(str(as_of_raw))
            except Exception:
                continue

            if as_of > reference_date:
                continue

            fy = _to_float(row.get("fiscal_year", None))
            fq = _to_float(row.get("fiscal_quarter", None))
            rev = _to_float(row.get("revenue", None))

            if np.isnan(fy) or np.isnan(fq) or np.isnan(rev):
                continue

            records.append({"fiscal_year": fy, "fiscal_quarter": fq, "revenue": rev})

    if len(records) < 2:
        return float("nan")

    rec_df = pd.DataFrame(records).drop_duplicates(subset=["fiscal_year", "fiscal_quarter"])
    rec_df = rec_df.sort_values(["fiscal_year", "fiscal_quarter"], ascending=True)

    if len(rec_df) < 2:
        return float("nan")

    rev_current = rec_df.iloc[-1]["revenue"]
    rev_prev = rec_df.iloc[-2]["revenue"]

    if rev_prev == 0 or np.isnan(rev_prev) or np.isnan(rev_current):
        return float("nan")

    return (rev_current - rev_prev) / abs(rev_prev) * 100


# ---------------------------------------------------------------------------
# 섹터 내 z-score 계산
# ---------------------------------------------------------------------------

def _compute_sector_zscores(
    df: pd.DataFrame,
    sector_map: dict[str, str],
) -> pd.DataFrame:
    """
    각 팩터에 대해 GICS 섹터 내 z-score를 계산하여 컬럼을 추가합니다.

    Args:
        df: 팩터 DataFrame (ticker 컬럼 포함)
        sector_map: {ticker: gics_sector}

    Returns:
        z-score 컬럼이 추가된 DataFrame
    """
    df = df.copy()

    # 섹터 컬럼 추가
    df["gics_sector"] = df["ticker"].map(sector_map).fillna("Unknown")

    for factor in FACTOR_COLS:
        zscore_col = f"{factor}_zscore"
        df[zscore_col] = float("nan")

        for sector, group in df.groupby("gics_sector"):
            valid_mask = df["gics_sector"] == sector
            vals = df.loc[valid_mask, factor].astype(float)

            sector_mean = vals.mean()
            sector_std = vals.std()

            if np.isnan(sector_mean) or sector_std == 0 or np.isnan(sector_std):
                # 표준편차가 0이거나 NaN이면 z-score를 0으로 (모두 같은 값)
                df.loc[valid_mask, zscore_col] = 0.0
            else:
                df.loc[valid_mask, zscore_col] = (vals - sector_mean) / sector_std

    # 섹터 컬럼 제거 (출력 스키마에 포함되지 않음)
    df = df.drop(columns=["gics_sector"])

    return df


# ---------------------------------------------------------------------------
# 저장 헬퍼
# ---------------------------------------------------------------------------

def _save_ticker_parquet(
    out_dir: Path,
    ticker: str,
    date_str: str,
    row: pd.DataFrame,
) -> None:
    """단일 종목 팩터 파일을 저장합니다."""
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"{ticker}_{date_str}.parquet"
    try:
        row.to_parquet(out_path, compression=PARQUET_COMPRESSION, index=False)
        logger.debug("[FUND] 저장: %s", out_path.name)
    except Exception as exc:
        logger.warning("[FUND] %s 저장 실패: %s", out_path.name, exc)


def _save_combined_parquet(
    out_dir: Path,
    date_str: str,
    df: pd.DataFrame,
) -> str:
    """전체 통합 팩터 파일을 저장하고 경로를 반환합니다."""
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / f"fundamental_factors_{date_str}.parquet"
    df.to_parquet(out_path, compression=PARQUET_COMPRESSION, index=False)
    logger.info("[FUND] 통합 파일 저장: %s (%d 종목)", out_path.name, len(df))
    return str(out_path)


# ---------------------------------------------------------------------------
# 참조일 결정 헬퍼
# ---------------------------------------------------------------------------

def _resolve_reference_date(reference_date: str | None) -> pd.Timestamp:
    """
    reference_date 문자열(YYYYMMDD)을 Timestamp로 변환합니다.
    None이면 pykrx 기본값 파일의 가장 최신 날짜를 사용합니다.
    """
    if reference_date is not None:
        try:
            return pd.Timestamp(reference_date)
        except Exception as exc:
            logger.warning("[FUND] reference_date 파싱 실패 (%s): %s — 최신 날짜 사용", reference_date, exc)

    # 최신 날짜 결정: pykrx fundamental 파일들의 인덱스 최댓값
    latest: pd.Timestamp | None = None
    for fpath in sorted(RAW_FUNDAMENTAL_PATH.glob("*.parquet"))[:10]:  # 샘플 10개만 확인
        try:
            df = pd.read_parquet(fpath)
            df.index = pd.to_datetime(df.index)
            candidate = df.index.max()
            if latest is None or candidate > latest:
                latest = candidate
        except Exception:
            continue

    if latest is not None:
        logger.info("[FUND] 참조일 자동 결정: %s", latest.strftime("%Y-%m-%d"))
        return latest

    # 최종 fallback: 오늘 날짜
    fallback = pd.Timestamp("today").normalize()
    logger.warning("[FUND] 참조일 결정 실패 — 오늘 날짜 사용: %s", fallback.strftime("%Y-%m-%d"))
    return fallback


# ---------------------------------------------------------------------------
# 종목 목록 수집
# ---------------------------------------------------------------------------

def _collect_tickers() -> list[str]:
    """
    RAW_FUNDAMENTAL_PATH와 RAW_FINANCIAL_PATH에서 종목 코드를 수집합니다.
    """
    tickers: set[str] = set()

    for fpath in RAW_FUNDAMENTAL_PATH.glob("*.parquet"):
        tickers.add(fpath.stem)

    for fpath in RAW_FINANCIAL_PATH.glob("*.parquet"):
        # 파일명 형식: {ticker}_{YYYYQ#}_{YYYYMMDD}.parquet
        parts = fpath.stem.split("_")
        if parts:
            tickers.add(parts[0])

    return sorted(tickers)


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def main(reference_date: str | None = None) -> str | None:
    """
    전체 종목의 기본적 팩터를 생성합니다.

    Args:
        reference_date: YYYYMMDD 형식의 참조일. None이면 최신 가용 날짜를 사용합니다.

    Returns:
        통합 팩터 파일 경로 문자열 또는 실패 시 None.
    """
    logger.info("=== 기본적 팩터 생성 파이프라인 시작 ===")

    # 데이터 경로 확인
    if not RAW_FINANCIAL_PATH.exists() and not RAW_FUNDAMENTAL_PATH.exists():
        logger.error(
            "RAW_FINANCIAL_PATH 와 RAW_FUNDAMENTAL_PATH 모두 존재하지 않습니다: %s, %s",
            RAW_FINANCIAL_PATH,
            RAW_FUNDAMENTAL_PATH,
        )
        return None

    # 참조일 결정
    ref_ts = _resolve_reference_date(reference_date)
    date_str = ref_ts.strftime("%Y%m%d")
    logger.info("참조일: %s", ref_ts.strftime("%Y-%m-%d"))

    # 종목 목록 수집
    tickers = _collect_tickers()
    if not tickers:
        logger.error("처리할 종목을 찾을 수 없습니다.")
        return None
    logger.info("종목 수: %d", len(tickers))

    # 섹터 매핑 로드
    sector_map = _load_sector_map()

    # 종목별 팩터 계산
    factor_records: list[dict[str, object]] = []
    skipped = 0

    for ticker in tickers:
        try:
            result = _compute_ticker_factors(ticker, ref_ts)
        except Exception as exc:
            logger.warning("[FUND] %s 팩터 계산 실패: %s", ticker, exc)
            skipped += 1
            continue

        if result is None:
            logger.debug("[FUND] %s 데이터 없음 — 건너뜀", ticker)
            skipped += 1
            continue

        factor_records.append(result)

    if not factor_records:
        logger.error("유효한 팩터 레코드가 없습니다.")
        return None

    logger.info("팩터 계산 완료: %d 종목 (건너뜀: %d)", len(factor_records), skipped)

    # DataFrame 생성
    combined_df = pd.DataFrame(factor_records)

    # 수치형 팩터 컬럼을 float64로 명시적 변환
    for col in FACTOR_COLS + ["fiscal_year", "fiscal_quarter"]:
        if col in combined_df.columns:
            combined_df[col] = pd.to_numeric(combined_df[col], errors="coerce")

    # 섹터 내 z-score 계산
    combined_df = _compute_sector_zscores(combined_df, sector_map)

    # 출력 컬럼 순서 정렬
    output_cols = (
        ["ticker", "date"]
        + FACTOR_COLS
        + ZSCORE_COLS
        + ["fiscal_year", "fiscal_quarter"]
    )
    # 존재하는 컬럼만 선택
    output_cols = [c for c in output_cols if c in combined_df.columns]
    combined_df = combined_df[output_cols]

    # 종목별 개별 파일 저장
    out_dir = PROCESSED_FUNDAMENTAL_PATH
    for ticker, ticker_df in combined_df.groupby("ticker"):
        _save_ticker_parquet(out_dir, str(ticker), date_str, ticker_df.reset_index(drop=True))

    # 통합 파일 저장
    output_path = _save_combined_parquet(out_dir, date_str, combined_df.reset_index(drop=True))

    # 요약 출력
    valid_counts = {col: int(combined_df[col].notna().sum()) for col in FACTOR_COLS}
    logger.info("=== 기본적 팩터 생성 파이프라인 완료 ===")
    logger.info("출력 경로: %s", output_path)
    logger.info("팩터별 유효 종목 수: %s", valid_counts)

    print(f"\n[완료] 참조일: {ref_ts.strftime('%Y-%m-%d')}")
    print(f"       처리 종목: {len(factor_records):,}  /  건너뜀: {skipped:,}")
    print(f"       출력 파일: {output_path}")
    for col, cnt in valid_counts.items():
        print(f"       {col:30s}: {cnt:,} 종목")

    return output_path


if __name__ == "__main__":
    main()
