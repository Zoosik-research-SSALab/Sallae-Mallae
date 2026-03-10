"""
models/lstm_trainer.py
KOSPI 200 주가 패턴 인식을 위한 PyTorch LSTM 모델 트레이너.
섹터별(GICS 섹터) 이진 분류 모델을 학습합니다.
타겟: 5일 후 수익률 상승(1) / 비상승(0)
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.metrics import roc_auc_score, accuracy_score

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import PROCESSED_LSTM_PATH, MODELS_LSTM_PATH, TRAIN_END_DATE, TEST_START_DATE
from utils.logger import setup_logger

logger = setup_logger(__name__)


# ---------------------------------------------------------------------------
# 모델 정의
# ---------------------------------------------------------------------------

class StockLSTM(nn.Module):
    """KOSPI 200 주가 패턴 이진 분류 LSTM 모델."""

    def __init__(
        self,
        input_size: int = 5,
        hidden_size: int = 64,
        num_layers: int = 2,
        dropout: float = 0.2,
    ):
        super().__init__()
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout,
            batch_first=True,
        )
        self.dropout = nn.Dropout(dropout)
        self.fc = nn.Linear(hidden_size, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        lstm_out, _ = self.lstm(x)
        out = lstm_out[:, -1, :]
        out = self.dropout(out)
        return torch.sigmoid(self.fc(out)).squeeze(-1)


# ---------------------------------------------------------------------------
# 트레이너 클래스
# ---------------------------------------------------------------------------

class SectorLSTMTrainer:
    """특정 섹터에 대한 LSTM 모델 학습/추론 담당 클래스."""

    def __init__(self, sector_id: str, device: str | None = None):
        self.sector_id = sector_id
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = StockLSTM().to(self.device)
        self.history: dict[str, list[float]] = {"train_loss": [], "val_loss": []}

    def train(
        self,
        X_train: np.ndarray,
        y_train: np.ndarray,
        epochs: int = 50,
        batch_size: int = 64,
        patience: int = 10,
        lr: float = 1e-3,
    ) -> dict[str, list[float]]:
        """LSTM 모델 학습 (시간 순서 마지막 10%를 검증 세트로 사용)."""
        n_val = max(1, int(len(X_train) * 0.10))
        n_train = len(X_train) - n_val

        X_tr = torch.tensor(X_train[:n_train], dtype=torch.float32)
        y_tr = torch.tensor(y_train[:n_train], dtype=torch.float32)
        X_val = torch.tensor(X_train[n_train:], dtype=torch.float32)
        y_val = torch.tensor(y_train[n_train:], dtype=torch.float32)

        train_loader = DataLoader(
            TensorDataset(X_tr, y_tr),
            batch_size=batch_size,
            shuffle=True,
        )

        optimizer = torch.optim.Adam(self.model.parameters(), lr=lr)
        criterion = nn.BCELoss()

        best_val_loss = float("inf")
        best_state: dict | None = None
        no_improve = 0

        self.model.train()
        for epoch in range(1, epochs + 1):
            epoch_loss = 0.0
            for X_batch, y_batch in train_loader:
                X_batch = X_batch.to(self.device)
                y_batch = y_batch.to(self.device)

                optimizer.zero_grad()
                preds = self.model(X_batch)
                loss = criterion(preds, y_batch)
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item() * len(y_batch)

            train_loss = epoch_loss / n_train

            self.model.eval()
            with torch.no_grad():
                val_preds = self.model(X_val.to(self.device))
                val_loss = criterion(val_preds, y_val.to(self.device)).item()
            self.model.train()

            self.history["train_loss"].append(train_loss)
            self.history["val_loss"].append(val_loss)

            if epoch % 10 == 0 or epoch == 1:
                logger.info(
                    "Sector %s | Epoch %d/%d | train_loss=%.4f | val_loss=%.4f",
                    self.sector_id, epoch, epochs, train_loss, val_loss,
                )

            if val_loss < best_val_loss:
                best_val_loss = val_loss
                best_state = {k: v.cpu().clone() for k, v in self.model.state_dict().items()}
                no_improve = 0
            else:
                no_improve += 1
                if no_improve >= patience:
                    logger.info(
                        "Sector %s | Early stopping at epoch %d (patience=%d)",
                        self.sector_id, epoch, patience,
                    )
                    break

        if best_state is not None:
            self.model.load_state_dict(best_state)

        return self.history

    def predict(
        self, X_test: np.ndarray, threshold: float = 0.5
    ) -> tuple[np.ndarray, np.ndarray]:
        """테스트 데이터에 대해 확률과 이진 예측을 반환."""
        self.model.eval()
        X_tensor = torch.tensor(X_test, dtype=torch.float32).to(self.device)
        with torch.no_grad():
            probs = self.model(X_tensor).cpu().numpy()
        preds = (probs >= threshold).astype(np.int32)
        return probs, preds

    def save(self, path: str | Path) -> None:
        """모델 가중치와 메타데이터를 .pt 파일로 저장."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        torch.save(
            {
                "model_state_dict": self.model.state_dict(),
                "sector_id": self.sector_id,
            },
            path,
        )
        logger.info("Sector %s | Model saved -> %s", self.sector_id, path)

    @classmethod
    def load(
        cls, path: str | Path, sector_id: str, device: str | None = None
    ) -> "SectorLSTMTrainer":
        """저장된 .pt 파일에서 모델을 복원."""
        path = Path(path)
        trainer = cls(sector_id=sector_id, device=device)
        checkpoint = torch.load(path, map_location=trainer.device)
        trainer.model.load_state_dict(checkpoint["model_state_dict"])
        trainer.model.eval()
        logger.info("Sector %s | Model loaded <- %s", sector_id, path)
        return trainer


