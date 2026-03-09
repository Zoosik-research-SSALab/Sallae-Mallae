"""
features/build_lgbm_features.py
LightGBM 피처 엔지니어링 모듈 (stock_ml_model)

입력:
  PROCESSED_BASE_PATH/base_features.parquet (또는 RAW_OHLCV_PATH 폴백)
  RAW_SUPPLY_PATH/{ticker}.parquet
  RAW_MACRO_PATH/*.parquet

출력:
  PROCESSED_LGBM_PATH/lgbm_features.parquet  (전체)
  PROCESSED_LGBM_PATH/lgbm_train.parquet     (학습: ~2020-12-31)
  PROCESSED_LGBM_PATH/lgbm_test.parquet      (테스트: 2021-01)

Python 3.10+ 호환, Google Colab 동작 지원.
"""

from __future__ import annotations

import warnings
from pathlib import Path

import numpy as np
import pandas as pd

from config import (
    RAW_MACRO_PATH,
    RAW_OHLCV_PATH,
    RAW_SUPPLY_PATH,
    PROCESSED_BASE_PATH,
    PROCESSED_LGBM_PATH,
    TRAIN_END_DATE,
    TEST_START_DATE,
    TEST_END_DATE,
    PARQUET_COMPRESSION,
)
from utils.logger import setup_logger
from utils.drive_utils import ensure_dir, save_parquet, load_parquet

warnings.filterwarnings("ignore", category=FutureWarning)

logger = setup_logger(__name__)

# ---------------------------------------------------------------------------
# 피처 목록 상수
# ---------------------------------------------------------------------------
TECH_FEATURES: list[str] = [
    "rsi_14",
    "macd",
    "macd_signal",
    "macd_hist",
    "bb_upper",
    "bb_middle",
    "bb_lower",
    "ma_5",
    "ma_20",
    "ma_60",
    "volume_ratio_5d",
    "volume_ratio_20d",
    "momentum_5d",
    "momentum_20d",
]

SUPPLY_FEATURES: list[str] = [
    "foreign_net_buy_1d",
    "foreign_net_buy_5d",
    "foreign_net_buy_20d",
    "institution_net_buy_1d",
    "institution_net_buy_5d",
]

MACRO_FEATURES: list[str] = [
    "kospi200_return_1d",
    "vkospi",
    "usd_krw_change",
    "sp500_return_1d",
    "nasdaq_return_1d",
    "dxy_change",
    "vix",
    "vix_change",
    "us_bond_10y",
    "us_bond_10y_change",
    "sox_return_1d",
]

META_FEATURES: list[str] = [
    "stock_id",
    "sector_id",
    "market_cap_rank",
]

FEATURES: list[str] = TECH_FEATURES + SUPPLY_FEATURES + MACRO_FEATURES + META_FEATURES

TARGET: str = "return_5d_class"


# ---------------------------------------------------------------------------
# 섹터 조회 헬퍼
# ---------------------------------------------------------------------------

def _get_wics_sector_map(tickers: list[str]) -> dict[str, str]:
    """
    pykrx WICS API로 종목별 섹터를 조회합니다.
    조회에 실패하거나 pykrx가 없는 종목은 "Unknown"으로 처리합니다.

    Args:
        tickers: 종목 코드 목록

    Returns:
        {ticker: sector_name} 딕셔너리
    """
    import datetime

    sector_map: dict[str, str] = {t: "Unknown" for t in tickers}

    try:
        from pykrx import stock as krx_stock  # type: ignore

        base_date = datetime.date.today().strftime("%Y%m%d")
        df = krx_stock.get_market_sector_classifications(date=base_date, market="KOSPI")
        if df is not None and not df.empty:
            for ticker in tickers:
                if ticker in df.index:
                    sector_map[ticker] = str(df.loc[ticker, "섹터"])
            logger.info("[SECTOR] WICS 섹터 조회 완료 (%d건)", sum(v != "Unknown" for v in sector_map.values()))
        else:
            logger.warning("[SECTOR] WICS 섹터 데이터가 비어 있습니다 — 모두 'Unknown'으로 처리합니다.")
    except ImportError:
        logger.warning("[SECTOR] pykrx 미설치 — 섹터 정보를 모두 'Unknown'으로 처리합니다.")
    except Exception as exc:
        logger.warning("[SECTOR] WICS 섹터 조회 실패: %s — 모두 'Unknown'으로 처리합니다.", exc)

    return sector_map


