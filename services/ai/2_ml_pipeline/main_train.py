"""
main_train.py — ML 파이프라인 메인 진입점
LightGBM, LSTM, GARCH 모델 학습을 실행합니다.
"""
import sys
import argparse
from pathlib import Path

# 프로젝트 루트를 sys.path에 추가
_PROJECT_ROOT = Path(__file__).resolve().parent
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from domains.stock.price_predictor import train_price_predictor
from domains.news.sentiment_analyzer import train_sentiment_analyzer


def main() -> None:
    parser = argparse.ArgumentParser(description="ML 파이프라인")
    parser.add_argument("--skip-features", action="store_true", help="피처 생성 건너뜀")
    parser.add_argument("--only-lgbm", action="store_true", help="LightGBM만 실행")
    parser.add_argument("--only-lstm", action="store_true", help="LSTM만 실행")
    parser.add_argument("--only-garch", action="store_true", help="GARCH만 실행")
    args = parser.parse_args()

    only_flags = [args.only_lgbm, args.only_lstm, args.only_garch]
    run_all = not any(only_flags)

    # --- LightGBM ---
    if run_all or args.only_lgbm:
        if not args.skip_features:
            print("[pipeline] LightGBM 피처 생성 시작...")
            from features.build_lgbm_features import main as build_lgbm_features
            build_lgbm_features()
            print("[pipeline] LightGBM 피처 생성 완료")

        stock_model_path = train_price_predictor()
        print(f"[train] stock model: {stock_model_path}")

    # --- LSTM ---
    if run_all or args.only_lstm:
        if not args.skip_features:
            print("[pipeline] LSTM 시퀀스 생성 시작...")
            from features.build_lstm_sequences import main as build_lstm_sequences
            build_lstm_sequences()
            print("[pipeline] LSTM 시퀀스 생성 완료")

        print("[pipeline] LSTM 모델 학습 시작...")
        from models.lstm_trainer import main as train_lstm
        lstm_model_path = train_lstm()
        print(f"[train] lstm models: {lstm_model_path}")

    # --- GARCH ---
    if run_all or args.only_garch:
        print("[pipeline] GARCH 변동성 모델 피팅 시작...")
        from models.garch_trainer import main as train_garch
        garch_model_path = train_garch()
        print(f"[train] garch model: {garch_model_path}")

    # --- 뉴스 감성 분석 (스켈레톤) ---
    if run_all:
        news_model_path = train_sentiment_analyzer()
        print(f"[train] news model: {news_model_path}")

    print("[train] done")


if __name__ == "__main__":
    main()
