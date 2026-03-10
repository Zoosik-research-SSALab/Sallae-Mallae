"""
validation/walk_forward_validator.py
KOSPI 200 ML 모델 Walk-Forward 검증 프레임워크.

각 윈도우마다 모델을 직접 학습(train)하고 예측하여 슬라이딩 윈도우 방식으로 검증합니다.

검증 대상 모델:
  - LightGBM : 3-class 방향 예측 (상승/횡보/하락)
  - LSTM      : 이진 분류 상승 확률
  - GARCH     : 변동성·리스크 플래그
  - Stacking Ensemble : 3개 모델 조합 메타 모델

주요 메트릭:
  - Direction Accuracy : 방향 예측 정확도 (목표 > 55%)
  - IC (Information Coefficient): Spearman 순위 상관계수 (목표 > 0.05)
  - Sharpe Ratio : 롱/숏 전략의 연환산 위험조정 수익률 (목표 > 1.0)
  - Max Drawdown  : 최대 낙폭 (목표 < 15%)

Python 3.10+ 호환, Google Colab 동작 지원.
"""

from __future__ import annotations

import json
import sys
import warnings
from datetime import datetime, date, timedelta
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from dateutil.relativedelta import relativedelta
from scipy.stats import spearmanr

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import (
    RAW_OHLCV_PATH,
    VALIDATION_PATH,
    VALID_START_DATE,
    FINAL_TEST_END,
    WF_STEP_MONTHS,
    TARGET_HORIZON,
)
from utils.logger import setup_logger

warnings.filterwarnings("ignore")

logger = setup_logger(__name__)

# ---------------------------------------------------------------------------
# 트레이너 임포트 (각각 독립적으로 예외 처리)
# ---------------------------------------------------------------------------

try:
    from models import lgbm_trainer
    _LGBM_AVAILABLE = True
except Exception as _e:
    logger.warning("[WF] lgbm_trainer 임포트 실패: %s", _e)
    lgbm_trainer = None  # type: ignore[assignment]
    _LGBM_AVAILABLE = False

try:
    from models import lstm_trainer
    _LSTM_AVAILABLE = True
except Exception as _e:
    logger.warning("[WF] lstm_trainer 임포트 실패: %s", _e)
    lstm_trainer = None  # type: ignore[assignment]
    _LSTM_AVAILABLE = False

try:
    from models import garch_trainer
    _GARCH_AVAILABLE = True
except Exception as _e:
    logger.warning("[WF] garch_trainer 임포트 실패: %s", _e)
    garch_trainer = None  # type: ignore[assignment]
    _GARCH_AVAILABLE = False

try:
    from models import ensemble_trainer
    _ENSEMBLE_AVAILABLE = True
except Exception as _e:
    logger.warning("[WF] ensemble_trainer 임포트 실패: %s", _e)
    ensemble_trainer = None  # type: ignore[assignment]
    _ENSEMBLE_AVAILABLE = False

# ---------------------------------------------------------------------------
# 상수
# ---------------------------------------------------------------------------
ACCURACY_TARGET: float = 0.55           # 방향 정확도 목표
IC_TARGET: float = 0.05                 # IC 목표
SHARPE_TARGET: float = 1.0             # Sharpe Ratio 목표
MAX_DD_TARGET: float = -0.15           # Max Drawdown 목표 (음수)
REGIME_ACCURACY_THRESHOLD: float = 0.50  # 레짐 변화 감지 임계값
REGIME_ROLLING_WINDOW: int = 6         # 롤링 윈도우 수 (레짐 감지)
TREND_WINDOW: int = 3                  # 추세 기울기 계산 윈도우 수

# Progressive 모드 기준 (조기 중단)
PROGRESSIVE_DA_THRESHOLD: float = 0.52   # 최소 방향 정확도 (랜덤 이상)
PROGRESSIVE_MAX_FAILS: int = 2           # 연속 실패 허용 횟수

# 단순 가중 평균 가중치
SIMPLE_AVG_WEIGHTS: dict[str, float] = {
    "lgbm": 0.4,
    "lstm": 0.4,
    "garch_inv_risk": 0.2,
}

# 사용 가능한 모델 식별자
VALID_MODELS: set[str] = {"lgbm", "lstm", "garch", "ensemble"}


# ---------------------------------------------------------------------------
# Walk-Forward 윈도우 생성
# ---------------------------------------------------------------------------

def _generate_windows() -> list[tuple[date, date]]:
    """
    VALID_START_DATE ~ FINAL_TEST_END 범위를 WF_STEP_MONTHS 단위로 분할합니다.

    Returns:
        (start, end) 튜플 목록
    """
    start_dt = datetime.strptime(VALID_START_DATE, "%Y-%m-%d").date()
    end_dt = datetime.strptime(FINAL_TEST_END, "%Y-%m-%d").date()

    windows: list[tuple[date, date]] = []
    cur_start = start_dt

    while cur_start < end_dt:
        cur_end = cur_start + relativedelta(months=WF_STEP_MONTHS) - relativedelta(days=1)
        if cur_end > end_dt:
            cur_end = end_dt
        windows.append((cur_start, cur_end))
        cur_start = cur_start + relativedelta(months=WF_STEP_MONTHS)

    return windows


