"""
domains/stock/price_predictor.py
주가 예측 모델 학습 — LightGBM 기반.
"""
import sys
from pathlib import Path

# 프로젝트 루트를 sys.path에 추가 (models/, features/ 임포트용)
_PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from models.lgbm_trainer import main as train_lgbm_main


def train_price_predictor() -> str:
    """LightGBM 모델 학습을 실행하고 모델 저장 경로를 반환합니다."""
    train_lgbm_main()

    from config import MODELS_LGBM_PATH
    from datetime import datetime
    today_str = datetime.now().strftime("%Y%m%d")
    model_path = MODELS_LGBM_PATH / f"lgbm_model_{today_str}.pkl"
    return str(model_path)
