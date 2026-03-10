"""
models/garch_trainer.py
KOSPI 200 개별 종목 GARCH(1,1) 변동성 모델 자동 피팅.

각 종목의 최근 252거래일 일별 수익률로 GARCH(1,1)을 피팅하고,
1일/3일/5일 변동성 예측값, 변동성 수준 분류, 리스크 플래그를 생성합니다.
"""

from __future__ import annotations

import sys
import warnings
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import (
    RAW_OHLCV_PATH,
    PROCESSED_GARCH_PATH,
    MODELS_GARCH_PATH,
    PARQUET_COMPRESSION,
)
from utils.logger import setup_logger

warnings.filterwarnings("ignore")

logger = setup_logger(__name__)

# ---------------------------------------------------------------------------
# 상수
# ---------------------------------------------------------------------------
LOOKBACK_DAYS: int = 252          # 피팅에 사용할 최근 거래일 수
FORECAST_HORIZONS: list[int] = [1, 3, 5]  # 변동성 예측 기간 (거래일)

# 변동성 수준 4단계 분류 기준 (연환산 변동성 %)
VOL_LEVELS: dict[str, tuple[float, float]] = {
    "낮음": (0.0, 15.0),
    "보통": (15.0, 30.0),
    "높음": (30.0, 50.0),
    "매우높음": (50.0, float("inf")),
}


# ---------------------------------------------------------------------------
# 단일 종목 GARCH 피팅
# ---------------------------------------------------------------------------

def fit_single_ticker(
    ticker: str,
    ohlcv_df: pd.DataFrame,
    forecast_date: str | None = None,
) -> dict | None:
    """
    단일 종목에 GARCH(1,1)을 피팅하고 변동성 예측을 반환합니다.

    Args:
        ticker: 종목 코드
        ohlcv_df: OHLCV DataFrame (close 컬럼 필수, 날짜 인덱스)
        forecast_date: 예측 기준일 (None이면 마지막 날짜)

    Returns:
        결과 딕셔너리 또는 피팅 실패 시 None
    """
    from arch import arch_model

    df = ohlcv_df.copy()
    df.index = pd.to_datetime(df.index)
    df = df.sort_index()

    if "close" not in df.columns:
        logger.debug("[GARCH] %s: close 컬럼 없음 — 건너뜀", ticker)
        return None

    # 일별 수익률 (%)
    returns = df["close"].pct_change(1).dropna() * 100

    if len(returns) < 60:
        logger.debug("[GARCH] %s: 수익률 데이터 부족 (%d < 60) — 건너뜀", ticker, len(returns))
        return None

    # 최근 LOOKBACK_DAYS만 사용
    returns = returns.tail(LOOKBACK_DAYS)

    try:
        model = arch_model(returns, vol="Garch", p=1, q=1, mean="Constant", rescale=False)
        result = model.fit(disp="off", show_warning=False)
    except Exception as exc:
        logger.debug("[GARCH] %s: 피팅 실패 — %s", ticker, exc)
        return None

    # 변동성 예측
    try:
        forecasts = result.forecast(horizon=max(FORECAST_HORIZONS))
        variance_forecast = forecasts.variance.iloc[-1]  # 마지막 행의 예측
    except Exception as exc:
        logger.debug("[GARCH] %s: 예측 실패 — %s", ticker, exc)
        return None

    # 1d/3d/5d 변동성 (연환산)
    vol_forecasts: dict[str, float] = {}
    for h in FORECAST_HORIZONS:
        col = f"h.{h}"
        if col in variance_forecast.index:
            daily_vol = np.sqrt(variance_forecast[col])
            annual_vol = daily_vol * np.sqrt(252)
            vol_forecasts[f"vol_{h}d"] = float(annual_vol)
        else:
            vol_forecasts[f"vol_{h}d"] = float("nan")

    # 5일 변동성 기준으로 수준 분류
    vol_5d = vol_forecasts.get("vol_5d", float("nan"))
    vol_level = "Unknown"
    for level_name, (low, high) in VOL_LEVELS.items():
        if low <= vol_5d < high:
            vol_level = level_name
            break

    # 1년 변동성 분포 대비 백분위
    conditional_vol = result.conditional_volatility
    annual_cond_vol = conditional_vol * np.sqrt(252)
    if len(annual_cond_vol) > 0 and not np.isnan(vol_5d):
        percentile = float((annual_cond_vol < vol_5d).mean() * 100)
    else:
        percentile = float("nan")

    # 리스크 플래그 (상위 20% 또는 "높음" 이상)
    risk_flag = vol_level in ("높음", "매우높음") or percentile > 80

    last_date = returns.index[-1].strftime("%Y-%m-%d")

    return {
        "ticker": ticker,
        "date": forecast_date or last_date,
        "vol_1d": vol_forecasts["vol_1d"],
        "vol_3d": vol_forecasts["vol_3d"],
        "vol_5d": vol_forecasts["vol_5d"],
        "volatility_level": vol_level,
        "risk_flag": risk_flag,
        "percentile_vs_1y": percentile,
        "omega": float(result.params.get("omega", np.nan)),
        "alpha": float(result.params.get("alpha[1]", np.nan)),
        "beta": float(result.params.get("beta[1]", np.nan)),
    }


