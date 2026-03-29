"""
백필 CSV 배치 프로세서 — GPU 서버용

크롤링된 raw CSV에 키워드 추출 + 감성 분석을 수행하여
backfill_loader가 바로 적재할 수 있는 processed CSV를 출력한다.

GPU 서버 요구사항:
  - vLLM 서버 실행 중 (Qwen/Qwen2.5-7B-Instruct, FP16)
  - PyTorch + CUDA (FinBERT용)
  - 45GB+ VRAM 권장

사전 실행:
  vllm serve Qwen/Qwen2.5-7B-Instruct \\
    --host 0.0.0.0 --port 8000 --max-model-len 4096

사용법:
  # 기본 (clean + keyword + sentiment)
  python -m processors.csv_batch_processor input_dir/ --output output_dir/

  # clean만 건너뛰기 (이미 clean 완료된 CSV)
  python -m processors.csv_batch_processor input_dir/ --output output_dir/ --skip-clean

  # vLLM 서버 주소 변경
  python -m processors.csv_batch_processor input_dir/ --output output_dir/ --vllm-url http://localhost:8000

  # 이어서 처리 (체크포인트 기반)
  python -m processors.csv_batch_processor input_dir/ --output output_dir/ --resume
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import argparse
import asyncio
import json
import logging
import re
import time
from datetime import datetime

import aiohttp
import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# 설정
# ---------------------------------------------------------------------------
VLLM_BATCH_SIZE = 50       # vLLM 동시 요청 수
VLLM_DELAY = 0.3           # 배치 간 딜레이
FINBERT_BATCH_SIZE = 64    # FinBERT 배치 크기
CHECKPOINT_FILE = ".csv_batch_checkpoint.json"


# ---------------------------------------------------------------------------
# 체크포인트
# ---------------------------------------------------------------------------
def _load_checkpoint(output_dir: Path) -> set[str]:
    cp_path = output_dir / CHECKPOINT_FILE
    if cp_path.exists():
        with open(cp_path, "r", encoding="utf-8") as f:
            return set(json.load(f))
    return set()


def _save_checkpoint(output_dir: Path, done: set[str]) -> None:
    cp_path = output_dir / CHECKPOINT_FILE
    with open(cp_path, "w", encoding="utf-8") as f:
        json.dump(sorted(done), f, ensure_ascii=False, indent=2)


# ---------------------------------------------------------------------------
# 1단계: 클린 (clean_articles 로직 인라인)
# ---------------------------------------------------------------------------
NOISE_TITLE_PATTERNS = [
    r"^언론사 선정", r"네이버 메인에서 보고 싶은", r"^관련뉴스", r"^Keep에",
]
AD_KEYWORDS = [
    "무료 상담", "수익률 보장", "카카오톡 상담", "텔레그램 추천",
    "주식리딩방", "종목추천방", "무료체험", "수익인증",
    "원금보장", "100% 수익", "VIP 추천", "선착순 모집",
]
MIN_BODY_LENGTH = 20


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """노이즈/광고/중복 제거."""
    before = len(df)
    if df.empty:
        return df

    # URL 중복 제거
    df = df.drop_duplicates(subset=["article_url"], keep="first")

    # 노이즈 제목
    pattern = "|".join(NOISE_TITLE_PATTERNS)
    mask = df["title"].fillna("").str.contains(pattern, regex=True, na=False)
    df = df[~mask]

    # 광고
    body_col = df.get("full_body", df.get("body", pd.Series("", index=df.index))).fillna("")
    search_col = df["title"].fillna("") + " " + body_col
    ad_pattern = "|".join(re.escape(kw) for kw in AD_KEYWORDS)
    mask = search_col.str.contains(ad_pattern, regex=True, na=False)
    df = df[~mask]

    # 본문 길이
    body_col = df.get("full_body", df.get("body", pd.Series("", index=df.index))).fillna("")
    df = df[body_col.str.len() >= MIN_BODY_LENGTH]

    # 정규화 제목 중복
    import unicodedata
    def _norm(t):
        if not isinstance(t, str):
            return ""
        t = unicodedata.normalize("NFC", t)
        t = re.sub(r"[^\w가-힣a-zA-Z0-9]", "", t)
        return re.sub(r"\s+", "", t).lower()

    df = df.copy()
    df["_nt"] = df["title"].apply(_norm)
    df = df.drop_duplicates(subset=["_nt"], keep="first")
    df = df.drop(columns=["_nt"])

    removed = before - len(df)
    if removed > 0:
        logger.info("    클린: %d → %d (-%d건)", before, len(df), removed)

    return df.reset_index(drop=True)


# ---------------------------------------------------------------------------
# 2단계: 키워드 추출 (vLLM)
# ---------------------------------------------------------------------------
KEYWORD_SYSTEM = (
    "당신은 한국 주식 시장 뉴스 분석 전문가입니다. "
    "주어진 기사에서 핵심 주제 키워드를 추출합니다."
)

KEYWORD_PROMPT = """\
다음 뉴스 기사를 분석하여 핵심 주제 키워드를 최대 3개 추출해주세요.

