"""
감성 분석 배치 — FinBERT + Gemini 듀얼 추론 & Hard Sample 필터링

두 모델의 추론 결과를 비교하여 불일치/저신뢰 샘플을 필터링하고,
파인튜닝용 JSONL로 내보냅니다.

흐름:
  1. 뉴스 기사 목록 입력 (DB 또는 CSV)
  2. FinBERT (snunlp/KR-FinBert-SC) 로컬 추론
  3. Gemini (GMS API) LLM 추론
  4. 두 결과 비교 → hard sample 판정
  5. 일치 결과 → stock_news_map.sentiment_score/label 에 DB 저장
  6. hard sample → output/hard_samples_{date}.jsonl 로 내보내기

사용법:
  # 최근 N일 기사 감성 분석
  python -m processors.sentiment_analyzer --days 7

  # 전체 미분석 기사
  python -m processors.sentiment_analyzer

  # CSV 입력 (DB 없이 테스트)
  python -m processors.sentiment_analyzer --csv output/filtered_daily_20260313/
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import argparse
import asyncio
import json
import logging
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta

from config import GMS_API_KEY, GMS_API_URL, GMS_MODEL

logger = logging.getLogger(__name__)

# 라벨 매핑 (FinBERT 모델 출력 → 표준 라벨)
LABEL_MAP = {0: "NEGATIVE", 1: "NEUTRAL", 2: "POSITIVE"}


@dataclass
class SentimentResult:
    """감성 분석 결과 (단일 기사)."""
    label: str       # POSITIVE, NEGATIVE, NEUTRAL
    score: float     # 0.0 ~ 1.0 (해당 라벨의 확률)


@dataclass
class DualSentimentResult:
    """FinBERT + Gemini 듀얼 추론 결과."""
    news_id: int
    title: str
    snippet: str
    finbert: SentimentResult
    gemini: SentimentResult
    # hard sample 판정 플래그
    is_label_mismatch: bool      # 라벨 불일치
    is_low_conf_finbert: bool    # FinBERT 저신뢰 (< threshold)
    is_low_conf_gemini: bool     # Gemini 저신뢰 (< threshold)
    is_hard_sample: bool         # 위 조건 중 하나라도 해당


# ---------------------------------------------------------------------------
# FinBERT 분석기 (snunlp/KR-FinBert-SC)
# ---------------------------------------------------------------------------
class FinBERTAnalyzer:
    """
    한국어 금융 감성 분류 모델.
    snunlp/KR-FinBert-SC: 3-class (negative, neutral, positive)
    """

    def __init__(self, model_name: str = "snunlp/KR-FinBert-SC", device: str | None = None):
        import torch
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        self._torch = torch
        self._device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        logger.info("FinBERT 모델 로딩: %s (device=%s)", model_name, self._device)
        self._tokenizer = AutoTokenizer.from_pretrained(model_name)
        self._model = AutoModelForSequenceClassification.from_pretrained(model_name)
        self._model.to(self._device)
        self._model.eval()
        logger.info("FinBERT 모델 로딩 완료")

    def analyze(self, text: str) -> SentimentResult:
        """단일 텍스트 감성 분석."""
        inputs = self._tokenizer(
            text, return_tensors="pt", truncation=True, max_length=512, padding=True
        )
        inputs = {k: v.to(self._device) for k, v in inputs.items()}

        with self._torch.no_grad():
            outputs = self._model(**inputs)
            probs = self._torch.softmax(outputs.logits, dim=-1)[0]

        pred_idx = probs.argmax().item()
        return SentimentResult(
            label=LABEL_MAP[pred_idx],
            score=round(probs[pred_idx].item(), 4),
        )

    def analyze_batch(self, texts: list[str], batch_size: int = 32) -> list[SentimentResult]:
        """배치 감성 분석."""
        results = []
        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            inputs = self._tokenizer(
                batch_texts, return_tensors="pt", truncation=True,
                max_length=512, padding=True,
            )
            inputs = {k: v.to(self._device) for k, v in inputs.items()}

            with self._torch.no_grad():
                outputs = self._model(**inputs)
                probs = self._torch.softmax(outputs.logits, dim=-1)

            for j in range(len(batch_texts)):
                pred_idx = probs[j].argmax().item()
                results.append(SentimentResult(
                    label=LABEL_MAP[pred_idx],
                    score=round(probs[j][pred_idx].item(), 4),
                ))

            if i + batch_size < len(texts):
                logger.info("  FinBERT 배치 %d~%d / %d", i + 1, min(i + batch_size, len(texts)), len(texts))

        return results


# ---------------------------------------------------------------------------
# Gemini 감성 분석기 (GMS 프록시)
# ---------------------------------------------------------------------------
class GeminiSentimentAnalyzer:
    """GMS 프록시를 통한 Gemini 감성 분류."""

    _SYSTEM = (
        "당신은 한국 주식 시장 뉴스 감성 분석 전문가입니다. "
        "주어진 뉴스 텍스트의 감성을 분류합니다."
    )

    _PROMPT = """\
