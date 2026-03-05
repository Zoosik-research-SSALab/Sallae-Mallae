from pathlib import Path


def train_price_predictor() -> str:
    artifact_dir = Path(__file__).resolve().parents[3] / "artifacts"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    model_path = artifact_dir / "stock_price_model.joblib"
    model_path.write_text("dummy stock model", encoding="utf-8")
    return str(model_path)