규칙:
- 기업명/종목명/사람 이름은 키워드에서 반드시 제외
- 키워드는 사업/기술/이벤트/산업 트렌드를 나타내는 명사구여야 합니다
  (좋은 예: "ESS 수주", "HBM 납품", "금리 인상", "실적 개선")
  (나쁜 예: "삼성전자", "효성중공업", "조현준")
- 2~8글자의 간결한 한국어 키프레이즈로 작성하세요
- 쉼표로 구분하여 키워드만 출력하세요. 다른 설명은 쓰지 마세요

제목: {title}
본문: {body}

키워드:"""


async def _extract_one(
    session: aiohttp.ClientSession, title: str, body: str,
    vllm_url: str, model: str,
) -> str:
    """단일 기사 키워드 추출."""
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": KEYWORD_SYSTEM},
            {"role": "user", "content": KEYWORD_PROMPT.format(title=title, body=body[:1500])},
        ],
        "max_tokens": 50,
        "temperature": 0,
    }
    try:
        async with session.post(
            f"{vllm_url}/v1/chat/completions",
            json=payload,
            timeout=aiohttp.ClientTimeout(total=60),
        ) as resp:
            data = await resp.json()
            raw = data["choices"][0]["message"]["content"].strip()
            # JSON 배열 형식
            match = re.search(r'\[.*?\]', raw, re.DOTALL)
            if match:
                keywords = json.loads(match.group())
                return ",".join(str(k).strip() for k in keywords[:3] if k and str(k).strip())
            # 쉼표 구분
            keywords = [k.strip().strip('"\'') for k in raw.split(",")]
            return ",".join(k for k in keywords[:3] if k and len(k) <= 20)
    except Exception as e:
        logger.warning("vLLM 키워드 추출 실패: %s", e)
        return ""


async def extract_keywords_csv(
    df: pd.DataFrame,
    vllm_url: str = "http://localhost:8000",
    model: str = "Qwen/Qwen2.5-7B-Instruct",
    batch_size: int = VLLM_BATCH_SIZE,
) -> list[str]:
    """DataFrame의 모든 행에 대해 키워드 추출. keywords 컬럼용 문자열 리스트 반환."""
    results = [""] * len(df)
    titles = df["title"].fillna("").tolist()
    bodies = (df.get("full_body", df.get("body", pd.Series("", index=df.index)))).fillna("").tolist()

    connector = aiohttp.TCPConnector(limit=batch_size)
    async with aiohttp.ClientSession(connector=connector) as session:
        for i in range(0, len(df), batch_size):
            batch_indices = list(range(i, min(i + batch_size, len(df))))
            tasks = [
                _extract_one(session, titles[j], bodies[j], vllm_url, model)
                for j in batch_indices
            ]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            for idx, result in zip(batch_indices, batch_results):
                if isinstance(result, str):
                    results[idx] = result
                else:
                    logger.warning("    키워드 추출 예외 (row %d): %s", idx, result)

            done = min(i + batch_size, len(df))
            if done % 200 == 0 or done == len(df):
                logger.info("    키워드: %d/%d", done, len(df))

            if i + batch_size < len(df):
                await asyncio.sleep(VLLM_DELAY)

    return results


# ---------------------------------------------------------------------------
# 3단계: 감성 분석 (FinBERT)
# ---------------------------------------------------------------------------
LABEL_MAP = {0: "NEGATIVE", 1: "NEUTRAL", 2: "POSITIVE"}


class FinBERTProcessor:
    """FinBERT 감성 분석 (GPU 배치)."""

    def __init__(self, model_name: str = "snunlp/KR-FinBert-SC"):
        import torch
        from transformers import AutoModelForSequenceClassification, AutoTokenizer

        self._torch = torch
        self._device = "cuda" if torch.cuda.is_available() else "cpu"
        logger.info("FinBERT 로딩: %s (device=%s)", model_name, self._device)

        self._tokenizer = AutoTokenizer.from_pretrained(model_name)
        self._model = AutoModelForSequenceClassification.from_pretrained(model_name)
        self._model.to(self._device)
        self._model.eval()
        logger.info("FinBERT 로딩 완료")

    def analyze_batch(self, texts: list[str], batch_size: int = FINBERT_BATCH_SIZE) -> list[tuple[str, float]]:
        """배치 감성 분석. 반환: [(label, score), ...]"""
        results = []
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            inputs = self._tokenizer(
                batch, return_tensors="pt", truncation=True,
                max_length=512, padding=True,
            )
            inputs = {k: v.to(self._device) for k, v in inputs.items()}

            with self._torch.no_grad():
                outputs = self._model(**inputs)
                probs = self._torch.softmax(outputs.logits, dim=-1)

            for j in range(len(batch)):
                pred_idx = probs[j].argmax().item()
                label = LABEL_MAP[pred_idx]
                score = probs[j][pred_idx].item()
                # POSITIVE → +score, NEGATIVE → -score, NEUTRAL → 0
                if label == "POSITIVE":
                    db_score = round(score, 4)
                elif label == "NEGATIVE":
                    db_score = round(-score, 4)
                else:
                    db_score = 0.0
                results.append((label, db_score))

            done = min(i + batch_size, len(texts))
            if done % 500 == 0 or done == len(texts):
                logger.info("    감성: %d/%d", done, len(texts))

        return results


# ---------------------------------------------------------------------------
# 메인 처리
# ---------------------------------------------------------------------------
async def process_csv(
    csv_path: Path,
    output_dir: Path,
    vllm_url: str,
    vllm_model: str,
    finbert: FinBERTProcessor,
    skip_clean: bool = False,
) -> dict:
    """단일 CSV를 처리하여 processed CSV 출력."""
    try:
        df = pd.read_csv(csv_path, encoding="utf-8-sig", dtype={"code": str},
                         engine="python", on_bad_lines="skip")
    except Exception:
        df = pd.read_csv(csv_path, encoding="utf-8", dtype={"code": str},
                         engine="python", on_bad_lines="skip")

    if df.empty:
        return {"file": csv_path.name, "original": 0, "final": 0}

    original = len(df)

    # 1. 클린
    if not skip_clean:
        df = clean_dataframe(df)
        if df.empty:
            return {"file": csv_path.name, "original": original, "final": 0}

    # 2. 키워드 추출
    keywords_list = await extract_keywords_csv(df, vllm_url=vllm_url, model=vllm_model)
    df["keywords"] = keywords_list

    # 3. 감성 분석
    texts = (df["title"].fillna("") + " " + df.get("body", pd.Series("", index=df.index)).fillna("")).tolist()
    sentiments = finbert.analyze_batch(texts)
    df["sentiment_label"] = [s[0] for s in sentiments]
    df["sentiment_score"] = [s[1] for s in sentiments]

    # 저장
    out_path = output_dir / csv_path.name
    df.to_csv(out_path, index=False, encoding="utf-8-sig")

    return {"file": csv_path.name, "original": original, "final": len(df)}


async def run_batch(
    input_dir: str,
    output_dir: str,
    vllm_url: str = "http://localhost:8000",
    vllm_model: str = "Qwen/Qwen2.5-7B-Instruct",
    skip_clean: bool = False,
    resume: bool = False,
) -> None:
    """폴더 내 모든 CSV를 순차 처리."""
    in_path = Path(input_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    csv_files = sorted(in_path.glob("*.csv"))
    if not csv_files:
        logger.error("CSV 파일 없음: %s", input_dir)
        return

    # 체크포인트
    done_files = _load_checkpoint(out_path) if resume else set()
    pending = [f for f in csv_files if f.name not in done_files]

    if resume and len(pending) < len(csv_files):
        logger.info("체크포인트: %d개 완료, %d개 남음", len(csv_files) - len(pending), len(pending))

    if not pending:
        logger.info("모든 CSV 처리 완료!")
        return

    # FinBERT 로드 (한번만)
    finbert = FinBERTProcessor()

    logger.info("=" * 60)
    logger.info("  CSV 배치 프로세서 시작")
    logger.info("  입력: %s (%d개 CSV, %d개 대기)", input_dir, len(csv_files), len(pending))
    logger.info("  출력: %s", output_dir)
    logger.info("  vLLM: %s (%s)", vllm_url, vllm_model)
    logger.info("=" * 60)

    total_original = 0
    total_final = 0
    start_time = time.time()

    for idx, csv_file in enumerate(pending, 1):
        logger.info("[%d/%d] %s", idx, len(pending), csv_file.name)

        try:
            stats = await process_csv(
                csv_file, out_path,
                vllm_url=vllm_url, vllm_model=vllm_model,
                finbert=finbert, skip_clean=skip_clean,
            )
            total_original += stats["original"]
            total_final += stats["final"]

            logger.info("  완료: %d → %d건", stats["original"], stats["final"])

            done_files.add(csv_file.name)
            _save_checkpoint(out_path, done_files)

        except Exception as e:
            logger.error("  [%s] 처리 실패: %s", csv_file.name, e)

    elapsed = time.time() - start_time
    logger.info("=" * 60)
    logger.info("  전체 완료 (%.1f분)", elapsed / 60)
    logger.info("  기사: %d → %d건 (-%d건 제거)", total_original, total_final, total_original - total_final)
    logger.info("  출력: %s", out_path.resolve())
    logger.info("=" * 60)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------
def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="백필 CSV 배치 프로세서 (clean + keyword + sentiment)")
    parser.add_argument("input_dir", help="raw CSV 폴더 경로")
    parser.add_argument("--output", required=True, help="processed CSV 출력 폴더")
    parser.add_argument("--vllm-url", default="http://localhost:8000", help="vLLM 서버 URL (기본: http://localhost:8000)")
    parser.add_argument("--vllm-model", default="Qwen/Qwen2.5-7B-Instruct", help="vLLM 모델명 (기본: Qwen/Qwen2.5-7B-Instruct)")
    parser.add_argument("--skip-clean", action="store_true", help="클린 단계 건너뛰기")
    parser.add_argument("--resume", action="store_true", help="체크포인트 기반 이어서 처리")
    args = parser.parse_args()

    asyncio.run(run_batch(
        input_dir=args.input_dir,
        output_dir=args.output,
        vllm_url=args.vllm_url,
        vllm_model=args.vllm_model,
        skip_clean=args.skip_clean,
        resume=args.resume,
    ))


if __name__ == "__main__":
    main()
