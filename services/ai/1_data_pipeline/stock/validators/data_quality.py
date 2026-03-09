"""
validators/data_quality.py
KOSPI 200 데이터 품질 검증 스크립트.
OHLCV / 수급 / 매크로 / 재무 데이터의 결측치, 연속성, 이상치를 점검하고
JSON 형식의 품질 리포트를 생성합니다.
Python 3.10+ 호환, Google Colab 동작 지원.
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import pandas as pd

from config import (
    BASE_PATH,
    LOGS_PATH,
    RAW_FINANCIAL_PATH,
    RAW_MACRO_PATH,
    RAW_OHLCV_PATH,
    RAW_SUPPLY_PATH,
)
from utils.drive_utils import file_is_valid, load_parquet
from utils.logger import setup_logger

logger = setup_logger(__name__)

# ---------------------------------------------------------------------------
# 품질 기준
# ---------------------------------------------------------------------------

QUALITY_RULES: dict[str, float | int] = {
    "missing_rate_threshold": 0.01,   # 결측치 1% 초과 시 경고
    "return_outlier_threshold": 0.30,  # 수익률 ±30% 초과 = 이상치
    "min_file_size_bytes": 1,          # 0KB 파일 금지
}


# ---------------------------------------------------------------------------
# 내부 유틸리티
# ---------------------------------------------------------------------------

def _missing_rate(df: pd.DataFrame) -> float:
    """DataFrame 전체 결측치 비율을 반환합니다."""
    if df.empty:
        return 1.0
    total = df.size
    missing = int(df.isnull().sum().sum())
    return missing / total if total > 0 else 1.0


def _detect_return_outliers(df: pd.DataFrame, col: str = "close") -> list[str]:
    """
    지정 컬럼의 일별 수익률에서 ±threshold 를 초과하는 날짜 목록을 반환합니다.

    Args:
        df:  날짜 인덱스를 가진 DataFrame
        col: 수익률 계산 기준 컬럼 (기본값 "close")

    Returns:
        이상치 날짜 문자열 리스트 ("YYYY-MM-DD")
    """
    threshold = float(QUALITY_RULES["return_outlier_threshold"])
    if col not in df.columns or df[col].dropna().empty:
        return []

    returns = df[col].pct_change().dropna()
    outlier_mask = returns.abs() > threshold
    outlier_dates = returns.index[outlier_mask]

    return [d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d)[:10]
            for d in outlier_dates]


def _detect_missing_dates(df: pd.DataFrame) -> list[str]:
    """
    DataFrame 인덱스(날짜)의 평일 기준 누락 날짜를 반환합니다.
    pykrx 거래일이 아닌 단순 평일(월~금) 기준으로 확인합니다.

    Args:
        df: DatetimeIndex를 가진 DataFrame

    Returns:
        누락된 날짜 문자열 리스트 ("YYYY-MM-DD")
    """
    if df.empty or not isinstance(df.index, pd.DatetimeIndex):
        return []

    start = df.index.min()
    end = df.index.max()

    # 평일(월~금) 기준 전체 날짜 범위 생성
    all_weekdays = pd.bdate_range(start=start, end=end)
    existing = set(df.index.normalize())
    missing = [d for d in all_weekdays if d not in existing]

    return [d.strftime("%Y-%m-%d") for d in missing]


def _fmt_dates(dates) -> list[str]:
    """날짜 인덱스를 YYYY-MM-DD 문자열 리스트로 변환합니다."""
    return [d.strftime("%Y-%m-%d") if hasattr(d, "strftime") else str(d)[:10] for d in dates]


def _detect_invalid_prices(df: pd.DataFrame) -> dict[str, list[str]]:
    """
    가격 컬럼에서 물리적으로 불가능한 값을 탐지합니다.

    탐지 항목:
    - open/high/low/close <= 0  (0 이하 가격)
    - high < low                (고가 < 저가, 논리적 불가능)
    - high < open 또는 high < close (고가가 시가/종가보다 낮음)
    - low > open 또는 low > close   (저가가 시가/종가보다 높음)

    Returns:
        {"non_positive": [...], "high_lt_low": [...], "ohlc_logic": [...]}
    """
    result: dict[str, list[str]] = {
        "non_positive": [],
        "high_lt_low": [],
        "ohlc_logic": [],
    }

    price_cols = [c for c in ["open", "high", "low", "close"] if c in df.columns]
    if not price_cols:
        return result

    # 0 이하 가격 (컬럼별 합산, 중복 날짜 제거)
    bad_dates: set[str] = set()
    for col in price_cols:
        mask = df[col].notna() & (df[col] <= 0)
        bad_dates.update(_fmt_dates(df.index[mask]))
    result["non_positive"] = sorted(bad_dates)

    # high < low
    if "high" in df.columns and "low" in df.columns:
        mask = df["high"].notna() & df["low"].notna() & (df["high"] < df["low"])
        result["high_lt_low"] = _fmt_dates(df.index[mask])

    # OHLC 논리 위반: high < open/close 또는 low > open/close
    ohlc_bad: set[str] = set()
    for price_col in ["open", "close"]:
        if "high" in df.columns and price_col in df.columns:
            mask = df["high"].notna() & df[price_col].notna() & (df["high"] < df[price_col])
            ohlc_bad.update(_fmt_dates(df.index[mask]))
        if "low" in df.columns and price_col in df.columns:
            mask = df["low"].notna() & df[price_col].notna() & (df["low"] > df[price_col])
            ohlc_bad.update(_fmt_dates(df.index[mask]))
    result["ohlc_logic"] = sorted(ohlc_bad)

    return result


def _detect_invalid_volume(df: pd.DataFrame) -> dict[str, list[str]]:
    """
    거래량 컬럼에서 불가능한 값을 탐지합니다.

    탐지 항목:
    - volume < 0  (음수 거래량)
    - volume == 0 (0 거래량)

    Returns:
        {"negative": [...], "zero": [...]}
    """
    result: dict[str, list[str]] = {"negative": [], "zero": []}

    if "volume" not in df.columns:
        return result

    neg_mask = df["volume"].notna() & (df["volume"] < 0)
    result["negative"] = _fmt_dates(df.index[neg_mask])

    zero_mask = df["volume"].notna() & (df["volume"] == 0)
    result["zero"] = _fmt_dates(df.index[zero_mask])

    return result


def _detect_volume_spikes(df: pd.DataFrame) -> list[str]:
    """
    IQR 방식으로 거래량 스파이크를 탐지합니다.

    기준: Q3 + 5 * IQR 초과 (보수적 임계값으로 실제 이상값만 탐지)
    데이터가 30행 미만이거나 IQR이 0이면 검사를 건너뜁니다.

    Returns:
        거래량 스파이크 날짜 문자열 리스트 ("YYYY-MM-DD")
    """
    if "volume" not in df.columns:
        return []

    vol = df["volume"].dropna()
    if len(vol) < 30:
        return []

    q1 = vol.quantile(0.25)
    q3 = vol.quantile(0.75)
    iqr = q3 - q1
    if iqr == 0:
        return []

    upper = q3 + 5.0 * iqr
    spike_dates = vol.index[vol > upper]
    return _fmt_dates(spike_dates)


# ---------------------------------------------------------------------------
# 공개 검증 함수
# ---------------------------------------------------------------------------

def check_ohlcv_quality(tickers: list[str]) -> dict:
    """
    OHLCV 데이터 품질을 종목별로 점검합니다.

    점검 항목:
    - 파일 존재 및 크기 (0KB 감지)
    - 결측치 비율 (1% 초과 시 경고)
    - 날짜 연속성 (평일 기준 누락 날짜)
    - 이상치 수익률 (±30% 초과)
    - 0 이하 가격 (open/high/low/close <= 0)
    - high < low 위반 (논리적 불가능)
    - OHLC 논리 위반 (high < open/close, low > open/close)
    - 음수/0 거래량
    - 거래량 스파이크 (Q3 + 5*IQR 초과)

    Args:
        tickers: 검증 대상 종목 코드 리스트

    Returns:
        종목별 품질 결과 딕셔너리
    """
    logger.info("OHLCV 품질 검증 시작 | 종목 수: %d", len(tickers))

    results: dict[str, dict] = {}
    ok_count = 0
    issue_count = 0

    for ticker in tickers:
        path = RAW_OHLCV_PATH / f"{ticker}.parquet"
        entry: dict = {
            "file_exists": False,
            "file_size_ok": False,
            "missing_rate": None,
            "missing_rate_ok": False,
            "missing_dates_count": 0,
            "missing_dates_sample": [],
            "outlier_dates_count": 0,
            "outlier_dates_sample": [],
            "non_positive_price_count": 0,
            "non_positive_price_sample": [],
            "high_lt_low_count": 0,
            "high_lt_low_sample": [],
            "ohlc_logic_violation_count": 0,
            "ohlc_logic_violation_sample": [],
            "negative_volume_count": 0,
            "zero_volume_count": 0,
            "zero_volume_sample": [],
            "volume_spike_count": 0,
            "volume_spike_sample": [],
            "issues": [],
        }

        # 파일 존재 및 크기 확인
        if not path.exists():
            entry["issues"].append("파일 없음")
            results[ticker] = entry
            issue_count += 1
            continue

        entry["file_exists"] = True

        if not file_is_valid(path):
            entry["issues"].append("파일 크기 0KB")
            results[ticker] = entry
            issue_count += 1
            continue

        entry["file_size_ok"] = True

        # 데이터 로드
        df = load_parquet(path)
        if df is None or df.empty:
            entry["issues"].append("데이터 로드 실패 또는 빈 파일")
            results[ticker] = entry
            issue_count += 1
            continue

        # 결측치 비율
        rate = _missing_rate(df)
        entry["missing_rate"] = round(rate, 6)
        threshold = float(QUALITY_RULES["missing_rate_threshold"])
        if rate > threshold:
            entry["issues"].append(f"결측치 비율 초과: {rate:.2%} > {threshold:.2%}")
        else:
            entry["missing_rate_ok"] = True

        # 날짜 연속성 (누락 거래일)
        missing_dates = _detect_missing_dates(df)
        entry["missing_dates_count"] = len(missing_dates)
        entry["missing_dates_sample"] = missing_dates[:10]  # 최대 10개만 샘플
        if missing_dates:
            entry["issues"].append(f"누락 날짜 {len(missing_dates)}개 감지")

        # 이상치 수익률
        outlier_dates = _detect_return_outliers(df)
        entry["outlier_dates_count"] = len(outlier_dates)
        entry["outlier_dates_sample"] = outlier_dates[:10]
        if outlier_dates:
            entry["issues"].append(f"이상치 수익률 {len(outlier_dates)}건 감지")

        # 불가능한 가격값 (0 이하, high < low, OHLC 논리 위반)
        price_issues = _detect_invalid_prices(df)
        entry["non_positive_price_count"] = len(price_issues["non_positive"])
        entry["non_positive_price_sample"] = price_issues["non_positive"][:10]
        entry["high_lt_low_count"] = len(price_issues["high_lt_low"])
        entry["high_lt_low_sample"] = price_issues["high_lt_low"][:10]
        entry["ohlc_logic_violation_count"] = len(price_issues["ohlc_logic"])
        entry["ohlc_logic_violation_sample"] = price_issues["ohlc_logic"][:10]
        if price_issues["non_positive"]:
            entry["issues"].append(f"0 이하 가격 {len(price_issues['non_positive'])}건 감지")
        if price_issues["high_lt_low"]:
            entry["issues"].append(f"high < low 위반 {len(price_issues['high_lt_low'])}건 감지")
        if price_issues["ohlc_logic"]:
            entry["issues"].append(f"OHLC 논리 위반 {len(price_issues['ohlc_logic'])}건 감지")

        # 불가능한 거래량 (음수, 0)
        vol_issues = _detect_invalid_volume(df)
        entry["negative_volume_count"] = len(vol_issues["negative"])
        entry["zero_volume_count"] = len(vol_issues["zero"])
        entry["zero_volume_sample"] = vol_issues["zero"][:10]
        if vol_issues["negative"]:
            entry["issues"].append(f"음수 거래량 {len(vol_issues['negative'])}건 감지")
        if vol_issues["zero"]:
            entry["issues"].append(f"0 거래량 {len(vol_issues['zero'])}건 감지")

        # 거래량 스파이크 (IQR 기반)
        spike_dates = _detect_volume_spikes(df)
        entry["volume_spike_count"] = len(spike_dates)
        entry["volume_spike_sample"] = spike_dates[:10]
        if spike_dates:
            entry["issues"].append(f"거래량 스파이크 {len(spike_dates)}건 감지")

        if not entry["issues"]:
            ok_count += 1
        else:
            issue_count += 1

        results[ticker] = entry

    logger.info("OHLCV 품질 검증 완료 | 정상: %d | 이슈: %d", ok_count, issue_count)
    return results


def check_supply_quality(tickers: list[str]) -> dict:
    """
    수급 데이터 품질을 종목별로 점검합니다.

    점검 항목:
    - 파일 존재 및 크기
    - 결측치 비율 (1% 초과 시 경고)
    - 날짜 연속성 (평일 기준 누락 날짜)

    Args:
        tickers: 검증 대상 종목 코드 리스트

    Returns:
        종목별 품질 결과 딕셔너리
    """
    logger.info("수급 데이터 품질 검증 시작 | 종목 수: %d", len(tickers))

    results: dict[str, dict] = {}
    ok_count = 0
    issue_count = 0

    for ticker in tickers:
        path = RAW_SUPPLY_PATH / f"{ticker}.parquet"
        entry: dict = {
            "file_exists": False,
            "file_size_ok": False,
            "missing_rate": None,
            "missing_rate_ok": False,
            "missing_dates_count": 0,
            "missing_dates_sample": [],
            "issues": [],
        }

        if not path.exists():
            entry["issues"].append("파일 없음")
            results[ticker] = entry
            issue_count += 1
            continue

        entry["file_exists"] = True

        if not file_is_valid(path):
            entry["issues"].append("파일 크기 0KB")
            results[ticker] = entry
            issue_count += 1
            continue

        entry["file_size_ok"] = True

        df = load_parquet(path)
        if df is None or df.empty:
            entry["issues"].append("데이터 로드 실패 또는 빈 파일")
            results[ticker] = entry
            issue_count += 1
            continue

        # 결측치 비율
        rate = _missing_rate(df)
        entry["missing_rate"] = round(rate, 6)
        threshold = float(QUALITY_RULES["missing_rate_threshold"])
        if rate > threshold:
            entry["issues"].append(f"결측치 비율 초과: {rate:.2%} > {threshold:.2%}")
        else:
            entry["missing_rate_ok"] = True

        # 날짜 연속성
        missing_dates = _detect_missing_dates(df)
        entry["missing_dates_count"] = len(missing_dates)
        entry["missing_dates_sample"] = missing_dates[:10]
        if missing_dates:
            entry["issues"].append(f"누락 날짜 {len(missing_dates)}개 감지")

        if not entry["issues"]:
            ok_count += 1
        else:
            issue_count += 1

        results[ticker] = entry

    logger.info("수급 데이터 품질 검증 완료 | 정상: %d | 이슈: %d", ok_count, issue_count)
    return results


def check_macro_quality() -> dict:
    """
    매크로 데이터 품질을 점검합니다.

    RAW_MACRO_PATH 내 모든 .parquet 파일을 순회하여
    결측치 비율과 날짜 연속성을 확인합니다.

    Returns:
        파일별 품질 결과 딕셔너리
    """
    logger.info("매크로 데이터 품질 검증 시작")

    results: dict[str, dict] = {}

    if not RAW_MACRO_PATH.exists():
        logger.warning("매크로 데이터 경로 없음: %s", RAW_MACRO_PATH)
        return {"error": "매크로 데이터 경로 없음"}

    parquet_files = list(RAW_MACRO_PATH.glob("*.parquet"))
    if not parquet_files:
        logger.warning("매크로 데이터 파일 없음: %s", RAW_MACRO_PATH)
        return {"error": "매크로 parquet 파일 없음"}

    ok_count = 0
    issue_count = 0

    for path in parquet_files:
        name = path.stem
        entry: dict = {
            "file_size_ok": False,
            "missing_rate": None,
            "missing_rate_ok": False,
            "row_count": 0,
            "issues": [],
        }

        if not file_is_valid(path):
            entry["issues"].append("파일 크기 0KB")
            results[name] = entry
            issue_count += 1
            continue

        entry["file_size_ok"] = True

        df = load_parquet(path)
        if df is None or df.empty:
            entry["issues"].append("데이터 로드 실패 또는 빈 파일")
            results[name] = entry
            issue_count += 1
            continue

        entry["row_count"] = len(df)

        rate = _missing_rate(df)
        entry["missing_rate"] = round(rate, 6)
        threshold = float(QUALITY_RULES["missing_rate_threshold"])
        if rate > threshold:
            entry["issues"].append(f"결측치 비율 초과: {rate:.2%} > {threshold:.2%}")
        else:
            entry["missing_rate_ok"] = True

        if not entry["issues"]:
            ok_count += 1
        else:
            issue_count += 1

        results[name] = entry

    logger.info(
        "매크로 데이터 품질 검증 완료 | 파일 수: %d | 정상: %d | 이슈: %d",
        len(parquet_files), ok_count, issue_count,
    )
    return results


def check_financial_quality(tickers: list[str]) -> dict:
    """
    재무 데이터 품질을 종목별로 점검합니다.

    파일 명명 규칙: {ticker}_{YYYYMMDD}.parquet (수집 날짜 포함, Point-in-Time 보장)
    한 종목에 복수의 파일이 존재할 수 있으며, 전체 파일을 병합하여 검증합니다.

    점검 항목:
    - 파일 존재 여부 (패턴: {ticker}_*.parquet)
    - 수집 파일 수 및 총 분기 수
    - as_of_date 필드 존재 여부 (필수)
    - 핵심 재무 컬럼(revenue, operating_income, net_income) 결측치 비율
    - 분기 중복 여부 (동일 fiscal_year+fiscal_quarter 중복)

    Args:
        tickers: 검증 대상 종목 코드 리스트

    Returns:
        종목별 품질 결과 딕셔너리
    """
    logger.info("재무 데이터 품질 검증 시작 | 종목 수: %d", len(tickers))

    _CORE_COLS = ["revenue", "operating_income", "net_income"]
    _MIN_QUARTERS = 4  # 최소 분기 수 기준

    results: dict[str, dict] = {}
    ok_count = 0
    issue_count = 0

    for ticker in tickers:
        # {ticker}_*.parquet 패턴으로 파일 목록 수집
        files = sorted(RAW_FINANCIAL_PATH.glob(f"{ticker}_*.parquet"))

        entry: dict = {
            "file_exists": False,
            "file_count": 0,
            "quarter_count": 0,
            "has_as_of_date": False,
            "core_missing_rate": None,
            "core_missing_rate_ok": False,
            "duplicate_quarters": [],
            "issues": [],
        }

        if not files:
            entry["issues"].append("파일 없음 (패턴: {ticker}_*.parquet)")
            results[ticker] = entry
            issue_count += 1
            continue

        entry["file_exists"] = True
        entry["file_count"] = len(files)

        # 유효한 파일만 로드하여 병합
        frames: list[pd.DataFrame] = []
        for path in files:
            if not file_is_valid(path):
                continue
            df = load_parquet(path)
            if df is not None and not df.empty:
                frames.append(df)

        if not frames:
            entry["issues"].append("로드 가능한 파일 없음 (모두 빈 파일)")
            results[ticker] = entry
            issue_count += 1
            continue

        combined = pd.concat(frames, ignore_index=True)
        entry["quarter_count"] = len(combined)

        # as_of_date 필드 존재 여부
        has_as_of_date = "as_of_date" in combined.columns
        entry["has_as_of_date"] = has_as_of_date
        if not has_as_of_date:
            entry["issues"].append("as_of_date 컬럼 없음")

        # 분기 수 부족 경고
        if len(combined) < _MIN_QUARTERS:
            entry["issues"].append(
                f"분기 수 부족: {len(combined)}개 < 최소 {_MIN_QUARTERS}개"
            )

        # 핵심 재무 컬럼 결측치 비율
        available_core = [c for c in _CORE_COLS if c in combined.columns]
        if available_core:
            core_df = combined[available_core]
            rate = _missing_rate(core_df)
            entry["core_missing_rate"] = round(rate, 6)
            threshold = float(QUALITY_RULES["missing_rate_threshold"])
            if rate > threshold:
                entry["issues"].append(
                    f"핵심 재무 컬럼 결측치 비율 초과: {rate:.2%} > {threshold:.2%}"
                )
            else:
                entry["core_missing_rate_ok"] = True
        else:
            entry["issues"].append(f"핵심 재무 컬럼 없음: {_CORE_COLS}")

        # 분기 중복 검사 (fiscal_year + fiscal_quarter 조합)
        if {"fiscal_year", "fiscal_quarter"}.issubset(combined.columns):
            dup_mask = combined.duplicated(subset=["fiscal_year", "fiscal_quarter"], keep=False)
            if dup_mask.any():
                dups = combined[dup_mask][["fiscal_year", "fiscal_quarter"]].drop_duplicates()
                dup_list = [
                    f"{int(r.fiscal_year)}Q{int(r.fiscal_quarter)}"
                    for _, r in dups.iterrows()
                ]
                entry["duplicate_quarters"] = dup_list[:10]
                entry["issues"].append(f"분기 중복 {len(dup_list)}건: {dup_list[:5]}")

        if not entry["issues"]:
            ok_count += 1
        else:
            issue_count += 1

        results[ticker] = entry

    logger.info("재무 데이터 품질 검증 완료 | 정상: %d | 이슈: %d", ok_count, issue_count)
    return results


def check_supply_sum(tickers: list[str]) -> dict:
    """
    ① 수급 합계 검증: 외국인+기관+개인 순매수 합계 패턴 분석.

    [주의] KRX pykrx 데이터는 '기타법인' 카테고리를 포함하지 않아
    외국인+기관+개인 합계가 구조적으로 0이 되지 않습니다.
    따라서 절대적 합계=0 대신 일별 불균형 비율(imbalance_ratio)의
    종목별 이상치를 탐지합니다.

    탐지 기준:
    - imbalance_ratio = |sum| / abs_total (일별 계산)
    - median_ratio: 종목의 중앙값 (모든 종목 공통 참조값)
    - 특정 날짜에 ratio > 0.95 (한쪽 투자자만 일방적으로 거래)
      → 데이터 결함 신호

    Args:
        tickers: 검증 대상 종목 코드 리스트

    Returns:
        종목별 수급 불균형 분석 결과 딕셔너리와 전체 통계
    """
    logger.info("① 수급 합계(불균형) 검증 시작 | 종목 수: %d", len(tickers))

    _NET_COLS = ["foreign_net_buy", "institution_net_buy", "individual_net_buy"]
    # 단일 날짜 불균형 비율이 이 값 초과 시 데이터 결함 의심
    _EXTREME_RATIO = 0.95

    results: dict[str, dict] = {}
    all_median_ratios: list[float] = []
    ok_count = 0
    issue_count = 0

    for ticker in tickers:
        path = RAW_SUPPLY_PATH / f"{ticker}.parquet"
        entry: dict = {
            "file_exists": False,
            "row_count": 0,
            "checked_rows": 0,
            "median_imbalance_ratio": None,
            "extreme_day_count": 0,
            "extreme_day_sample": [],
            "issues": [],
        }

        if not path.exists() or not file_is_valid(path):
            entry["issues"].append("파일 없음 또는 빈 파일")
            results[ticker] = entry
            issue_count += 1
            continue

        df = load_parquet(path)
        if df is None or df.empty:
            entry["issues"].append("데이터 로드 실패")
            results[ticker] = entry
            issue_count += 1
            continue

        entry["file_exists"] = True
        entry["row_count"] = len(df)

        missing_cols = [c for c in _NET_COLS if c not in df.columns]
        if missing_cols:
            entry["issues"].append(f"수급 컬럼 없음: {missing_cols}")
            results[ticker] = entry
            issue_count += 1
            continue

        # 모두 0인 행(KRX 실제 데이터 이전 기간) 제외
        non_zero_mask = df[_NET_COLS].abs().sum(axis=1) > 0
        df_valid = df.loc[non_zero_mask]
        entry["checked_rows"] = len(df_valid)

        if df_valid.empty:
            results[ticker] = entry
            ok_count += 1
            continue

        # 일별 불균형 비율 계산
        net_sum = df_valid[_NET_COLS].sum(axis=1)
        abs_total = df_valid[_NET_COLS].abs().sum(axis=1)
        # abs_total이 0인 행 방지
        safe_abs = abs_total.replace(0, float("nan"))
        ratio = net_sum.abs() / safe_abs

        median_ratio = float(ratio.median())
        entry["median_imbalance_ratio"] = round(median_ratio, 4)
        all_median_ratios.append(median_ratio)

        # 극단적 불균형 날짜 탐지 (한쪽 방향만 압도적인 날)
        extreme_mask = ratio > _EXTREME_RATIO
        extreme_count = int(extreme_mask.sum())
        entry["extreme_day_count"] = extreme_count
        if extreme_count > 0:
            extreme_dates = df_valid.index[extreme_mask]
            entry["extreme_day_sample"] = _fmt_dates(list(extreme_dates[:10]))
            entry["issues"].append(
                f"극단적 수급 불균형 {extreme_count}일: "
                f"ratio>{_EXTREME_RATIO} (3개 카테고리 중 1개가 거의 전부)"
            )

        if not entry["issues"]:
            ok_count += 1
        else:
            issue_count += 1

        results[ticker] = entry

    # 전체 통계 요약
    if all_median_ratios:
        import statistics
        results["__summary__"] = {
            "note": (
                "KRX 데이터는 기타법인 카테고리 미포함으로 합계!=0이 정상. "
                "median_imbalance_ratio는 구조적 불균형 수준을 나타냄."
            ),
            "ticker_count": len(all_median_ratios),
            "overall_median_ratio": round(statistics.median(all_median_ratios), 4),
            "overall_mean_ratio": round(statistics.mean(all_median_ratios), 4),
            "ratio_min": round(min(all_median_ratios), 4),
            "ratio_max": round(max(all_median_ratios), 4),
        }

    logger.info("① 수급 불균형 검증 완료 | 정상: %d | 극단이상: %d", ok_count, issue_count)
    return results


def check_delisted_cutoff() -> dict:
    """
    ③ 편출 종목 마지막 거래일 확인: OHLCV 마지막 날짜 ≈ 편출 시점 검증.

    kospi200_universe.json에서 편출 종목(end_date != null)을 추출하여
    해당 종목의 OHLCV 마지막 행 날짜가 편출 날짜의 6개월(183일) 이내인지 확인합니다.
    초과 시 생존편향 해결이 불완전하다는 신호입니다.

    Returns:
        편출 종목별 마지막 거래일 검증 결과 딕셔너리
    """
    logger.info("③ 편출 종목 마지막 거래일 확인 시작")

    from config import RAW_UNIVERSE_PATH

    universe_path = RAW_UNIVERSE_PATH / "kospi200_universe.json"

    result: dict = {
        "universe_loaded": False,
        "total_delisted": 0,
        "checked": 0,
        "ok_count": 0,
        "late_data_count": 0,
        "no_file_count": 0,
        "details": {},
        "issues": [],
    }

    if not universe_path.exists():
        result["issues"].append(f"유니버스 파일 없음: {universe_path}")
        return result

    with open(universe_path, encoding="utf-8") as f:
        universe = json.load(f)

    result["universe_loaded"] = True

    tickers_info = universe.get("tickers", {})

    # 편출 종목: periods[-1][1] != None (end_date 있음)
    delisted = {
        ticker: info
        for ticker, info in tickers_info.items()
        if info.get("periods") and info["periods"][-1][1] is not None
    }

    result["total_delisted"] = len(delisted)
    logger.info("편출 종목 수: %d개", len(delisted))

    # [중요] "편출" = KOSPI 200 지수에서 제거, 거래소 상장 유지 가능
    # 따라서 OHLCV가 편출일 이후에도 존재하는 것은 정상.
    # 검증 목표: OHLCV 데이터가 KOSPI 200 멤버십 기간을 완전히 커버하는지 확인.
    # 이슈 조건: ohlcv_last_date < end_date - TOLERANCE (편출일 이전에 데이터 끊김)
    _TOLERANCE_DAYS = 183   # 반기 스냅샷 오차 허용 (±6개월)

    for ticker, info in delisted.items():
        end_date_str: str = info["periods"][-1][1]
        end_date = pd.Timestamp(end_date_str)

        ohlcv_path = RAW_OHLCV_PATH / f"{ticker}.parquet"

        entry: dict = {
            "delisted_date": end_date_str,
            "name": info.get("name", ""),
            "ohlcv_last_date": None,
            "days_before_delisted": None,   # 양수: OHLCV가 편출일보다 이전에 종료
            "days_after_delisted": None,    # 양수: OHLCV가 편출일 이후에도 지속 (정상)
            "status": "unknown",
        }

        if not ohlcv_path.exists() or not file_is_valid(ohlcv_path):
            entry["status"] = "no_file"
            result["no_file_count"] += 1
            result["details"][ticker] = entry
            continue

        df = load_parquet(ohlcv_path)
        if df is None or df.empty:
            entry["status"] = "empty_file"
            result["no_file_count"] += 1
            result["details"][ticker] = entry
            continue

        result["checked"] += 1
        last_date = df.index.max()
        entry["ohlcv_last_date"] = last_date.strftime("%Y-%m-%d")

        days_diff = int((last_date - end_date).days)  # 양수: OHLCV가 편출일 이후까지 있음
        if days_diff >= 0:
            entry["days_after_delisted"] = days_diff
        else:
            entry["days_before_delisted"] = -days_diff  # 절댓값

        # 이슈: OHLCV가 편출일보다 TOLERANCE_DAYS 이상 이전에 끊긴 경우
        # (편출 시점 전에 거래가 중단됐거나 데이터 누락)
        if days_diff < -_TOLERANCE_DAYS:
            entry["status"] = "early_cutoff"
            result["late_data_count"] += 1  # 필드명 재활용 (coverage_gap_count)
            result["issues"].append(
                f"[{ticker}] {info.get('name', '')} 편출일={end_date_str}, "
                f"OHLCV 마지막={entry['ohlcv_last_date']} ({days_diff}일, 멤버십 기간 데이터 누락)"
            )
        else:
            # 정상: OHLCV가 편출일 근처 또는 이후까지 존재
            entry["status"] = "ok"
            result["ok_count"] += 1

        result["details"][ticker] = entry

    logger.info(
        "③ 편출 종목 커버리지 확인 완료 | 총 편출: %d | 확인: %d | 정상: %d | 커버리지부족: %d | 파일없음: %d",
        result["total_delisted"],
        result["checked"],
        result["ok_count"],
        result["late_data_count"],
        result["no_file_count"],
    )
    return result


def check_date_alignment(sample_tickers: list[str] | None = None) -> dict:
    """
    ② 날짜 Alignment 검증: OHLCV ↔ 수급 ↔ 매크로가 같은 거래일 기준인지 확인.

    OHLCV 기준 종목(첫 번째 샘플)의 거래일 날짜 집합과 매크로/수급 날짜를 비교합니다.
    50일 이상 차이 나면 이슈로 기록합니다.

    Args:
        sample_tickers: 수급 비교에 사용할 샘플 종목 목록.
                        None 이면 OHLCV 파일 목록에서 자동으로 5개 선택.

    Returns:
        날짜 정렬 검증 결과 딕셔너리
    """
    logger.info("② 날짜 Alignment 검증 시작")

    _MISSING_THRESHOLD = 50   # 50일 이상 누락 시 이슈

    result: dict = {
        "sample_tickers": [],
        "ohlcv_date_range": None,
        "macro_date_range": {},
        "supply_date_range": {},
        "ohlcv_vs_macro": {},
        "ohlcv_vs_supply": {},
        "issues": [],
    }

    if not RAW_OHLCV_PATH.exists():
        result["issues"].append("OHLCV 경로 없음")
        return result

    # 샘플 종목 선택
    if sample_tickers is None:
        all_ohlcv = list(RAW_OHLCV_PATH.glob("*.parquet"))
        sample_tickers = [p.stem for p in all_ohlcv[:5]]

    if not sample_tickers:
        result["issues"].append("OHLCV 파일 없음")
        return result

    result["sample_tickers"] = sample_tickers

    # 기준 종목 OHLCV 날짜 집합
    ohlcv_df = load_parquet(RAW_OHLCV_PATH / f"{sample_tickers[0]}.parquet")
    if ohlcv_df is None or ohlcv_df.empty:
        result["issues"].append(f"OHLCV 기준 종목 로드 실패: {sample_tickers[0]}")
        return result

    ohlcv_dates = set(ohlcv_df.index.normalize())
    result["ohlcv_date_range"] = {
        "ticker": sample_tickers[0],
        "start": ohlcv_df.index.min().strftime("%Y-%m-%d"),
        "end": ohlcv_df.index.max().strftime("%Y-%m-%d"),
        "count": len(ohlcv_dates),
    }

    # 매크로 날짜 비교
    if RAW_MACRO_PATH.exists():
        for macro_path in sorted(RAW_MACRO_PATH.glob("*.parquet")):
            name = macro_path.stem
            macro_df = load_parquet(macro_path)
            if macro_df is None or macro_df.empty:
                continue

            macro_dates = set(macro_df.index.normalize())
            result["macro_date_range"][name] = {
                "start": macro_df.index.min().strftime("%Y-%m-%d"),
                "end": macro_df.index.max().strftime("%Y-%m-%d"),
                "count": len(macro_dates),
            }

            # 매크로 시작일 이후 OHLCV 날짜만 비교 (커버리지 차이 고려)
            macro_start = macro_df.index.min().normalize()
            ohlcv_after_macro = {d for d in ohlcv_dates if d >= macro_start}
            missing_in_macro = ohlcv_after_macro - macro_dates

            result["ohlcv_vs_macro"][name] = {
                "ohlcv_days_after_macro_start": len(ohlcv_after_macro),
                "missing_in_macro": len(missing_in_macro),
                "missing_rate": round(len(missing_in_macro) / len(ohlcv_after_macro), 4)
                    if ohlcv_after_macro else 0.0,
                "missing_sample": sorted(
                    [d.strftime("%Y-%m-%d") for d in list(missing_in_macro)[:5]]
                ),
            }

            if len(missing_in_macro) > _MISSING_THRESHOLD:
                result["issues"].append(
                    f"매크로[{name}]: OHLCV 거래일 기준 {len(missing_in_macro)}일 누락"
                )
    else:
        result["issues"].append("매크로 데이터 경로 없음")

    # 수급 날짜 비교 (샘플 종목 최대 3개)
    for ticker in sample_tickers[:3]:
        supply_path = RAW_SUPPLY_PATH / f"{ticker}.parquet"
        if not supply_path.exists():
            continue

        supply_df = load_parquet(supply_path)
        if supply_df is None or supply_df.empty:
            continue

        supply_dates = set(supply_df.index.normalize())
        result["supply_date_range"][ticker] = {
            "start": supply_df.index.min().strftime("%Y-%m-%d"),
            "end": supply_df.index.max().strftime("%Y-%m-%d"),
            "count": len(supply_dates),
        }

        missing_in_supply = ohlcv_dates - supply_dates
        extra_in_supply = supply_dates - ohlcv_dates

        result["ohlcv_vs_supply"][ticker] = {
            "ohlcv_count": len(ohlcv_dates),
            "supply_count": len(supply_dates),
            "missing_in_supply": len(missing_in_supply),
            "extra_in_supply": len(extra_in_supply),
            "missing_sample": sorted(
                [d.strftime("%Y-%m-%d") for d in list(missing_in_supply)[:5]]
            ),
        }

        if len(missing_in_supply) > _MISSING_THRESHOLD:
            result["issues"].append(
                f"수급[{ticker}]: OHLCV 대비 {len(missing_in_supply)}일 누락"
            )

    logger.info("② 날짜 Alignment 검증 완료 | 이슈: %d건", len(result["issues"]))
    return result


def generate_quality_report(output_path: Path | None = None) -> dict:
    """
    전체 데이터 품질 리포트를 생성하고 JSON 파일로 저장합니다.

    OHLCV / 수급 / 매크로 / 재무 데이터 검증을 순차 실행하여
    요약(summary)과 세부(details) 결과를 포함한 딕셔너리를 반환합니다.

    Args:
        output_path: 리포트 저장 경로 (.json). None 이면 LOGS_PATH 아래에
                     "quality_report_{timestamp}.json" 으로 자동 저장합니다.

    Returns:
        품질 리포트 딕셔너리
    """
    logger.info("전체 품질 리포트 생성 시작")

    # OHLCV 에서 종목 목록 수집 (파일 이름 기반)
    tickers: list[str] = []
    if RAW_OHLCV_PATH.exists():
        tickers = [p.stem for p in RAW_OHLCV_PATH.glob("*.parquet")]
    logger.info("검증 대상 종목 수: %d", len(tickers))

    # 각 카테고리 검증
    ohlcv_results = check_ohlcv_quality(tickers)
    supply_results = check_supply_quality(tickers)
    macro_results = check_macro_quality()
    financial_results = check_financial_quality(tickers)

    # 정상/이슈 집계
    def _count_ok(results: dict) -> int:
        return sum(1 for v in results.values() if isinstance(v, dict) and not v.get("issues"))

    ohlcv_ok = _count_ok(ohlcv_results)
    supply_ok = _count_ok(supply_results)
    macro_ok = _count_ok(macro_results)
    financial_ok = _count_ok(financial_results)

    # 전체 이슈 목록 (종목 코드 + 설명)
    all_issues: list[str] = []
    for category, results in [
        ("OHLCV", ohlcv_results),
        ("수급", supply_results),
        ("매크로", macro_results),
        ("재무", financial_results),
    ]:
        for key, detail in results.items():
            if isinstance(detail, dict):
                for issue in detail.get("issues", []):
                    all_issues.append(f"[{category}][{key}] {issue}")

    timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")

    report: dict = {
        "timestamp": timestamp,
        "summary": {
            "total_tickers": len(tickers),
            "ohlcv_ok": ohlcv_ok,
            "supply_ok": supply_ok,
            "macro_ok": macro_ok,
            "financial_ok": financial_ok,
            "total_issues": len(all_issues),
            "issues": all_issues,
        },
        "details": {
            "ohlcv": ohlcv_results,
            "supply": supply_results,
            "macro": macro_results,
            "financial": financial_results,
        },
    }

    # JSON 저장
    if output_path is None:
        LOGS_PATH.mkdir(parents=True, exist_ok=True)
        safe_ts = timestamp.replace(":", "-").replace("T", "_")
        output_path = LOGS_PATH / f"quality_report_{safe_ts}.json"

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    logger.info("품질 리포트 저장 완료: %s", output_path)
    return report


# ---------------------------------------------------------------------------
# Verbose 출력 헬퍼
# ---------------------------------------------------------------------------

def _print_verbose_ohlcv(ticker: str, detail: dict) -> None:
    """
    --verbose 모드에서 OHLCV 이슈 날짜의 실제 값을 테이블로 출력합니다.

    각 이슈 유형별로 해당 날짜의 open/high/low/close/volume 실제 값을 보여줍니다.
    샘플은 최대 10건이며 전체 건수가 더 많으면 안내 문구를 함께 표시합니다.
    """
    path = RAW_OHLCV_PATH / f"{ticker}.parquet"
    df = load_parquet(path)
    if df is None or df.empty:
        return

    price_cols = [c for c in ["open", "high", "low", "close", "volume"] if c in df.columns]

    checks = [
        ("0 이하 가격",      "non_positive_price_sample",    "non_positive_price_count"),
        ("high < low 위반",  "high_lt_low_sample",           "high_lt_low_count"),
        ("OHLC 논리 위반",   "ohlc_logic_violation_sample",  "ohlc_logic_violation_count"),
        ("0 거래량",         "zero_volume_sample",            "zero_volume_count"),
        ("거래량 스파이크",  "volume_spike_sample",           "volume_spike_count"),
        ("이상치 수익률",    "outlier_dates_sample",          "outlier_dates_count"),
    ]

    has_output = False
    for label, sample_key, count_key in checks:
        dates = detail.get(sample_key, [])
        total = detail.get(count_key, 0)
        if not dates:
            continue

        if not has_output:
            print(f"\n  ┌─ [{ticker}] 상세 데이터 ──────────────────────")
            has_output = True

        idx = pd.to_datetime(dates)
        rows = df[df.index.isin(idx)][price_cols]
        suffix = f"  (전체 {total}건 중 최대 10건)" if total > 10 else ""
        print(f"  │")
        print(f"  │  [{label}]{suffix}")
        for line in rows.to_string().splitlines():
            print(f"  │    {line}")

    if has_output:
        print("  └" + "─" * 48)


# ---------------------------------------------------------------------------
# CLI 엔트리포인트
# ---------------------------------------------------------------------------

def main() -> None:
    """
    품질 검증 실행 및 리포트를 콘솔에 출력합니다.

    옵션:
        --tickers 005930 000660  특정 종목만 검증 (미지정 시 전체)
        --category ohlcv supply  검증할 카테고리 (미지정 시 전체)
        --output report.json     리포트 저장 경로 (미지정 시 자동)
        --verbose / -v           이슈 날짜의 실제 OHLCV 값을 테이블로 출력

    ML 전 검증 카테고리 (--category ml_validation):
        supply_sum       ① 수급 합계 검증 (외국인+기관+개인 ≈ 0)
        date_alignment   ② 날짜 Alignment 검증 (OHLCV ↔ 수급 ↔ 매크로)
        delisted_cutoff  ③ 편출 종목 마지막 거래일 확인
    """
    import argparse

    _ALL_CATEGORIES = ["ohlcv", "supply", "macro", "financial",
                       "supply_sum", "date_alignment", "delisted_cutoff"]

    parser = argparse.ArgumentParser(
        description="KOSPI 200 데이터 품질 검증",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "예시:\n"
            "  python validators/data_quality.py                                          # 전체 검증\n"
            "  python validators/data_quality.py --tickers 005930 000660                  # 특정 종목만\n"
            "  python validators/data_quality.py --category ohlcv                         # OHLCV만\n"
            "  python validators/data_quality.py --category supply_sum date_alignment delisted_cutoff  # ML 전 검증\n"
            "  python validators/data_quality.py --tickers 005930 --verbose               # 실제 값 출력\n"
        ),
    )
    parser.add_argument(
        "--tickers",
        nargs="+",
        metavar="TICKER",
        help="검증할 종목 코드 (미지정 시 OHLCV 파일 목록 전체)",
    )
    parser.add_argument(
        "--category",
        nargs="+",
        choices=_ALL_CATEGORIES,
        metavar="CATEGORY",
        help=(
            "검증할 카테고리 (미지정 시 전체 파일 품질 검증): "
            "ohlcv supply macro financial supply_sum date_alignment delisted_cutoff"
        ),
    )
    parser.add_argument(
        "--output",
        metavar="PATH",
        help="리포트 JSON 저장 경로 (미지정 시 logs/ 아래 자동 생성)",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="이슈 날짜의 실제 OHLCV 값을 테이블로 출력합니다",
    )
    args = parser.parse_args()

    # 종목 목록 결정
    if args.tickers:
        tickers = args.tickers
    else:
        tickers = [p.stem for p in RAW_OHLCV_PATH.glob("*.parquet")] if RAW_OHLCV_PATH.exists() else []

    # 카테고리 결정
    _FILE_QUALITY_CATS = {"ohlcv", "supply", "macro", "financial"}
    _ML_VALID_CATS = {"supply_sum", "date_alignment", "delisted_cutoff"}

    if args.category:
        categories = set(args.category)
    else:
        categories = _FILE_QUALITY_CATS  # 기본값: 파일 품질 검증만

    # ML 전 검증 카테고리 분리
    ml_cats = categories & _ML_VALID_CATS
    file_cats = categories & _FILE_QUALITY_CATS

    # ── ML 전 검증 (supply_sum / date_alignment / delisted_cutoff) ──────────
    if ml_cats:
        ml_results: dict[str, dict] = {}
        ml_issues: list[str] = []

        if "supply_sum" in ml_cats:
            ml_results["supply_sum"] = check_supply_sum(tickers)
            for ticker, detail in ml_results["supply_sum"].items():
                for issue in detail.get("issues", []):
                    ml_issues.append(f"[수급합계][{ticker}] {issue}")

        if "date_alignment" in ml_cats:
            ml_results["date_alignment"] = check_date_alignment(
                sample_tickers=tickers[:5] if tickers else None
            )
            for issue in ml_results["date_alignment"].get("issues", []):
                ml_issues.append(f"[날짜정렬] {issue}")

        if "delisted_cutoff" in ml_cats:
            ml_results["delisted_cutoff"] = check_delisted_cutoff()
            for issue in ml_results["delisted_cutoff"].get("issues", []):
                ml_issues.append(f"[편출마감] {issue}")

        print("\n===== ML 전 데이터 검증 =====")
        print(f"생성 시각  : {datetime.now().strftime('%Y-%m-%dT%H:%M:%S')}")

        if "supply_sum" in ml_results:
            r = ml_results["supply_sum"]
            ok = sum(1 for v in r.values() if isinstance(v, dict) and not v.get("issues"))
            print(f"① 수급 합계 : 종목 {len(r)}개 중 이슈 {len(r) - ok}개")

        if "date_alignment" in ml_results:
            r = ml_results["date_alignment"]
            n_issues = len(r.get("issues", []))
            print(f"② 날짜 정렬 : {'정상' if n_issues == 0 else f'이슈 {n_issues}건'}")
            if r.get("ohlcv_date_range"):
                dr = r["ohlcv_date_range"]
                print(f"   OHLCV 기준: {dr['start']} ~ {dr['end']} ({dr['count']}거래일)")
            for name, d in r.get("ohlcv_vs_macro", {}).items():
                print(f"   매크로[{name}] 누락: {d['missing_in_macro']}일 "
                      f"({d['missing_rate']:.1%})")

        if "delisted_cutoff" in ml_results:
            r = ml_results["delisted_cutoff"]
            print(f"③ 편출 커버리지: 총 편출 {r['total_delisted']}개 | "
                  f"확인 {r['checked']}개 | 정상 {r['ok_count']}개 | "
                  f"커버리지부족 {r['late_data_count']}개 | 파일없음 {r['no_file_count']}개")
            if r['late_data_count'] == 0:
                print("   -> 모든 편출 종목의 OHLCV가 멤버십 기간을 커버함 (정상)")

        print(f"\n전체 이슈  : {len(ml_issues)}건")
        if ml_issues:
            print("\n--- 이슈 목록 (최대 20건) ---")
            for issue in ml_issues[:20]:
                print(f"  {issue}")
            if len(ml_issues) > 20:
                print(f"  ... 외 {len(ml_issues) - 20}건")

        if args.output:
            out = Path(args.output)
            out.parent.mkdir(parents=True, exist_ok=True)
            with open(out, "w", encoding="utf-8") as f:
                json.dump(
                    {"timestamp": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
                     "ml_validation": ml_results,
                     "issues": ml_issues},
                    f, ensure_ascii=False, indent=2,
                )
            logger.info("ML 검증 리포트 저장: %s", out)

        print("================================\n")

        if not file_cats:
            return  # ML 검증만 요청된 경우 종료

    # ── 파일 품질 검증 (ohlcv / supply / macro / financial) ─────────────────
    if not file_cats:
        return

    if file_cats == _FILE_QUALITY_CATS and not args.tickers and not args.output:
        # 전체 검증 → generate_quality_report 사용 (JSON 자동 저장)
        report = generate_quality_report(Path(args.output) if args.output else None)
    else:
        # 부분 검증 → 선택된 카테고리만 실행, JSON 저장 선택적
        logger.info("선택 검증 | 종목 수: %d | 카테고리: %s", len(tickers), sorted(file_cats))

        timestamp = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        results: dict[str, dict] = {}
        all_issues: list[str] = []

        if "ohlcv" in file_cats:
            results["ohlcv"] = check_ohlcv_quality(tickers)
        if "supply" in file_cats:
            results["supply"] = check_supply_quality(tickers)
        if "macro" in file_cats:
            results["macro"] = check_macro_quality()
        if "financial" in file_cats:
            results["financial"] = check_financial_quality(tickers)

        category_labels = {"ohlcv": "OHLCV", "supply": "수급", "macro": "매크로", "financial": "재무"}
        for cat_key, cat_results in results.items():
            label = category_labels.get(cat_key, cat_key)
            for key, detail in cat_results.items():
                if isinstance(detail, dict):
                    for issue in detail.get("issues", []):
                        all_issues.append(f"[{label}][{key}] {issue}")

        def _count_ok(r: dict) -> int:
            return sum(1 for v in r.values() if isinstance(v, dict) and not v.get("issues"))

        report = {
            "timestamp": timestamp,
            "summary": {
                "total_tickers": len(tickers),
                **{f"{k}_ok": _count_ok(v) for k, v in results.items()},
                "total_issues": len(all_issues),
                "issues": all_issues,
            },
            "details": results,
        }

        if args.output:
            out = Path(args.output)
            out.parent.mkdir(parents=True, exist_ok=True)
            with open(out, "w", encoding="utf-8") as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            logger.info("리포트 저장: %s", out)

    summary = report["summary"]
    print("\n===== 데이터 품질 리포트 =====")
    print(f"생성 시각  : {report['timestamp']}")
    print(f"검증 종목 수: {summary['total_tickers']}")
    for key in ["ohlcv_ok", "supply_ok", "macro_ok", "financial_ok"]:
        if key in summary:
            label = {"ohlcv_ok": "OHLCV 정상", "supply_ok": "수급 정상",
                     "macro_ok": "매크로 정상", "financial_ok": "재무 정상"}[key]
            print(f"{label:10s}: {summary[key]}")
    print(f"전체 이슈  : {summary['total_issues']}건")

    if summary["issues"]:
        print("\n--- 이슈 목록 (최대 20건) ---")
        for issue in summary["issues"][:20]:
            print(f"  {issue}")
        if len(summary["issues"]) > 20:
            print(f"  ... 외 {len(summary['issues']) - 20}건")

    print("================================\n")

    # --verbose: OHLCV 이슈 날짜의 실제 값 출력
    if args.verbose and "ohlcv" in report.get("details", {}):
        print("===== 상세 데이터 (--verbose) =====")
        for ticker, detail in report["details"]["ohlcv"].items():
            if detail.get("issues"):
                _print_verbose_ohlcv(ticker, detail)
        print("===================================\n")


if __name__ == "__main__":
    main()