# ---------------------------------------------------------------------------
# base_features 로드 (기본 경로) 또는 RAW OHLCV 폴백
# ---------------------------------------------------------------------------

def _load_base_features() -> pd.DataFrame | None:
    """
    PROCESSED_BASE_PATH/base_features.parquet 을 로드합니다.
    MultiIndex (date, ticker)를 가정합니다.

    Returns:
        로드된 DataFrame, 또는 파일 없음/오류 시 None
    """
    path = PROCESSED_BASE_PATH / "base_features.parquet"
    df = load_parquet(path)
    if df is None or df.empty:
        logger.warning("[BASE] base_features.parquet 로드 실패: %s", path)
        return None

    # MultiIndex 정규화
    if not isinstance(df.index, pd.MultiIndex):
        logger.warning("[BASE] MultiIndex가 아닙니다 — 인덱스를 재구성합니다.")
        if "date" in df.columns and "ticker" in df.columns:
            df = df.set_index(["date", "ticker"])
        else:
            logger.error("[BASE] 'date', 'ticker' 컬럼이 없어 MultiIndex 재구성 불가.")
            return None

    df.index.names = ["date", "ticker"]
    df.index = df.index.set_levels(
        pd.to_datetime(df.index.levels[df.index.names.index("date")]),
        level="date",
    )
    df.sort_index(inplace=True)
    logger.info("[BASE] base_features.parquet 로드 완료: %d행, %d컬럼", len(df), len(df.columns))
    return df


def _load_ohlcv_fallback() -> pd.DataFrame | None:
    """
    base_features.parquet 이 없을 때 RAW_OHLCV_PATH 에서 직접 로드한 뒤
    기술지표를 계산하여 반환합니다.

    Returns:
        기술지표가 계산된 DataFrame (MultiIndex: date+ticker), 또는 실패 시 None
    """
    if not RAW_OHLCV_PATH.exists():
        logger.error("[FALLBACK] RAW_OHLCV_PATH 가 존재하지 않습니다: %s", RAW_OHLCV_PATH)
        return None

    tickers: list[str] = [p.stem for p in sorted(RAW_OHLCV_PATH.glob("*.parquet"))]
    if not tickers:
        logger.error("[FALLBACK] OHLCV parquet 파일을 찾을 수 없습니다: %s", RAW_OHLCV_PATH)
        return None

    logger.info("[FALLBACK] RAW OHLCV 에서 직접 로드합니다 (종목 수: %d)", len(tickers))

    frames: list[pd.DataFrame] = []
    for ticker in tickers:
        path = RAW_OHLCV_PATH / f"{ticker}.parquet"
        df = load_parquet(path)
        if df is None or df.empty:
            logger.debug("[FALLBACK] %s OHLCV 없음 — 건너뜀", ticker)
            continue
        df = df.copy()
        df["ticker"] = ticker
        frames.append(df)

    if not frames:
        logger.error("[FALLBACK] 로드 가능한 OHLCV 파일이 없습니다.")
        return None

    combined = pd.concat(frames, axis=0)
    combined.index = pd.to_datetime(combined.index)
    combined.sort_index(inplace=True)

    # 기술지표 계산
    combined = _compute_tech_features(combined)

    # MultiIndex 설정
    combined = combined.reset_index().rename(columns={"index": "date"})
    date_col = combined.columns[0] if combined.columns[0] != "ticker" else "date"
    combined = combined.rename(columns={combined.columns[0]: "date"})
    combined = combined.set_index(["date", "ticker"])
    combined.index.names = ["date", "ticker"]

    logger.info("[FALLBACK] OHLCV 폴백 완료: %d행", len(combined))
    return combined


# ---------------------------------------------------------------------------
# 기술 지표 계산 (폴백 경로 전용)
# ---------------------------------------------------------------------------