# ---------------------------------------------------------------------------
# 모델 학습 + 예측 (윈도우별)
# ---------------------------------------------------------------------------

def _run_lgbm_window(
    train_end: str,
    predict_start: str,
    predict_end: str,
) -> pd.DataFrame | None:
    """
    LightGBM 모델을 학습하고 예측합니다.

    Args:
        train_end: 학습 종료일 (YYYY-MM-DD)
        predict_start: 예측 시작일 (YYYY-MM-DD)
        predict_end: 예측 종료일 (YYYY-MM-DD)

    Returns:
        date, ticker, prob_up, prob_down, prob_sideways, predicted_class,
        confidence, true_class, predicted_label 컬럼 DataFrame 또는 None
    """
    if not _LGBM_AVAILABLE or lgbm_trainer is None:
        logger.debug("[WF] LightGBM 사용 불가 (임포트 실패)")
        return None

    try:
        result = lgbm_trainer.train_and_predict_window(train_end, predict_start, predict_end)
        if result is not None:
            logger.debug(
                "[WF] LightGBM 완료: %d행 (%s ~ %s)", len(result), predict_start, predict_end
            )
        else:
            logger.warning("[WF] LightGBM 결과 없음 (%s ~ %s)", predict_start, predict_end)
        return result
    except Exception as exc:
        logger.warning("[WF] LightGBM 학습/예측 실패 (%s ~ %s): %s", predict_start, predict_end, exc)
        return None


def _run_lstm_window(
    train_end: str,
    predict_start: str,
    predict_end: str,
) -> pd.DataFrame | None:
    """
    LSTM 모델을 학습하고 예측합니다.

    Args:
        train_end: 학습 종료일 (YYYY-MM-DD)
        predict_start: 예측 시작일 (YYYY-MM-DD)
        predict_end: 예측 종료일 (YYYY-MM-DD)

    Returns:
        date, ticker, prob, y_true, sector_id 컬럼 DataFrame 또는 None
    """
    if not _LSTM_AVAILABLE or lstm_trainer is None:
        logger.debug("[WF] LSTM 사용 불가 (임포트 실패)")
        return None

    try:
        result = lstm_trainer.train_and_predict_window(train_end, predict_start, predict_end)
        if result is not None:
            logger.debug(
                "[WF] LSTM 완료: %d행 (%s ~ %s)", len(result), predict_start, predict_end
            )
        else:
            logger.warning("[WF] LSTM 결과 없음 (%s ~ %s)", predict_start, predict_end)
        return result
    except Exception as exc:
        logger.warning("[WF] LSTM 학습/예측 실패 (%s ~ %s): %s", predict_start, predict_end, exc)
        return None


def _run_garch_window(train_end: str) -> pd.DataFrame | None:
    """
    GARCH 모델을 피팅합니다.

    Args:
        train_end: 학습 종료일 (YYYY-MM-DD)

    Returns:
        ticker, date, vol_1d, vol_3d, vol_5d, volatility_level, risk_flag,
        percentile_vs_1y 컬럼 DataFrame 또는 None
    """
    if not _GARCH_AVAILABLE or garch_trainer is None:
        logger.debug("[WF] GARCH 사용 불가 (임포트 실패)")
        return None

    try:
        result = garch_trainer.fit_all_tickers_window(train_end)
        if result is not None and not result.empty:
            logger.debug("[WF] GARCH 완료: %d종목 (train_end=%s)", len(result), train_end)
        else:
            logger.warning("[WF] GARCH 결과 없음 (train_end=%s)", train_end)
        return result
    except Exception as exc:
        logger.warning("[WF] GARCH 피팅 실패 (train_end=%s): %s", train_end, exc)
        return None


def _run_ensemble_window(
    lgbm_df: pd.DataFrame | None,
    lstm_df: pd.DataFrame | None,
    garch_df: pd.DataFrame | None,
) -> tuple[pd.DataFrame, dict] | None:
    """
    스태킹 앙상블 모델을 학습하고 예측합니다.

    Args:
        lgbm_df: LightGBM 예측 DataFrame
        lstm_df: LSTM 예측 DataFrame
        garch_df: GARCH 결과 DataFrame

    Returns:
        (predictions_df, metrics_dict) 또는 None
    """
    if not _ENSEMBLE_AVAILABLE or ensemble_trainer is None:
        logger.debug("[WF] 앙상블 사용 불가 (임포트 실패)")
        return None

    if lgbm_df is None and lstm_df is None:
        logger.debug("[WF] 앙상블: 기반 모델 예측 없음 — 건너뜀")
        return None

    try:
        result = ensemble_trainer.train_and_predict_window(lgbm_df, lstm_df, garch_df)
        if result is not None:
            preds_df, metrics_dict = result
            logger.debug("[WF] 앙상블 완료: %d행", len(preds_df) if preds_df is not None else 0)
        else:
            logger.warning("[WF] 앙상블 결과 없음")
        return result
    except Exception as exc:
        logger.warning("[WF] 앙상블 학습/예측 실패: %s", exc)
        return None


