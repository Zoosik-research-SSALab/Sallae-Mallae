"""
뉴스 기사 중복 제거 + 광고/노이즈 필터링

사용법:
  python clean_articles.py output/news_2024/
  python clean_articles.py output/news_2025_20260308/ --backup
  python clean_articles.py output/news_2024/ --no-embedding  # 임베딩 없이 빠른 정리
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import argparse
import glob
import os
import re
import unicodedata

import numpy as np
import pandas as pd

# ═══════════════════════════════════════════
# 노이즈/광고 필터링 패턴
# ═══════════════════════════════════════════
NOISE_TITLE_PATTERNS = [
    r"^언론사 선정",
    r"네이버 메인에서 보고 싶은",
    r"^관련뉴스",
    r"^Keep에",
]

AD_KEYWORDS = [
    "무료 상담", "수익률 보장", "카카오톡 상담", "텔레그램 추천",
    "주식리딩방", "종목추천방", "무료체험", "수익인증",
    "원금보장", "100% 수익", "VIP 추천", "선착순 모집",
]

MIN_BODY_LENGTH = 20


# ═══════════════════════════════════════════
# 제목 정규화
# ═══════════════════════════════════════════
def normalize_title(title: str) -> str:
    """제목을 정규화하여 비교 가능하게 만듦."""
    if not isinstance(title, str):
        return ""
    t = unicodedata.normalize("NFC", title)
    t = re.sub(r"[^\w가-힣a-zA-Z0-9]", "", t)
    t = re.sub(r"\s+", "", t)
    return t.lower()


# ═══════════════════════════════════════════
# 필터링 함수들
# ═══════════════════════════════════════════
def filter_noise_titles(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """UI 텍스트/노이즈 제목 제거."""
    pattern = "|".join(NOISE_TITLE_PATTERNS)
    mask = df["title"].fillna("").str.contains(pattern, regex=True, na=False)
    removed = mask.sum()
    return df[~mask], removed


def filter_ads(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """광고성 기사 제거."""
    search_col = df["title"].fillna("") + " " + df.get("full_body", df.get("body", pd.Series("", index=df.index))).fillna("")
    pattern = "|".join(re.escape(kw) for kw in AD_KEYWORDS)
    mask = search_col.str.contains(pattern, regex=True, na=False)
    removed = mask.sum()
    return df[~mask], removed


def filter_short_body(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """본문이 너무 짧거나 없는 기사 제거."""
    body_col = df.get("full_body", df.get("body", pd.Series("", index=df.index))).fillna("")
    mask = body_col.str.len() < MIN_BODY_LENGTH
    removed = mask.sum()
    return df[~mask], removed


def dedup_url(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """article_url 기준 완전일치 중복 제거."""
    before = len(df)
    df = df.drop_duplicates(subset=["article_url"], keep="first")
    return df, before - len(df)


def dedup_normalized_title(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """정규화된 제목 기준 중복 제거."""
    df["_norm_title"] = df["title"].apply(normalize_title)
    before = len(df)
    df = df.drop_duplicates(subset=["_norm_title"], keep="first")
    df = df.drop(columns=["_norm_title"])
    return df, before - len(df)


# ═══════════════════════════════════════════
# 임베딩 기반 유사 제목 중복 제거
# ═══════════════════════════════════════════
class TitleEmbedder:
    def __init__(self, model_name: str = "intfloat/multilingual-e5-small"):
        import torch
        from transformers import AutoTokenizer, AutoModel

        print(f"  임베딩 모델 로딩: {model_name}")
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.torch = torch
        self.model.to(self.device)
        self.model.eval()

    def encode(self, texts: list[str], batch_size: int = 64) -> np.ndarray:
        """텍스트 리스트를 임베딩 벡터로 변환."""
        all_embs = []
        with self.torch.no_grad():
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                # E5 모델은 query: prefix 필요
                batch = [f"query: {t}" for t in batch]
                encoded = self.tokenizer(batch, padding=True, truncation=True, max_length=128, return_tensors="pt")
                encoded = {k: v.to(self.device) for k, v in encoded.items()}
                output = self.model(**encoded)
                # [CLS] 토큰 임베딩 사용
                embs = output.last_hidden_state[:, 0, :].cpu().numpy()
                # L2 정규화
                norms = np.linalg.norm(embs, axis=1, keepdims=True)
                embs = embs / np.maximum(norms, 1e-8)
                all_embs.append(embs)
        return np.vstack(all_embs)


def dedup_embedding(df: pd.DataFrame, embedder: TitleEmbedder, threshold: float = 0.97) -> tuple[pd.DataFrame, int]:
    """임베딩 코사인 유사도 기반 중복 제거. 같은 날짜의 기사끼리만 비교."""
    if len(df) < 2:
        return df, 0

    # 날짜별로 그룹핑하여 같은 날짜 내에서만 중복 비교
    dates = df["date"].fillna("").astype(str).tolist()
    titles = df["title"].fillna("").tolist()
    embs = embedder.encode(titles)

    remove_idx = set()

    # 날짜별 인덱스 그룹
    date_groups: dict[str, list[int]] = {}
    for i, d in enumerate(dates):
        date_key = d[:10]  # "2025.01.15" 형식 기준
        date_groups.setdefault(date_key, []).append(i)

    for date_key, indices in date_groups.items():
        if len(indices) < 2:
            continue
        # 해당 날짜의 임베딩만 추출하여 유사도 계산
        group_embs = embs[indices]
        sim_matrix = group_embs @ group_embs.T

        for a in range(len(indices)):
            i = indices[a]
            if i in remove_idx:
                continue
            for b in range(a + 1, len(indices)):
                j = indices[b]
                if j in remove_idx:
                    continue
                if sim_matrix[a][b] >= threshold:
                    remove_idx.add(j)

    before = len(df)
    keep_mask = [i not in remove_idx for i in range(len(df))]
    df = df.iloc[keep_mask].reset_index(drop=True)
    return df, before - len(df)


# ═══════════════════════════════════════════
# 메인 처리
# ═══════════════════════════════════════════
def clean_csv(csv_path: str, output_dir: str, embedder: TitleEmbedder | None = None) -> dict:
    """단일 CSV 파일 정리 후 output_dir에 저장."""
    df = pd.read_csv(csv_path, encoding="utf-8-sig", dtype={"code": str}, engine="python", on_bad_lines="skip")
    original = len(df)

    if original == 0:
        return {"file": os.path.basename(csv_path), "original": 0, "final": 0, "removed": {}}

    stats = {}

    # 1. URL 중복 제거
    df, n = dedup_url(df)
    if n: stats["url_dedup"] = n

    # 2. 노이즈 제목 제거
    df, n = filter_noise_titles(df)
    if n: stats["noise_title"] = n

    # 3. 광고성 기사 제거
    df, n = filter_ads(df)
    if n: stats["ad_filter"] = n

    # 4. 짧은 본문 제거
    df, n = filter_short_body(df)
    if n: stats["short_body"] = n

    # 5. 정규화 제목 중복 제거
    df, n = dedup_normalized_title(df)
    if n: stats["title_norm_dedup"] = n

    # 6. 임베딩 유사도 중복 제거
    if embedder and len(df) >= 2:
        df, n = dedup_embedding(df, embedder)
        if n: stats["embedding_dedup"] = n

    # 별도 폴더에 저장
    out_path = os.path.join(output_dir, os.path.basename(csv_path))
    df.to_csv(out_path, index=False, encoding="utf-8-sig")

    return {
        "file": os.path.basename(csv_path),
        "original": original,
        "final": len(df),
        "removed": stats,
    }


def main():
    parser = argparse.ArgumentParser(description="뉴스 기사 중복 제거 + 노이즈 필터링")
    parser.add_argument("target_dir", help="처리할 CSV 폴더 경로")
    parser.add_argument("--output-dir", default=None, help="출력 폴더 직접 지정")
    parser.add_argument("--no-embedding", action="store_true", help="임베딩 유사도 중복 제거 비활성화 (빠른 처리)")
    parser.add_argument("--threshold", type=float, default=0.97, help="임베딩 유사도 임계값 (기본: 0.97)")
    args = parser.parse_args()

    if not os.path.isdir(args.target_dir):
        print(f"폴더 없음: {args.target_dir}")
        return

    csv_files = sorted(glob.glob(os.path.join(args.target_dir, "*.csv")))
    if not csv_files:
        print(f"CSV 파일 없음: {args.target_dir}")
        return

    # 출력 폴더 결정
    if args.output_dir:
        output_dir = args.output_dir
    else:
        dir_name = os.path.basename(args.target_dir.rstrip("/"))
        output_dir = os.path.join("output", "filtered_" + dir_name)
    os.makedirs(output_dir, exist_ok=True)

    # 임베딩 모델 로드
    embedder = None
    if not args.no_embedding:
        embedder = TitleEmbedder()

    print(f"\n{'='*60}")
    print(f"  뉴스 기사 정리 시작")
    print(f"  입력: {args.target_dir} ({len(csv_files)}개 CSV)")
    print(f"  출력: {output_dir}/")
    print(f"  임베딩 중복 제거: {'ON' if embedder else 'OFF'}")
    print(f"{'='*60}\n")

    # 체크포인트: 이미 출력 폴더에 있는 파일은 스킵
    already_done = set(os.listdir(output_dir))
    pending = [(i, f) for i, f in enumerate(csv_files) if os.path.basename(f) not in already_done]

    if len(pending) < len(csv_files):
        skipped = len(csv_files) - len(pending)
        print(f"  체크포인트: {skipped}개 이미 처리됨, {len(pending)}개 남음\n")

    total_original = 0
    total_final = 0
    total_stats: dict[str, int] = {}

    for seq, (_, csv_path) in enumerate(pending, 1):
        result = clean_csv(csv_path, output_dir, embedder)
        total_original += result["original"]
        total_final += result["final"]

        removed_total = result["original"] - result["final"]
        if removed_total > 0:
            detail = ", ".join(f"{k}:{v}" for k, v in result["removed"].items())
            print(f"  [{seq}/{len(pending)}] {result['file']}: {result['original']} → {result['final']} (-{removed_total}: {detail})")

            for k, v in result["removed"].items():
                total_stats[k] = total_stats.get(k, 0) + v

        if seq % 50 == 0:
            print(f"  ... {seq}/{len(pending)} 처리 완료")

    print(f"\n{'='*60}")
    print(f"  정리 완료")
    print(f"  전체: {total_original} → {total_final} (-{total_original - total_final}건)")
    print(f"  사유별:")
    for k, v in sorted(total_stats.items(), key=lambda x: -x[1]):
        print(f"    {k}: {v}건")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