def _compute_tech_for_group(grp: pd.DataFrame) -> pd.DataFrame:
    """
    단일 종목 그룹에 대해 ta 라이브러리를 사용해 기술지표를 계산합니다.
    (pandas-ta 대신 ta 사용 — Python 3.14 호환, numba 불필요)

    Args:
        grp: 단일 종목의 OHLCV DataFrame (close, high, low, volume 컬럼 필요)

    Returns:
        기술지표 컬럼이 추가된 DataFrame
    """
    try:
        import ta as ta_lib  # type: ignore
    except ImportError as exc:
        raise ImportError("ta 패키지가 필요합니다: pip install ta") from exc

    grp = grp.copy().sort_index()
    close = grp["close"]
    high = grp["high"]
    low = grp["low"]
    volume = grp["volume"]

    # RSI(14)
    grp["rsi_14"] = ta_lib.momentum.RSIIndicator(close=close, window=14).rsi()

    # MACD
    macd_ind = ta_lib.trend.MACD(close=close, window_slow=26, window_fast=12, window_sign=9)
    grp["macd"]        = macd_ind.macd()
    grp["macd_signal"] = macd_ind.macd_signal()
    grp["macd_hist"]   = macd_ind.macd_diff()

    # Bollinger Bands
    bb_ind = ta_lib.volatility.BollingerBands(close=close, window=20, window_dev=2)
    grp["bb_upper"]  = bb_ind.bollinger_hband()
    grp["bb_middle"] = bb_ind.bollinger_mavg()
    grp["bb_lower"]  = bb_ind.bollinger_lband()

    # 이동평균
    grp["ma_5"]  = ta_lib.trend.SMAIndicator(close=close, window=5).sma_indicator()
    grp["ma_20"] = ta_lib.trend.SMAIndicator(close=close, window=20).sma_indicator()
    grp["ma_60"] = ta_lib.trend.SMAIndicator(close=close, window=60).sma_indicator()

    # 거래량 비율
    vol_ma5  = volume.rolling(window=5,  min_periods=1).mean()
    vol_ma20 = volume.rolling(window=20, min_periods=1).mean()
    grp["volume_ratio_5d"]  = volume / vol_ma5.replace(0, np.nan)
    grp["volume_ratio_20d"] = volume / vol_ma20.replace(0, np.nan)

    return grp


def _compute_tech_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    전체 종목 DataFrame에 대해 종목별(groupby ticker) 기술지표를 계산합니다.

    Args:
        df: 'ticker' 컬럼이 포함된 전체 OHLCV DataFrame

    Returns:
        기술지표 컬럼이 추가된 DataFrame
    """
    logger.info("[TECH] 기술지표 계산 시작 (종목 수: %d)", df["ticker"].nunique())
    result = df.groupby("ticker", group_keys=False).apply(_compute_tech_for_group)
    logger.info("[TECH] 기술지표 계산 완료")
    return result


# ---------------------------------------------------------------------------
# 추가 피처 계산 (base_features 위에 덧붙임)
# ---------------------------------------------------------------------------

def _add_momentum_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    momentum_5d, momentum_20d 를 ticker 별로 계산하여 추가합니다.
    이미 컬럼이 존재하면 건너뜁니다 (base_features 에 이미 포함된 경우).

    Args:
        df: MultiIndex (date, ticker) DataFrame, 'close' 컬럼 필요

    Returns:
        momentum_5d, momentum_20d 컬럼이 추가된 DataFrame
    """
    if "momentum_5d" in df.columns and "momentum_20d" in df.columns:
        logger.debug("[MOMENTUM] momentum 컬럼이 이미 존재합니다 — 건너뜁니다.")
        return df

    if "close" not in df.columns:
        logger.warning("[MOMENTUM] 'close' 컬럼 없음 — momentum 피처를 NaN으로 채웁니다.")
        df["momentum_5d"]  = np.nan
        df["momentum_20d"] = np.nan
        return df

    logger.info("[MOMENTUM] momentum_5d, momentum_20d 계산 시작")

    def _momentum_for_ticker(grp: pd.DataFrame) -> pd.DataFrame:
        grp = grp.copy()
        grp["momentum_5d"]  = grp["close"].pct_change(periods=5)
        grp["momentum_20d"] = grp["close"].pct_change(periods=20)
        return grp

    df = df.groupby(level="ticker", group_keys=False).apply(_momentum_for_ticker)
    logger.info("[MOMENTUM] momentum 피처 계산 완료")
    return df