# ---------------------------------------------------------------------------
# 실제 수익률 계산
# ---------------------------------------------------------------------------

def _load_forward_returns(tickers: list[str], start: date, end: date) -> pd.DataFrame:
    """
    RAW_OHLCV에서 각 종목의 TARGET_HORIZON일 선행 수익률을 계산합니다.

    Args:
        tickers: 종목 코드 목록
        start: 시작일
        end: 종료일

    Returns:
        date, ticker, fwd_return 컬럼 DataFrame
    """
    records: list[dict] = []

    for ticker in tickers:
        ohlcv_file = RAW_OHLCV_PATH / f"{ticker}.parquet"
        if not ohlcv_file.exists():
            continue

        try:
            df = pd.read_parquet(ohlcv_file)
        except Exception as exc:
            logger.debug("[WF] OHLCV 로드 실패 %s: %s", ticker, exc)
            continue

        if "close" not in df.columns:
            continue

        df.index = pd.to_datetime(df.index)
        df = df.sort_index()

        # 윈도우보다 약간 더 넓게 슬라이싱 (선행 기간 확보)
        buf_start = pd.Timestamp(start) - pd.Timedelta(days=30)
        buf_end = pd.Timestamp(end) + pd.Timedelta(days=TARGET_HORIZON * 3)
        sliced = df.loc[buf_start:buf_end, ["close"]].copy()

        if sliced.empty:
            continue

        # TARGET_HORIZON일 선행 수익률
        sliced["fwd_return"] = sliced["close"].shift(-TARGET_HORIZON) / sliced["close"] - 1

        # 윈도우 범위만 필터
        mask = (sliced.index.date >= start) & (sliced.index.date <= end)
        sliced = sliced.loc[mask].dropna(subset=["fwd_return"])

        for idx_date, row in sliced.iterrows():
            records.append({
                "date": pd.Timestamp(idx_date),
                "ticker": ticker,
                "fwd_return": float(row["fwd_return"]),
            })

    if not records:
        return pd.DataFrame(columns=["date", "ticker", "fwd_return"])

    return pd.DataFrame(records)


# ---------------------------------------------------------------------------
# 메트릭 계산
# ---------------------------------------------------------------------------

def _calc_direction_accuracy(predicted_up: pd.Series, fwd_return: pd.Series) -> float:
    """
    방향 예측 정확도를 계산합니다.

    Args:
        predicted_up: 상승 예측 여부 (bool Series)
        fwd_return: 실제 선행 수익률

    Returns:
        방향 정확도 (0~1)
    """
    actual_up = fwd_return > 0
    valid = predicted_up.notna() & actual_up.notna()
    if valid.sum() == 0:
        return float("nan")
    return float((predicted_up[valid].astype(bool) == actual_up[valid]).mean())


def _calc_ic(signal: pd.Series, fwd_return: pd.Series) -> float:
    """
    IC (Information Coefficient): 예측 신호와 실제 수익률의 Spearman 상관계수.

    Args:
        signal: 예측 신호 (연속값, 클수록 상승)
        fwd_return: 실제 선행 수익률

    Returns:
        IC 값
    """
    valid = signal.notna() & fwd_return.notna()
    if valid.sum() < 5:
        return float("nan")

    ic, _ = spearmanr(signal[valid], fwd_return[valid])
    return float(ic) if not np.isnan(ic) else float("nan")


def _calc_sharpe_and_drawdown(
    signal: pd.Series,
    fwd_return: pd.Series,
    dates: pd.Series,
) -> tuple[float, float]:
    """
    롱/숏 전략 기반 Sharpe Ratio와 Max Drawdown을 계산합니다.

    상위 20% 종목 롱, 하위 20% 종목 숏 (날짜별 크로스 섹셔널).

    Args:
        signal: 예측 신호 (연속값)
        fwd_return: 실제 선행 수익률
        dates: 날짜 Series

    Returns:
        (annualized_sharpe, max_drawdown) 튜플
    """
    df = pd.DataFrame({
        "date": dates,
        "signal": signal.values,
        "fwd_return": fwd_return.values,
    }).dropna()

    if len(df) < 10:
        return float("nan"), float("nan")

    daily_returns: list[float] = []

    for _, day_df in df.groupby("date"):
        if len(day_df) < 5:
            continue

        quantile_20 = day_df["signal"].quantile(0.20)
        quantile_80 = day_df["signal"].quantile(0.80)

        long_mask = day_df["signal"] >= quantile_80
        short_mask = day_df["signal"] <= quantile_20

        if long_mask.sum() == 0 or short_mask.sum() == 0:
            continue

        long_ret = day_df.loc[long_mask, "fwd_return"].mean()
        short_ret = day_df.loc[short_mask, "fwd_return"].mean()
        ls_ret = long_ret - short_ret
        daily_returns.append(ls_ret)

    if len(daily_returns) < 5:
        return float("nan"), float("nan")

    ret_series = pd.Series(daily_returns)
    mean_ret = ret_series.mean()
    std_ret = ret_series.std()

    sharpe = float(mean_ret / std_ret * np.sqrt(252)) if std_ret > 1e-9 else float("nan")

    # Max Drawdown
    cumulative = (1 + ret_series).cumprod()
    running_max = cumulative.cummax()
    drawdown = (cumulative - running_max) / running_max
    max_dd = float(drawdown.min())

    return sharpe, max_dd


