"""
models/packet_builder.py
계층적 통합 패킷 구성 모듈.

앙상블 결과(Layer1)와 개별 모델 출력(Layer2)을 계층적으로 통합한
JSON 패킷을 종목별로 생성하여 AI 에이전트에 전달합니다.

Layer 1 (앙상블 종합):
  result, confidence, signal_agreement, confidence_gap, risk_flag

Layer 2 (개별 모델 상세):
  lgbm: direction_prob, predicted_class, confidence, key_features
  lstm: pattern_score, sequence_confidence
  garch: volatility_forecast, volatility_level, risk_flag, percentile_vs_1y

신호 충돌 시나리오 5가지 자동 분류 + 에이전트 해석 힌트 생성.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))

from config import (
    PROCESSED_LGBM_PATH,
    PROCESSED_LSTM_PATH,
    PROCESSED_GARCH_PATH,
    PROCESSED_ENSEMBLE_PATH,
    PROCESSED_PACKETS_PATH,
    MODELS_LGBM_PATH,
    PARQUET_COMPRESSION,
)
from utils.logger import setup_logger

logger = setup_logger(__name__)

# ---------------------------------------------------------------------------
# 신호 충돌 시나리오 정의
# ---------------------------------------------------------------------------
SCENARIOS = {
    "full_agreement_bullish": {
        "label": "완전 일치 (상승)",
        "hint": "모든 모델이 상승을 가리킵니다. 높은 신뢰도로 매수 신호입니다.",
    },
    "full_agreement_bearish": {
        "label": "하락 일치",
        "hint": "모든 모델이 하락을 가리킵니다. 매도 또는 관망을 권합니다.",
    },
    "partial_conflict": {
        "label": "부분 충돌",
        "hint": "일부 모델 간 신호가 엇갈립니다. 앙상블 결과를 우선하되, 개별 모델 근거를 참고하세요.",
    },
    "garch_warning": {
        "label": "GARCH 경고",
        "hint": "방향성 모델은 상승을 가리키지만 변동성이 높습니다. 포지션 크기 축소를 고려하세요.",
    },
    "full_conflict": {
        "label": "완전 충돌",
        "hint": "모델 간 신호가 완전히 엇갈립니다. 관망을 권하며, 추가 정보를 기다리세요.",
    },
}


# ---------------------------------------------------------------------------
# 데이터 로더
# ---------------------------------------------------------------------------

def _load_lgbm_predictions() -> pd.DataFrame | None:
    """LightGBM 예측 결과 로드."""
    path = PROCESSED_LGBM_PATH / "lgbm_predictions_2021_01.parquet"
    if not path.exists():
        logger.warning("[PACKET] LightGBM 예측 없음: %s", path)
        return None
    df = pd.read_parquet(path)
    if isinstance(df.index, pd.MultiIndex):
        df = df.reset_index()
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    logger.info("[PACKET] LightGBM 예측 로드: %d행", len(df))
    return df


def _load_lgbm_feature_importance() -> dict[str, float]:
    """LightGBM 최신 모델의 피처 중요도 로드."""
    if not MODELS_LGBM_PATH.exists():
        return {}
    model_files = sorted(MODELS_LGBM_PATH.glob("lgbm_model_*.pkl"))
    if not model_files:
        return {}
    try:
        payload = joblib.load(model_files[-1])
        model = payload["model"]
        features = payload["features"]
        importances = model.feature_importances_
        fi = dict(zip(features, importances))
        # 상위 5개만
        return dict(sorted(fi.items(), key=lambda x: x[1], reverse=True)[:5])
    except Exception as exc:
        logger.debug("[PACKET] LightGBM 피처 중요도 로드 실패: %s", exc)
        return {}


def _load_lstm_predictions() -> pd.DataFrame | None:
    """LSTM 예측 결과 로드."""
    path = PROCESSED_LSTM_PATH / "lstm_predictions_2021_01.parquet"
    if not path.exists():
        logger.warning("[PACKET] LSTM 예측 없음: %s", path)
        return None
    df = pd.read_parquet(path)
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    logger.info("[PACKET] LSTM 예측 로드: %d행", len(df))
    return df


def _load_garch_results() -> pd.DataFrame | None:
    """GARCH 최신 결과 로드."""
    if not PROCESSED_GARCH_PATH.exists():
        logger.warning("[PACKET] GARCH 디렉토리 없음")
        return None
    files = sorted(PROCESSED_GARCH_PATH.glob("garch_results_*.parquet"))
    if not files:
        logger.warning("[PACKET] GARCH 결과 파일 없음")
        return None
    df = pd.read_parquet(files[-1])
    logger.info("[PACKET] GARCH 결과 로드: %d종목 (%s)", len(df), files[-1].name)
    return df


def _load_ensemble_predictions() -> pd.DataFrame | None:
    """앙상블 예측 결과 로드."""
    if not PROCESSED_ENSEMBLE_PATH.exists():
        logger.warning("[PACKET] 앙상블 디렉토리 없음")
        return None
    files = sorted(PROCESSED_ENSEMBLE_PATH.glob("ensemble_predictions_*.parquet"))
    if not files:
        logger.warning("[PACKET] 앙상블 예측 파일 없음")
        return None
    df = pd.read_parquet(files[-1])
    if "date" in df.columns:
        df["date"] = pd.to_datetime(df["date"]).dt.strftime("%Y-%m-%d")
    logger.info("[PACKET] 앙상블 예측 로드: %d행 (%s)", len(df), files[-1].name)
    return df


# ---------------------------------------------------------------------------
# 신호 충돌 시나리오 분류
# ---------------------------------------------------------------------------

def classify_scenario(
    ensemble_result: int,
    lgbm_bullish: bool,
    lstm_bullish: bool,
    garch_risk: bool,
) -> str:
    """
    신호 충돌 시나리오를 5가지 중 하나로 분류합니다.

    Returns:
        시나리오 키 (SCENARIOS 딕셔너리의 키)
    """
    all_bullish = lgbm_bullish and lstm_bullish
    all_bearish = not lgbm_bullish and not lstm_bullish
    signals_agree = lgbm_bullish == lstm_bullish

    if all_bullish and not garch_risk:
        return "full_agreement_bullish"
    if all_bearish:
        return "full_agreement_bearish"
    if all_bullish and garch_risk:
        return "garch_warning"
    if not signals_agree and ensemble_result == 1:
        return "partial_conflict"
    if not signals_agree:
        return "full_conflict"

    return "partial_conflict"


# ---------------------------------------------------------------------------
# 패킷 생성
# ---------------------------------------------------------------------------

def _safe_float(val) -> float | None:
    """NaN/None을 JSON 호환 None으로 변환."""
    if val is None:
        return None
    try:
        f = float(val)
        if np.isnan(f) or np.isinf(f):
            return None
        return round(f, 6)
    except (TypeError, ValueError):
        return None


def build_packet(
    ticker: str,
    date: str,
    lgbm_row: dict | None,
    lstm_row: dict | None,
    garch_row: dict | None,
    ensemble_row: dict | None,
    key_features: dict[str, float],
) -> dict:
    """
    단일 종목·날짜에 대한 계층적 통합 패킷을 생성합니다.

    Returns:
        Layer1 + Layer2 + scenario 구조의 딕셔너리
    """
    # --- Layer 1: 앙상블 종합 ---
    layer1 = {
        "result": "상승" if (ensemble_row or {}).get("ensemble_result", 0) == 1 else "하락",
        "confidence": _safe_float((ensemble_row or {}).get("ensemble_confidence", 0.5)),
        "signal_agreement": _safe_float((ensemble_row or {}).get("signal_agreement", 0)),
        "confidence_gap": _safe_float((ensemble_row or {}).get("confidence_gap", 0)),
        "risk_flag": bool((ensemble_row or {}).get("risk_flag", False)),
    }

    # --- Layer 2: 개별 모델 상세 ---
    # LightGBM
    lgbm_layer = {}
    if lgbm_row:
        lgbm_layer = {
            "direction_prob": {
                "up": _safe_float(lgbm_row.get("prob_up")),
                "sideways": _safe_float(lgbm_row.get("prob_sideways")),
                "down": _safe_float(lgbm_row.get("prob_down")),
            },
            "predicted_class": lgbm_row.get("predicted_label", "unknown"),
            "confidence": _safe_float(lgbm_row.get("confidence")),
            "key_features": {k: _safe_float(v) for k, v in key_features.items()},
        }

    # LSTM
    lstm_layer = {}
    if lstm_row:
        lstm_layer = {
            "pattern_score": _safe_float(lstm_row.get("prob")),
            "sequence_confidence": _safe_float(abs(lstm_row.get("prob", 0.5) - 0.5) * 2),
        }

    # GARCH
    garch_layer = {}
    if garch_row:
        garch_layer = {
            "volatility_forecast": {
                "1d": _safe_float(garch_row.get("vol_1d")),
                "3d": _safe_float(garch_row.get("vol_3d")),
                "5d": _safe_float(garch_row.get("vol_5d")),
            },
            "volatility_level": garch_row.get("volatility_level", "Unknown"),
            "risk_flag": bool(garch_row.get("risk_flag", False)),
            "percentile_vs_1y": _safe_float(garch_row.get("percentile_vs_1y")),
        }

    layer2 = {
        "lgbm": lgbm_layer,
        "lstm": lstm_layer,
        "garch": garch_layer,
    }

    # --- 신호 충돌 시나리오 ---
    lgbm_bullish = (lgbm_row or {}).get("prob_up", 0) > (lgbm_row or {}).get("prob_down", 0)
    lstm_bullish = (lstm_row or {}).get("prob", 0.5) > 0.5
    garch_risk = bool((garch_row or {}).get("risk_flag", False))
    ensemble_result = int((ensemble_row or {}).get("ensemble_result", 0))

    scenario_key = classify_scenario(ensemble_result, lgbm_bullish, lstm_bullish, garch_risk)
    scenario_info = SCENARIOS[scenario_key]

    packet = {
        "ticker": ticker,
        "date": date,
        "generated_at": datetime.now().isoformat(),
        "layer1_ensemble": layer1,
        "layer2_models": layer2,
        "scenario": {
            "type": scenario_key,
            "label": scenario_info["label"],
            "hint": scenario_info["hint"],
        },
    }

    return packet


# ---------------------------------------------------------------------------
# 패킷 유효성 검증
# ---------------------------------------------------------------------------

REQUIRED_KEYS = ["ticker", "date", "layer1_ensemble", "layer2_models", "scenario"]
REQUIRED_LAYER1_KEYS = ["result", "confidence", "signal_agreement", "confidence_gap", "risk_flag"]


def validate_packet(packet: dict) -> bool:
    """패킷 필수 키 존재 여부를 검증합니다."""
    for key in REQUIRED_KEYS:
        if key not in packet:
            logger.warning("[PACKET] 필수 키 누락: %s (ticker=%s)", key, packet.get("ticker"))
            return False
    for key in REQUIRED_LAYER1_KEYS:
        if key not in packet.get("layer1_ensemble", {}):
            logger.warning("[PACKET] Layer1 키 누락: %s (ticker=%s)", key, packet.get("ticker"))
            return False
    return True


# ---------------------------------------------------------------------------
# 메인 파이프라인
# ---------------------------------------------------------------------------

def build_all_packets() -> list[dict]:
    """모든 종목·날짜에 대한 통합 패킷을 생성합니다."""
    lgbm_df = _load_lgbm_predictions()
    lstm_df = _load_lstm_predictions()
    garch_df = _load_garch_results()
    ensemble_df = _load_ensemble_predictions()
    key_features = _load_lgbm_feature_importance()

    if ensemble_df is None:
        logger.error("[PACKET] 앙상블 예측이 없습니다. 패킷 생성 불가.")
        return []

    # GARCH를 ticker 기준 딕셔너리로 변환
    garch_dict: dict[str, dict] = {}
    if garch_df is not None:
        for _, row in garch_df.iterrows():
            garch_dict[row["ticker"]] = row.to_dict()

    # LightGBM을 (date, ticker) 딕셔너리로 변환
    lgbm_dict: dict[tuple[str, str], dict] = {}
    if lgbm_df is not None:
        for _, row in lgbm_df.iterrows():
            d = row.get("date", "")
            t = row.get("ticker", "")
            if isinstance(lgbm_df.index, pd.MultiIndex):
                d, t = row.name
                d = str(d)[:10]
            lgbm_dict[(str(d)[:10], str(t))] = row.to_dict()

    # LSTM을 (date, ticker) 딕셔너리로 변환
    lstm_dict: dict[tuple[str, str], dict] = {}
    if lstm_df is not None:
        for _, row in lstm_df.iterrows():
            lstm_dict[(str(row.get("date", ""))[:10], str(row.get("ticker", "")))] = row.to_dict()

    packets: list[dict] = []
    valid_count = 0
    invalid_count = 0

    for _, ens_row in ensemble_df.iterrows():
        date = str(ens_row.get("date", ""))[:10]
        ticker = str(ens_row.get("ticker", ""))

        lgbm_row = lgbm_dict.get((date, ticker))
        lstm_row = lstm_dict.get((date, ticker))
        garch_row = garch_dict.get(ticker)

        packet = build_packet(
            ticker=ticker,
            date=date,
            lgbm_row=lgbm_row,
            lstm_row=lstm_row,
            garch_row=garch_row,
            ensemble_row=ens_row.to_dict(),
            key_features=key_features,
        )

        if validate_packet(packet):
            packets.append(packet)
            valid_count += 1
        else:
            invalid_count += 1

    logger.info("[PACKET] 패킷 생성 완료: %d건 유효, %d건 무효", valid_count, invalid_count)
    return packets


def save_packets(packets: list[dict]) -> str:
    """패킷을 종목별 JSON 파일로 저장합니다."""
    today_str = datetime.now().strftime("%Y%m%d")
    out_dir = PROCESSED_PACKETS_PATH / today_str
    out_dir.mkdir(parents=True, exist_ok=True)

    saved = 0
    for packet in packets:
        ticker = packet["ticker"]
        date = packet["date"].replace("-", "")
        out_path = out_dir / f"{ticker}_{date}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(packet, f, ensure_ascii=False, indent=2)
        saved += 1

    logger.info("[PACKET] JSON 저장 완료: %d건 → %s", saved, out_dir)

    # 전체 요약도 Parquet으로 저장
    summary_rows = []
    for p in packets:
        summary_rows.append({
            "ticker": p["ticker"],
            "date": p["date"],
            "ensemble_result": p["layer1_ensemble"]["result"],
            "ensemble_confidence": p["layer1_ensemble"]["confidence"],
            "signal_agreement": p["layer1_ensemble"]["signal_agreement"],
            "risk_flag": p["layer1_ensemble"]["risk_flag"],
            "scenario_type": p["scenario"]["type"],
            "scenario_label": p["scenario"]["label"],
        })

    if summary_rows:
        summary_df = pd.DataFrame(summary_rows)
        summary_path = PROCESSED_PACKETS_PATH / f"packet_summary_{today_str}.parquet"
        summary_df.to_parquet(summary_path, index=False, compression=PARQUET_COMPRESSION)
        logger.info("[PACKET] 요약 Parquet 저장: %s", summary_path)

    return str(out_dir)


def display_summary(packets: list[dict]) -> None:
    """패킷 요약을 출력합니다."""
    if not packets:
        print("\n[PACKET] 생성된 패킷 없음")
        return

    print("\n" + "=" * 60)
    print("계층적 통합 패킷 생성 결과")
    print("=" * 60)
    print(f"  총 패킷 수: {len(packets)}")

    # 시나리오 분포
    scenario_counts: dict[str, int] = {}
    for p in packets:
        s = p["scenario"]["label"]
        scenario_counts[s] = scenario_counts.get(s, 0) + 1

    print("\n신호 시나리오 분포:")
    for label, count in sorted(scenario_counts.items(), key=lambda x: -x[1]):
        pct = count / len(packets) * 100
        print(f"  {label:>16}: {count:>5}건 ({pct:>5.1f}%)")

    # 앙상블 결과 분포
    bullish = sum(1 for p in packets if p["layer1_ensemble"]["result"] == "상승")
    bearish = len(packets) - bullish
    print(f"\n앙상블 결과:")
    print(f"  상승: {bullish}건 ({bullish/len(packets)*100:.1f}%)")
    print(f"  하락: {bearish}건 ({bearish/len(packets)*100:.1f}%)")

    # 리스크 플래그
    risk_count = sum(1 for p in packets if p["layer1_ensemble"]["risk_flag"])
    print(f"\n리스크 플래그: {risk_count}건 ({risk_count/len(packets)*100:.1f}%)")

    # 샘플 패킷 (첫 2개)
    print("\n--- 샘플 패킷 ---")
    for p in packets[:2]:
        print(json.dumps(p, ensure_ascii=False, indent=2)[:500])
        print("...")

    print("=" * 60 + "\n")


# ---------------------------------------------------------------------------
# 엔트리포인트
# ---------------------------------------------------------------------------

def main() -> str | None:
    """통합 패킷 전체 파이프라인 실행."""
    logger.info("=== 계층적 통합 패킷 구성 시작 ===")

    packets = build_all_packets()

    if not packets:
        logger.error("패킷 생성 실패. 종료합니다.")
        return None

    display_summary(packets)
    out_dir = save_packets(packets)

    logger.info("=== 계층적 통합 패킷 구성 완료 ===")
    return out_dir


if __name__ == "__main__":
    main()