def _add_supply_features_from_raw(
    df: pd.DataFrame,
    tickers: list[str],
) -> pd.DataFrame:
    """
    base_features 에 수급 피처가 없을 때 RAW_SUPPLY_PATH 에서 직접 로드하여 추가합니다.
    이미 수급 피처 컬럼이 모두 존재하면 바로 반환합니다.

    Args:
        df: MultiIndex (date, ticker) DataFrame
        tickers: 종목 코드 목록

    Returns:
        수급 피처 컬럼이 추가된 DataFrame
    """
    already_present = all(c in df.columns for c in SUPPLY_FEATURES)
    if already_present:
        logger.debug("[SUPPLY] 수급 피처 컬럼이 이미 존재합니다 — 건너뜁니다.")
        return df

    missing_cols = [c for c in SUPPLY_FEATURES if c not in df.columns]
    logger.info("[SUPPLY] 수급 피처 추가 로드 시작 (누락 컬럼: %s)", missing_cols)

    supply_frames: list[pd.DataFrame] = []
    for ticker in tickers:
        path = RAW_SUPPLY_PATH / f"{ticker}.parquet"
        sdf = load_parquet(path)
        if sdf is None or sdf.empty:
            logger.debug("[SUPPLY] %s 파일 없음 — 건너뜀", ticker)
            continue
        sdf = sdf.copy()
        sdf.index = pd.to_datetime(sdf.index)
        sdf = sdf.sort_index()

        row_list: list[dict] = []
        for date, row in sdf.iterrows():
            row_dict: dict = {"date": date, "ticker": ticker}

            foreign_raw = row.get("foreign_net_buy", np.nan)
            institution_raw = row.get("institution_net_buy", np.nan)
            row_dict["_foreign"] = foreign_raw
            row_dict["_institution"] = institution_raw
            row_list.append(row_dict)

        if not row_list:
            continue

        ticker_df = pd.DataFrame(row_list).set_index(["date", "ticker"])
        ticker_df.index = ticker_df.index.set_levels(
            pd.to_datetime(ticker_df.index.levels[ticker_df.index.names.index("date")]), level="date"
        )
        # rolling 계산은 날짜 인덱스 기준이므로 Series 로 처리
        foreign_s = ticker_df["_foreign"]
        inst_s    = ticker_df["_institution"]

        ticker_df["foreign_net_buy_1d"]  = foreign_s
        ticker_df["foreign_net_buy_5d"]  = foreign_s.rolling(window=5,  min_periods=1).sum()
        ticker_df["foreign_net_buy_20d"] = foreign_s.rolling(window=20, min_periods=1).sum()
        ticker_df["institution_net_buy_1d"] = inst_s
        ticker_df["institution_net_buy_5d"] = inst_s.rolling(window=5, min_periods=1).sum()

        ticker_df = ticker_df.drop(columns=["_foreign", "_institution"])
        supply_frames.append(ticker_df)

    if not supply_frames:
        logger.warning("[SUPPLY] 수급 데이터 없음 — 수급 피처를 NaN으로 채웁니다.")
        for col in SUPPLY_FEATURES:
            if col not in df.columns:
                df[col] = np.nan
        return df

    supply_combined = pd.concat(supply_frames)
    supply_combined = supply_combined[~supply_combined.index.duplicated(keep="last")]

    for col in SUPPLY_FEATURES:
        if col not in df.columns:
            df[col] = supply_combined[col].reindex(df.index)

    logger.info("[SUPPLY] 수급 피처 추가 완료")
    return df