# ---------------------------------------------------------------------------
# 단순 가중 평균 신호 계산
# ---------------------------------------------------------------------------

def _build_simple_avg_signal(
    lgbm_df: pd.DataFrame | None,
    lstm_df: pd.DataFrame | None,
    garch_df: pd.DataFrame | None,
) -> pd.DataFrame | None:
    """
    단순 가중 평균 신호를 계산합니다.

    공식: 0.4 * lgbm_prob_up + 0.4 * lstm_prob + 0.2 * (1 - garch_risk)

    Args:
        lgbm_df: LightGBM 예측 DataFrame (date, ticker, prob_up 포함)
        lstm_df: LSTM 예측 DataFrame (date, ticker, prob 포함)
        garch_df: GARCH 결과 DataFrame (ticker, risk_flag 포함)

    Returns:
        date, ticker, simple_avg_signal 컬럼 DataFrame 또는 None
    """
    if lgbm_df is None and lstm_df is None:
        return None

    # 기준 DataFrame 결정
    if lgbm_df is not None and lstm_df is not None:
        merged = pd.merge(
            lgbm_df[["date", "ticker", "prob_up"]].rename(columns={"prob_up": "lgbm_up"}),
            lstm_df[["date", "ticker", "prob"]].rename(columns={"prob": "lstm_prob"}),
            on=["date", "ticker"],
            how="inner",
        )
    elif lgbm_df is not None:
        merged = lgbm_df[["date", "ticker", "prob_up"]].rename(columns={"prob_up": "lgbm_up"}).copy()
        merged["lstm_prob"] = 0.5
    else:
        merged = lstm_df[["date", "ticker", "prob"]].rename(columns={"prob": "lstm_prob"}).copy()
        merged["lgbm_up"] = 1 / 3

    # GARCH risk (ticker 기준 left join)
    if garch_df is not None and "risk_flag" in garch_df.columns:
        risk_col = garch_df[["ticker", "risk_flag"]].copy()
        risk_col["garch_risk"] = risk_col["risk_flag"].astype(float)
        merged = pd.merge(merged, risk_col[["ticker", "garch_risk"]], on="ticker", how="left")
    else:
        merged["garch_risk"] = 0.0

    merged["garch_risk"] = merged["garch_risk"].fillna(0.0)
    merged["lgbm_up"] = merged["lgbm_up"].fillna(1 / 3)
    merged["lstm_prob"] = merged["lstm_prob"].fillna(0.5)

    w = SIMPLE_AVG_WEIGHTS
    merged["simple_avg_signal"] = (
        w["lgbm"] * merged["lgbm_up"]
        + w["lstm"] * merged["lstm_prob"]
        + w["garch_inv_risk"] * (1.0 - merged["garch_risk"])
    )

    return merged[["date", "ticker", "simple_avg_signal"]]


# ---------------------------------------------------------------------------
# 단일 윈도우 검증
# ---------------------------------------------------------------------------

