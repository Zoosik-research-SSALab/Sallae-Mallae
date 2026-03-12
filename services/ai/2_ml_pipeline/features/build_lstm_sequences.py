"""
features/build_lstm_sequences.py
LSTM용 시퀀스 데이터 생성 모듈.

입력:
  RAW_OHLCV_PATH/{ticker}.parquet
  RAW_SUPPLY_PATH/{ticker}.parquet
  RAW_MACRO_PATH/kospi200.parquet

출력:
  PROCESSED_LSTM_PATH/train/sector_{sector_id}.npz  -> X (n,20,5), y (n,), tickers, dates
  PROCESSED_LSTM_PATH/test/sector_{sector_id}.npz   -> 동일 구조 (테스트 기간)

정규화:
  피처별 -3σ~+3σ 클리핑 후 MinMaxScaler [0,1].
  스케일러 파라미터는 학습 데이터 기준으로 산출하며,
  PROCESSED_LSTM_PATH/scalers/sector_{sector_id}_scaler.npz 에 저장.

Python 3.10+ 호환, Google Colab 동작 지원.
"""

from __future__ import annotations

import json
import warnings
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler

from config import (
    RAW_OHLCV_PATH,
    RAW_SUPPLY_PATH,
    RAW_MACRO_PATH,
    RAW_UNIVERSE_PATH,
    PROCESSED_LSTM_PATH,
    SEQ_LEN,
    TRAIN_END_DATE,
    TEST_START_DATE,
    TEST_END_DATE,
    PARQUET_COMPRESSION,
)
from utils.logger import setup_logger

warnings.filterwarnings("ignore", category=FutureWarning)

logger = setup_logger(__name__)

# ---------------------------------------------------------------------------
# 피처 상수
# ---------------------------------------------------------------------------
FEATURES: list[str] = [
    "daily_return",            # 일별 수익률 (%) = close.pct_change(1) * 100
    "volume_change_ratio",     # 거래량 변화율 = volume.pct_change(1)
    "high_low_range",          # 고저 변동폭 (%) = (high-low) / close.shift(1) * 100
    "foreign_net_buy_change",  # 외인 순매수 변화율 = foreign_net_buy.pct_change(1)
    "relative_return",         # KOSPI200 대비 상대 수익률 = daily_return/100 - kospi200_return
]

N_FEATURES: int = len(FEATURES)

# 클리핑 표준편차 배수
CLIP_SIGMA: float = 3.0

# 5일 후 수익률이 0 초과이면 상승(1), 이하이면 하락·횡보(0)
TARGET_HORIZON: int = 5


# ---------------------------------------------------------------------------
# 코스피200 기준 시리즈 로드
# ---------------------------------------------------------------------------

def _load_kospi200() -> pd.Series | None:
    """RAW_MACRO_PATH/kospi200.parquet 에서 종가 시리즈를 로드합니다."""
    path = RAW_MACRO_PATH / "kospi200.parquet"
    if not path.exists():
        logger.warning("[KOSPI200] 기준 파일 없음 (%s) — relative_return 은 NaN 처리", path)
        return None
    try:
        df = pd.read_parquet(path)
    except Exception as exc:
        logger.warning("[KOSPI200] 파일 로드 실패: %s — relative_return 은 NaN 처리", exc)
        return None
    if df is None or df.empty:
        logger.warning("[KOSPI200] 빈 파일 — relative_return 은 NaN 처리")
        return None
    df.index = pd.to_datetime(df.index)
    close_col = "close" if "close" in df.columns else df.columns[0]
    return df[close_col].sort_index()


# ---------------------------------------------------------------------------
# 섹터 조회 헬퍼 (sector_mapping.json 사용)
# ---------------------------------------------------------------------------