# ---------------------------------------------------------------------------
# 보조 함수
# ---------------------------------------------------------------------------

def _load_npz(npz_path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray | None, np.ndarray | None]:
    """npz 파일을 로드하여 X, y (+ 선택적 ticker, date) 반환."""
    data = np.load(npz_path, allow_pickle=True)
    X = data["X"].astype(np.float32)
    y = data["y"].astype(np.float32)
    tickers = data["tickers"] if "tickers" in data else None
    dates = data["dates"] if "dates" in data else None
    return X, y, tickers, dates


# ---------------------------------------------------------------------------
# 메인 학습 루프
# ---------------------------------------------------------------------------

MIN_SAMPLES = 100


def train_all_sectors() -> list[dict]:
    """모든 섹터 npz 파일을 순회하며 섹터별 LSTM 모델을 학습."""
    train_dir = PROCESSED_LSTM_PATH / "train"
    test_dir = PROCESSED_LSTM_PATH / "test"
    MODELS_LSTM_PATH.mkdir(parents=True, exist_ok=True)

    npz_files = sorted(train_dir.glob("sector_*.npz"))
    if not npz_files:
        logger.error("학습 데이터 없음: %s 에 sector_*.npz 파일이 존재하지 않습니다.", train_dir)
        return []

    all_results: list[dict] = []

    for npz_path in npz_files:
        stem = npz_path.stem
        sector_id = stem.replace("sector_", "")

        logger.info("=== 섹터 %s 학습 시작 ===", sector_id)

        X_train, y_train, _, _ = _load_npz(npz_path)

        nan_count = np.isnan(X_train).sum()
        if nan_count > 0:
            logger.warning("Sector %s | X_train NaN %d개 → 0으로 대체", sector_id, nan_count)
            X_train = np.nan_to_num(X_train, nan=0.0)

        if len(X_train) < MIN_SAMPLES:
            logger.warning(
                "Sector %s | 샘플 수 %d < %d (최소 기준) — 건너뜀",
                sector_id, len(X_train), MIN_SAMPLES,
            )
            continue

        logger.info(
            "Sector %s | 학습 샘플: %d | X shape: %s | y 양성 비율: %.1f%%",
            sector_id, len(X_train), X_train.shape, y_train.mean() * 100,
        )

        trainer = SectorLSTMTrainer(sector_id=sector_id)
        trainer.train(X_train, y_train)

        model_path = MODELS_LSTM_PATH / f"sector_{sector_id}_model.pt"
        trainer.save(model_path)

        test_npz = test_dir / npz_path.name
        if not test_npz.exists():
            alt = test_dir / f"sector_{sector_id}.npz"
            if alt.exists():
                test_npz = alt

        if test_npz.exists():
            X_test, y_test, tickers, dates = _load_npz(test_npz)
            logger.info(
                "Sector %s | 테스트 샘플: %d | y 양성 비율: %.1f%%",
                sector_id, len(X_test), y_test.mean() * 100,
            )
            probs, preds = trainer.predict(X_test)
            all_results.append({
                "sector_id": sector_id,
                "y_true": y_test,
                "probs": probs,
                "preds": preds,
                "tickers": tickers,
                "dates": dates,
            })
        else:
            logger.warning("Sector %s | 테스트 파일 없음: %s", sector_id, test_npz)

    return all_results


# ---------------------------------------------------------------------------
# 평가 및 출력
# ---------------------------------------------------------------------------

