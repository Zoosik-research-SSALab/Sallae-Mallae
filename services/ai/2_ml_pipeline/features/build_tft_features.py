"""
features/build_tft_features.py
Temporal Fusion Transformer(TFT)용 피처 데이터셋 생성 모듈.

입력:
  RAW_OHLCV_PATH/{ticker}.parquet         — DatetimeIndex, OHLCV 열
  RAW_SUPPLY_PATH/{ticker}.parquet        — DatetimeIndex, 수급(외인·기관) 열
  RAW_MACRO_PATH/kospi200.parquet         — KOSPI200 지수
  RAW_MACRO_PATH/vix.parquet              — VIX 공포 지수
  RAW_MACRO_PATH/usd_krw.parquet          — USD/KRW 환율
  RAW_UNIVERSE_PATH/sector_mapping.json   — {ticker: {cluster_id, gics_sector, ...}}

출력:
  BASE_PATH/processed/tft_features/tft_features.parquet
    — 정규 컬럼 DataFrame (MultiIndex 없음)
    — 시계열 ID: ticker, 시간 인덱스: time_idx (종목별 0-based 단조 증가)
    — 정적 범주: sector_id, ticker_encoded
    — 알려진 미래 입력(캘린더): day_of_week, month, week_of_year, is_month_end, is_quarter_end
    — 관찰된 과거 입력(기술·수급·매크로): daily_return, log_volume_change, ...
    — 타겟: target_5d (0/1 이진)

Python 3.10+ 호환, Google Colab 동작 지원.
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder

from config import (
    RAW_OHLCV_PATH,
    RAW_SUPPLY_PATH,
    RAW_MACRO_PATH,
    RAW_UNIVERSE_PATH,
    PROCESSED_BASE_PATH,
    BASE_PATH,
    SEQ_LEN,
    TARGET_HORIZON,
)
from utils.logger import setup_logger

warnings.filterwarnings("ignore", category=FutureWarning)

logger = setup_logger(__name__)

# ---------------------------------------------------------------------------
# 출력 경로
# ---------------------------------------------------------------------------
TFT_OUTPUT_PATH: Path = BASE_PATH / "processed" / "tft_features"

# ---------------------------------------------------------------------------
# 피처 상수
# ---------------------------------------------------------------------------
# 클리핑 표준편차 배수 (수치 안정성)
CLIP_SIGMA: float = 3.0

# RSI/볼린저 웜업 기간 + MACD 웜업 = 최소 60거래일 이상 필요 → dropna 로 자동 제거
WARMUP_DAYS: int = 60

# 기술적 피처 열 목록 (save 시 순서 고정용)
TECHNICAL_COLS: list[str] = [
    "daily_return",
    "log_volume_change",
    "high_low_range",
    "rsi_14",
    "macd_norm",
    "bb_percent_b",
    "volume_ratio_5d",
    "momentum_5d",
    "momentum_20d",
]

SUPPLY_COLS: list[str] = [
    "foreign_net_ratio",
    "inst_net_ratio",
]

MACRO_COLS: list[str] = [
    "kospi200_return",
    "vix",
    "vix_change",
    "usd_krw_change",
]

CALENDAR_COLS: list[str] = [
    "day_of_week",
    "month",
    "week_of_year",
    "is_month_end",
    "is_quarter_end",
]

STATIC_CAT_COLS: list[str] = [
    "sector_id",
    "ticker_encoded",
]

ALL_FEATURE_COLS: list[str] = (
    TECHNICAL_COLS + SUPPLY_COLS + MACRO_COLS + CALENDAR_COLS + ["relative_return"]
)


# ---------------------------------------------------------------------------
# RSI 계산 헬퍼
# ---------------------------------------------------------------------------

def _compute_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """
    Wilder 평활 방식으로 RSI를 계산합니다.

    Args:
        series: 종가 시리즈
        period: RSI 기간 (기본 14일)

    Returns:
        RSI 시리즈 (0~100 범위)
    """
    delta = series.diff(1)
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)

    # Wilder 지수이동평균 (com = period - 1)
    avg_gain = gain.ewm(com=period - 1, min_periods=period, adjust=False).mean()
    avg_loss = loss.ewm(com=period - 1, min_periods=period, adjust=False).mean()

    rs = avg_gain / avg_loss.replace(0.0, np.nan)
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return rsi


# ---------------------------------------------------------------------------
# 단일 종목 기술적 피처 계산
# ---------------------------------------------------------------------------

def _compute_technical_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    단일 종목 OHLCV DataFrame으로 기술적 피처를 계산합니다.

    Args:
        df: DatetimeIndex, 열 [open, high, low, close, volume]을 가진 DataFrame

    Returns:
        원본 DataFrame에 기술 피처 열이 추가된 DataFrame
    """
    out = df.copy().sort_index()
    close = out["close"]
    volume = out["volume"]
    close_prev = close.shift(1)

    # 1. 일별 수익률 (%)
    out["daily_return"] = close.pct_change(1) * 100

    # 2. 거래량 변화율 — 로그 변환 (부호 보존)
    vol_pct = volume.pct_change(1).replace([np.inf, -np.inf], np.nan)
    out["log_volume_change"] = (np.sign(vol_pct) * np.log1p(vol_pct.abs())).clip(
        lower=-CLIP_SIGMA * 5, upper=CLIP_SIGMA * 5
    )

    # 3. 고저 변동폭 (%)
    out["high_low_range"] = ((out["high"] - out["low"]) / close_prev) * 100

    # 4. RSI 14일
    out["rsi_14"] = _compute_rsi(close, period=14)

    # 5. MACD 정규화 (종가 대비)
    ema12 = close.ewm(span=12, adjust=False).mean()
    ema26 = close.ewm(span=26, adjust=False).mean()
    macd_line = ema12 - ema26
    out["macd_norm"] = (macd_line / close_prev.replace(0, np.nan)) * 100

    # 6. 볼린저 밴드 %B (20일 기준)
    bb_mid = close.rolling(20, min_periods=20).mean()
    bb_std = close.rolling(20, min_periods=20).std(ddof=0)
    bb_upper = bb_mid + 2.0 * bb_std
    bb_lower = bb_mid - 2.0 * bb_std
    bb_range = (bb_upper - bb_lower).replace(0, np.nan)
    out["bb_percent_b"] = (close - bb_lower) / bb_range

    # 7. 거래량 5일 이동평균 대비 비율
    vol_ma5 = volume.rolling(5, min_periods=1).mean().replace(0, np.nan)
    out["volume_ratio_5d"] = volume / vol_ma5

    # 8. 모멘텀 5일 (%)
    out["momentum_5d"] = close.pct_change(5) * 100

    # 9. 모멘텀 20일 (%)
    out["momentum_20d"] = close.pct_change(20) * 100

    return out