def _get_group_map(tickers: list[str], group_by: str = "cluster") -> dict[str, str]:
    """
    sector_mapping.json에서 종목별 그룹을 로드합니다.

    Args:
        tickers: 종목 코드 목록
        group_by: "cluster" (gics_cluster: 3그룹) 또는 "sector" (gics_sector: 11그룹)

    Returns:
        {ticker: group_name} 딕셔너리
    """
    key_map = {"cluster": "gics_cluster", "sector": "gics_sector"}
    json_key = key_map.get(group_by, "gics_cluster")

    group_map: dict[str, str] = {t: "Unknown" for t in tickers}

    sector_file = RAW_UNIVERSE_PATH / "sector_mapping.json"
    if not sector_file.exists():
        logger.warning("[GROUP] sector_mapping.json 없음: %s — 모두 'Unknown'으로 처리합니다.", sector_file)
        return group_map

    try:
        with open(sector_file, encoding="utf-8") as f:
            data = json.load(f)

        ticker_data = data.get("tickers", {})
        mapped = 0
        for ticker in tickers:
            if ticker in ticker_data:
                group_map[ticker] = ticker_data[ticker].get(json_key, "Unknown")
                mapped += 1
        logger.info("[GROUP] %s 기준 매핑 완료 (%d/%d건)", group_by, mapped, len(tickers))
    except Exception as exc:
        logger.warning("[GROUP] sector_mapping.json 로드 실패: %s — 모두 'Unknown'으로 처리합니다.", exc)

    return group_map


# ---------------------------------------------------------------------------
# 단일 종목 피처 계산
# ---------------------------------------------------------------------------

def compute_features(
    ohlcv_df: pd.DataFrame,
    supply_df: pd.DataFrame,
    kospi200_series: pd.Series | None,
) -> pd.DataFrame:
    """단일 종목의 OHLCV + 수급 데이터로 LSTM 피처 5개를 계산합니다."""
    df = ohlcv_df.copy().sort_index()
    df.index = pd.to_datetime(df.index)

    # 1. 일별 수익률 (%)
    df["daily_return"] = df["close"].pct_change(1) * 100

    # 2. 거래량 변화율
    df["volume_change_ratio"] = df["volume"].pct_change(1)

    # 3. 고저 변동폭 (%)
    df["high_low_range"] = ((df["high"] - df["low"]) / df["close"].shift(1)) * 100

    # 4. 외인 순매수 변화율 (diff 기반 — pct_change는 0 나눗셈으로 inf/NaN 폭발)
    if not supply_df.empty and "foreign_net_buy" in supply_df.columns:
        supply = supply_df["foreign_net_buy"].copy()
        supply.index = pd.to_datetime(supply.index)
        supply = supply.reindex(df.index)
        # diff를 20일 이동평균 절대값으로 나누어 상대적 변화율 계산
        diff = supply.diff(1)
        rolling_abs_mean = supply.abs().rolling(window=20, min_periods=1).mean()
        rolling_abs_mean = rolling_abs_mean.replace(0, np.nan)
        df["foreign_net_buy_change"] = diff / rolling_abs_mean
        # inf 제거
        df["foreign_net_buy_change"] = df["foreign_net_buy_change"].replace([np.inf, -np.inf], np.nan)
    else:
        df["foreign_net_buy_change"] = np.nan

    # 5. 코스피200 대비 상대 수익률
    if kospi200_series is not None:
        kospi_ret = kospi200_series.pct_change(1).reindex(df.index)
        df["relative_return"] = df["daily_return"] / 100 - kospi_ret
    else:
        df["relative_return"] = np.nan

    # 타겟: TARGET_HORIZON일 후 상승 여부 (0/1)
    future_close = df["close"].shift(-TARGET_HORIZON)
    df["target_5d"] = ((future_close / df["close"]) - 1 > 0).astype(float)
    df.loc[future_close.isna(), "target_5d"] = np.nan

    return df[FEATURES + ["target_5d"]]


# ---------------------------------------------------------------------------
# 시퀀스 생성 (날짜 메타데이터 포함)
# ---------------------------------------------------------------------------