def _add_macro_features_from_raw(df: pd.DataFrame) -> pd.DataFrame:
    """
    base_features 에 매크로 피처가 없을 때 RAW_MACRO_PATH 에서 직접 로드하여 추가합니다.
    이미 매크로 피처 컬럼이 모두 존재하면 바로 반환합니다.

    Args:
        df: MultiIndex (date, ticker) DataFrame

    Returns:
        매크로 피처 컬럼이 추가된 DataFrame
    """
    already_present = all(c in df.columns for c in MACRO_FEATURES)
    if already_present:
        logger.debug("[MACRO] 매크로 피처 컬럼이 이미 존재합니다 — 건너뜁니다.")
        return df

    missing_cols = [c for c in MACRO_FEATURES if c not in df.columns]
    logger.info("[MACRO] 매크로 피처 추가 로드 시작 (누락 컬럼: %s)", missing_cols)

    def _load_close(filename: str) -> pd.Series | None:
        path = RAW_MACRO_PATH / filename
        mdf = load_parquet(path)
        if mdf is None or mdf.empty:
            logger.debug("[MACRO] %s 없음", filename)
            return None
        mdf.index = pd.to_datetime(mdf.index)
        close_col = "close" if "close" in mdf.columns else mdf.columns[0]
        return mdf[close_col].sort_index()

    macro_series: dict[str, pd.Series] = {}

    kospi200 = _load_close("kospi200.parquet")
    if kospi200 is not None:
        macro_series["kospi200_return_1d"] = kospi200.pct_change(1)

    vkospi = _load_close("vkospi.parquet")
    if vkospi is not None:
        macro_series["vkospi"] = vkospi

    usd_krw = _load_close("usd_krw.parquet")
    if usd_krw is not None:
        macro_series["usd_krw_change"] = usd_krw.pct_change(1)

    sp500 = _load_close("sp500.parquet")
    if sp500 is not None:
        macro_series["sp500_return_1d"] = sp500.pct_change(1)

    nasdaq = _load_close("nasdaq.parquet")
    if nasdaq is not None:
        macro_series["nasdaq_return_1d"] = nasdaq.pct_change(1)

    dxy = _load_close("dxy.parquet")
    if dxy is not None:
        macro_series["dxy_change"] = dxy.pct_change(1)

    vix = _load_close("vix.parquet")
    if vix is not None:
        macro_series["vix"]        = vix
        macro_series["vix_change"] = vix.pct_change(1)

    bond_10y = _load_close("us_bond_10y.parquet")
    if bond_10y is not None:
        macro_series["us_bond_10y"]        = bond_10y
        macro_series["us_bond_10y_change"] = bond_10y.pct_change(1)

    sox = _load_close("sox.parquet")
    if sox is not None:
        macro_series["sox_return_1d"] = sox.pct_change(1)

    if not macro_series:
        logger.warning("[MACRO] 로드된 매크로 데이터가 없습니다 — NaN으로 채웁니다.")
        for col in missing_cols:
            df[col] = np.nan
        return df

    macro_df = pd.DataFrame(macro_series)
    macro_df.index = pd.to_datetime(macro_df.index)
    macro_df.sort_index(inplace=True)

    # date 레벨로 join (MultiIndex의 date 레벨 기준)
    date_level = df.index.get_level_values("date")
    for col in missing_cols:
        if col in macro_df.columns:
            df[col] = macro_df[col].reindex(date_level).values
        else:
            df[col] = np.nan

    logger.info("[MACRO] 매크로 피처 추가 완료")
    return df


# ---------------------------------------------------------------------------
# 타겟 계산 — 단면 분위수 기반 3클래스 (date별 cross-sectional quantile)
# ---------------------------------------------------------------------------

def compute_target(df: pd.DataFrame) -> pd.DataFrame:
    """
    5일 후 수익률을 기반으로 날짜별 단면 분위수(cross-sectional quantile)로
    3클래스 타겟을 생성합니다.

    미래 데이터 누출 방지를 위해 ticker 그룹 내에서 shift(-5)를 사용합니다.

    클래스 정의 (날짜별 단면 분위수):
      2 (상승): 해당 날짜 상위 33% 수익률
      1 (횡보): 해당 날짜 중간 33%
      0 (하락): 해당 날짜 하위 33%

    Args:
        df: MultiIndex (date, ticker) DataFrame, 'close' 컬럼 필요

    Returns:
        'return_5d', 'return_5d_class' 컬럼이 추가된 DataFrame
    """
    if "close" not in df.columns:
        logger.error("[TARGET] 'close' 컬럼이 없습니다 — 타겟 생성 불가")
        df["return_5d"]       = np.nan
        df[TARGET]            = np.nan
        return df

    logger.info("[TARGET] 5일 후 수익률 계산 시작")

    def _forward_return_for_ticker(grp: pd.DataFrame) -> pd.DataFrame:
        grp = grp.copy().sort_index()
        future_close = grp["close"].shift(-5)
        grp["return_5d"] = (future_close / grp["close"]) - 1
        return grp

    # 종목별 forward return 계산 (shift(-5)는 같은 종목 내에서만 적용)
    df = df.groupby(level="ticker", group_keys=False).apply(_forward_return_for_ticker)

    logger.info("[TARGET] 단면 분위수 기반 3클래스 라벨 생성 시작")

    def _quantile_label_for_date(grp: pd.DataFrame) -> pd.DataFrame:
        """날짜별 단면에서 분위수 기반 라벨을 계산합니다."""
        returns = grp["return_5d"]
        valid_mask = returns.notna()

        if valid_mask.sum() < 3:
            # 유효한 종목 수가 3개 미만이면 NaN 처리
            grp[TARGET] = np.nan
            return grp

        labels = pd.Series(np.nan, index=grp.index)
        q33 = returns[valid_mask].quantile(1 / 3)
        q67 = returns[valid_mask].quantile(2 / 3)

        labels[valid_mask & (returns <= q33)]              = 0  # 하락: 하위 33%
        labels[valid_mask & (returns > q33) & (returns <= q67)] = 1  # 횡보: 중간 33%
        labels[valid_mask & (returns > q67)]               = 2  # 상승: 상위 33%

        grp[TARGET] = labels
        return grp

    df = df.groupby(level="date", group_keys=False).apply(_quantile_label_for_date)

    valid_count = df[TARGET].notna().sum()
    logger.info("[TARGET] 타겟 생성 완료 (유효 행: %d / %d)", valid_count, len(df))
    return df