다음 주식 뉴스의 감성을 분석해주세요.

규칙:
- 반드시 JSON 객체 하나만 응답하세요. 다른 설명은 쓰지 마세요.
- label: "POSITIVE", "NEGATIVE", "NEUTRAL" 중 하나
- score: 해당 라벨의 확신도 (0.0 ~ 1.0)

텍스트: {text}

JSON 응답:"""

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash-lite",
                 base_url: str = "https://gms.ssafy.io/gmsapi/generativelanguage.googleapis.com/v1beta"):
        self._api_key = api_key
        self._model = model
        self._base_url = base_url.rstrip("/")

    async def analyze(self, text: str) -> SentimentResult:
        """단일 텍스트 감성 분석 (비동기)."""
        import aiohttp
        import re

        prompt = self._PROMPT.format(text=text[:1500])
        url = f"{self._base_url}/models/{self._model}:generateContent"

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": self._SYSTEM}]},
            "generationConfig": {
                "maxOutputTokens": 100,
                "temperature": 0.1,
            },
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    params={"key": self._api_key},
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        logger.warning("GMS Sentiment API 오류 (status=%d): %s", resp.status, error_text[:200])
                        return SentimentResult(label="NEUTRAL", score=0.0)
                    data = await resp.json()
                    raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()

                    # JSON 객체 파싱
                    match = re.search(r'\{.*?\}', raw, re.DOTALL)
                    if match:
                        result = json.loads(match.group())
                        label = result.get("label", "NEUTRAL").upper()
                        if label not in ("POSITIVE", "NEGATIVE", "NEUTRAL"):
                            label = "NEUTRAL"
                        score = float(result.get("score", 0.5))
                        return SentimentResult(label=label, score=round(score, 4))
        except Exception as e:
            logger.warning("GMS Gemini 감성 분석 실패: %s", e)

        return SentimentResult(label="NEUTRAL", score=0.0)

    async def analyze_batch(self, texts: list[str], batch_size: int = 20,
                            delay: float = 0.5) -> list[SentimentResult]:
        """배치 감성 분석 (비동기, rate limit 대응)."""
        results: list[SentimentResult] = []

        for i in range(0, len(texts), batch_size):
            batch_texts = texts[i:i + batch_size]
            tasks = [self.analyze(t) for t in batch_texts]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            for r in batch_results:
                if isinstance(r, SentimentResult):
                    results.append(r)
                else:
                    logger.warning("Gemini 감성 분석 예외: %s", r)
                    results.append(SentimentResult(label="NEUTRAL", score=0.0))

            if i + batch_size < len(texts):
                logger.info("  Gemini 배치 %d~%d / %d", i + 1, min(i + batch_size, len(texts)), len(texts))
                if delay > 0:
                    await asyncio.sleep(delay)

        return results


# ---------------------------------------------------------------------------
# 듀얼 비교 & Hard Sample 판정
# ---------------------------------------------------------------------------
def compare_results(
    articles: list[dict],
    finbert_results: list[SentimentResult],
    gemini_results: list[SentimentResult],
    confidence_threshold: float = 0.7,
) -> list[DualSentimentResult]:
    """
    FinBERT와 Gemini 결과를 비교하여 hard sample 판정.

    Hard sample 조건 (OR):
      - 라벨 불일치 (FinBERT ≠ Gemini)
      - FinBERT 신뢰도 < threshold
      - Gemini 신뢰도 < threshold
    """
    dual_results = []
    for article, fb, gm in zip(articles, finbert_results, gemini_results):
        is_mismatch = fb.label != gm.label
        is_low_fb = fb.score < confidence_threshold
        is_low_gm = gm.score < confidence_threshold

        dual_results.append(DualSentimentResult(
            news_id=article.get("id", 0),
            title=article.get("title", ""),
            snippet=article.get("body", "")[:250],
            finbert=fb,
            gemini=gm,
            is_label_mismatch=is_mismatch,
            is_low_conf_finbert=is_low_fb,
            is_low_conf_gemini=is_low_gm,
            is_hard_sample=is_mismatch or is_low_fb or is_low_gm,
        ))

    return dual_results


# ---------------------------------------------------------------------------
# Hard Sample 내보내기
# ---------------------------------------------------------------------------
def export_hard_samples(
    dual_results: list[DualSentimentResult],
    output_dir: Path | None = None,
) -> Path | None:
    """Hard sample을 JSONL 파일로 내보내기 (파인튜닝용)."""
    from config import OUTPUT_DIR
    out_dir = output_dir or OUTPUT_DIR

    hard_samples = [r for r in dual_results if r.is_hard_sample]
    if not hard_samples:
        logger.info("Hard sample이 없습니다.")
        return None

    today_str = datetime.now().strftime("%Y%m%d")
    filepath = out_dir / f"hard_samples_{today_str}.jsonl"

    with open(filepath, "w", encoding="utf-8") as f:
        for sample in hard_samples:
            record = {
                "news_id": sample.news_id,
                "title": sample.title,
                "snippet": sample.snippet,
                "finbert_label": sample.finbert.label,
                "finbert_score": sample.finbert.score,
                "gemini_label": sample.gemini.label,
                "gemini_score": sample.gemini.score,
                "is_label_mismatch": sample.is_label_mismatch,
                "is_low_conf_finbert": sample.is_low_conf_finbert,
                "is_low_conf_gemini": sample.is_low_conf_gemini,
            }
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    logger.info("Hard sample 내보내기: %s (%d건)", filepath, len(hard_samples))
    return filepath


def export_summary(dual_results: list[DualSentimentResult], output_dir: Path | None = None) -> Path:
    """전체 결과 통계 요약 CSV 내보내기."""
    import csv
    from config import OUTPUT_DIR
    out_dir = output_dir or OUTPUT_DIR

    today_str = datetime.now().strftime("%Y%m%d")
    filepath = out_dir / f"sentiment_summary_{today_str}.csv"

    with open(filepath, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.writer(f)
        writer.writerow([
            "news_id", "title",
            "finbert_label", "finbert_score",
            "gemini_label", "gemini_score",
            "label_mismatch", "low_conf_finbert", "low_conf_gemini", "is_hard_sample",
        ])
        for r in dual_results:
            writer.writerow([
                r.news_id, r.title,
                r.finbert.label, r.finbert.score,
                r.gemini.label, r.gemini.score,
                r.is_label_mismatch, r.is_low_conf_finbert, r.is_low_conf_gemini,
                r.is_hard_sample,
            ])

    logger.info("감성 분석 요약: %s (%d건)", filepath, len(dual_results))
    return filepath


# ---------------------------------------------------------------------------
# DB 저장 (일치 결과 → stock_news_map)
# ---------------------------------------------------------------------------
def save_sentiment_to_db(dual_results: list[DualSentimentResult]) -> dict[str, int]:
    """
    라벨이 일치하는 결과만 stock_news_map에 sentiment_score/label 업데이트.
    불일치(hard sample)는 DB에 저장하지 않음.
    반환: {"updated": N, "skipped_hard": N}
    """
    from db import get_session
    from models import StockNewsMap

    stats = {"updated": 0, "skipped_hard": 0}

    with get_session() as session:
        try:
            for r in dual_results:
                if r.is_label_mismatch:
                    stats["skipped_hard"] += 1
                    continue

                # FinBERT 결과를 기준으로 저장 (로컬 모델이 primary)
                # sentiment_score: -1.0 ~ 1.0 변환
                if r.finbert.label == "POSITIVE":
                    score = r.finbert.score
                elif r.finbert.label == "NEGATIVE":
                    score = -r.finbert.score
                else:
                    score = 0.0

                # news_id로 매핑된 모든 stock_news_map 레코드 업데이트
                maps = (
                    session.query(StockNewsMap)
                    .filter(StockNewsMap.news_id == r.news_id)
                    .all()
                )
                for m in maps:
                    m.sentiment_score = score
                    m.sentiment_label = r.finbert.label
                    stats["updated"] += 1

            session.commit()
        except Exception:
            session.rollback()
            raise

    return stats


# ---------------------------------------------------------------------------
# 메인 배치 실행
# ---------------------------------------------------------------------------
async def run_sentiment_batch(
    days: int | None = None,
    limit: int = 5000,
    confidence_threshold: float = 0.7,
    csv_dir: str | None = None,
    skip_db: bool = False,
) -> list[DualSentimentResult]:
    """
    감성 분석 배치 실행.

    Args:
        days: 최근 N일 기사만 처리
        limit: 최대 처리 건수
        confidence_threshold: hard sample 판정 신뢰도 기준
        csv_dir: CSV 입력 디렉토리 (DB 없이 테스트용)
        skip_db: DB 저장 건너뛰기
    """
    # 1. 기사 목록 로드
    if csv_dir:
        articles = _load_articles_from_csv(csv_dir)
    else:
        articles = _load_articles_from_db(days=days, limit=limit)

    if not articles:
        logger.info("감성 분석 대상 기사가 없습니다.")
        return []

    logger.info("감성 분석 대상: %d건", len(articles))

    # 입력 텍스트 준비 (제목 + 스니펫)
    texts = [f"{a['title']} {a['body'][:250]}" for a in articles]

    # 2. FinBERT 추론
    logger.info("FinBERT 추론 시작...")
    finbert = FinBERTAnalyzer()
    finbert_results = finbert.analyze_batch(texts)
    logger.info("FinBERT 추론 완료")

    # 3. Gemini 추론
    if not GMS_API_KEY:
        logger.warning("GMS_API_KEY 미설정 — Gemini 추론 건너뜀 (FinBERT 결과만 사용)")
        gemini_results = [SentimentResult(label="NEUTRAL", score=0.0) for _ in articles]
    else:
        logger.info("Gemini 추론 시작...")
        gemini = GeminiSentimentAnalyzer(
            api_key=GMS_API_KEY, model=GMS_MODEL, base_url=GMS_API_URL
        )
        gemini_results = await gemini.analyze_batch(texts)
        logger.info("Gemini 추론 완료")

    # 4. 비교 & Hard Sample 판정
    dual_results = compare_results(articles, finbert_results, gemini_results, confidence_threshold)

    total = len(dual_results)
    hard_count = sum(1 for r in dual_results if r.is_hard_sample)
    mismatch_count = sum(1 for r in dual_results if r.is_label_mismatch)
    low_fb_count = sum(1 for r in dual_results if r.is_low_conf_finbert)
    low_gm_count = sum(1 for r in dual_results if r.is_low_conf_gemini)

    logger.info("=== 감성 분석 결과 ===")
    logger.info("  전체: %d건", total)
    logger.info("  Hard Sample: %d건 (%.1f%%)", hard_count, hard_count / total * 100 if total else 0)
    logger.info("    - 라벨 불일치: %d건", mismatch_count)
    logger.info("    - FinBERT 저신뢰: %d건", low_fb_count)
    logger.info("    - Gemini 저신뢰: %d건", low_gm_count)

    # 5. 내보내기
    export_hard_samples(dual_results)
    export_summary(dual_results)

    # 6. DB 저장 (선택)
    if not skip_db and not csv_dir:
        try:
            stats = save_sentiment_to_db(dual_results)
            logger.info("DB 저장: updated=%d, skipped_hard=%d", stats["updated"], stats["skipped_hard"])
        except Exception as e:
            logger.error("DB 저장 실패: %s", e)

    return dual_results


def _load_articles_from_db(days: int | None = None, limit: int = 5000) -> list[dict]:
    """DB에서 감성 미분석 기사 조회."""
    from db import get_session
    from models import StockNews, StockNewsMap

    with get_session() as session:
        query = (
            session.query(StockNews)
            .join(StockNewsMap, StockNews.id == StockNewsMap.news_id)
            .filter(StockNewsMap.sentiment_label.is_(None))
        )
        if days:
            cutoff = datetime.now() - timedelta(days=days)
            query = query.filter(StockNews.published_at >= cutoff)

        query = query.order_by(StockNews.published_at.desc()).limit(limit)
        results = query.all()

        return [
            {"id": n.id, "title": n.title or "", "body": n.snippet or ""}
            for n in results
        ]


def _load_articles_from_csv(csv_dir: str) -> list[dict]:
    """CSV 디렉토리에서 기사 로드 (DB 없이 테스트용)."""
    import pandas as pd

    csv_path = Path(csv_dir)
    articles = []
    article_id = 1

    for csv_file in sorted(csv_path.glob("*.csv")):
        try:
            df = pd.read_csv(csv_file, encoding="utf-8-sig")
        except Exception:
            df = pd.read_csv(csv_file, encoding="utf-8")

        title_col = next((c for c in df.columns if "title" in c.lower()), None)
        body_col = next((c for c in df.columns if c.lower() in ("snippet", "body", "content")), None)

        if not title_col:
            continue

        for _, row in df.iterrows():
            articles.append({
                "id": article_id,
                "title": str(row.get(title_col, "")),
                "body": str(row.get(body_col, "")) if body_col else "",
            })
            article_id += 1

    return articles


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="뉴스 감성 분석 배치 (FinBERT + Gemini)")
    parser.add_argument("--days", type=int, default=None, help="최근 N일 기사만 처리")
    parser.add_argument("--limit", type=int, default=5000, help="최대 처리 건수")
    parser.add_argument("--threshold", type=float, default=0.7, help="Hard sample 신뢰도 기준 (기본: 0.7)")
    parser.add_argument("--csv", type=str, default=None, help="CSV 입력 디렉토리 (DB 없이 테스트)")
    parser.add_argument("--skip-db", action="store_true", help="DB 저장 건너뛰기")
    args = parser.parse_args()

    asyncio.run(run_sentiment_batch(
        days=args.days,
        limit=args.limit,
        confidence_threshold=args.threshold,
        csv_dir=args.csv,
        skip_db=args.skip_db,
    ))


if __name__ == "__main__":
    main()
