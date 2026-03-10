"""
models/ensemble_trainer.py
스태킹 앙상블 메타 모델 학습.

LightGBM·LSTM·GARCH 3개 모델의 예측값을 메타 피처로 수집하여
LogisticRegression 메타 모델을 학습합니다.

메타 피처:
  - lgbm_up_prob, lgbm_down_prob: LightGBM 상승/하락 확률
  - lstm_score: LSTM 상승 확률
  - garch_vol_5d: GARCH 5일 변동성 예측
  - garch_percentile: 1년 분포 내 위치
  + 파생: signal_agreement, confidence_gap, high_risk
"""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import (
    PROCESSED_LGBM_PATH,
    PROCESSED_LSTM_PATH,
    PROCESSED_GARCH_PATH,
    PROCESSED_ENSEMBLE_PATH,
    MODELS_ENSEMBLE_PATH,
    PARQUET_COMPRESSION,
)
from utils.logger import setup_logger

logger = setup_logger(__name__)


# ---------------------------------------------------------------------------
# 메타 피처 수집
# ---------------------------------------------------------------------------

def _load_lgbm_predictions() -> pd.DataFrame | None:
    """LightGBM 예측 결과를 로드합니다."""
    path = PROCESSED_LGBM_PATH / "lgbm_predictions_2021_01.parquet"
    if not path.exists():
        logger.warning("[ENSEMBLE] LightGBM 예측 파일 없음: %s", path)
        return None

    df = pd.read_parquet(path)

    # MultiIndex (date, ticker) → 플랫 컬럼
    if isinstance(df.index, pd.MultiIndex):
        df = df.reset_index()

    # 날짜 정규화
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

    # ticker 컬럼 확보
    if "ticker" not in df.columns and df.index.name == "ticker":
        df = df.reset_index()

    rename_map = {}
    if "prob_up" in df.columns:
        rename_map["prob_up"] = "lgbm_up_prob"
    if "prob_down" in df.columns:
        rename_map["prob_down"] = "lgbm_down_prob"
    if "confidence" in df.columns:
        rename_map["confidence"] = "lgbm_confidence"
    if "true_class" in df.columns:
        rename_map["true_class"] = "lgbm_true_class"

    df = df.rename(columns=rename_map)

    keep_cols = ["date", "ticker"]
    for col in ["lgbm_up_prob", "lgbm_down_prob", "lgbm_confidence", "lgbm_true_class"]:
        if col in df.columns:
            keep_cols.append(col)

    logger.info("[ENSEMBLE] LightGBM 예측 로드: %d행", len(df))
    return df[keep_cols]


def _load_lstm_predictions() -> pd.DataFrame | None:
    """LSTM 예측 결과를 로드합니다."""
    path = PROCESSED_LSTM_PATH / "lstm_predictions_2021_01.parquet"
    if not path.exists():
        logger.warning("[ENSEMBLE] LSTM 예측 파일 없음: %s", path)
        return None

    df = pd.read_parquet(path)

    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")

    rename_map = {"prob": "lstm_score", "y_true": "lstm_true"}
    df = df.rename(columns=rename_map)

    keep_cols = ["date", "ticker"]
    for col in ["lstm_score", "lstm_true"]:
        if col in df.columns:
            keep_cols.append(col)

    logger.info("[ENSEMBLE] LSTM 예측 로드: %d행", len(df))
    return df[keep_cols]


def _load_garch_results() -> pd.DataFrame | None:
    """GARCH 결과를 로드합니다 (최신 파일)."""
    if not PROCESSED_GARCH_PATH.exists():
        logger.warning("[ENSEMBLE] GARCH 결과 디렉토리 없음: %s", PROCESSED_GARCH_PATH)
        return None

    garch_files = sorted(PROCESSED_GARCH_PATH.glob("garch_results_*.parquet"))
    if not garch_files:
        logger.warning("[ENSEMBLE] GARCH 결과 파일 없음")
        return None

    df = pd.read_parquet(garch_files[-1])

    rename_map = {
        "vol_5d": "garch_vol_5d",
        "percentile_vs_1y": "garch_percentile",
        "risk_flag": "garch_risk_flag",
    }
    df = df.rename(columns=rename_map)

    keep_cols = ["ticker"]
    for col in ["garch_vol_5d", "garch_percentile", "garch_risk_flag"]:
        if col in df.columns:
            keep_cols.append(col)

    logger.info("[ENSEMBLE] GARCH 결과 로드: %d종목 (%s)", len(df), garch_files[-1].name)
    return df[keep_cols]