# ---------------------------------------------------------------------------
# 메타 피처
# ---------------------------------------------------------------------------

def _add_meta_features(
    df: pd.DataFrame,
    sector_map: dict[str, str],
) -> pd.DataFrame:
    """
    stock_id (category), sector_id (category), market_cap_rank 를 추가합니다.

    market_cap_rank 는 날짜별 시가총액 내림차순 순위입니다.
    'market_cap' 컬럼이 없으면 ticker 목록 순서를 프록시로 사용합니다.

    Args:
        df: MultiIndex (date, ticker) DataFrame
        sector_map: {ticker: sector_name} 딕셔너리

    Returns:
        메타 피처 컬럼이 추가된 DataFrame
    """
    df = df.copy()

    ticker_level = df.index.get_level_values("ticker")
    df["stock_id"]  = pd.Categorical(ticker_level)
    df["sector_id"] = pd.Categorical(
        pd.Series(ticker_level, index=df.index).map(sector_map).fillna("Unknown")
    )

    if "market_cap" in df.columns:
        df["market_cap_rank"] = (
            df.groupby(level="date")["market_cap"]
            .rank(ascending=False, method="first")
            .astype(int)
        )
        logger.info("[META] market_cap_rank: market_cap 컬럼 기반 날짜별 순위 계산 완료")
    else:
        # market_cap 없음 — 알파벳 순서를 프록시로 사용
        tickers_sorted = sorted(df.index.get_level_values("ticker").unique().tolist())
        rank_proxy = {t: i + 1 for i, t in enumerate(tickers_sorted)}
        df["market_cap_rank"] = (
            pd.Series(ticker_level, index=df.index)
            .map(rank_proxy)
            .fillna(0)
            .astype(int)
        )
        logger.warning(
            "[META] 'market_cap' 컬럼 없음 — ticker 알파벳 순서를 market_cap_rank 프록시로 사용합니다."
        )

    return df


# ---------------------------------------------------------------------------
# 결측치 처리
# ---------------------------------------------------------------------------

def _fill_and_clean(df: pd.DataFrame) -> pd.DataFrame:
    """
    수치형 피처를 종목별 forward fill 한 뒤 타겟이 NaN인 행을 제거합니다.

    Args:
        df: MultiIndex (date, ticker) DataFrame

    Returns:
        결측치 처리된 DataFrame
    """
    numeric_feature_cols = [
        c for c in TECH_FEATURES + SUPPLY_FEATURES + MACRO_FEATURES
        if c in df.columns
    ]

    if numeric_feature_cols:
        df[numeric_feature_cols] = (
            df.groupby(level="ticker", group_keys=False)[numeric_feature_cols]
            .apply(lambda g: g.ffill())
        )

    before = len(df)
    df = df[df[TARGET].notna()].copy()
    after = len(df)
    logger.info("[CLEAN] 타겟 NaN 제거: %d행 → %d행 (제거: %d행)", before, after, before - after)

    # 타겟 정수형 변환
    df[TARGET] = df[TARGET].astype(int)

    return df


# ---------------------------------------------------------------------------
# 메인 파이프라인
# ---------------------------------------------------------------------------

