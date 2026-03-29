from pathlib import Path

import joblib


def train_sentiment_analyzer() -> str:
    artifact_dir = Path(__file__).resolve().parents[3] / "artifacts"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    model_path = artifact_dir / "news_sentiment_model.joblib"
    joblib.dump({"model": None, "status": "dummy"}, model_path)
    return str(model_path)