# ---------------------------------------------------------------------------
# 전체 종목 피팅
# ---------------------------------------------------------------------------

def fit_all_tickers(forecast_date: str | None = None) -> pd.DataFrame:
    """
    RAW_OHLCV_PATH의 모든 종목에 GARCH(1,1)을 피팅합니다.

    Returns:
        종목별 변동성 예측 결과 DataFrame
    """
    if not RAW_OHLCV_PATH.exists():
        logger.error("RAW_OHLCV_PATH가 존재하지 않습니다: %s", RAW_OHLCV_PATH)
        return pd.DataFrame()

    parquet_files = sorted(RAW_OHLCV_PATH.glob("*.parquet"))
    if not parquet_files:
        logger.error("OHLCV parquet 파일 없음: %s", RAW_OHLCV_PATH)
        return pd.DataFrame()

    logger.info("=== GARCH 변동성 모델 피팅 시작 (%d 종목) ===", len(parquet_files))

    results: list[dict] = []
    success_count = 0
    fail_count = 0

    for pf in parquet_files:
        ticker = pf.stem

        try:
            ohlcv_df = pd.read_parquet(pf)
        except Exception as exc:
            logger.debug("[GARCH] %s: 파일 로드 실패 — %s", ticker, exc)
            fail_count += 1
            continue

        if ohlcv_df.empty:
            fail_count += 1
            continue

        result = fit_single_ticker(ticker, ohlcv_df, forecast_date)
        if result is not None:
            results.append(result)
            success_count += 1
        else:
            fail_count += 1

    total = success_count + fail_count
    success_rate = success_count / total * 100 if total > 0 else 0

    logger.info(
        "=== GARCH 피팅 완료: %d/%d 성공 (%.1f%%) ===",
        success_count, total, success_rate,
    )

    if not results:
        logger.warning("피팅 성공 종목이 없습니다.")
        return pd.DataFrame()

    return pd.DataFrame(results)


def fit_all_tickers_window(train_end_date: str) -> pd.DataFrame:
    """
    Walk-Forward용: train_end_date까지의 OHLCV 데이터로 GARCH 피팅.

    Args:
        train_end_date: 학습 종료일 (YYYY-MM-DD). 이 날짜까지의 데이터만 사용.

    Returns:
        종목별 변동성 예측 결과 DataFrame (fit_all_tickers와 동일 스키마)
    """
    if not RAW_OHLCV_PATH.exists():
        logger.error("RAW_OHLCV_PATH가 존재하지 않습니다: %s", RAW_OHLCV_PATH)
        return pd.DataFrame()

    parquet_files = sorted(RAW_OHLCV_PATH.glob("*.parquet"))
    if not parquet_files:
        logger.error("OHLCV parquet 파일 없음: %s", RAW_OHLCV_PATH)
        return pd.DataFrame()

    end_ts = pd.Timestamp(train_end_date)
    logger.info("[GARCH-WF] 피팅 시작 (%d 종목, train_end=%s)", len(parquet_files), train_end_date)

    results: list[dict] = []
    for pf in parquet_files:
        ticker = pf.stem
        try:
            ohlcv_df = pd.read_parquet(pf)
        except Exception:
            continue
        if ohlcv_df.empty:
            continue

        # train_end_date까지만 필터링
        ohlcv_df.index = pd.to_datetime(ohlcv_df.index)
        ohlcv_df = ohlcv_df[ohlcv_df.index <= end_ts]

        if ohlcv_df.empty:
            continue

        result = fit_single_ticker(ticker, ohlcv_df, forecast_date=train_end_date)
        if result is not None:
            results.append(result)

    logger.info("[GARCH-WF] 피팅 완료: %d종목 성공", len(results))
    return pd.DataFrame(results) if results else pd.DataFrame()