def build_lgbm_features() -> pd.DataFrame:
    """
    LightGBM 피처 데이터셋 전체를 구성합니다.

    파이프라인:
      1. base_features.parquet 로드 (실패 시 RAW OHLCV 폴백)
      2. momentum_5d, momentum_20d 추가
      3. 수급 피처 보완 (누락 시 RAW에서 로드)
      4. 매크로 피처 보완 (누락 시 RAW에서 로드)
      5. 타겟 생성 (단면 분위수 기반 3클래스)
      6. 메타 피처 추가 (stock_id, sector_id, market_cap_rank)
      7. 결측치 처리

    Returns:
        최종 피처 DataFrame (MultiIndex: date + ticker)
    """
    logger.info("=== LightGBM 피처 빌드 시작 ===")

    # 1. 베이스 피처 로드
    df = _load_base_features()
    if df is None:
        logger.warning("[PIPELINE] base_features 로드 실패 — RAW OHLCV 폴백 시도")
        df = _load_ohlcv_fallback()
        if df is None:
            raise RuntimeError(
                "base_features.parquet 과 RAW OHLCV 모두 로드에 실패했습니다. "
                "데이터 경로를 확인하세요."
            )

    # 종목 목록
    tickers: list[str] = df.index.get_level_values("ticker").unique().tolist()
    logger.info("[PIPELINE] 총 종목 수: %d", len(tickers))

    # 2. momentum 피처 추가
    df = _add_momentum_features(df)

    # 3. 수급 피처 보완
    df = _add_supply_features_from_raw(df, tickers)

    # 4. 매크로 피처 보완
    df = _add_macro_features_from_raw(df)

    # 5. 타겟 생성
    df = compute_target(df)

    # 6. 메타 피처
    sector_map = _get_wics_sector_map(tickers)
    df = _add_meta_features(df, sector_map)

    # 7. 결측치 처리
    df = _fill_and_clean(df)

    logger.info("=== LightGBM 피처 빌드 완료: %d행, %d컬럼 ===", len(df), len(df.columns))
    return df


def split_and_save(df: pd.DataFrame) -> None:
    """
    전체 데이터셋을 학습/테스트 분리하고 Parquet 으로 저장합니다.

    저장 파일:
      lgbm_features.parquet — 전체
      lgbm_train.parquet    — 학습 (~ TRAIN_END_DATE)
      lgbm_test.parquet     — 테스트 (TEST_START_DATE ~ TEST_END_DATE)

    Args:
        df: MultiIndex (date, ticker) 전체 피처 DataFrame
    """
    ensure_dir(PROCESSED_LGBM_PATH)

    date_level = df.index.get_level_values("date")

    train_mask = date_level <= pd.Timestamp(TRAIN_END_DATE)
    test_mask  = (date_level >= pd.Timestamp(TEST_START_DATE)) & (
        date_level <= pd.Timestamp(TEST_END_DATE)
    )

    df_train = df[train_mask]
    df_test  = df[test_mask]

    # 전체
    full_path = PROCESSED_LGBM_PATH / "lgbm_features.parquet"
    save_parquet(df, full_path, compression=PARQUET_COMPRESSION)
    logger.info("[SAVE] lgbm_features.parquet 저장 완료: %d행 → %s", len(df), full_path)

    # 학습
    train_path = PROCESSED_LGBM_PATH / "lgbm_train.parquet"
    save_parquet(df_train, train_path, compression=PARQUET_COMPRESSION)
    logger.info(
        "[SAVE] lgbm_train.parquet 저장 완료: %d행 (~ %s) → %s",
        len(df_train), TRAIN_END_DATE, train_path,
    )

    # 테스트
    test_path = PROCESSED_LGBM_PATH / "lgbm_test.parquet"
    save_parquet(df_test, test_path, compression=PARQUET_COMPRESSION)
    logger.info(
        "[SAVE] lgbm_test.parquet 저장 완료: %d행 (%s ~ %s) → %s",
        len(df_test), TEST_START_DATE, TEST_END_DATE, test_path,
    )


def main() -> None:
    """
    LightGBM 피처 생성 파이프라인 진입점.
    base_features.parquet 기반으로 피처를 구성하고 학습/테스트 분리 저장합니다.
    """
    logger.info("LightGBM 피처 생성 파이프라인 시작")

    dataset = build_lgbm_features()
    split_and_save(dataset)

    logger.info("LightGBM 피처 생성 파이프라인 완료")


if __name__ == "__main__":
    main()