def create_sequences_with_metadata(
    df: pd.DataFrame,
    seq_len: int,
    ticker: str,
    start_date: str | None,
    end_date: str | None,
) -> tuple[np.ndarray, np.ndarray, list[str], list[str]]:
    """피처 DataFrame에서 슬라이딩 윈도우 방식으로 (X, y, tickers, dates) 를 생성합니다."""
    valid = df.dropna(subset=["target_5d"])

    start_ts = pd.Timestamp(start_date) if start_date else None
    end_ts = pd.Timestamp(end_date) if end_date else None

    feature_arr = valid[FEATURES].values
    target_arr = valid["target_5d"].values
    dates_arr = valid.index

    X_list: list[np.ndarray] = []
    y_list: list[float] = []
    ticker_list: list[str] = []
    date_list: list[str] = []

    n = len(feature_arr)
    for i in range(seq_len, n):
        last_date = dates_arr[i]

        if start_ts is not None and last_date < start_ts:
            continue
        if end_ts is not None and last_date > end_ts:
            continue

        window = feature_arr[i - seq_len: i]
        label = target_arr[i]

        if np.isnan(window).any() or np.isnan(label):
            continue

        X_list.append(window)
        y_list.append(label)
        ticker_list.append(ticker)
        date_list.append(last_date.strftime("%Y-%m-%d"))

    if not X_list:
        empty_X = np.empty((0, seq_len, N_FEATURES), dtype=np.float32)
        empty_y = np.empty(0, dtype=np.float32)
        return empty_X, empty_y, [], []

    X = np.array(X_list, dtype=np.float32)
    y = np.array(y_list, dtype=np.float32)
    return X, y, ticker_list, date_list


# ---------------------------------------------------------------------------
# 정규화 헬퍼
# ---------------------------------------------------------------------------

def _fit_scaler(X_train: np.ndarray) -> tuple[np.ndarray, np.ndarray, MinMaxScaler]:
    """학습 데이터에서 클리핑 + MinMaxScaler를 학습합니다."""
    flat = X_train.reshape(-1, N_FEATURES)

    clip_mean = np.nanmean(flat, axis=0)
    clip_std = np.nanstd(flat, axis=0)
    clip_std = np.where(clip_std == 0, 1.0, clip_std)

    low = clip_mean - CLIP_SIGMA * clip_std
    high = clip_mean + CLIP_SIGMA * clip_std
    clipped = np.clip(flat, low, high)

    scaler = MinMaxScaler(feature_range=(0, 1))
    scaler.fit(clipped)

    return clip_mean, clip_std, scaler


def _apply_scaler(
    X: np.ndarray,
    clip_mean: np.ndarray,
    clip_std: np.ndarray,
    scaler: MinMaxScaler,
) -> np.ndarray:
    """학습된 스케일러로 데이터를 변환합니다."""
    n, seq_len, nf = X.shape
    flat = X.reshape(-1, nf)

    low = clip_mean - CLIP_SIGMA * clip_std
    high = clip_mean + CLIP_SIGMA * clip_std
    clipped = np.clip(flat, low, high)

    scaled = scaler.transform(clipped)
    return scaled.reshape(n, seq_len, nf).astype(np.float32)


# ---------------------------------------------------------------------------
# 섹터별 시퀀스 생성 (학습/테스트 분리)
# ---------------------------------------------------------------------------