# ---------------------------------------------------------------------------
# 메타 피처 병합 + 파생 피처 생성
# ---------------------------------------------------------------------------

META_FEATURES = [
    "lgbm_up_prob",
    "lgbm_down_prob",
    "lstm_score",
    "garch_vol_5d",
    "garch_percentile",
    "signal_agreement",
    "confidence_gap",
    "high_risk",
]


def build_meta_features() -> pd.DataFrame | None:
    """
    3개 모델의 예측값을 병합하고 파생 메타 피처를 생성합니다.

    Returns:
        메타 피처 DataFrame (date, ticker, meta features, target)
    """
    lgbm_df = _load_lgbm_predictions()
    lstm_df = _load_lstm_predictions()
    garch_df = _load_garch_results()

    if lgbm_df is None and lstm_df is None:
        logger.error("[ENSEMBLE] LightGBM과 LSTM 예측이 모두 없습니다. 앙상블 불가.")
        return None

    # 기준 DataFrame 결정 (LightGBM 우선)
    if lgbm_df is not None and lstm_df is not None:
        merged = pd.merge(lgbm_df, lstm_df, on=["date", "ticker"], how="inner")
    elif lgbm_df is not None:
        merged = lgbm_df.copy()
        merged["lstm_score"] = 0.5  # 기본값
    else:
        merged = lstm_df.copy()
        merged["lgbm_up_prob"] = 1 / 3
        merged["lgbm_down_prob"] = 1 / 3

    # GARCH는 ticker 기준 left join (날짜 무관, 최신 스냅샷)
    if garch_df is not None:
        merged = pd.merge(merged, garch_df, on="ticker", how="left")
    else:
        merged["garch_vol_5d"] = np.nan
        merged["garch_percentile"] = np.nan
        merged["garch_risk_flag"] = False

    # 결측 처리
    merged["lgbm_up_prob"] = merged.get("lgbm_up_prob", pd.Series(1 / 3, index=merged.index)).fillna(1 / 3)
    merged["lgbm_down_prob"] = merged.get("lgbm_down_prob", pd.Series(1 / 3, index=merged.index)).fillna(1 / 3)
    merged["lstm_score"] = merged.get("lstm_score", pd.Series(0.5, index=merged.index)).fillna(0.5)
    merged["garch_vol_5d"] = merged["garch_vol_5d"].fillna(merged["garch_vol_5d"].median() if merged["garch_vol_5d"].notna().any() else 30.0)
    merged["garch_percentile"] = merged["garch_percentile"].fillna(50.0)
    merged["garch_risk_flag"] = merged.get("garch_risk_flag", pd.Series(False, index=merged.index)).fillna(False)

    # --- 파생 메타 피처 ---

    # signal_agreement: LightGBM과 LSTM이 같은 방향을 가리키는지 (0~1)
    lgbm_bullish = merged["lgbm_up_prob"] > merged["lgbm_down_prob"]
    lstm_bullish = merged["lstm_score"] > 0.5
    merged["signal_agreement"] = (lgbm_bullish == lstm_bullish).astype(float)

    # confidence_gap: LightGBM 최대 확률과 LSTM 확률의 차이
    merged["confidence_gap"] = abs(merged["lgbm_up_prob"] - merged["lstm_score"])

    # high_risk: GARCH 리스크 플래그 또는 변동성 상위
    merged["high_risk"] = merged["garch_risk_flag"].astype(float)

    # 타겟 결정 (LightGBM true_class 기반: 2=상승→1, 0=하락→0, 1=횡보→제외)
    if "lgbm_true_class" in merged.columns:
        # 3-class → 2-class: 상승(2)→1, 하락(0)→0, 횡보(1)→제외
        merged["target"] = merged["lgbm_true_class"].map({0: 0, 1: np.nan, 2: 1})
    elif "lstm_true" in merged.columns:
        merged["target"] = merged["lstm_true"]
    else:
        logger.warning("[ENSEMBLE] 타겟 컬럼을 찾을 수 없습니다.")
        merged["target"] = np.nan

    logger.info("[ENSEMBLE] 메타 피처 병합 완료: %d행, %d컬럼", len(merged), len(merged.columns))
    return merged


