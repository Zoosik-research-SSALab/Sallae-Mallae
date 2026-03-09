"""
models/cluster_lgbm_trainer.py
클러스터별 LightGBM 트레이너.

기존 lgbm_trainer.py와의 차이:
  - 타겟: label {-1, 0, 1} (클러스터 내 상대순위)
  - 3-class: -1=하위20%, 0=중립, 1=상위20%
  - 재무 PIT 피처 포함
"""

from __future__ import annotations

import sys
from datetime import datetime
from pathlib import Path
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent))

import joblib
import numpy as np
import pandas as pd
import lightgbm as lgb
from lightgbm import LGBMClassifier
from sklearn.metrics import accuracy_score, classification_report

from config import MODELS_CLUSTER_PATH, TARGET_HORIZON_LONG, TOP_PCT, BOTTOM_PCT, PARQUET_COMPRESSION
from utils.logger import setup_logger

logger = setup_logger(__name__)

# 클러스터1 피처 목록 (build_cluster1_features.py와 동기화)
CLUSTER1_FEATURES = [
    # 기술적
    "rsi_14", "macd", "macd_signal", "macd_hist",
    "bb_upper", "bb_middle", "bb_lower",
    "ma_5", "ma_20", "ma_60",
    "volume_ratio_5d", "volume_ratio_20d",
    "momentum_5d", "momentum_20d",
    # 수급
    "foreign_net_buy_1d", "foreign_net_buy_5d", "foreign_net_buy_20d",
    "institution_net_buy_1d", "institution_net_buy_5d",
    # 매크로 (클러스터1 가중)
    "sox_return_1d", "nasdaq_return_1d", "usd_krw_change",
    "kospi200_return_1d", "vix",
    # 재무 PIT
    "per", "pbr", "roe", "debt_ratio", "revenue_growth",
    # 메타
    "stock_id", "market_cap_rank",
]

CATEGORICAL_FEATURES = ["stock_id"]

TARGET = "label"

CLASS_NAMES = {-1: "bottom20", 0: "neutral", 1: "top20"}

LGBM_PARAMS = {
    "objective":          "multiclass",
    "num_class":          3,
    "num_leaves":         31,
    "learning_rate":      0.05,
    "n_estimators":       500,
    "min_child_samples":  20,
    "subsample":          0.8,
    "colsample_bytree":   0.8,
    "reg_alpha":          0.1,
    "reg_lambda":         0.1,
    "random_state":       42,
    "n_jobs":             -1,
    "verbose":            -1,
}


def _label_to_lgbm_class(labels: pd.Series) -> pd.Series:
    """LightGBM은 0-based 정수 클래스가 필요하므로 {-1,0,1} → {0,1,2}로 변환."""
    return labels.map({-1: 0, 0: 1, 1: 2}).astype(int)


def _lgbm_class_to_label(classes: np.ndarray) -> np.ndarray:
    """{0,1,2} → {-1,0,1}로 역변환."""
    mapping = {0: -1, 1: 0, 2: 1}
    return np.vectorize(mapping.get)(classes)