def build_sector_sequences(
    sector_id: str,
    tickers: list[str],
    kospi200_series: pd.Series | None,
    split: str,
) -> tuple[np.ndarray, np.ndarray, list[str], list[str]] | None:
    """섹터에 속한 종목들의 시퀀스를 생성합니다."""
    if split == "train":
        start_date = None
        end_date = TRAIN_END_DATE
    elif split == "test":
        start_date = TEST_START_DATE
        end_date = TEST_END_DATE
    elif split == "all":
        start_date = None
        end_date = None
    else:
        raise ValueError(f"split 은 'train', 'test', 'all' 이어야 합니다: {split!r}")

    all_X: list[np.ndarray] = []
    all_y: list[np.ndarray] = []
    all_tickers: list[str] = []
    all_dates: list[str] = []

    for ticker in tickers:
        ohlcv_path = RAW_OHLCV_PATH / f"{ticker}.parquet"
        supply_path = RAW_SUPPLY_PATH / f"{ticker}.parquet"

        if not ohlcv_path.exists():
            logger.debug("[LSTM] %s OHLCV 파일 없음 — 건너뜀", ticker)
            continue

        try:
            ohlcv_df = pd.read_parquet(ohlcv_path)
        except Exception as exc:
            logger.warning("[LSTM] %s OHLCV 로드 실패: %s", ticker, exc)
            continue

        if ohlcv_df.empty:
            continue

        supply_df = pd.DataFrame()
        if supply_path.exists():
            try:
                supply_df = pd.read_parquet(supply_path)
            except Exception:
                pass

        try:
            feat_df = compute_features(ohlcv_df, supply_df, kospi200_series)
            X, y, t_list, d_list = create_sequences_with_metadata(
                feat_df, SEQ_LEN, ticker, start_date, end_date
            )
        except Exception as exc:
            logger.warning("[LSTM] %s 시퀀스 생성 실패: %s", ticker, exc)
            continue

        if X.shape[0] == 0:
            continue

        all_X.append(X)
        all_y.append(y)
        all_tickers.extend(t_list)
        all_dates.extend(d_list)

    if not all_X:
        logger.warning("[LSTM] 섹터 '%s' split='%s' — 유효 시퀀스 없음", sector_id, split)
        return None

    X_concat = np.concatenate(all_X, axis=0)
    y_concat = np.concatenate(all_y, axis=0)

    return X_concat, y_concat, all_tickers, all_dates


# ---------------------------------------------------------------------------
# 저장 헬퍼
# ---------------------------------------------------------------------------

def _safe_sector_name(sector_id: str) -> str:
    """파일명에 사용 불가한 문자를 대체합니다."""
    return (
        sector_id
        .replace("/", "_")
        .replace("\\", "_")
        .replace(" ", "_")
        .replace(":", "_")
    )


def _save_sector_npz(
    out_dir: Path,
    sector_id: str,
    X: np.ndarray,
    y: np.ndarray,
    tickers: list[str],
    dates: list[str],
) -> None:
    """섹터 시퀀스를 npz 파일로 저장합니다."""
    out_dir.mkdir(parents=True, exist_ok=True)
    safe_id = _safe_sector_name(sector_id)
    out_path = out_dir / f"sector_{safe_id}.npz"

    np.savez_compressed(
        str(out_path),
        X=X,
        y=y,
        tickers=np.array(tickers, dtype=object),
        dates=np.array(dates, dtype=object),
    )
    logger.info("[LSTM] 저장 완료: %s  (X=%s, y=%s)", out_path, X.shape, y.shape)