# ---------------------------------------------------------------------------
# 메타 모델 학습
# ---------------------------------------------------------------------------

def train_meta_model(meta_df: pd.DataFrame) -> tuple[LogisticRegression, dict] | None:
    """
    LogisticRegression 메타 모델을 학습합니다.

    시간 순서를 유지하여 마지막 20%를 테스트로 사용합니다.

    Returns:
        (trained_model, metrics_dict) 또는 None
    """
    # 타겟이 있는 행만 사용
    valid = meta_df.dropna(subset=["target"]).copy()
    valid["target"] = valid["target"].astype(int)

    if len(valid) < 50:
        logger.error("[ENSEMBLE] 유효 샘플 부족: %d < 50", len(valid))
        return None

    # 시간 순서 유지 분할
    n_test = max(1, int(len(valid) * 0.20))
    n_train = len(valid) - n_test

    train_data = valid.iloc[:n_train]
    test_data = valid.iloc[n_train:]

    # 사용 가능한 메타 피처만 선택
    available_features = [f for f in META_FEATURES if f in valid.columns]
    if not available_features:
        logger.error("[ENSEMBLE] 사용 가능한 메타 피처가 없습니다.")
        return None

    X_train = train_data[available_features].values
    y_train = train_data["target"].values
    X_test = test_data[available_features].values
    y_test = test_data["target"].values

    # NaN/inf 안전 처리
    X_train = np.nan_to_num(X_train, nan=0.0, posinf=1.0, neginf=0.0)
    X_test = np.nan_to_num(X_test, nan=0.0, posinf=1.0, neginf=0.0)

    logger.info(
        "[ENSEMBLE] 학습 데이터: %d행 (양성 %.1f%%) | 테스트: %d행 (양성 %.1f%%)",
        len(y_train), y_train.mean() * 100,
        len(y_test), y_test.mean() * 100,
    )

    # LogisticRegression 학습
    model = LogisticRegression(C=1.0, max_iter=1000, random_state=42)
    model.fit(X_train, y_train)

    # 예측 및 평가
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)

    logger.info("[ENSEMBLE] 메타 모델 정확도: %.4f (%.2f%%)", acc, acc * 100)

    # 피처 중요도 (계수)
    coef_dict = {f: float(c) for f, c in zip(available_features, model.coef_[0])}
    logger.info("[ENSEMBLE] 피처 계수: %s", coef_dict)

    metrics = {
        "accuracy": float(acc),
        "train_samples": int(len(y_train)),
        "test_samples": int(len(y_test)),
        "train_positive_rate": float(y_train.mean()),
        "test_positive_rate": float(y_test.mean()),
        "features_used": available_features,
        "coefficients": coef_dict,
    }

    return model, metrics


# ---------------------------------------------------------------------------
# 앙상블 예측 생성
# ---------------------------------------------------------------------------

def generate_ensemble_predictions(
    meta_df: pd.DataFrame,
    model: LogisticRegression,
) -> pd.DataFrame:
    """
    메타 모델로 앙상블 예측을 생성합니다.

    출력 컬럼:
      - ensemble_result: 예측 클래스 (0=하락, 1=상승)
      - ensemble_confidence: 예측 확률
      - signal_agreement: LightGBM-LSTM 신호 일치도
      - confidence_gap: 신뢰도 차이
      - risk_flag: GARCH 리스크 플래그
    """
    available_features = [f for f in META_FEATURES if f in meta_df.columns]
    X = meta_df[available_features].values
    X = np.nan_to_num(X, nan=0.0, posinf=1.0, neginf=0.0)

    probs = model.predict_proba(X)[:, 1]
    preds = model.predict(X)

    result = meta_df[["date", "ticker"]].copy()
    result["ensemble_result"] = preds
    result["ensemble_confidence"] = probs
    result["signal_agreement"] = meta_df["signal_agreement"].values
    result["confidence_gap"] = meta_df["confidence_gap"].values
    result["risk_flag"] = meta_df["high_risk"].values.astype(bool)

    if "target" in meta_df.columns:
        result["true_label"] = meta_df["target"].values

    return result