class ClusterLGBMTrainer:
    """
    클러스터별 LightGBM 3-class 트레이너.

    타겟: {-1=하위20%, 0=중립, 1=상위20%}
    """

    def __init__(
        self,
        cluster_id: int = 1,
        features: list[str] | None = None,
        target_horizon: int = TARGET_HORIZON_LONG,
        top_pct: float = TOP_PCT,
        bottom_pct: float = BOTTOM_PCT,
        params: dict | None = None,
    ) -> None:
        self.cluster_id = cluster_id
        self.features = features if features is not None else CLUSTER1_FEATURES
        self.target_horizon = target_horizon
        self.top_pct = top_pct
        self.bottom_pct = bottom_pct
        self.params = params if params is not None else LGBM_PARAMS.copy()
        self.model: Optional[LGBMClassifier] = None
        self._medians: dict = {}

    def _prepare_X(self, df: pd.DataFrame) -> pd.DataFrame:
        available = [c for c in self.features if c in df.columns]
        X = df[available].copy()
        # object dtype 컬럼을 float으로 변환 (재무 PIT None 값 처리)
        for col in X.columns:
            if col not in CATEGORICAL_FEATURES and X[col].dtype == object:
                X[col] = pd.to_numeric(X[col], errors="coerce")
        # NaN 보정 (학습 median으로)
        for col, val in self._medians.items():
            if col in X.columns:
                X[col] = X[col].fillna(val)
        # 카테고리 인코딩
        for col in CATEGORICAL_FEATURES:
            if col in X.columns:
                X[col] = X[col].astype("category")
        return X

    def train(self, train_df: pd.DataFrame) -> None:
        """
        학습 DataFrame으로 모델을 훈련합니다.

        Args:
            train_df: MultiIndex (date, ticker) 피처 + TARGET 컬럼 DataFrame
        """
        logger.info("[CLUSTER%d] 학습 시작: shape=%s", self.cluster_id, train_df.shape)

        # 결측치 median 계산
        numeric_features = [c for c in self.features if c in train_df.columns and c not in CATEGORICAL_FEATURES]
        self._medians = {
            col: float(train_df[col].median()) if not pd.isna(train_df[col].median()) else 0.0
            for col in numeric_features
        }

        X_train = self._prepare_X(train_df)
        y_train = _label_to_lgbm_class(train_df[TARGET])

        cat_cols = [c for c in CATEGORICAL_FEATURES if c in X_train.columns]

        dist = y_train.value_counts().to_dict()
        logger.info(
            "[CLUSTER%d] 학습 shape=%s | 클래스 분포(0-based)=%s",
            self.cluster_id, X_train.shape, dist,
        )

        self.model = LGBMClassifier(**self.params)
        self.model.fit(
            X_train, y_train,
            categorical_feature=cat_cols if cat_cols else "auto",
        )
        logger.info("[CLUSTER%d] 학습 완료", self.cluster_id)

    def predict(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        예측 결과 DataFrame을 반환합니다.

        Returns:
            DataFrame: predicted_label(-1/0/1), confidence, prob_bottom20, prob_neutral, prob_top20
        """
        if self.model is None:
            raise RuntimeError("모델이 학습되지 않았습니다. train()을 먼저 호출하세요.")

        X = self._prepare_X(df)
        proba = self.model.predict_proba(X)  # (n, 3)
        pred_class_0based = proba.argmax(axis=1)
        pred_labels = _lgbm_class_to_label(pred_class_0based)

        return pd.DataFrame(
            {
                "predicted_label": pred_labels,
                "confidence":      proba.max(axis=1),
                "prob_bottom20":   proba[:, 0],
                "prob_neutral":    proba[:, 1],
                "prob_top20":      proba[:, 2],
            },
            index=df.index,
        )

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """원시 확률 행렬 (n, 3) 반환. 스태킹 앙상블용."""
        if self.model is None:
            raise RuntimeError("모델 미학습")
        X_prep = self._prepare_X(X)
        return self.model.predict_proba(X_prep)

    def get_feature_importance(self, top_n: int = 15) -> pd.DataFrame:
        if self.model is None:
            raise RuntimeError("모델 미학습")
        imp = pd.DataFrame({
            "feature": self.model.feature_name_,
            "importance": self.model.feature_importances_,
        }).sort_values("importance", ascending=False)
        return imp.head(top_n).reset_index(drop=True)

    def save(self, path: str | Path | None = None) -> Path:
        """모델을 joblib으로 저장합니다."""
        if path is None:
            MODELS_CLUSTER_PATH.mkdir(parents=True, exist_ok=True)
            today = datetime.now().strftime("%Y%m%d")
            path = MODELS_CLUSTER_PATH / f"cluster{self.cluster_id}_lgbm_{today}.pkl"
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump({
            "model":       self.model,
            "medians":     self._medians,
            "features":    self.features,
            "cluster_id":  self.cluster_id,
            "top_pct":     self.top_pct,
            "bottom_pct":  self.bottom_pct,
        }, path)
        logger.info("[CLUSTER%d] 모델 저장: %s", self.cluster_id, path)
        return path

    @classmethod
    def load(cls, path: str | Path) -> "ClusterLGBMTrainer":
        """저장된 모델을 로드합니다."""
        payload = joblib.load(path)
        trainer = cls(
            cluster_id=payload["cluster_id"],
            features=payload["features"],
            top_pct=payload.get("top_pct", TOP_PCT),
            bottom_pct=payload.get("bottom_pct", BOTTOM_PCT),
        )
        trainer.model = payload["model"]
        trainer._medians = payload["medians"]
        logger.info("[CLUSTER%d] 모델 로드: %s", trainer.cluster_id, path)
        return trainer

    def evaluate(self, test_df: pd.DataFrame) -> dict:
        """검증 DataFrame에 대해 평가 지표를 계산합니다."""
        preds = self.predict(test_df)
        y_true = test_df[TARGET].astype(int).values
        y_pred = preds["predicted_label"].values

        # Top20% precision
        pred_top = y_pred == 1
        true_top = y_true == 1
        top20_precision = float((pred_top & true_top).sum() / pred_top.sum()) if pred_top.sum() > 0 else float("nan")

        # IC (Spearman)
        ic = float(pd.Series(y_pred.astype(float)).corr(pd.Series(y_true.astype(float)), method="spearman"))

        accuracy = accuracy_score(y_true, y_pred)

        report = classification_report(
            y_true, y_pred,
            labels=[-1, 0, 1],
            target_names=["bottom20", "neutral", "top20"],
            zero_division=0,
        )

        return {
            "accuracy":        accuracy,
            "top20_precision": top20_precision,
            "ic":              ic,
            "report":          report,
            "n_samples":       len(y_true),
        }


# ---------------------------------------------------------------------------
# Main (단독 실행)
# ---------------------------------------------------------------------------

def main() -> None:
    """
    클러스터1 피처를 로드하여 LightGBM 모델을 학습하고 저장합니다.
    """
    from config import PROCESSED_CLUSTER1_PATH, VALID_START_DATE, VALID_END_DATE

    logger.info("=== 클러스터1 LightGBM 트레이너 ===")

    train_path = PROCESSED_CLUSTER1_PATH / "cluster1_train.parquet"
    valid_path = PROCESSED_CLUSTER1_PATH / "cluster1_valid.parquet"

    if not train_path.exists():
        logger.error("학습 데이터 없음: %s", train_path)
        logger.error("먼저 실행: python features/build_cluster1_features.py")
        raise FileNotFoundError(str(train_path))

    logger.info("학습 데이터 로드: %s", train_path)
    train_df = pd.read_parquet(train_path)

    trainer = ClusterLGBMTrainer(cluster_id=1)
    trainer.train(train_df)

    # 모델 저장
    model_path = trainer.save()
    print(f"\n모델 저장: {model_path}")

    # 검증 평가
    if valid_path.exists():
        logger.info("검증 데이터 평가: %s", valid_path)
        valid_df = pd.read_parquet(valid_path)
        metrics = trainer.evaluate(valid_df)

        print("\n=== 검증 성과 ===")
        print(f"  정확도:          {metrics['accuracy']:.4f}")
        print(f"  Top20% Precision: {metrics['top20_precision']:.4f}  ← 목표: >55%")
        print(f"  IC (Spearman):    {metrics['ic']:.4f}  ← 목표: >0.05")
        print(f"  샘플 수:          {metrics['n_samples']}")
        print(f"\n{metrics['report']}")

        # Top10 피처 중요도
        imp = trainer.get_feature_importance(10)
        print("\n=== Top 10 피처 중요도 ===")
        for _, row in imp.iterrows():
            print(f"  {row['feature']:<35s}  {row['importance']:.0f}")
    else:
        logger.warning("검증 데이터 없음: %s", valid_path)

    print("\n완료.")


if __name__ == "__main__":
    main()