def _validate_window(
    window_idx: int,
    window_start: date,
    window_end: date,
    models: set[str] | None = None,
) -> dict[str, Any]:
    """
    단일 Walk-Forward 윈도우에서 모델을 학습하고 메트릭을 계산합니다.

    Args:
        window_idx: 윈도우 인덱스
        window_start: 예측 기간 시작일 (= 학습 종료일 다음날)
        window_end: 예측 기간 종료일

    Returns:
        윈도우 메트릭 딕셔너리
    """
    train_end = (window_start - timedelta(days=1)).strftime("%Y-%m-%d")
    predict_start = window_start.strftime("%Y-%m-%d")
    predict_end = window_end.strftime("%Y-%m-%d")

    logger.info(
        "[WF] 윈도우 %d: train_end=%s, predict=%s ~ %s",
        window_idx, train_end, predict_start, predict_end,
    )

    result: dict[str, Any] = {
        "window_idx": window_idx,
        "train_end": train_end,
        "start": predict_start,
        "end": predict_end,
        "n_observations": 0,
        "direction_accuracy": None,
        "ic": None,
        "sharpe_ratio": None,
        "max_drawdown": None,
        "simple_avg": {
            "direction_accuracy": None,
            "ic": None,
            "sharpe_ratio": None,
            "max_drawdown": None,
        },
        "stacking_ensemble": {
            "direction_accuracy": None,
            "ic": None,
            "sharpe_ratio": None,
            "max_drawdown": None,
        },
        "model_status": {
            "lgbm": "skipped",
            "lstm": "skipped",
            "garch": "skipped",
            "ensemble": "skipped",
        },
        "status": "no_data",
    }

    # 실행할 모델 결정
    run_models = models if models is not None else VALID_MODELS

    # --- 모델 학습 및 예측 (각각 독립 예외 처리) ---
    lgbm_df = _run_lgbm_window(train_end, predict_start, predict_end) if "lgbm" in run_models else None
    if "lgbm" not in run_models:
        result["model_status"]["lgbm"] = "skipped"
    else:
        result["model_status"]["lgbm"] = "ok" if lgbm_df is not None else "failed"

    lstm_df = _run_lstm_window(train_end, predict_start, predict_end) if "lstm" in run_models else None
    if "lstm" not in run_models:
        result["model_status"]["lstm"] = "skipped"
    else:
        result["model_status"]["lstm"] = "ok" if lstm_df is not None else "failed"

    garch_df = _run_garch_window(train_end) if "garch" in run_models else None
    if "garch" not in run_models:
        result["model_status"]["garch"] = "skipped"
    else:
        result["model_status"]["garch"] = "ok" if garch_df is not None else "failed"

    ensemble_result = _run_ensemble_window(lgbm_df, lstm_df, garch_df) if "ensemble" in run_models else None
    if "ensemble" not in run_models:
        ensemble_df = None
        result["model_status"]["ensemble"] = "skipped"
    elif ensemble_result is not None:
        ensemble_df, _ensemble_metrics = ensemble_result
        result["model_status"]["ensemble"] = "ok"
    else:
        ensemble_df = None
        result["model_status"]["ensemble"] = "failed"

    # 사용 가능한 티커 수집
    tickers: set[str] = set()
    for df in [lgbm_df, lstm_df, ensemble_df]:
        if df is not None and "ticker" in df.columns:
            tickers.update(df["ticker"].unique())

    if not tickers:
        logger.warning("[WF] 윈도우 %d: 예측 데이터 없음", window_idx)
        return result

    # 실제 수익률 로드
    fwd_df = _load_forward_returns(sorted(tickers), window_start, window_end)

    if fwd_df.empty:
        logger.warning("[WF] 윈도우 %d: 실제 수익률 데이터 없음", window_idx)
        return result

    result["n_observations"] = len(fwd_df)

    # --- 스태킹 앙상블 메트릭 ---
    if ensemble_df is not None and "ensemble_result" in ensemble_df.columns:
        ens_merged = pd.merge(
            ensemble_df[["date", "ticker", "ensemble_result", "ensemble_confidence"]],
            fwd_df,
            on=["date", "ticker"],
            how="inner",
        )

        if len(ens_merged) >= 10:
            predicted_up = ens_merged["ensemble_result"].astype(float).map(lambda x: x >= 1)
            signal = ens_merged["ensemble_confidence"].astype(float)
            fwd = ens_merged["fwd_return"].astype(float)
            dates = ens_merged["date"]

            da = _calc_direction_accuracy(predicted_up, fwd)
            ic = _calc_ic(signal, fwd)
            sharpe, max_dd = _calc_sharpe_and_drawdown(signal, fwd, dates)

            result["stacking_ensemble"] = {
                "direction_accuracy": da if not np.isnan(da) else None,
                "ic": ic if not np.isnan(ic) else None,
                "sharpe_ratio": sharpe if not np.isnan(sharpe) else None,
                "max_drawdown": max_dd if not np.isnan(max_dd) else None,
            }

            # 대표 메트릭 (앙상블 기준)
            result["direction_accuracy"] = result["stacking_ensemble"]["direction_accuracy"]
            result["ic"] = result["stacking_ensemble"]["ic"]
            result["sharpe_ratio"] = result["stacking_ensemble"]["sharpe_ratio"]
            result["max_drawdown"] = result["stacking_ensemble"]["max_drawdown"]

    # --- 단순 가중 평균 메트릭 ---
    simple_df = _build_simple_avg_signal(lgbm_df, lstm_df, garch_df)
    if simple_df is not None:
        sa_merged = pd.merge(simple_df, fwd_df, on=["date", "ticker"], how="inner")

        if len(sa_merged) >= 10:
            sa_signal = sa_merged["simple_avg_signal"].astype(float)
            sa_predicted_up = sa_signal >= 0.5
            sa_fwd = sa_merged["fwd_return"].astype(float)
            sa_dates = sa_merged["date"]

            sa_da = _calc_direction_accuracy(sa_predicted_up, sa_fwd)
            sa_ic = _calc_ic(sa_signal, sa_fwd)
            sa_sharpe, sa_max_dd = _calc_sharpe_and_drawdown(sa_signal, sa_fwd, sa_dates)

            result["simple_avg"] = {
                "direction_accuracy": sa_da if not np.isnan(sa_da) else None,
                "ic": sa_ic if not np.isnan(sa_ic) else None,
                "sharpe_ratio": sa_sharpe if not np.isnan(sa_sharpe) else None,
                "max_drawdown": sa_max_dd if not np.isnan(sa_max_dd) else None,
            }

            # 앙상블 메트릭이 없을 경우 단순 평균으로 대체
            if result["direction_accuracy"] is None:
                result["direction_accuracy"] = result["simple_avg"]["direction_accuracy"]
                result["ic"] = result["simple_avg"]["ic"]
                result["sharpe_ratio"] = result["simple_avg"]["sharpe_ratio"]
                result["max_drawdown"] = result["simple_avg"]["max_drawdown"]

    result["status"] = "ok" if result["direction_accuracy"] is not None else "partial"
    return result