def evaluate_and_display(all_results: list[dict]) -> dict:
    """모든 섹터의 예측 결과를 집계하고 요약을 출력."""
    if not all_results:
        logger.warning("평가할 결과가 없습니다.")
        return {}

    all_y_true = np.concatenate([r["y_true"] for r in all_results])
    all_probs = np.concatenate([r["probs"] for r in all_results])
    all_preds = np.concatenate([r["preds"] for r in all_results])

    overall_acc = accuracy_score(all_y_true, all_preds)
    try:
        overall_auc = roc_auc_score(all_y_true, all_probs)
    except ValueError:
        overall_auc = float("nan")

    print("\n" + "=" * 60)
    print("KOSPI 200 LSTM 예측 결과")
    print("=" * 60)
    print(f"  학습 종료일  : {TRAIN_END_DATE}")
    print(f"  예측 시작일  : {TEST_START_DATE}")
    print(f"  총 테스트 샘플: {len(all_y_true):,}")
    print(f"  전체 정확도  : {overall_acc:.4f} ({overall_acc*100:.2f}%)")
    print(f"  전체 AUC-ROC : {overall_auc:.4f}")
    print(f"  실제 양성 비율: {all_y_true.mean()*100:.1f}%")
    print(f"  예측 양성 비율: {all_preds.mean()*100:.1f}%")

    print("\n" + "-" * 60)
    print("섹터별 결과:")
    print(f"  {'섹터ID':>20}  {'샘플수':>8}  {'정확도':>8}  {'AUC-ROC':>8}")
    print("-" * 60)

    sector_metrics: list[dict] = []
    for r in all_results:
        sid = r["sector_id"]
        y_t = r["y_true"]
        prbs = r["probs"]
        pdss = r["preds"]
        acc = accuracy_score(y_t, pdss)
        try:
            auc = roc_auc_score(y_t, prbs)
        except ValueError:
            auc = float("nan")
        sector_metrics.append({"sector_id": sid, "n": len(y_t), "acc": acc, "auc": auc})
        print(f"  {sid:>20}  {len(y_t):>8,}  {acc:>8.4f}  {auc:>8.4f}")

    print("=" * 60 + "\n")

    return {
        "total_samples": int(len(all_y_true)),
        "overall_accuracy": float(overall_acc),
        "overall_auc": float(overall_auc),
        "positive_rate_actual": float(all_y_true.mean()),
        "positive_rate_pred": float(all_preds.mean()),
        "sector_metrics": sector_metrics,
    }


# ---------------------------------------------------------------------------
# 예측 결과 저장
# ---------------------------------------------------------------------------

def save_predictions(all_results: list[dict]) -> None:
    """집계 예측을 Parquet으로 저장."""
    rows = []
    for r in all_results:
        n = len(r["y_true"])
        tickers = r["tickers"] if r["tickers"] is not None else [None] * n
        dates = r["dates"] if r["dates"] is not None else [None] * n
        for i in range(n):
            rows.append({
                "sector_id": r["sector_id"],
                "ticker": tickers[i],
                "date": dates[i],
                "y_true": int(r["y_true"][i]),
                "prob": float(r["probs"][i]),
                "pred": int(r["preds"][i]),
            })

    if not rows:
        logger.warning("저장할 예측 데이터가 없습니다.")
        return

    df = pd.DataFrame(rows)
    out_path = PROCESSED_LSTM_PATH / "lstm_predictions_2021_01.parquet"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(out_path, index=False)
    logger.info("예측 결과 저장 완료: %s (%d 행)", out_path, len(df))


# ---------------------------------------------------------------------------
# Walk-Forward 학습 및 예측
# ---------------------------------------------------------------------------

