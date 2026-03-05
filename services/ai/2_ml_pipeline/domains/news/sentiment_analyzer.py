from pathlib import Path


def train_sentiment_analyzer() -> str:
    artifact_dir = Path(__file__).resolve().parents[3] / "artifacts"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    model_path = artifact_dir / "news_sentiment_model.joblib"
    model_path.write_text("dummy news model", encoding="utf-8")
    return str(model_path)