# ---------------------------------------------------------------------------
# 매크로 데이터 로드
# ---------------------------------------------------------------------------

def _load_macro_features() -> pd.DataFrame:
    """
    KOSPI200, VIX, USD/KRW 매크로 파일을 로드하고 날짜 기준으로 병합합니다.

    Returns:
        날짜 인덱스를 가진 매크로 피처 DataFrame.
        열: kospi200_return, vix, vix_change, usd_krw_change
    """
    macro_frames: list[pd.DataFrame] = []

    # --- KOSPI200 ---
    kospi_path = RAW_MACRO_PATH / "kospi200.parquet"
    if kospi_path.exists():
        try:
            df_k = pd.read_parquet(kospi_path)
            df_k.index = pd.to_datetime(df_k.index)
            close_col = "close" if "close" in df_k.columns else df_k.columns[0]
            df_k = df_k[[close_col]].sort_index()
            df_k["kospi200_return"] = df_k[close_col].pct_change(1)
            macro_frames.append(df_k[["kospi200_return"]])
        except Exception as exc:
            logger.warning("[MACRO] kospi200 로드 실패: %s", exc)
    else:
        logger.warning("[MACRO] kospi200.parquet 없음 (%s) — 0으로 대체합니다.", kospi_path)

    # --- VIX ---
    vix_path = RAW_MACRO_PATH / "vix.parquet"
    if vix_path.exists():
        try:
            df_v = pd.read_parquet(vix_path)
            df_v.index = pd.to_datetime(df_v.index)
            close_col = "close" if "close" in df_v.columns else df_v.columns[0]
            df_v = df_v[[close_col]].sort_index()
            df_v = df_v.rename(columns={close_col: "vix"})
            df_v["vix_change"] = df_v["vix"].pct_change(1)
            macro_frames.append(df_v[["vix", "vix_change"]])
        except Exception as exc:
            logger.warning("[MACRO] vix 로드 실패: %s", exc)
    else:
        logger.warning("[MACRO] vix.parquet 없음 (%s) — 0으로 대체합니다.", vix_path)

    # --- USD/KRW ---
    usd_path = RAW_MACRO_PATH / "usd_krw.parquet"
    if usd_path.exists():
        try:
            df_u = pd.read_parquet(usd_path)
            df_u.index = pd.to_datetime(df_u.index)
            close_col = "close" if "close" in df_u.columns else df_u.columns[0]
            df_u = df_u[[close_col]].sort_index()
            df_u["usd_krw_change"] = df_u[close_col].pct_change(1)
            macro_frames.append(df_u[["usd_krw_change"]])
        except Exception as exc:
            logger.warning("[MACRO] usd_krw 로드 실패: %s", exc)
    else:
        logger.warning("[MACRO] usd_krw.parquet 없음 (%s) — 0으로 대체합니다.", usd_path)

    if not macro_frames:
        logger.warning("[MACRO] 로드된 매크로 파일 없음 — 빈 DataFrame 반환")
        return pd.DataFrame()

    # 날짜 기준 outer join 병합
    macro_df = macro_frames[0]
    for frame in macro_frames[1:]:
        macro_df = macro_df.join(frame, how="outer")

    macro_df = macro_df.sort_index()

    # VIX는 결측치 forward fill (시장 휴일 대응)
    if "vix" in macro_df.columns:
        macro_df["vix"] = macro_df["vix"].ffill()
    if "vix_change" in macro_df.columns:
        macro_df["vix_change"] = macro_df["vix_change"].ffill()

    return macro_df


