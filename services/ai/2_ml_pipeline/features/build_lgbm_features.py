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
    RAW_UNIVERSE_PATH,
    PROCESSED_BASE_PATH,
    PROCESSED_FUNDAMENTAL_PATH,
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
    "macd_norm",
    "macd_signal_norm",
    "macd_hist_norm",
    "bb_percent_b",
    "bb_width",
    "close_to_ma5",
    "close_to_ma20",
    "close_to_ma60",
    "volume_ratio_5d",
    "volume_ratio_20d",
    "momentum_5d",
    "momentum_20d",
    "momentum_accel",
    "rsi_divergence",
    "volume_climax",
]

SUPPLY_FEATURES: list[str] = [
    "foreign_net_buy_1d",
    "foreign_net_buy_5d",
    "foreign_net_buy_20d",
    "institution_net_buy_1d",
    "institution_net_buy_5d",
    "foreign_buy_ratio_1d",
    "institution_buy_ratio_1d",
]

MACRO_FEATURES: list[str] = [
    "kospi200_return_1d",
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

REGIME_FEATURES: list[str] = [
    "vix_regime",
    "vix_ma20_ratio",
    "bond_trend_60d",
    "market_momentum_20d",
    "volatility_regime",
]

FUNDAMENTAL_FEATURES: list[str] = [
    "per_zscore",
    "pbr_zscore",
    "roe_zscore",
]

CS_RANK_FEATURES: list[str] = [
    "rsi_14_rank",
    "close_to_ma5_rank", "close_to_ma20_rank", "close_to_ma60_rank",
    "bb_percent_b_rank", "bb_width_rank",
    "macd_norm_rank", "macd_hist_norm_rank",
    "volume_ratio_5d_rank", "volume_ratio_20d_rank",
    "momentum_5d_rank", "momentum_20d_rank",
    "momentum_accel_rank",
]

META_FEATURES: list[str] = [
    "stock_id",
    "sector_id",
    "market_cap_rank",
]

FEATURES: list[str] = TECH_FEATURES + SUPPLY_FEATURES + MACRO_FEATURES + REGIME_FEATURES + FUNDAMENTAL_FEATURES + CS_RANK_FEATURES + META_FEATURES

TARGET: str = "return_5d_class"


# ---------------------------------------------------------------------------
# 섹터 조회 헬퍼
# ---------------------------------------------------------------------------

def _get_wics_sector_map(tickers: list[str]) -> dict[str, str]:
    """
    sector_mapping.json 파일에서 종목별 GICS 섹터를 로드합니다.
    파일이 없으면 "Unknown"으로 처리합니다.

    Args:
        tickers: 종목 코드 목록

    Returns:
        {ticker: sector_name} 딕셔너리
    """
    import json

    sector_map: dict[str, str] = {t: "Unknown" for t in tickers}

    sector_file = RAW_UNIVERSE_PATH / "sector_mapping.json"
    if not sector_file.exists():
        logger.warning("[SECTOR] sector_mapping.json 없음: %s — 모두 'Unknown'으로 처리합니다.", sector_file)
        return sector_map

    try:
        with open(sector_file, encoding="utf-8") as f:
            data = json.load(f)

        ticker_data = data.get("tickers", {})
        mapped = 0
        for ticker in tickers:
            if ticker in ticker_data:
                sector_map[ticker] = ticker_data[ticker].get("gics_sector", "Unknown")
                mapped += 1
        logger.info("[SECTOR] sector_mapping.json 로드 완료 (%d/%d건 매핑)", mapped, len(tickers))
    except Exception as exc:
        logger.warning("[SECTOR] sector_mapping.json 로드 실패: %s — 모두 'Unknown'으로 처리합니다.", exc)

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


# ---------------------------------------------------------------------------
# 가격 정규화 피처 (가격 레벨 → 상대 비율)
# ---------------------------------------------------------------------------

def _normalize_price_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    가격 레벨 피처를 가격 대비 비율로 정규화합니다.

    종목 간 가격 수준 차이(삼성전자 7만 vs 소형주 200원)로 인한
    가짜 상관(spurious correlation)을 제거합니다.

    변환:
      ma_5, ma_20, ma_60  → close / ma_N - 1 (이동평균 괴리율)
      bb_upper, bb_lower  → bb_percent_b = (close - bb_lower) / (bb_upper - bb_lower)
      bb_upper, bb_lower  → bb_width = (bb_upper - bb_lower) / bb_middle
      macd, macd_signal, macd_hist → / close * 100 (가격 대비 정규화)

    Args:
        df: MultiIndex (date, ticker) DataFrame, close + 기술지표 컬럼 필요

    Returns:
        정규화 피처 컬럼이 추가된 DataFrame
    """
    df = df.copy()
    close = df["close"].astype(float)

    logger.info("[NORM] 가격 정규화 피처 계산 시작")

    # 이동평균 괴리율: close / ma_N - 1
    for n in [5, 20, 60]:
        ma_col = f"ma_{n}"
        norm_col = f"close_to_ma{n}"
        if ma_col in df.columns:
            ma_val = df[ma_col].astype(float).replace(0, np.nan)
            df[norm_col] = close / ma_val - 1
        else:
            df[norm_col] = np.nan

    # 볼린저밴드 %B: (close - bb_lower) / (bb_upper - bb_lower)
    if "bb_upper" in df.columns and "bb_lower" in df.columns:
        bb_range = (df["bb_upper"].astype(float) - df["bb_lower"].astype(float)).replace(0, np.nan)
        df["bb_percent_b"] = (close - df["bb_lower"].astype(float)) / bb_range
    else:
        df["bb_percent_b"] = np.nan

    # 볼린저밴드 폭: (bb_upper - bb_lower) / bb_middle
    if "bb_upper" in df.columns and "bb_lower" in df.columns and "bb_middle" in df.columns:
        bb_mid = df["bb_middle"].astype(float).replace(0, np.nan)
        df["bb_width"] = (df["bb_upper"].astype(float) - df["bb_lower"].astype(float)) / bb_mid
    else:
        df["bb_width"] = np.nan

    # MACD 정규화: / close * 100
    for col, norm_col in [("macd", "macd_norm"), ("macd_signal", "macd_signal_norm"), ("macd_hist", "macd_hist_norm")]:
        if col in df.columns:
            close_nonzero = close.replace(0, np.nan)
            df[norm_col] = df[col].astype(float) / close_nonzero * 100
        else:
            df[norm_col] = np.nan

    logger.info("[NORM] 가격 정규화 피처 계산 완료 (8개 피처 추가)")
    return df


# ---------------------------------------------------------------------------
# 수급 피처 정규화 (거래량 대비 비율)
# ---------------------------------------------------------------------------

def _normalize_supply_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    수급 피처를 거래량 대비 비율로 정규화합니다.

    raw 금액은 종목 간 스케일 차이가 커서 예측력이 약합니다.
    거래량 대비 비율로 변환하면 종목 간 비교가 가능해집니다.

    Args:
        df: MultiIndex (date, ticker) DataFrame, volume + 수급 컬럼 필요

    Returns:
        정규화 수급 피처 컬럼이 추가된 DataFrame
    """
    df = df.copy()

    logger.info("[SUPPLY-NORM] 수급 피처 정규화 시작")

    if "volume" not in df.columns:
        logger.warning("[SUPPLY-NORM] volume 컬럼 없음 — 정규화 건너뜀")
        df["foreign_buy_ratio_1d"] = np.nan
        df["institution_buy_ratio_1d"] = np.nan
        return df

    vol = df["volume"].astype(float).replace(0, np.nan)

    if "foreign_net_buy_1d" in df.columns:
        df["foreign_buy_ratio_1d"] = df["foreign_net_buy_1d"].astype(float) / vol
    else:
        df["foreign_buy_ratio_1d"] = np.nan

    if "institution_net_buy_1d" in df.columns:
        df["institution_buy_ratio_1d"] = df["institution_net_buy_1d"].astype(float) / vol
    else:
        df["institution_buy_ratio_1d"] = np.nan

    logger.info("[SUPPLY-NORM] 수급 피처 정규화 완료 (2개 피처 추가)")
    return df


# ---------------------------------------------------------------------------
# 크로스섹셔널 표준화 (날짜별 백분위 랭크)
# ---------------------------------------------------------------------------

def _cross_sectional_rank(df: pd.DataFrame) -> pd.DataFrame:
    """
    주요 수치 피처를 날짜별 크로스섹셔널 백분위 랭크(0~1)로 변환합니다.

    절대값 기반 피처는 시장 레짐에 따라 의미가 달라지지만,
    날짜별 상대 순위는 레짐에 불변입니다.
    예: RSI=72 → "오늘 시장에서 상위 5%" (레짐 무관하게 일관된 신호)

    원본 피처를 유지하고, {피처}_rank 컬럼을 추가합니다.

    Args:
        df: MultiIndex (date, ticker) DataFrame

    Returns:
        rank 컬럼이 추가된 DataFrame
    """
    # 랭크로 변환할 피처 목록 (수치형, cross-sectional 의미 있는 것만)
    rank_targets = [
        "rsi_14",
        "close_to_ma5", "close_to_ma20", "close_to_ma60",
        "bb_percent_b", "bb_width",
        "macd_norm", "macd_hist_norm",
        "volume_ratio_5d", "volume_ratio_20d",
        "momentum_5d", "momentum_20d",
        "momentum_accel",
    ]

    available = [c for c in rank_targets if c in df.columns]
    if not available:
        logger.warning("[CS-RANK] 랭크 변환할 피처가 없습니다.")
        return df

    logger.info("[CS-RANK] 크로스섹셔널 랭크 변환 시작 (%d개 피처)", len(available))

    for col in available:
        rank_col = f"{col}_rank"
        # 날짜별 백분위 랭크 (0~1, 높을수록 해당 피처 값이 높음)
        df[rank_col] = df.groupby(level="date")[col].rank(pct=True, method="average")

    logger.info("[CS-RANK] 크로스섹셔널 랭크 변환 완료 (%d개 _rank 컬럼 추가)", len(available))
    return df


# ---------------------------------------------------------------------------
# 반전 감지 피처 (추세 전환 보완)
# ---------------------------------------------------------------------------

def _add_reversal_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    추세 전환 구간을 감지하기 위한 반전 신호 피처를 추가합니다.

    피처:
      momentum_accel: 모멘텀 가속도 (momentum_5d - momentum_20d)
        양수 = 가속(추세 강화), 음수 = 감속(추세 약화/반전 임박)
      rsi_divergence: RSI와 가격 모멘텀의 괴리
        가격은 상승하는데 RSI는 하락 → 음수 (약세 다이버전스)
      volume_climax: 거래량 급증 여부 (20일 평균 대비 2배 이상)
        1 = 클라이맥스 (천장/바닥 신호)

    Args:
        df: MultiIndex (date, ticker) DataFrame

    Returns:
        반전 피처 컬럼이 추가된 DataFrame
    """
    df = df.copy()

    logger.info("[REVERSAL] 반전 감지 피처 계산 시작")

    # 모멘텀 가속도: 단기 모멘텀 - 장기 모멘텀
    if "momentum_5d" in df.columns and "momentum_20d" in df.columns:
        df["momentum_accel"] = df["momentum_5d"] - df["momentum_20d"]
    else:
        df["momentum_accel"] = np.nan

    # RSI 다이버전스: RSI 변화 - 가격 모멘텀 변화 (부호 불일치 = 다이버전스)
    if "rsi_14" in df.columns and "momentum_5d" in df.columns:
        def _rsi_div_for_ticker(grp: pd.DataFrame) -> pd.DataFrame:
            grp = grp.copy()
            rsi_change = grp["rsi_14"].diff(5)  # RSI 5일 변화
            price_mom = grp["momentum_5d"]
            # 정규화: 둘 다 부호를 비교 (같은 방향이면 0에 가까움, 다이버전스면 음수)
            rsi_norm = rsi_change / rsi_change.abs().rolling(20, min_periods=5).mean().replace(0, np.nan)
            mom_norm = price_mom / price_mom.abs().rolling(20, min_periods=5).mean().replace(0, np.nan)
            grp["rsi_divergence"] = rsi_norm * mom_norm  # 같은 부호면 양수, 다이버전스면 음수
            return grp

        df = df.groupby(level="ticker", group_keys=False).apply(_rsi_div_for_ticker)
    else:
        df["rsi_divergence"] = np.nan

    # 거래량 클라이맥스: volume_ratio_20d > 2이면 1
    if "volume_ratio_20d" in df.columns:
        df["volume_climax"] = (df["volume_ratio_20d"] > 2.0).astype(float)
    else:
        df["volume_climax"] = np.nan

    logger.info("[REVERSAL] 반전 감지 피처 계산 완료 (3개 피처)")
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
# 시장 레짐 피처 (매크로 기반 파생)
# ---------------------------------------------------------------------------

def _add_regime_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    매크로 데이터에서 시장 레짐 판단 피처를 파생합니다.

    모든 종목에 같은 날짜는 같은 값이지만, 트리 모델이
    "이 레짐에서는 이 패턴이 유효하다"를 학습하는 데 사용됩니다.

    피처:
      vix_regime: VIX가 20일 평균 이상이면 1 (공포 레짐)
      vix_ma20_ratio: VIX / VIX_MA20 - 1 (VIX 괴리율)
      bond_trend_60d: 60거래일 금리 변화 (양수면 인상 추세)
      market_momentum_20d: KOSPI200 20일 수익률
      volatility_regime: VIX 수준 범주 (0=안정 <15, 1=보통 15-25, 2=불안 25-35, 3=공포 >35)

    Args:
        df: MultiIndex (date, ticker) DataFrame

    Returns:
        레짐 피처 컬럼이 추가된 DataFrame
    """
    logger.info("[REGIME] 시장 레짐 피처 계산 시작")

    # 날짜 레벨 추출
    date_level = df.index.get_level_values("date")
    unique_dates = pd.DatetimeIndex(sorted(date_level.unique()))

    # 날짜 기준 레짐 피처 계산 (Series)
    regime_df = pd.DataFrame(index=unique_dates)

    # VIX 기반 레짐
    if "vix" in df.columns:
        # 날짜별 VIX 값 (모든 종목 동일이므로 첫 번째 값 사용)
        vix_daily = df.groupby(level="date")["vix"].first().reindex(unique_dates)
        vix_ma20 = vix_daily.rolling(window=20, min_periods=5).mean()

        regime_df["vix_regime"] = (vix_daily > vix_ma20).astype(float)
        regime_df["vix_ma20_ratio"] = vix_daily / vix_ma20.replace(0, np.nan) - 1

        # VIX 수준 범주화
        regime_df["volatility_regime"] = 0.0
        regime_df.loc[vix_daily >= 15, "volatility_regime"] = 1.0
        regime_df.loc[vix_daily >= 25, "volatility_regime"] = 2.0
        regime_df.loc[vix_daily >= 35, "volatility_regime"] = 3.0
    else:
        regime_df["vix_regime"] = np.nan
        regime_df["vix_ma20_ratio"] = np.nan
        regime_df["volatility_regime"] = np.nan

    # 금리 추세
    if "us_bond_10y" in df.columns:
        bond_daily = df.groupby(level="date")["us_bond_10y"].first().reindex(unique_dates)
        regime_df["bond_trend_60d"] = bond_daily.diff(60)
    else:
        regime_df["bond_trend_60d"] = np.nan

    # 시장 모멘텀
    if "kospi200_return_1d" in df.columns:
        kospi_daily = df.groupby(level="date")["kospi200_return_1d"].first().reindex(unique_dates)
        regime_df["market_momentum_20d"] = kospi_daily.rolling(window=20, min_periods=5).sum()
    else:
        regime_df["market_momentum_20d"] = np.nan

    # MultiIndex에 매핑
    for col in REGIME_FEATURES:
        if col in regime_df.columns:
            df[col] = regime_df[col].reindex(date_level).values
        else:
            df[col] = np.nan

    logger.info("[REGIME] 시장 레짐 피처 계산 완료 (%d개 피처)", len(REGIME_FEATURES))
    return df


# ---------------------------------------------------------------------------
# 재무 팩터 통합 (PER/PBR/ROE z-score)
# ---------------------------------------------------------------------------

def _add_fundamental_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    build_fundamental_factors에서 생성된 재무 팩터 z-score를 통합합니다.

    가장 최신 fundamental_factors 파일에서 ticker별 z-score를 로드하고
    ticker 기준으로 join합니다 (날짜 무관, 최신 스냅샷).

    Args:
        df: MultiIndex (date, ticker) DataFrame

    Returns:
        재무 팩터 z-score 컬럼이 추가된 DataFrame
    """
    logger.info("[FUNDAMENTAL] 재무 팩터 통합 시작")

    if not PROCESSED_FUNDAMENTAL_PATH.exists():
        logger.warning("[FUNDAMENTAL] 경로 없음: %s — NaN으로 채웁니다.", PROCESSED_FUNDAMENTAL_PATH)
        for col in FUNDAMENTAL_FEATURES:
            df[col] = np.nan
        return df

    # 최신 통합 파일 로드
    fund_files = sorted(PROCESSED_FUNDAMENTAL_PATH.glob("fundamental_factors_*.parquet"))
    if not fund_files:
        logger.warning("[FUNDAMENTAL] 재무 팩터 파일 없음 — NaN으로 채웁니다.")
        for col in FUNDAMENTAL_FEATURES:
            df[col] = np.nan
        return df

    try:
        fund_df = pd.read_parquet(fund_files[-1])
    except Exception as exc:
        logger.warning("[FUNDAMENTAL] 파일 로드 실패: %s — NaN으로 채웁니다.", exc)
        for col in FUNDAMENTAL_FEATURES:
            df[col] = np.nan
        return df

    if "ticker" not in fund_df.columns:
        logger.warning("[FUNDAMENTAL] ticker 컬럼 없음 — NaN으로 채웁니다.")
        for col in FUNDAMENTAL_FEATURES:
            df[col] = np.nan
        return df

    # ticker 기준으로 z-score 매핑
    keep_cols = ["ticker"] + [c for c in FUNDAMENTAL_FEATURES if c in fund_df.columns]
    fund_map = fund_df[keep_cols].drop_duplicates(subset=["ticker"], keep="last").set_index("ticker")

    ticker_level = df.index.get_level_values("ticker")
    for col in FUNDAMENTAL_FEATURES:
        if col in fund_map.columns:
            df[col] = fund_map[col].reindex(ticker_level).values
        else:
            df[col] = np.nan

    matched = df[FUNDAMENTAL_FEATURES[0]].notna().sum()
    logger.info("[FUNDAMENTAL] 재무 팩터 통합 완료 (%d/%d 행 매칭)", matched, len(df))
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


def compute_binary_target(df: pd.DataFrame) -> pd.DataFrame:
    """
    5일 후 수익률을 기반으로 날짜별 단면 중앙값(median) 기준
    2클래스 이진 타겟을 생성합니다.

    횡보 클래스를 제거하여 상승/하락 분류를 단순화합니다.

    클래스 정의 (날짜별 단면 중앙값):
      1 (상승): 해당 날짜 상위 50% 수익률
      0 (하락): 해당 날짜 하위 50% 수익률

    Args:
        df: MultiIndex (date, ticker) DataFrame, 'return_5d' 컬럼 필요

    Returns:
        'return_5d_binary' 컬럼이 추가된 DataFrame
    """
    if "return_5d" not in df.columns:
        logger.warning("[TARGET-BIN] 'return_5d' 컬럼 없음 — 이진 타겟 생성 불가")
        df["return_5d_binary"] = np.nan
        return df

    logger.info("[TARGET-BIN] 이진 타겟 생성 시작 (날짜별 중앙값 기준)")

    def _binary_label_for_date(grp: pd.DataFrame) -> pd.DataFrame:
        returns = grp["return_5d"]
        valid_mask = returns.notna()

        if valid_mask.sum() < 2:
            grp["return_5d_binary"] = np.nan
            return grp

        median = returns[valid_mask].median()
        labels = pd.Series(np.nan, index=grp.index)
        labels[valid_mask & (returns >= median)] = 1  # 상위 50%
        labels[valid_mask & (returns < median)] = 0   # 하위 50%

        grp["return_5d_binary"] = labels
        return grp

    df = df.groupby(level="date", group_keys=False).apply(_binary_label_for_date)

    valid_count = df["return_5d_binary"].notna().sum()
    logger.info("[TARGET-BIN] 이진 타겟 생성 완료 (유효 행: %d / %d)", valid_count, len(df))
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
        c for c in TECH_FEATURES + SUPPLY_FEATURES + MACRO_FEATURES + REGIME_FEATURES + FUNDAMENTAL_FEATURES + CS_RANK_FEATURES
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

    # 2.5. 가격 정규화 피처
    df = _normalize_price_features(df)

    # 2.7. 수급 피처 정규화
    df = _normalize_supply_features(df)

    # 3. 수급 피처 보완
    df = _add_supply_features_from_raw(df, tickers)

    # 4. 매크로 피처 보완
    df = _add_macro_features_from_raw(df)

    # 4.2. 반전 감지 피처
    df = _add_reversal_features(df)

    # 4.3. 크로스섹셔널 랭크 표준화
    df = _cross_sectional_rank(df)

    # 4.5. 시장 레짐 피처
    df = _add_regime_features(df)

    # 4.7. 재무 팩터 통합
    df = _add_fundamental_features(df)

    # 5. 타겟 생성
    df = compute_target(df)

    # 5.5. 이진 타겟 생성 (2-class)
    df = compute_binary_target(df)

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