# ---------------------------------------------------------------------------
# 결과 저장
# ---------------------------------------------------------------------------

def save_results(df: pd.DataFrame, forecast_date: str | None = None) -> str:
    """GARCH 결과를 Parquet과 joblib로 저장합니다."""
    date_str = forecast_date or datetime.now().strftime("%Y%m%d")

    # Parquet 저장
    PROCESSED_GARCH_PATH.mkdir(parents=True, exist_ok=True)
    parquet_path = PROCESSED_GARCH_PATH / f"garch_results_{date_str}.parquet"
    df.to_parquet(parquet_path, index=False, compression=PARQUET_COMPRESSION)
    logger.info("결과 저장: %s (%d행)", parquet_path, len(df))

    # 모델 파라미터 joblib 저장 (앙상블 입력용)
    MODELS_GARCH_PATH.mkdir(parents=True, exist_ok=True)
    model_path = MODELS_GARCH_PATH / f"garch_params_{date_str}.pkl"
    params_dict = {
        row["ticker"]: {
            "vol_1d": row["vol_1d"],
            "vol_3d": row["vol_3d"],
            "vol_5d": row["vol_5d"],
            "volatility_level": row["volatility_level"],
            "risk_flag": row["risk_flag"],
            "percentile_vs_1y": row["percentile_vs_1y"],
            "omega": row["omega"],
            "alpha": row["alpha"],
            "beta": row["beta"],
        }
        for _, row in df.iterrows()
    }
    joblib.dump(params_dict, model_path)
    logger.info("모델 파라미터 저장: %s", model_path)

    return str(model_path)


# ---------------------------------------------------------------------------
# 요약 출력
# ---------------------------------------------------------------------------

def display_summary(df: pd.DataFrame) -> None:
    """GARCH 결과 요약을 출력합니다."""
    if df.empty:
        print("\n[GARCH] 결과 없음")
        return

    print("\n" + "=" * 60)
    print("KOSPI 200 GARCH(1,1) 변동성 예측 결과")
    print("=" * 60)
    print(f"  총 종목 수     : {len(df)}")
    print(f"  평균 vol_5d    : {df['vol_5d'].mean():.2f}%")
    print(f"  중앙값 vol_5d  : {df['vol_5d'].median():.2f}%")

    # 변동성 수준 분포
    print("\n변동성 수준 분포:")
    level_counts = df["volatility_level"].value_counts()
    for level in ["낮음", "보통", "높음", "매우높음"]:
        count = level_counts.get(level, 0)
        pct = count / len(df) * 100
        print(f"  {level:>6}: {count:>4}종목 ({pct:>5.1f}%)")

    # 리스크 플래그
    risk_count = df["risk_flag"].sum()
    print(f"\n리스크 플래그    : {risk_count}종목 ({risk_count / len(df) * 100:.1f}%)")

    # 상위/하위 5종목
    print("\n--- 변동성 상위 5종목 ---")
    top5 = df.nlargest(5, "vol_5d")[["ticker", "vol_5d", "volatility_level", "percentile_vs_1y"]]
    print(top5.to_string(index=False))

    print("\n--- 변동성 하위 5종목 ---")
    bottom5 = df.nsmallest(5, "vol_5d")[["ticker", "vol_5d", "volatility_level", "percentile_vs_1y"]]
    print(bottom5.to_string(index=False))

    print("=" * 60 + "\n")


# ---------------------------------------------------------------------------
# 메인 엔트리포인트
# ---------------------------------------------------------------------------

def main() -> str | None:
    """GARCH 전체 파이프라인 실행. 모델 저장 경로를 반환."""
    logger.info("GARCH 변동성 모델 파이프라인 시작")

    df = fit_all_tickers()

    if df.empty:
        logger.error("GARCH 결과가 비어있습니다. 종료합니다.")
        return None

    display_summary(df)
    model_path = save_results(df)

    logger.info("GARCH 변동성 모델 파이프라인 완료")
    return model_path


if __name__ == "__main__":
    main()