def _save_scaler(
    scalers_dir: Path,
    sector_id: str,
    clip_mean: np.ndarray,
    clip_std: np.ndarray,
    scaler: MinMaxScaler,
) -> None:
    """스케일러 파라미터를 npz 파일로 저장합니다."""
    scalers_dir.mkdir(parents=True, exist_ok=True)
    safe_id = _safe_sector_name(sector_id)
    out_path = scalers_dir / f"sector_{safe_id}_scaler.npz"

    np.savez_compressed(
        str(out_path),
        clip_mean=clip_mean,
        clip_std=clip_std,
        data_min=scaler.data_min_,
        data_max=scaler.data_max_,
        scale=scaler.scale_,
        min_=scaler.min_,
        feature_range=np.array(scaler.feature_range),
    )
    logger.info("[SCALER] 저장 완료: %s", out_path)


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def main(group_by: str = "cluster") -> None:
    """
    전체 그룹별 LSTM 시퀀스 파일을 생성합니다.

    Args:
        group_by: "cluster" (3그룹) 또는 "sector" (11그룹)
    """
    logger.info("=== LSTM 시퀀스 생성 파이프라인 시작 (group_by=%s) ===", group_by)
    logger.info("학습 기간: ~ %s", TRAIN_END_DATE)
    logger.info("테스트 기간: %s ~ %s", TEST_START_DATE, TEST_END_DATE)

    if not RAW_OHLCV_PATH.exists():
        logger.error("RAW_OHLCV_PATH 가 존재하지 않습니다: %s", RAW_OHLCV_PATH)
        return

    tickers: list[str] = [p.stem for p in sorted(RAW_OHLCV_PATH.glob("*.parquet"))]
    if not tickers:
        logger.error("OHLCV parquet 파일을 찾을 수 없습니다: %s", RAW_OHLCV_PATH)
        return

    logger.info("종목 수: %d", len(tickers))

    kospi200_series = _load_kospi200()

    group_map = _get_group_map(tickers, group_by=group_by)
    sector_groups: dict[str, list[str]] = {}
    for ticker, group in group_map.items():
        sector_groups.setdefault(group, []).append(ticker)
    logger.info("[GROUP] %s 그룹 수: %d", group_by, len(sector_groups))

    train_dir = PROCESSED_LSTM_PATH / "train"
    test_dir = PROCESSED_LSTM_PATH / "test"
    all_dir = PROCESSED_LSTM_PATH / "all"
    scalers_dir = PROCESSED_LSTM_PATH / "scalers"

    total_train_samples = 0
    total_test_samples = 0
    total_all_samples = 0

    for sector_id, sector_tickers in sector_groups.items():
        logger.info("[LSTM] 섹터 '%s' 처리 중 (%d 종목)", sector_id, len(sector_tickers))

        # --- 학습 시퀀스 ---
        train_result = build_sector_sequences(
            sector_id, sector_tickers, kospi200_series, split="train"
        )
        if train_result is None:
            logger.warning("[LSTM] 섹터 '%s' 학습 시퀀스 없음 — 테스트도 건너뜀", sector_id)
            continue

        X_train_raw, y_train, train_tickers, train_dates = train_result

        clip_mean, clip_std, scaler = _fit_scaler(X_train_raw)
        X_train = _apply_scaler(X_train_raw, clip_mean, clip_std, scaler)
        _save_scaler(scalers_dir, sector_id, clip_mean, clip_std, scaler)
        _save_sector_npz(train_dir, sector_id, X_train, y_train, train_tickers, train_dates)
        total_train_samples += X_train.shape[0]

        # --- 테스트 시퀀스 ---
        test_result = build_sector_sequences(
            sector_id, sector_tickers, kospi200_series, split="test"
        )
        if test_result is None:
            logger.warning("[LSTM] 섹터 '%s' 테스트 시퀀스 없음 — 건너뜀", sector_id)
            continue

        X_test_raw, y_test, test_tickers, test_dates = test_result
        X_test = _apply_scaler(X_test_raw, clip_mean, clip_std, scaler)
        _save_sector_npz(test_dir, sector_id, X_test, y_test, test_tickers, test_dates)
        total_test_samples += X_test.shape[0]

        # --- 전체 기간 시퀀스 (Walk-Forward용) ---
        all_result = build_sector_sequences(
            sector_id, sector_tickers, kospi200_series, split="all"
        )
        if all_result is not None:
            X_all_raw, y_all, all_tickers_list, all_dates_list = all_result
            X_all = _apply_scaler(X_all_raw, clip_mean, clip_std, scaler)
            _save_sector_npz(all_dir, sector_id, X_all, y_all, all_tickers_list, all_dates_list)
            total_all_samples += X_all.shape[0]

    logger.info("=== LSTM 시퀀스 생성 파이프라인 완료 ===")
    logger.info("학습 샘플 합계: %d", total_train_samples)
    logger.info("테스트 샘플 합계: %d", total_test_samples)
    logger.info("전체 샘플 합계: %d", total_all_samples)
    print(f"\n[완료] 학습 샘플: {total_train_samples:,}  /  테스트 샘플: {total_test_samples:,}  /  전체: {total_all_samples:,}")


if __name__ == "__main__":
    main()