def train_and_predict_window(
    train_end_date: str,
    predict_start: str,
    predict_end: str,
) -> pd.DataFrame | None:
    """
    Walk-Forward용: 지정된 날짜 범위로 LSTM 학습 및 예측.

    train/ 및 test/ 디렉토리의 모든 NPZ 파일을 로드하고,
    날짜 기준으로 재분할하여 학습 및 예측을 수행합니다.

    Args:
        train_end_date: 학습 종료일 (YYYY-MM-DD)
        predict_start: 예측 시작일 (YYYY-MM-DD)
        predict_end: 예측 종료일 (YYYY-MM-DD)

    Returns:
        예측 DataFrame (date, ticker, prob, y_true) 또는 None
    """
    train_dir = PROCESSED_LSTM_PATH / "train"
    test_dir = PROCESSED_LSTM_PATH / "test"

    # 모든 NPZ 파일 수집 (train + test)
    all_npz: list[Path] = []
    if train_dir.exists():
        all_npz.extend(sorted(train_dir.glob("sector_*.npz")))
    if test_dir.exists():
        all_npz.extend(sorted(test_dir.glob("sector_*.npz")))

    if not all_npz:
        logger.warning("[LSTM-WF] NPZ 파일 없음")
        return None

    train_end_ts = pd.Timestamp(train_end_date)
    predict_start_ts = pd.Timestamp(predict_start)
    predict_end_ts = pd.Timestamp(predict_end)

    all_predictions: list[dict] = []
    sectors_trained = 0

    # 섹터별로 처리 (같은 sector_id를 가진 train/test NPZ를 합침)
    sector_data: dict[str, list[tuple[np.ndarray, np.ndarray, np.ndarray | None, np.ndarray | None]]] = {}

    for npz_path in all_npz:
        sector_id = npz_path.stem.replace("sector_", "")
        X, y, tickers, dates = _load_npz(npz_path)

        if dates is None:
            logger.debug("[LSTM-WF] 섹터 %s: 날짜 메타데이터 없음 — 건너뜀", sector_id)
            continue

        if sector_id not in sector_data:
            sector_data[sector_id] = []
        sector_data[sector_id].append((X, y, tickers, dates))

    if not sector_data:
        logger.warning("[LSTM-WF] 날짜 메타데이터가 있는 섹터가 없습니다.")
        return None

    for sector_id, data_list in sector_data.items():
        # 같은 섹터의 모든 NPZ 합치기
        X_all = np.concatenate([d[0] for d in data_list])
        y_all = np.concatenate([d[1] for d in data_list])
        tickers_all = np.concatenate([d[2] for d in data_list]) if all(d[2] is not None for d in data_list) else None
        dates_all = np.concatenate([d[3] for d in data_list])

        # 날짜 기준 분할
        dates_ts = pd.to_datetime(dates_all)
        train_mask = dates_ts <= train_end_ts
        test_mask = (dates_ts >= predict_start_ts) & (dates_ts <= predict_end_ts)

        X_train = X_all[train_mask]
        y_train = y_all[train_mask]
        X_test = X_all[test_mask]
        y_test = y_all[test_mask]

        if len(X_train) < MIN_SAMPLES or len(X_test) == 0:
            continue

        # NaN 처리
        X_train = np.nan_to_num(X_train, nan=0.0)
        X_test = np.nan_to_num(X_test, nan=0.0)

        # 학습
        trainer = SectorLSTMTrainer(sector_id=sector_id)
        trainer.train(X_train, y_train)

        # 예측
        probs, preds = trainer.predict(X_test)
        sectors_trained += 1

        # 결과 수집
        test_tickers = tickers_all[test_mask] if tickers_all is not None else [None] * len(X_test)
        test_dates = dates_all[test_mask]

        for i in range(len(X_test)):
            all_predictions.append({
                "date": test_dates[i],
                "ticker": test_tickers[i],
                "prob": float(probs[i]),
                "y_true": int(y_test[i]),
                "sector_id": sector_id,
            })

    if not all_predictions:
        logger.warning("[LSTM-WF] 예측 결과 없음")
        return None

    result = pd.DataFrame(all_predictions)
    result["date"] = pd.to_datetime(result["date"])

    logger.info(
        "[LSTM-WF] 완료: %d섹터, %d예측 (%s ~ %s)",
        sectors_trained, len(result), predict_start, predict_end,
    )
    return result


# ---------------------------------------------------------------------------
# 엔트리포인트
# ---------------------------------------------------------------------------

def main() -> str | None:
    """LSTM 섹터 모델 전체 학습 및 예측 실행. 모델 저장 경로를 반환."""
    train_dir = PROCESSED_LSTM_PATH / "train"

    if not train_dir.exists() or not any(train_dir.glob("sector_*.npz")):
        print(
            f"\n[오류] 학습 데이터를 찾을 수 없습니다.\n"
            f"  경로: {train_dir}\n"
            f"  패턴: sector_*.npz\n\n"
            "먼저 LSTM 시퀀스 빌드 스크립트를 실행하세요:\n"
            "  python features/build_lstm_sequences.py\n"
        )
        return None

    logger.info("LSTM 섹터 모델 학습 시작 | 학습 종료일: %s | 예측 시작일: %s", TRAIN_END_DATE, TEST_START_DATE)
    logger.info("PyTorch 버전: %s | CUDA 사용 가능: %s", torch.__version__, torch.cuda.is_available())

    all_results = train_all_sectors()

    if not all_results:
        logger.error("학습 완료된 섹터가 없습니다. 종료합니다.")
        return None

    evaluate_and_display(all_results)
    save_predictions(all_results)

    return str(MODELS_LSTM_PATH)


if __name__ == "__main__":
    main()