# ---------------------------------------------------------------------------
# 전체 메트릭 집계
# ---------------------------------------------------------------------------

def _aggregate_metrics(window_metrics: list[dict]) -> dict[str, Any]:
    """
    윈도우별 메트릭을 전체 평균으로 집계합니다.

    Args:
        window_metrics: 윈도우별 메트릭 목록

    Returns:
        집계 메트릭 딕셔너리
    """
    keys = ["direction_accuracy", "ic", "sharpe_ratio", "max_drawdown"]
    agg: dict[str, Any] = {}

    for key in keys:
        vals = [w[key] for w in window_metrics if w.get(key) is not None]
        agg[key] = float(np.mean(vals)) if vals else None

    return agg


def _aggregate_comparison(window_metrics: list[dict]) -> dict[str, Any]:
    """
    단순 가중 평균 vs 스태킹 앙상블 비교 테이블을 생성합니다.

    Args:
        window_metrics: 윈도우별 메트릭 목록

    Returns:
        비교 딕셔너리 (simple_avg, stacking_ensemble 각 서브딕셔너리)
    """
    keys = ["direction_accuracy", "ic", "sharpe_ratio", "max_drawdown"]
    comparison: dict[str, dict] = {
        "simple_avg": {},
        "stacking_ensemble": {},
    }

    for method in ("simple_avg", "stacking_ensemble"):
        for key in keys:
            vals = [
                w[method][key]
                for w in window_metrics
                if w.get(method) and w[method].get(key) is not None
            ]
            comparison[method][key] = float(np.mean(vals)) if vals else None

    return comparison


# ---------------------------------------------------------------------------
# 레짐 변화 감지
# ---------------------------------------------------------------------------

def _detect_regime_change(window_metrics: list[dict]) -> dict[str, Any]:
    """
    6개 윈도우(= ~6개월) 롤링 평균 Direction Accuracy로 레짐 변화를 감지합니다.

    Args:
        window_metrics: 윈도우별 메트릭 목록

    Returns:
        rolling_accuracy: 윈도우별 롤링 정확도 목록
        retrain_trigger: 재학습 필요 여부
        degradation_trend: 성능 저하 추세 (최근 3개 윈도우 기울기)
    """
    acc_series = [w["direction_accuracy"] for w in window_metrics]
    windows_labels = [f"{w['start']}~{w['end']}" for w in window_metrics]

    rolling_accuracy: list[dict] = []
    retrain_trigger = False

    for i in range(len(acc_series)):
        lo = max(0, i - REGIME_ROLLING_WINDOW + 1)
        vals = [v for v in acc_series[lo:i + 1] if v is not None]
        roll_mean = float(np.mean(vals)) if vals else None

        if roll_mean is not None and roll_mean < REGIME_ACCURACY_THRESHOLD:
            retrain_trigger = True

        rolling_accuracy.append({
            "window": windows_labels[i],
            "rolling_accuracy": roll_mean,
        })

    # 최근 TREND_WINDOW개 윈도우 기울기 (성능 저하 추세)
    recent_vals = [v for v in acc_series[-TREND_WINDOW:] if v is not None]
    if len(recent_vals) >= 2:
        x = np.arange(len(recent_vals), dtype=float)
        slope = float(np.polyfit(x, recent_vals, 1)[0])
        degradation_trend = slope
    else:
        degradation_trend = None

    return {
        "rolling_accuracy": rolling_accuracy,
        "retrain_trigger": retrain_trigger,
        "degradation_trend": degradation_trend,
    }


# ---------------------------------------------------------------------------
# 결과 저장
# ---------------------------------------------------------------------------

def _save_results(payload: dict, reference_date: str) -> str:
    """
    검증 결과를 JSON 파일로 저장합니다.

    Args:
        payload: 저장할 딕셔너리
        reference_date: 기준일 (YYYYMMDD)

    Returns:
        저장된 파일 경로 문자열
    """
    VALIDATION_PATH.mkdir(parents=True, exist_ok=True)
    out_path = VALIDATION_PATH / f"walk_forward_results_{reference_date}.json"

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2, default=str)

    logger.info("[WF] 검증 결과 저장: %s", out_path)
    return str(out_path)


