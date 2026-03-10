"""
models/lgbm_trainer.py
LightGBM 3-class direction model trainer for KOSPI 200 stocks.

Trains on all tickers together (MultiIndex: date, ticker).
Predicts January 2021 and prints evaluation results.
Python 3.10+ compatible.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Optional

from lightgbm import LGBMClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

from config import (
    PROCESSED_LGBM_PATH,
    MODELS_LGBM_PATH,
    TRAIN_END_DATE,
    TEST_START_DATE,
    TEST_END_DATE,
    PARQUET_COMPRESSION,
)
from utils.logger import setup_logger

logger = setup_logger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
LGBM_FEATURES = [
    # Technical (price-normalized)
    "rsi_14", "macd_norm", "macd_signal_norm", "macd_hist_norm",
    "bb_percent_b", "bb_width",
    "close_to_ma5", "close_to_ma20", "close_to_ma60",
    "volume_ratio_5d", "volume_ratio_20d",
    "momentum_5d", "momentum_20d",
    # Supply (may have NaN for pre-2020 data)
    "foreign_net_buy_1d", "foreign_net_buy_5d", "foreign_net_buy_20d",
    "institution_net_buy_1d", "institution_net_buy_5d",
    # Macro
    "kospi200_return_1d", "usd_krw_change",
    "sp500_return_1d", "nasdaq_return_1d", "dxy_change",
    "vix", "vix_change", "us_bond_10y", "us_bond_10y_change", "sox_return_1d",
    # Regime (market state)
    "vix_regime", "vix_ma20_ratio", "bond_trend_60d",
    "market_momentum_20d", "volatility_regime",
    # Meta (categorical)
    "stock_id", "cluster_id", "market_cap_rank",
]

TARGET = "return_5d_class"  # 0=down, 1=sideways, 2=up

CATEGORICAL_FEATURES = ["stock_id", "cluster_id"]

LGBM_PARAMS = {
    "objective": "multiclass",
    "num_class": 3,
    "num_leaves": 31,
    "learning_rate": 0.05,
    "n_estimators": 500,
    "min_child_samples": 20,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "reg_alpha": 0.1,
    "reg_lambda": 0.1,
    "random_state": 42,
    "n_jobs": -1,
    "verbose": -1,
}

CLASS_NAMES = {0: "down", 1: "sideways", 2: "up"}


# ---------------------------------------------------------------------------
# Helper: encode categorical columns
# ---------------------------------------------------------------------------
def _encode_categoricals(df: pd.DataFrame, cat_cols: list[str]) -> pd.DataFrame:
    """Convert specified columns to pandas Categorical dtype."""
    df = df.copy()
    for col in cat_cols:
        if col in df.columns:
            df[col] = df[col].astype("category")
    return df


# ---------------------------------------------------------------------------
# Helper: median imputation for NaN
# ---------------------------------------------------------------------------
def _compute_medians(df: pd.DataFrame, feature_cols: list[str]) -> dict:
    """Compute per-column medians for NaN imputation (ignores categoricals)."""
    medians = {}
    for col in feature_cols:
        if col in df.columns and col not in CATEGORICAL_FEATURES:
            median_val = df[col].median()
            medians[col] = median_val if not pd.isna(median_val) else 0.0
    return medians


def _apply_medians(df: pd.DataFrame, medians: dict) -> pd.DataFrame:
    """Fill NaN values using precomputed medians."""
    df = df.copy()
    for col, val in medians.items():
        if col in df.columns:
            df[col] = df[col].fillna(val)
    return df


# ---------------------------------------------------------------------------
# LGBMTrainer
# ---------------------------------------------------------------------------
class LGBMTrainer:
    """LightGBM multiclass trainer for stock direction prediction."""

    def __init__(
        self,
        features: list[str] | None = None,
        target: str = TARGET,
        categorical_features: list[str] | None = None,
        params: dict | None = None,
    ) -> None:
        self.features = features if features is not None else LGBM_FEATURES.copy()
        self.target = target
        self.categorical_features = categorical_features if categorical_features is not None else CATEGORICAL_FEATURES.copy()
        self.params = params if params is not None else LGBM_PARAMS.copy()
        self.model: Optional[LGBMClassifier] = None
        self._medians: dict = {}

    def _prepare_X(self, df: pd.DataFrame) -> pd.DataFrame:
        """Select feature columns, impute NaN, encode categoricals."""
        available = [c for c in self.features if c in df.columns]
        X = df[available].copy()
        X = _apply_medians(X, self._medians)
        X = _encode_categoricals(X, self.categorical_features)
        return X

    def train(self, train_df: pd.DataFrame) -> None:
        """
        Train LightGBM multiclass model on the full training DataFrame.

        Args:
            train_df: DataFrame with feature columns and TARGET column.
                      Index may be MultiIndex (date, ticker) or flat.
        """
        logger.info("Preparing training data ...")

        # Compute medians from training data for NaN imputation
        self._medians = _compute_medians(train_df, self.features)

        X_train = self._prepare_X(train_df)
        y_train = train_df[self.target].astype(int)

        # Identify categorical columns that exist in X_train
        cat_cols_present = [c for c in self.categorical_features if c in X_train.columns]

        logger.info(
            "Training shape: %s  |  target distribution: %s",
            X_train.shape,
            y_train.value_counts().to_dict(),
        )

        self.model = LGBMClassifier(**self.params)
        self.model.fit(
            X_train,
            y_train,
            categorical_feature=cat_cols_present if cat_cols_present else "auto",
        )
        logger.info("Training complete.")

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Generate predictions for the given DataFrame.

        Returns a DataFrame with columns:
            predicted_class, confidence,
            prob_down (class 0), prob_sideways (class 1), prob_up (class 2)
        """
        if self.model is None:
            raise RuntimeError("Model is not trained. Call train() first.")

        X = self._prepare_X(df)
        proba = self.model.predict_proba(X)  # shape (n, 3)
        pred_class = proba.argmax(axis=1)
        confidence = proba.max(axis=1)

        result = pd.DataFrame(
            {
                "predicted_class": pred_class,
                "confidence": confidence,
                "prob_down": proba[:, 0],
                "prob_sideways": proba[:, 1],
                "prob_up": proba[:, 2],
            },
            index=df.index,
        )
        return result

    def get_feature_importance(self, top_n: int = 10) -> pd.DataFrame:
        """
        Return top N features by LightGBM gain importance.

        Returns:
            DataFrame with columns [feature, importance] sorted descending.
        """
        if self.model is None:
            raise RuntimeError("Model is not trained. Call train() first.")

        importances = self.model.feature_importances_
        feature_names = self.model.feature_name_

        imp_df = pd.DataFrame(
            {"feature": feature_names, "importance": importances}
        ).sort_values("importance", ascending=False)

        return imp_df.head(top_n).reset_index(drop=True)

    def save(self, path: str | Path) -> None:
        """Save the trainer (model + medians) with joblib."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({"model": self.model, "medians": self._medians, "features": self.features}, path)
        logger.info("Model saved to %s", path)

    @classmethod
    def load(cls, path: str | Path) -> "LGBMTrainer":
        """Load a previously saved trainer."""
        path = Path(path)
        payload = joblib.load(path)
        trainer = cls(features=payload["features"])
        trainer.model = payload["model"]
        trainer._medians = payload["medians"]
        logger.info("Model loaded from %s", path)
        return trainer


# ---------------------------------------------------------------------------
# Walk-forward validation
# ---------------------------------------------------------------------------
def walk_forward_validation(
    train_df: pd.DataFrame,
    n_months_train: int = 12,
    n_months_test: int = 1,
) -> list[dict]:
    """
    Simplified walk-forward validation.

    Slides a window of n_months_train training months, tests on the next
    n_months_test month, and records accuracy.

    Args:
        train_df: Full training DataFrame with MultiIndex (date, ticker).
        n_months_train: Number of months in each training window.
        n_months_test: Number of months in each test window (default 1).

    Returns:
        List of dicts with keys: month, accuracy, n_samples, predictions_df.
    """
    # Ensure date level is datetime
    if isinstance(train_df.index, pd.MultiIndex):
        dates = train_df.index.get_level_values("date")
    else:
        dates = pd.to_datetime(train_df.index)

    min_date = pd.Timestamp(dates.min()).to_period("M")
    max_date = pd.Timestamp(dates.max()).to_period("M")

    results = []
    current_train_start = min_date

    while True:
        train_end = current_train_start + (n_months_train - 1)
        test_start = train_end + 1
        test_end = test_start + (n_months_test - 1)

        if test_end > max_date:
            break

        # Slice training and test windows
        train_mask = _period_mask(train_df, current_train_start, train_end)
        test_mask = _period_mask(train_df, test_start, test_end)

        fold_train = train_df[train_mask]
        fold_test = train_df[test_mask]

        if fold_train.empty or fold_test.empty:
            current_train_start += 1
            continue

        trainer = LGBMTrainer()
        trainer.train(fold_train)
        preds_df = trainer.predict(fold_test)
        y_true = fold_test[TARGET].astype(int).values
        y_pred = preds_df["predicted_class"].values
        acc = accuracy_score(y_true, y_pred)

        test_month = str(test_start)
        logger.info("Walk-forward month=%s  accuracy=%.4f  n=%d", test_month, acc, len(y_true))

        results.append(
            {
                "month": test_month,
                "accuracy": acc,
                "n_samples": len(y_true),
                "predictions_df": preds_df,
            }
        )

        current_train_start += 1

    return results


def _period_mask(df: pd.DataFrame, start_period: pd.Period, end_period: pd.Period) -> pd.Series:
    """Return boolean mask selecting rows within [start_period, end_period]."""
    if isinstance(df.index, pd.MultiIndex):
        dates = pd.to_datetime(df.index.get_level_values("date"))
    else:
        dates = pd.to_datetime(df.index)

    start_ts = start_period.to_timestamp(how="S")
    end_ts = end_period.to_timestamp(how="E")
    return (dates >= start_ts) & (dates <= end_ts)


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------
def evaluate_predictions(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_prob: np.ndarray,
) -> dict:
    """
    Compute classification evaluation metrics.

    Args:
        y_true: True class labels (int array, values 0/1/2).
        y_pred: Predicted class labels (int array).
        y_prob: Predicted probabilities (n x 3 array).

    Returns:
        Dict with keys:
            accuracy, direction_accuracy, IC,
            per_class_report (str), confusion_matrix (ndarray).
    """
    accuracy = accuracy_score(y_true, y_pred)

    # Direction accuracy: exclude sideways (class 1), compare up vs down
    binary_mask = (y_true != 1) & (y_pred != 1)
    if binary_mask.sum() > 0:
        direction_accuracy = accuracy_score(y_true[binary_mask], y_pred[binary_mask])
    else:
        direction_accuracy = float("nan")

    # Information coefficient: Spearman correlation between predicted class and true class
    # Higher predicted class (2=up) should correlate with higher true class
    if len(y_true) > 1:
        ic = float(pd.Series(y_pred).corr(pd.Series(y_true), method="spearman"))
    else:
        ic = float("nan")

    per_class_report = classification_report(
        y_true, y_pred, target_names=["down", "sideways", "up"], zero_division=0
    )
    conf_matrix = confusion_matrix(y_true, y_pred, labels=[0, 1, 2])

    return {
        "accuracy": accuracy,
        "direction_accuracy": direction_accuracy,
        "IC": ic,
        "per_class_report": per_class_report,
        "confusion_matrix": conf_matrix,
    }


# ---------------------------------------------------------------------------
# Walk-Forward 예측 (단일 윈도우)
# ---------------------------------------------------------------------------
def train_and_predict_window(
    train_end_date: str,
    predict_start: str,
    predict_end: str,
) -> pd.DataFrame | None:
    """
    Walk-Forward용: 지정된 날짜 범위로 LightGBM 학습 및 예측.

    Args:
        train_end_date: 학습 종료일 (YYYY-MM-DD)
        predict_start: 예측 시작일 (YYYY-MM-DD)
        predict_end: 예측 종료일 (YYYY-MM-DD)

    Returns:
        예측 DataFrame (date, ticker, prob_up, prob_down, prob_sideways,
        predicted_label, confidence, true_class) 또는 None
    """
    # 전체 피처 파일 로드
    features_path = PROCESSED_LGBM_PATH / "lgbm_features.parquet"
    if not features_path.exists():
        logger.warning("[LGBM-WF] 피처 파일 없음: %s", features_path)
        return None

    full_df = pd.read_parquet(features_path)

    # MultiIndex (date, ticker) 처리
    if isinstance(full_df.index, pd.MultiIndex):
        dates = pd.to_datetime(full_df.index.get_level_values("date"))
    else:
        full_df = full_df.reset_index()
        dates = pd.to_datetime(full_df["date"])
        full_df = full_df.set_index(["date", "ticker"])
        dates = pd.to_datetime(full_df.index.get_level_values("date"))

    train_end_ts = pd.Timestamp(train_end_date)
    predict_start_ts = pd.Timestamp(predict_start)
    predict_end_ts = pd.Timestamp(predict_end)

    # 학습/테스트 분할
    train_mask = dates <= train_end_ts
    test_mask = (dates >= predict_start_ts) & (dates <= predict_end_ts)

    train_df = full_df[train_mask]
    test_df = full_df[test_mask]

    if train_df.empty or test_df.empty:
        logger.warning("[LGBM-WF] 데이터 부족 (train=%d, test=%d)", len(train_df), len(test_df))
        return None

    # TARGET 컬럼 확인
    if TARGET not in train_df.columns or TARGET not in test_df.columns:
        logger.warning("[LGBM-WF] 타겟 컬럼 없음: %s", TARGET)
        return None

    logger.info(
        "[LGBM-WF] train=%d rows (~ %s), test=%d rows (%s ~ %s)",
        len(train_df), train_end_date, len(test_df), predict_start, predict_end,
    )

    # 학습
    trainer = LGBMTrainer()
    trainer.train(train_df)

    # 예측
    preds_df = trainer.predict(test_df)

    # 결과 DataFrame 구성 (MultiIndex → flat columns)
    result = preds_df.copy()
    if isinstance(result.index, pd.MultiIndex):
        result = result.reset_index()

    # date, ticker 컬럼 확보
    if "date" not in result.columns and isinstance(test_df.index, pd.MultiIndex):
        idx = test_df.index.to_frame(index=False)
        result["date"] = idx["date"].values
        result["ticker"] = idx["ticker"].values

    result["date"] = pd.to_datetime(result["date"])

    # true_class 추가
    if TARGET in test_df.columns:
        if isinstance(test_df.index, pd.MultiIndex):
            result["true_class"] = test_df[TARGET].astype(int).values
        else:
            result["true_class"] = test_df[TARGET].astype(int).values

    result["predicted_label"] = result["predicted_class"].map(CLASS_NAMES)

    logger.info("[LGBM-WF] 예측 완료: %d행", len(result))
    return result


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> None:
    """
    1. Load lgbm_train.parquet and lgbm_test.parquet.
    2. Train on full training period (up to TRAIN_END_DATE).
    3. Predict on test period (2021-01).
    4. Print evaluation results and feature importances.
    5. Save model and predictions.
    """
    logger.info("=== LightGBM Trainer - KOSPI 200 Direction Classification ===")

    # ------------------------------------------------------------------
    # 1. Load data
    # ------------------------------------------------------------------
    train_path = PROCESSED_LGBM_PATH / "lgbm_train.parquet"
    test_path = PROCESSED_LGBM_PATH / "lgbm_test.parquet"

    if not train_path.exists():
        logger.error("Training data not found: %s", train_path)
        raise FileNotFoundError(f"Training data not found: {train_path}")
    if not test_path.exists():
        logger.error("Test data not found: %s", test_path)
        raise FileNotFoundError(f"Test data not found: {test_path}")

    logger.info("Loading training data from %s ...", train_path)
    train_df = pd.read_parquet(train_path)

    logger.info("Loading test data from %s ...", test_path)
    test_df = pd.read_parquet(test_path)

    # ------------------------------------------------------------------
    # 2. Summarise loaded data
    # ------------------------------------------------------------------
    # Resolve date level
    if isinstance(train_df.index, pd.MultiIndex):
        train_dates = pd.to_datetime(train_df.index.get_level_values("date"))
        train_tickers = train_df.index.get_level_values("ticker")
    else:
        train_dates = pd.to_datetime(train_df.index)
        train_tickers = train_df.get("ticker", pd.Series(dtype=str))

    n_tickers = train_tickers.nunique()
    date_min = train_dates.min().strftime("%Y-%m-%d")
    date_max = train_dates.max().strftime("%Y-%m-%d")

    logger.info("Training data shape : %s", train_df.shape)
    logger.info("Unique tickers      : %d", n_tickers)
    logger.info("Date range          : %s ~ %s", date_min, date_max)
    logger.info("Test period         : %s ~ %s", TEST_START_DATE, TEST_END_DATE)

    print("\n" + "=" * 60)
    print("  LGBM Trainer - KOSPI 200 Direction Classification")
    print("=" * 60)
    print(f"  Training data shape : {train_df.shape}")
    print(f"  Unique tickers      : {n_tickers}")
    print(f"  Date range          : {date_min} ~ {date_max}")
    print(f"  Test period         : {TEST_START_DATE} ~ {TEST_END_DATE}")
    print("=" * 60 + "\n")

    # ------------------------------------------------------------------
    # 3. Train model on full training data
    # ------------------------------------------------------------------
    logger.info("Training LightGBM model on full training period ...")
    trainer = LGBMTrainer()
    trainer.train(train_df)

    # ------------------------------------------------------------------
    # 4. Predict on test set (2021-01)
    # ------------------------------------------------------------------
    logger.info("Predicting on test set ...")
    preds_df = trainer.predict(test_df)

    # Attach ground truth for evaluation
    y_true = test_df[TARGET].astype(int).values
    y_pred = preds_df["predicted_class"].values
    y_prob = preds_df[["prob_down", "prob_sideways", "prob_up"]].values

    # ------------------------------------------------------------------
    # 5. Evaluate
    # ------------------------------------------------------------------
    metrics = evaluate_predictions(y_true, y_pred, y_prob)

    print("\n--- Prediction Distribution (2021-01) ---")
    pred_counts = pd.Series(y_pred).value_counts().sort_index()
    for cls_id, cnt in pred_counts.items():
        print(f"  {CLASS_NAMES.get(int(cls_id), str(cls_id)):>10s} (class {cls_id}): {cnt:5d}  "
              f"({cnt / len(y_pred) * 100:.1f}%)")

    print(f"\n--- Evaluation Metrics ---")
    print(f"  Accuracy            : {metrics['accuracy']:.4f}")
    print(f"  Direction Accuracy  : {metrics['direction_accuracy']:.4f}")
    print(f"  IC (Spearman)       : {metrics['IC']:.4f}")
    print(f"\n--- Per-Class Report ---")
    print(metrics["per_class_report"])
    print("--- Confusion Matrix (rows=true, cols=pred) ---")
    print("  Labels: [down, sideways, up]")
    print(metrics["confusion_matrix"])

    # ------------------------------------------------------------------
    # 6. Feature importance (top 10)
    # ------------------------------------------------------------------
    imp_df = trainer.get_feature_importance(top_n=10)
    print("\n--- Top 10 Feature Importances ---")
    for _, row in imp_df.iterrows():
        print(f"  {row['feature']:<35s}  {row['importance']:.0f}")

    # ------------------------------------------------------------------
    # 7. Sample predictions (10 rows)
    # ------------------------------------------------------------------
    if isinstance(test_df.index, pd.MultiIndex):
        sample_index = test_df.index[:10]
    else:
        sample_index = test_df.index[:10]

    sample_preds = preds_df.loc[sample_index].copy()
    sample_preds["true_class"] = test_df.loc[sample_index, TARGET].astype(int)
    sample_preds["predicted_label"] = sample_preds["predicted_class"].map(CLASS_NAMES)
    sample_preds["true_label"] = sample_preds["true_class"].map(CLASS_NAMES)

    print("\n--- Sample Predictions (first 10 rows) ---")
    display_cols = ["true_label", "predicted_label", "confidence", "prob_down", "prob_sideways", "prob_up"]
    print(sample_preds[display_cols].to_string())

    # ------------------------------------------------------------------
    # 8. Save model
    # ------------------------------------------------------------------
    MODELS_LGBM_PATH.mkdir(parents=True, exist_ok=True)
    today_str = datetime.now().strftime("%Y%m%d")
    model_path = MODELS_LGBM_PATH / f"lgbm_model_{today_str}.pkl"
    trainer.save(model_path)
    logger.info("Model saved: %s", model_path)
    print(f"\nModel saved: {model_path}")

    # ------------------------------------------------------------------
    # 9. Save predictions
    # ------------------------------------------------------------------
    PROCESSED_LGBM_PATH.mkdir(parents=True, exist_ok=True)
    pred_save_path = PROCESSED_LGBM_PATH / "lgbm_predictions_2021_01.parquet"

    # Merge predictions with true labels
    preds_out = preds_df.copy()
    preds_out["true_class"] = test_df[TARGET].astype(int)
    preds_out["predicted_label"] = preds_out["predicted_class"].map(CLASS_NAMES)
    preds_out["true_label"] = preds_out["true_class"].map(CLASS_NAMES)

    preds_out.to_parquet(pred_save_path, compression=PARQUET_COMPRESSION)
    logger.info("Predictions saved: %s", pred_save_path)
    print(f"Predictions saved: {pred_save_path}")

    print("\nDone.")

    return str(model_path)


if __name__ == "__main__":
    main()