# ---------------------------------------------------------------------------
# 저장
# ---------------------------------------------------------------------------

def save_ensemble(
    model: LogisticRegression,
    metrics: dict,
    predictions: pd.DataFrame,
) -> str:
    """앙상블 모델, 메트릭, 예측을 저장합니다."""
    today_str = datetime.now().strftime("%Y%m%d")

    # 모델 저장
    MODELS_ENSEMBLE_PATH.mkdir(parents=True, exist_ok=True)
    model_path = MODELS_ENSEMBLE_PATH / f"meta_model_{today_str}.pkl"
    joblib.dump({"model": model, "metrics": metrics}, model_path)
    logger.info("[ENSEMBLE] 모델 저장: %s", model_path)

    # 예측 결과 저장
    PROCESSED_ENSEMBLE_PATH.mkdir(parents=True, exist_ok=True)
    pred_path = PROCESSED_ENSEMBLE_PATH / f"ensemble_predictions_{today_str}.parquet"
    predictions.to_parquet(pred_path, index=False, compression=PARQUET_COMPRESSION)
    logger.info("[ENSEMBLE] 예측 저장: %s (%d행)", pred_path, len(predictions))

    return str(model_path)


# ---------------------------------------------------------------------------
# 요약 출력
# ---------------------------------------------------------------------------

def display_summary(metrics: dict, predictions: pd.DataFrame) -> None:
    """앙상블 결과 요약을 출력합니다."""
    print("\n" + "=" * 60)
    print("스태킹 앙상블 메타 모델 결과")
    print("=" * 60)
    print(f"  학습 샘플      : {metrics['train_samples']:,}")
    print(f"  테스트 샘플    : {metrics['test_samples']:,}")
    print(f"  메타 모델 정확도: {metrics['accuracy']:.4f} ({metrics['accuracy']*100:.2f}%)")
    print(f"  사용 피처      : {', '.join(metrics['features_used'])}")

    print("\n피처 계수:")
    for feat, coef in metrics["coefficients"].items():
        print(f"  {feat:>20}: {coef:>8.4f}")

    # 예측 분포
    print(f"\n예측 분포:")
    print(f"  상승 예측: {(predictions['ensemble_result'] == 1).sum():,} ({(predictions['ensemble_result'] == 1).mean()*100:.1f}%)")
    print(f"  하락 예측: {(predictions['ensemble_result'] == 0).sum():,} ({(predictions['ensemble_result'] == 0).mean()*100:.1f}%)")

    if "true_label" in predictions.columns:
        valid = predictions.dropna(subset=["true_label"])
        if len(valid) > 0:
            full_acc = accuracy_score(valid["true_label"], valid["ensemble_result"])
            print(f"\n전체 정확도    : {full_acc:.4f} ({full_acc*100:.2f}%)")

    # 신호 일치도 분포
    agree_rate = predictions["signal_agreement"].mean()
    risk_rate = predictions["risk_flag"].mean()
    print(f"\n신호 일치율    : {agree_rate*100:.1f}%")
    print(f"리스크 플래그  : {risk_rate*100:.1f}%")
    print("=" * 60 + "\n")


# ---------------------------------------------------------------------------
# 메인 엔트리포인트
# ---------------------------------------------------------------------------

def main() -> str | None:
    """앙상블 메타 모델 전체 파이프라인 실행."""
    logger.info("=== 스태킹 앙상블 메타 모델 학습 시작 ===")

    # 1. 메타 피처 수집
    meta_df = build_meta_features()
    if meta_df is None:
        return None

    # 2. 메타 모델 학습
    result = train_meta_model(meta_df)
    if result is None:
        return None

    model, metrics = result

    # 3. 전체 데이터에 대한 앙상블 예측 생성
    predictions = generate_ensemble_predictions(meta_df, model)

    # 4. 요약 출력
    display_summary(metrics, predictions)

    # 5. 저장
    model_path = save_ensemble(model, metrics, predictions)

    logger.info("=== 스태킹 앙상블 메타 모델 학습 완료 ===")
    return model_path


if __name__ == "__main__":
    main()