# ---------------------------------------------------------------------------
# 요약 출력
# ---------------------------------------------------------------------------

def _display_summary(payload: dict) -> None:
    """검증 결과 요약을 콘솔에 출력합니다."""
    meta = payload.get("metadata", {})
    overall = payload.get("overall_metrics", {})
    comparison = payload.get("ensemble_comparison", {})
    regime = payload.get("regime_detection", {})
    per_window = payload.get("per_window_metrics", [])

    print("\n" + "=" * 70)
    print("Walk-Forward 검증 결과 (Train-Per-Window)")
    print("=" * 70)
    print(f"  기준일             : {meta.get('reference_date', '-')}")
    print(f"  검증 범위          : {meta.get('validation_range', '-')}")
    if meta.get("progressive"):
        threshold = meta.get("progressive_threshold", PROGRESSIVE_DA_THRESHOLD)
        print(f"  모드               : Progressive (DA >= {threshold:.0%} 기준)")
        if meta.get("stopped_early"):
            print(f"  조기 중단          : YES (Window {meta.get('windows_completed', '?')}/{meta.get('num_windows', '?')}에서 중단)")
        else:
            print(f"  조기 중단          : NO (전체 완료)")
    print(f"  총 윈도우 수        : {meta.get('num_windows', '-')}")
    print(f"  성공 윈도우 수      : {meta.get('ok_windows', '-')}")

    print("\n[전체 평균 메트릭]")
    da = overall.get("direction_accuracy")
    ic = overall.get("ic")
    sr = overall.get("sharpe_ratio")
    md = overall.get("max_drawdown")

    da_str = f"{da:.4f} ({da * 100:.1f}%)" if da is not None else "N/A"
    ic_str = f"{ic:.4f}" if ic is not None else "N/A"
    sr_str = f"{sr:.4f}" if sr is not None else "N/A"
    md_str = f"{md:.4f} ({md * 100:.1f}%)" if md is not None else "N/A"

    print(f"  Direction Accuracy : {da_str}  (목표 > {ACCURACY_TARGET * 100:.0f}%)")
    print(f"  IC                 : {ic_str}  (목표 > {IC_TARGET})")
    print(f"  Sharpe Ratio       : {sr_str}  (목표 > {SHARPE_TARGET})")
    print(f"  Max Drawdown       : {md_str}  (목표 > {MAX_DD_TARGET * 100:.0f}%)")

    print("\n[윈도우별 메트릭 요약]")
    header = f"  {'#':>3}  {'기간':<24} {'DA':>7} {'IC':>7} {'Sharpe':>8} {'MDD':>8}  {'모델상태'}"
    print(header)
    print("  " + "-" * 75)
    for wm in per_window:
        idx = wm.get("window_idx", "?")
        period = f"{wm.get('start', '?')} ~ {wm.get('end', '?')}"
        da_w = wm.get("direction_accuracy")
        ic_w = wm.get("ic")
        sr_w = wm.get("sharpe_ratio")
        md_w = wm.get("max_drawdown")
        ms = wm.get("model_status", {})
        model_str = (
            f"L={ms.get('lgbm','?')[0].upper()} "
            f"S={ms.get('lstm','?')[0].upper()} "
            f"G={ms.get('garch','?')[0].upper()} "
            f"E={ms.get('ensemble','?')[0].upper()}"
        )
        da_s = f"{da_w:.4f}" if da_w is not None else "   N/A"
        ic_s = f"{ic_w:.4f}" if ic_w is not None else "   N/A"
        sr_s = f"{sr_w:.4f}" if sr_w is not None else "    N/A"
        md_s = f"{md_w:.4f}" if md_w is not None else "    N/A"
        print(f"  {idx:>3}  {period:<24} {da_s:>7} {ic_s:>7} {sr_s:>8} {md_s:>8}  {model_str}")

    print("\n[앙상블 비교: 단순 가중 평균 vs 스태킹]")
    header2 = f"  {'메트릭':<22} {'단순 평균':>12} {'스태킹':>12}"
    print(header2)
    print("  " + "-" * 48)
    for metric_key, label in [
        ("direction_accuracy", "Direction Accuracy"),
        ("ic", "IC"),
        ("sharpe_ratio", "Sharpe Ratio"),
        ("max_drawdown", "Max Drawdown"),
    ]:
        sa_val = comparison.get("simple_avg", {}).get(metric_key)
        st_val = comparison.get("stacking_ensemble", {}).get(metric_key)
        sa_str = f"{sa_val:.4f}" if sa_val is not None else "N/A"
        st_str = f"{st_val:.4f}" if st_val is not None else "N/A"
        print(f"  {label:<22} {sa_str:>12} {st_str:>12}")

    print("\n[레짐 변화 감지]")
    retrain = regime.get("retrain_trigger", False)
    trend = regime.get("degradation_trend")
    trend_str = f"{trend:.6f}" if trend is not None else "N/A"
    print(f"  재학습 트리거       : {'YES (성능 저하 감지)' if retrain else 'NO'}")
    print(f"  성능 저하 추세      : {trend_str} (음수 = 하락 추세)")

    print("=" * 70 + "\n")


