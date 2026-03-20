"""
processors/build_fundamental_metrics.py
재무 원본 데이터에서 파생 지표(비율, 성장률)를 계산하는 프로세서.

stock_financials DB 테이블에 들어갈 파생 컬럼을 생성한다.

입력:
  RAW_FINANCIAL_PATH/{ticker}_{YYYYMMDD}.parquet (Point-in-Time 파일들)

출력:
  PROCESSED_FUNDAMENTAL_PATH/fundamental_metrics.parquet

파생 지표:
  - 비율: operating_margin, net_margin, roa, debt_ratio (개선)
  - 성장률 YoY: revenue_yoy, operating_profit_yoy, net_income_yoy
  - 성장률 QoQ: revenue_qoq, operating_profit_qoq
  - 밸류에이션: per, pbr (pykrx 분기 말일 기준)

Python 3.10+ 호환.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from config import (
    PARQUET_COMPRESSION,
    PROCESSED_FUNDAMENTAL_PATH,
    PYKRX_DELAY,
    RAW_FINANCIAL_PATH,
)
from utils.drive_utils import ensure_dir, load_parquet, save_parquet  # noqa: F401 (load_parquet used in fallback)
from utils.logger import setup_logger

logger = setup_logger(__name__)


# ---------------------------------------------------------------------------
# 1. 재무 원본 로드
# ---------------------------------------------------------------------------

def load_all_financial() -> pd.DataFrame:
    """
    raw/financial/ 에서 전체 parquet 파일을 로드하고 종목별 최신 as_of_date만 유지한다.

    Point-in-Time 보장: 동일 (ticker, fiscal_year, fiscal_quarter)에 대해
    가장 최근 as_of_date 파일의 데이터만 사용한다.

    Returns:
        통합된 재무 DataFrame. 파일이 없으면 빈 DataFrame.
    """
    if not RAW_FINANCIAL_PATH.exists():
        logger.warning("RAW_FINANCIAL_PATH 없음: %s", RAW_FINANCIAL_PATH)
        return pd.DataFrame()

    parquet_files = sorted(RAW_FINANCIAL_PATH.glob("*.parquet"))
    if not parquet_files:
        logger.warning("재무 parquet 파일 없음: %s", RAW_FINANCIAL_PATH)
        return pd.DataFrame()

    # PyArrow dataset reader로 일괄 로드 (개별 I/O 대비 대폭 성능 향상)
    try:
        import pyarrow.parquet as pq

        dataset = pq.ParquetDataset(RAW_FINANCIAL_PATH)
        combined = dataset.read().to_pandas()
        logger.info("재무 파일 %d개 로드 (PyArrow dataset), 총 %d행", len(parquet_files), len(combined))
    except Exception as exc:
        logger.warning("PyArrow dataset 로드 실패, 개별 로드로 폴백: %s", exc)
        frames: list[pd.DataFrame] = []
        for fp in parquet_files:
            try:
                df = load_parquet(fp)
                if df is not None and not df.empty:
                    frames.append(df)
            except Exception as exc2:
                logger.debug("파일 로드 실패 (건너뜀): %s — %s", fp.name, exc2)
        if not frames:
            logger.warning("유효한 재무 데이터 없음")
            return pd.DataFrame()
        combined = pd.concat(frames, ignore_index=True)
        logger.info("재무 파일 %d개 로드 (개별), 총 %d행", len(frames), len(combined))

    if combined.empty:
        logger.warning("유효한 재무 데이터 없음")
        return pd.DataFrame()

    # 필수 컬럼 존재 확인
    key_cols = ["ticker", "fiscal_year", "fiscal_quarter"]
    for col in key_cols:
        if col not in combined.columns:
            logger.error("필수 컬럼 누락: %s", col)
            return pd.DataFrame()

    # Point-in-Time: 동일 (ticker, fiscal_year, fiscal_quarter)에서 최신 as_of_date만 유지
    if "as_of_date" in combined.columns:
        combined["as_of_date"] = combined["as_of_date"].astype(str)
        combined = combined.sort_values("as_of_date", ascending=False)
        combined = combined.drop_duplicates(
            subset=key_cols, keep="first",
        ).reset_index(drop=True)
        logger.info("중복 제거 후 %d행 (최신 as_of_date 기준)", len(combined))

    return combined


# ---------------------------------------------------------------------------
# 2. 비율 지표 계산
# ---------------------------------------------------------------------------

def compute_ratio_metrics(df: pd.DataFrame) -> pd.DataFrame:
    """
    단일 행 기반 비율 지표를 계산한다.

    - operating_margin = operating_income / revenue * 100
    - net_margin = net_income / revenue * 100
    - roa = net_income / total_assets * 100
    - debt_ratio 개선: total_liabilities / total_equity * 100 (없으면 기존 값 유지)

    분모가 0 또는 NaN이면 결과는 NaN.
    """
    df = df.copy()

    revenue = df.get("revenue")
    operating_income = df.get("operating_income")
    net_income = df.get("net_income")
    total_assets = df.get("total_assets")
    total_liabilities = df.get("total_liabilities")
    total_equity = df.get("total_equity")

    # operating_margin
    if revenue is not None and operating_income is not None:
        df["operating_margin"] = np.where(
            (revenue != 0) & revenue.notna(),
            operating_income / revenue * 100,
            np.nan,
        )
    else:
        df["operating_margin"] = np.nan

    # net_margin
    if revenue is not None and net_income is not None:
        df["net_margin"] = np.where(
            (revenue != 0) & revenue.notna(),
            net_income / revenue * 100,
            np.nan,
        )
    else:
        df["net_margin"] = np.nan

    # roa
    if total_assets is not None and net_income is not None:
        df["roa"] = np.where(
            (total_assets != 0) & total_assets.notna(),
            net_income / total_assets * 100,
            np.nan,
        )
    else:
        df["roa"] = np.nan

    # debt_ratio 개선: total_liabilities가 있으면 직접 계산
    if total_liabilities is not None and total_equity is not None:
        improved = np.where(
            total_liabilities.notna() & (total_equity != 0) & total_equity.notna(),
            total_liabilities / total_equity * 100,
            np.nan,
        )
        # 기존 debt_ratio가 있으면 improved 값이 NaN인 경우만 기존 값 유지
        if "debt_ratio" in df.columns:
            df["debt_ratio"] = np.where(
                pd.notna(improved), improved, df["debt_ratio"],
            )
        else:
            df["debt_ratio"] = improved

    logger.info("비율 지표 계산 완료: operating_margin, net_margin, roa, debt_ratio")
    return df


# ---------------------------------------------------------------------------
# 3. 성장률 계산
# ---------------------------------------------------------------------------

def _prev_quarter(year: int, quarter: int) -> tuple[int, int]:
    """직전 분기의 (year, quarter)를 반환한다."""
    if quarter == 1:
        return year - 1, 4
    return year, quarter - 1


def compute_growth_rates(df: pd.DataFrame) -> pd.DataFrame:
    """
    종목별 YoY/QoQ 성장률을 key 기반 merge로 계산한다.

    YoY: (ticker, fiscal_year-1, fiscal_quarter) 매칭 — 전년 동분기
    QoQ: (ticker, prev_year, prev_quarter) 매칭 — 직전 분기
    growth = (current - prev) / abs(prev) * 100
    분모가 0 또는 NaN이면 NaN.

    분기 누락이 있어도 정확한 비교를 보장한다 (positional shift 미사용).
    """
    df = df.copy()

    metrics = {
        "revenue": ("revenue_yoy", "revenue_qoq"),
        "operating_income": ("operating_profit_yoy", "operating_profit_qoq"),
        "net_income": ("net_income_yoy", None),
    }

    merge_keys = ["ticker", "fiscal_year", "fiscal_quarter"]

    for src_col, (yoy_col, qoq_col) in metrics.items():
        if src_col not in df.columns:
            if yoy_col:
                df[yoy_col] = np.nan
            if qoq_col:
                df[qoq_col] = np.nan
            continue

        # --- YoY: 전년 동분기 key 매칭 ---
        prev_yoy = df[merge_keys + [src_col]].copy()
        prev_yoy = prev_yoy.rename(columns={src_col: "_prev_yoy"})
        prev_yoy["fiscal_year"] = prev_yoy["fiscal_year"] + 1  # 1년 뒤 행과 매칭
        df = df.merge(prev_yoy, on=merge_keys, how="left")
        df[yoy_col] = _safe_growth(df[src_col], df["_prev_yoy"])
        df = df.drop(columns=["_prev_yoy"])

        # --- QoQ: 직전 분기 key 매칭 ---
        if qoq_col:
            # 현재 행의 직전 분기 key를 계산하여 원본과 매칭
            df["_prev_y"], df["_prev_q"] = zip(
                *df.apply(
                    lambda r: _prev_quarter(int(r["fiscal_year"]), int(r["fiscal_quarter"])),
                    axis=1,
                )
            )
            prev_qoq = df[["ticker", "fiscal_year", "fiscal_quarter", src_col]].copy()
            prev_qoq = prev_qoq.rename(columns={
                src_col: "_prev_qoq",
                "fiscal_year": "_prev_y",
                "fiscal_quarter": "_prev_q",
            })
            df = df.merge(
                prev_qoq, on=["ticker", "_prev_y", "_prev_q"], how="left",
            )
            df[qoq_col] = _safe_growth(df[src_col], df["_prev_qoq"])
            df = df.drop(columns=["_prev_y", "_prev_q", "_prev_qoq"])

    logger.info(
        "성장률 계산 완료: revenue_yoy/qoq, operating_profit_yoy/qoq, net_income_yoy",
    )
    return df


def _safe_growth(current: pd.Series, prev: pd.Series) -> np.ndarray:
    """(current - prev) / abs(prev) * 100. 분모 0 또는 NaN → NaN."""
    abs_prev = prev.abs()
    return np.where(
        (abs_prev != 0) & abs_prev.notna() & current.notna(),
        (current - prev) / abs_prev * 100,
        np.nan,
    )


# ---------------------------------------------------------------------------
# 4. PER/PBR 조회 (pykrx)
# ---------------------------------------------------------------------------

# 분기 → 분기 말월/말일 매핑
_QUARTER_END: dict[int, tuple[int, int]] = {
    1: (3, 31),
    2: (6, 30),
    3: (9, 30),
    4: (12, 31),
}


def _quarter_end_date(year: int, quarter: int) -> str:
    """분기 말일을 YYYYMMDD 문자열로 반환한다."""
    month, day = _QUARTER_END[quarter]
    return f"{year}{month:02d}{day:02d}"


def _find_nearest_trading_date(date_str: str) -> str:
    """
    주어진 날짜가 비거래일이면 직전 거래일을 찾는다.
    pykrx get_nearest_business_day_in_a_week 또는 수동 탐색으로
    최대 14일 전까지 탐색한다 (연말 연휴 대응).
    """
    import time
    from datetime import datetime, timedelta

    from pykrx import stock

    # 방법 1: pykrx 내장 함수 시도
    try:
        nearest = stock.get_nearest_business_day_in_a_week(date_str, prev=True)
        if nearest:
            logger.debug("거래일 탐색: %s → %s (pykrx)", date_str, nearest)
            return nearest
    except Exception:
        pass

    # 방법 2: get_market_fundamental_by_ticker로 수동 탐색 (최대 14일)
    dt = datetime.strptime(date_str, "%Y%m%d")
    for offset in range(15):
        candidate = (dt - timedelta(days=offset)).strftime("%Y%m%d")
        time.sleep(PYKRX_DELAY)
        try:
            result = stock.get_market_fundamental_by_ticker(candidate, market="KOSPI")
            if result is not None and not result.empty:
                logger.debug("거래일 탐색: %s → %s (수동, offset=%d)", date_str, candidate, offset)
                return candidate
        except Exception:
            continue
    return date_str  # 폴백: 원래 날짜 반환


def _ensure_krx_session() -> bool:
    """KRX 세션 인증을 수행한다. 실패 시 False 반환."""
    import os

    user_id = os.environ.get("KRX_USER_ID")
    password = os.environ.get("KRX_PASSWORD")
    if not user_id or not password:
        logger.warning("KRX_USER_ID/KRX_PASSWORD 미설정 — PER/PBR 조회 불가")
        return False

    try:
        from utils.krx_session import ensure_krx_session
        ensure_krx_session(user_id, password)
        return True
    except Exception as exc:
        logger.warning("KRX 세션 인증 실패: %s", exc)
        return False


def fetch_per_pbr(df: pd.DataFrame) -> pd.DataFrame:
    """
    pykrx에서 분기 말일 기준 PER/PBR을 조회하여 DataFrame에 병합한다.

    KRX 세션 인증 후 각 (fiscal_year, fiscal_quarter) 조합별로 한 번씩 API를 호출하고,
    ticker 기준으로 left join 한다.

    Args:
        df: fiscal_year, fiscal_quarter, ticker 컬럼이 있는 DataFrame

    Returns:
        per, pbr 컬럼이 업데이트된 DataFrame.
    """
    import time

    from pykrx import stock

    df = df.copy()

    # KRX 세션 인증 (PER/PBR 조회에 필수)
    if not _ensure_krx_session():
        logger.warning("KRX 세션 인증 실패 — PER/PBR 기존 값 유지")
        return df

    # 고유 (fiscal_year, fiscal_quarter) 조합 추출
    quarters = (
        df[["fiscal_year", "fiscal_quarter"]]
        .drop_duplicates()
        .sort_values(["fiscal_year", "fiscal_quarter"])
    )

    # 분기 말일 → 실제 거래일 매핑 (인증된 세션으로 한번에 탐색)
    quarter_trading_dates: dict[tuple[int, int], str] = {}
    for _, row in quarters.iterrows():
        year = int(row["fiscal_year"])
        quarter = int(row["fiscal_quarter"])
        date_str = _quarter_end_date(year, quarter)
        trading_date = _find_nearest_trading_date(date_str)
        quarter_trading_dates[(year, quarter)] = trading_date
        logger.info("거래일 매핑: %dQ%d %s → %s", year, quarter, date_str, trading_date)

    # 분기별 PER/PBR 조회 결과 누적
    all_fundamentals: list[pd.DataFrame] = []

    for (year, quarter), trading_date in quarter_trading_dates.items():
        logger.info("PER/PBR 조회: %dQ%d (거래일: %s)", year, quarter, trading_date)

        time.sleep(PYKRX_DELAY)
        try:
            fund = stock.get_market_fundamental_by_ticker(trading_date, market="KOSPI")
            if fund is None or fund.empty:
                logger.warning("PER/PBR 데이터 없음: %s", trading_date)
                continue

            # pykrx 결과: index=ticker, columns=[BPS, PER, PBR, EPS, DIV, DPS]
            fund = fund[["PER", "PBR"]].rename(
                columns={"PER": "_per", "PBR": "_pbr"},
            )
            fund.index.name = "ticker"
            fund = fund.reset_index()
            fund["fiscal_year"] = year
            fund["fiscal_quarter"] = quarter
            all_fundamentals.append(fund)
        except Exception as exc:
            logger.warning("PER/PBR 조회 실패 (%dQ%d): %s", year, quarter, exc)

    if not all_fundamentals:
        logger.warning("PER/PBR 조회 결과 없음 — 기존 값 유지")
        return df

    fund_df = pd.concat(all_fundamentals, ignore_index=True)

    # 기존 per/pbr 컬럼 제거 후 병합
    for col in ("per", "pbr"):
        if col in df.columns:
            df = df.drop(columns=[col])

    df = df.merge(
        fund_df,
        on=["ticker", "fiscal_year", "fiscal_quarter"],
        how="left",
    )

    # 컬럼명 정리
    df = df.rename(columns={"_per": "per", "_pbr": "pbr"})

    # 0 → NaN (pykrx는 데이터 없는 종목에 0을 반환)
    for col in ("per", "pbr"):
        if col in df.columns:
            df[col] = df[col].replace(0, np.nan)

    per_count = df["per"].notna().sum() if "per" in df.columns else 0
    logger.info("PER/PBR 병합 완료: %d/%d행에 PER 값 존재", per_count, len(df))

    return df


# ---------------------------------------------------------------------------
# 5. 메인
# ---------------------------------------------------------------------------

def main() -> None:
    """재무 파생 지표를 계산하여 processed/fundamental/에 저장한다."""
    logger.info("=== 펀더멘탈 파생 지표 생성 시작 ===")

    df = load_all_financial()
    if df.empty:
        logger.warning("재무 데이터 없음 — 펀더멘탈 지표 생성 건너뜀")
        return

    df = compute_ratio_metrics(df)
    df = compute_growth_rates(df)
    df = fetch_per_pbr(df)

    # 소수점 반올림 (object 타입 → numeric 변환 후 반올림)
    float_cols = [
        "operating_margin", "net_margin", "roa", "debt_ratio",
        "revenue_yoy", "revenue_qoq",
        "operating_profit_yoy", "operating_profit_qoq",
        "net_income_yoy",
        "per", "pbr",
    ]
    for col in float_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce").round(2)

    # 저장
    ensure_dir(PROCESSED_FUNDAMENTAL_PATH)
    dest = PROCESSED_FUNDAMENTAL_PATH / "fundamental_metrics.parquet"
    save_parquet(df, dest, compression=PARQUET_COMPRESSION)

    logger.info(
        "=== 펀더멘탈 파생 지표 생성 완료: %d행, %d컬럼 → %s ===",
        len(df), len(df.columns), dest,
    )


if __name__ == "__main__":
    main()