# ---------------------------------------------------------------------------
# 수급 데이터 로드
# ---------------------------------------------------------------------------

def _load_supply_features(ticker: str) -> pd.DataFrame:
    """
    단일 종목의 수급(외인·기관) 데이터를 로드합니다.

    Args:
        ticker: 종목 코드

    Returns:
        DatetimeIndex를 가진 수급 DataFrame.
        파일이 없거나 로드 실패 시 빈 DataFrame 반환.
    """
    supply_path = RAW_SUPPLY_PATH / f"{ticker}.parquet"
    if not supply_path.exists():
        return pd.DataFrame()
    try:
        df = pd.read_parquet(supply_path)
        df.index = pd.to_datetime(df.index)
        return df.sort_index()
    except Exception as exc:
        logger.debug("[SUPPLY] %s 로드 실패: %s", ticker, exc)
        return pd.DataFrame()


# ---------------------------------------------------------------------------
# 캘린더 피처 추가
# ---------------------------------------------------------------------------

def _add_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    DatetimeIndex 기반 캘린더 피처를 추가합니다.

    Args:
        df: DatetimeIndex를 가진 DataFrame

    Returns:
        캘린더 피처 열이 추가된 DataFrame
    """
    idx = pd.DatetimeIndex(df.index)
    df = df.copy()
    df["day_of_week"] = idx.dayofweek.astype(int)       # 0=월 ~ 4=금
    df["month"] = idx.month.astype(int)                  # 1~12
    df["week_of_year"] = idx.isocalendar().week.astype(int)  # 1~53
    df["is_month_end"] = idx.is_month_end.astype(int)    # 0/1
    df["is_quarter_end"] = idx.is_quarter_end.astype(int)  # 0/1
    return df


# ---------------------------------------------------------------------------
# 3시그마 클리핑
# ---------------------------------------------------------------------------

def _clip_at_sigma(series: pd.Series, sigma: float = CLIP_SIGMA) -> pd.Series:
    """
    시리즈를 평균 ± sigma*표준편차 범위로 클리핑합니다.

    Args:
        series: 클리핑할 숫자 시리즈
        sigma: 표준편차 배수 (기본 3.0)

    Returns:
        클리핑된 시리즈
    """
    mu = series.mean()
    std = series.std()
    if std == 0 or np.isnan(std):
        return series
    return series.clip(lower=mu - sigma * std, upper=mu + sigma * std)


# ---------------------------------------------------------------------------
# 메인 함수
# ---------------------------------------------------------------------------

def build_tft_features(group_by: str = "cluster") -> None:
    """
    전체 종목에 대해 TFT 학습용 피처 데이터셋을 생성하고 Parquet으로 저장합니다.

    처리 순서:
      1. sector_mapping.json 로드 → sector_id(cluster) 매핑
      2. 매크로 피처 사전 로드 (날짜별 단일 테이블)
      3. 종목별 OHLCV 로드 → 기술 피처 계산
      4. 종목별 수급 데이터 로드 → 외인·기관 비율 계산
      5. 매크로 피처 날짜 병합
      6. 캘린더 피처 추가
      7. time_idx 생성 (종목별 0-based 단조 증가)
      8. ticker label-encode
      9. target_5d 생성 (5거래일 후 상승 여부 0/1)
      10. NaN 드롭 (웜업 기간 약 60일 제거) 및 수치 클리핑
      11. 저장: BASE_PATH/processed/tft_features/tft_features.parquet

    Args:
        group_by: 섹터 그룹 기준 — "cluster" (3그룹) 또는 "sector" (11그룹)
    """
    logger.info("=== TFT 피처 생성 파이프라인 시작 (group_by=%s) ===", group_by)

    # --- OHLCV 종목 목록 스캔 ---
    if not RAW_OHLCV_PATH.exists():
        logger.error("RAW_OHLCV_PATH 가 존재하지 않습니다: %s", RAW_OHLCV_PATH)
        return

    tickers: list[str] = sorted(p.stem for p in RAW_OHLCV_PATH.glob("*.parquet"))
    if not tickers:
        logger.error("OHLCV parquet 파일을 찾을 수 없습니다: %s", RAW_OHLCV_PATH)
        return
    logger.info("총 종목 수: %d", len(tickers))

    # --- sector_mapping.json 로드 ---
    sector_file = RAW_UNIVERSE_PATH / "sector_mapping.json"
    sector_map: dict[str, str] = {}
    json_key = "gics_cluster" if group_by == "cluster" else "gics_sector"

    if sector_file.exists():
        try:
            with open(sector_file, encoding="utf-8") as f:
                universe_data = json.load(f)
            ticker_data: dict = universe_data.get("tickers", {})
            for t in tickers:
                if t in ticker_data:
                    sector_map[t] = str(ticker_data[t].get(json_key, "Unknown"))
                else:
                    sector_map[t] = "Unknown"
            logger.info("[SECTOR] 매핑 완료 (%d/%d건)", len(sector_map), len(tickers))
        except Exception as exc:
            logger.warning("[SECTOR] sector_mapping.json 로드 실패: %s — 모두 'Unknown' 처리", exc)
            sector_map = {t: "Unknown" for t in tickers}
    else:
        logger.warning("[SECTOR] sector_mapping.json 없음: %s — 모두 'Unknown' 처리", sector_file)
        sector_map = {t: "Unknown" for t in tickers}

    # --- ticker label encoding ---
    le = LabelEncoder()
    le.fit(tickers)
    ticker_enc_map: dict[str, int] = {t: int(le.transform([t])[0]) for t in tickers}

    # --- 매크로 데이터 사전 로드 ---
    logger.info("[MACRO] 매크로 데이터 로드 중...")
    macro_df = _load_macro_features()
    if not macro_df.empty:
        logger.info("[MACRO] 매크로 로드 완료: %d행, 열=%s", len(macro_df), list(macro_df.columns))
    else:
        logger.warning("[MACRO] 매크로 데이터 없음 — 해당 피처는 0으로 채워집니다.")

    # --- 종목별 피처 계산 ---
    all_ticker_frames: list[pd.DataFrame] = []
    success_count = 0
    skip_count = 0

    for i, ticker in enumerate(tickers):
        # 진행 상황 20개 단위 출력
        if i > 0 and i % 20 == 0:
            logger.info(
                "[TFT] 진행 중: %d/%d 종목 처리 완료 (성공=%d, 건너뜀=%d)",
                i, len(tickers), success_count, skip_count,
            )

        ohlcv_path = RAW_OHLCV_PATH / f"{ticker}.parquet"
        if not ohlcv_path.exists():
            logger.debug("[TFT] %s OHLCV 파일 없음 — 건너뜀", ticker)
            skip_count += 1
            continue

        # OHLCV 로드
        try:
            ohlcv_df = pd.read_parquet(ohlcv_path)
        except Exception as exc:
            logger.warning("[TFT] %s OHLCV 로드 실패: %s", ticker, exc)
            skip_count += 1
            continue

        if ohlcv_df.empty:
            skip_count += 1
            continue

        ohlcv_df.index = pd.to_datetime(ohlcv_df.index)
        ohlcv_df = ohlcv_df.sort_index()

        # 기본 열 확인
        required_cols = {"open", "high", "low", "close", "volume"}
        if not required_cols.issubset(ohlcv_df.columns):
            logger.warning("[TFT] %s 필수 열 누락: %s", ticker, required_cols - set(ohlcv_df.columns))
            skip_count += 1
            continue

        # 기술 피처 계산
        try:
            feat_df = _compute_technical_features(ohlcv_df)
        except Exception as exc:
            logger.warning("[TFT] %s 기술 피처 계산 실패: %s", ticker, exc)
            skip_count += 1
            continue

        # 수급 데이터 로드 및 병합
        supply_df = _load_supply_features(ticker)

        if not supply_df.empty:
            # 외인 순매수 비율 계산
            vol = feat_df["volume"].replace(0, np.nan)
            if "foreign_net_buy" in supply_df.columns:
                foreign_net = supply_df["foreign_net_buy"].reindex(feat_df.index)
                feat_df["foreign_net_ratio"] = foreign_net / vol
            else:
                feat_df["foreign_net_ratio"] = 0.0

            # 기관 순매수 비율 계산
            inst_col = None
            for candidate in ("institution_net_buy", "inst_net_buy", "institutional_net_buy"):
                if candidate in supply_df.columns:
                    inst_col = candidate
                    break
            if inst_col is not None:
                inst_net = supply_df[inst_col].reindex(feat_df.index)
                feat_df["inst_net_ratio"] = inst_net / vol
            else:
                feat_df["inst_net_ratio"] = 0.0
        else:
            feat_df["foreign_net_ratio"] = 0.0
            feat_df["inst_net_ratio"] = 0.0

        # 매크로 피처 날짜 병합
        if not macro_df.empty:
            for col in MACRO_COLS:
                if col in macro_df.columns:
                    feat_df[col] = macro_df[col].reindex(feat_df.index)
                else:
                    feat_df[col] = 0.0
        else:
            for col in MACRO_COLS:
                feat_df[col] = 0.0

        # VIX forward fill (매크로 병합 후 잔여 결측)
        if "vix" in feat_df.columns:
            feat_df["vix"] = feat_df["vix"].ffill().fillna(0.0)
        if "vix_change" in feat_df.columns:
            feat_df["vix_change"] = feat_df["vix_change"].fillna(0.0)

        # 상대 수익률 계산 (daily_return — kospi200_return)
        if "kospi200_return" in feat_df.columns and not feat_df["kospi200_return"].isna().all():
            feat_df["relative_return"] = (
                feat_df["daily_return"] / 100.0 - feat_df["kospi200_return"]
            )
        else:
            feat_df["relative_return"] = feat_df["daily_return"] / 100.0

        # 캘린더 피처 추가
        feat_df = _add_calendar_features(feat_df)

        # 타겟 생성: 5거래일 후 종가 > 현재 종가이면 1, 아니면 0
        future_close = feat_df["close"].shift(-TARGET_HORIZON)
        feat_df["target_5d"] = ((future_close / feat_df["close"]) - 1.0 > 0.0).astype(float)
        feat_df.loc[future_close.isna(), "target_5d"] = np.nan

        # 정적 피처 추가
        feat_df["ticker"] = ticker
        feat_df["sector_id"] = sector_map.get(ticker, "Unknown")
        feat_df["ticker_encoded"] = ticker_enc_map[ticker]

        # date 열 추가 (인덱스 보존)
        feat_df["date"] = feat_df.index

        # NaN 드롭 (웜업 기간 제거 및 타겟 없는 마지막 행 제거)
        drop_cols = TECHNICAL_COLS + SUPPLY_COLS + ["target_5d"]
        feat_df = feat_df.dropna(subset=drop_cols)

        if feat_df.empty:
            logger.debug("[TFT] %s 유효 행 없음 (NaN 드롭 후) — 건너뜀", ticker)
            skip_count += 1
            continue

        # 나머지 매크로·상대수익률 결측 → 0 채움
        for col in MACRO_COLS + ["relative_return"]:
            if col in feat_df.columns:
                feat_df[col] = feat_df[col].ffill().fillna(0.0)

        # 수급 결측 → 0 채움
        for col in SUPPLY_COLS:
            feat_df[col] = feat_df[col].fillna(0.0)

        # time_idx 생성 (종목별 0-based 단조 증가, 날짜 정렬 기준)
        feat_df = feat_df.sort_index()
        feat_df["time_idx"] = np.arange(len(feat_df), dtype=int)

        all_ticker_frames.append(feat_df)
        success_count += 1

    logger.info(
        "[TFT] 종목별 피처 계산 완료 (성공=%d, 건너뜀=%d)",
        success_count, skip_count,
    )

    if not all_ticker_frames:
        logger.error("[TFT] 유효한 종목 데이터가 없어 파이프라인을 중단합니다.")
        return

    # --- 전체 병합 ---
    logger.info("[TFT] 전체 종목 프레임 병합 중...")
    result_df = pd.concat(all_ticker_frames, axis=0, ignore_index=False)

    # 열 정리 (타입 명시)
    result_df["ticker"] = result_df["ticker"].astype(str)
    result_df["sector_id"] = result_df["sector_id"].astype(str)
    result_df["ticker_encoded"] = result_df["ticker_encoded"].astype(int)
    result_df["time_idx"] = result_df["time_idx"].astype(int)
    result_df["target_5d"] = result_df["target_5d"].astype(int)
    result_df["date"] = pd.to_datetime(result_df["date"])

    # 정수형 캘린더 피처
    for col in CALENDAR_COLS:
        result_df[col] = result_df[col].astype(int)

    # 수치 피처 3시그마 클리핑 (전체 데이터 기준)
    numeric_feature_cols = TECHNICAL_COLS + SUPPLY_COLS + MACRO_COLS + ["relative_return"]
    logger.info("[TFT] 수치 피처 3σ 클리핑 적용 중...")
    for col in numeric_feature_cols:
        if col in result_df.columns:
            result_df[col] = _clip_at_sigma(result_df[col].astype(float), CLIP_SIGMA)

    # inf 방어 처리
    result_df = result_df.replace([np.inf, -np.inf], np.nan)
    for col in numeric_feature_cols:
        if col in result_df.columns:
            result_df[col] = result_df[col].fillna(0.0)

    # 최종 컬럼 순서 정리
    ordered_cols = (
        ["date", "ticker", "time_idx"]
        + STATIC_CAT_COLS
        + CALENDAR_COLS
        + TECHNICAL_COLS
        + SUPPLY_COLS
        + MACRO_COLS
        + ["relative_return"]
        + ["target_5d"]
    )
    # 실제 존재하는 열만 필터링 (누락 열 방어)
    ordered_cols = [c for c in ordered_cols if c in result_df.columns]
    result_df = result_df[ordered_cols]

    # --- 저장 ---
    TFT_OUTPUT_PATH.mkdir(parents=True, exist_ok=True)
    out_path = TFT_OUTPUT_PATH / "tft_features.parquet"
    result_df.to_parquet(out_path, compression="snappy", index=False)
    logger.info("[TFT] 저장 완료: %s", out_path)

    # --- 최종 통계 출력 ---
    n_rows = len(result_df)
    date_min = result_df["date"].min()
    date_max = result_df["date"].max()
    n_tickers = result_df["ticker"].nunique()
    n_features = len([c for c in result_df.columns if c not in ("date", "ticker", "time_idx", "sector_id", "ticker_encoded", "target_5d")])

    logger.info("=== TFT 피처 생성 파이프라인 완료 ===")
    logger.info("총 행: %d", n_rows)
    logger.info("날짜 범위: %s ~ %s", date_min.date(), date_max.date())
    logger.info("종목 수: %d", n_tickers)
    logger.info("피처 수: %d", n_features)

    print(
        f"\n[완료] 총 행: {n_rows:,} | "
        f"날짜: {date_min.date()} ~ {date_max.date()} | "
        f"종목 수: {n_tickers} | "
        f"피처 수: {n_features}"
    )


# ---------------------------------------------------------------------------
# 진입점
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    build_tft_features()