# ---------------------------------------------------------------------------
# 메인 엔트리포인트
# ---------------------------------------------------------------------------

def main(reference_date: str | None = None, models: list[str] | None = None, progressive: bool = False) -> str | None:
    """
    Walk-Forward 검증 전체 파이프라인 실행.

    각 윈도우마다 모델을 직접 학습하여 진정한 Walk-Forward 검증을 수행합니다.

    Args:
        reference_date: 기준일 문자열 (YYYYMMDD). None이면 오늘 날짜 사용.
        models: 실행할 모델 식별자 목록 (lgbm, lstm, garch, ensemble). None이면 전체 모델.

    Returns:
        저장된 JSON 파일 경로 또는 실패 시 None
    """
    ref_date = reference_date or datetime.now().strftime("%Y%m%d")
    logger.info("=== Walk-Forward 검증 시작 (기준일: %s, Train-Per-Window) ===", ref_date)

    # 모델 선택
    if models:
        run_models = set(models) & VALID_MODELS
        if not run_models:
            logger.error("[WF] 유효한 모델이 없습니다: %s (가능: %s)", models, VALID_MODELS)
            return None
        logger.info("[WF] 선택된 모델: %s", run_models)
    else:
        run_models = None  # None = 전체 모델

    # 1. 윈도우 생성
    windows = _generate_windows()
    logger.info(
        "[WF] 총 %d개 윈도우 생성 (%s ~ %s, step=%d개월)",
        len(windows), VALID_START_DATE, FINAL_TEST_END, WF_STEP_MONTHS,
    )

    if not windows:
        logger.error("[WF] 생성된 윈도우가 없습니다.")
        return None

    # 2. 윈도우별 학습 + 검증
    per_window_metrics: list[dict] = []

    consecutive_fails = 0
    stopped_early = False

    for idx, (w_start, w_end) in enumerate(windows):
        wm = _validate_window(idx, w_start, w_end, models=run_models)
        per_window_metrics.append(wm)

        # Progressive 모드: 기준 미달 시 조기 중단
        if progressive:
            da = wm.get("direction_accuracy")
            if da is not None and da >= PROGRESSIVE_DA_THRESHOLD:
                consecutive_fails = 0
                logger.info(
                    "[WF] Window %d PASS (DA=%.4f >= %.2f)",
                    idx, da, PROGRESSIVE_DA_THRESHOLD,
                )
            elif da is not None:
                consecutive_fails += 1
                logger.warning(
                    "[WF] Window %d FAIL (DA=%.4f < %.2f) [연속 %d회]",
                    idx, da, PROGRESSIVE_DA_THRESHOLD, consecutive_fails,
                )
            else:
                logger.info("[WF] Window %d: 메트릭 계산 불가 (데이터 부족)", idx)

            if consecutive_fails >= PROGRESSIVE_MAX_FAILS:
                logger.warning(
                    "[WF] Progressive 조기 중단: 연속 %d회 기준 미달 (Window %d)",
                    consecutive_fails, idx,
                )
                stopped_early = True
                break

    # 3. 전체 메트릭 집계
    ok_windows = [w for w in per_window_metrics if w["status"] == "ok"]
    overall_metrics = _aggregate_metrics(ok_windows if ok_windows else per_window_metrics)

    # 4. 앙상블 비교
    ensemble_comparison = _aggregate_comparison(per_window_metrics)

    # 5. 레짐 변화 감지
    regime_detection = _detect_regime_change(per_window_metrics)

    # 6. 결과 취합
    payload: dict[str, Any] = {
        "metadata": {
            "reference_date": ref_date,
            "validation_range": f"{VALID_START_DATE} ~ {FINAL_TEST_END}",
            "num_windows": len(windows),
            "ok_windows": len(ok_windows),
            "wf_step_months": WF_STEP_MONTHS,
            "target_horizon": TARGET_HORIZON,
            "mode": "train_per_window",
            "selected_models": sorted(run_models) if run_models else sorted(VALID_MODELS),
            "progressive": progressive,
            "progressive_threshold": PROGRESSIVE_DA_THRESHOLD if progressive else None,
            "stopped_early": stopped_early if progressive else False,
            "windows_completed": len(per_window_metrics),
        },
        "overall_metrics": overall_metrics,
        "per_window_metrics": per_window_metrics,
        "ensemble_comparison": ensemble_comparison,
        "regime_detection": regime_detection,
    }

    # 7. 요약 출력
    _display_summary(payload)

    # 8. 저장
    out_path = _save_results(payload, ref_date)

    logger.info("=== Walk-Forward 검증 완료: %s ===", out_path)
    return out_path


if __name__ == "__main__":
    main()
