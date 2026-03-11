"""
dashboard/pages/1_overview.py
데이터 현황 페이지 — 수집 파일 수, 용량, 종목별 상태, 매크로 지표 상태를 표시.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

# 프로젝트 루트를 sys.path에 추가
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from config import (
    PROCESSED_BASE_PATH,
    RAW_FINANCIAL_PATH,
    RAW_FUNDAMENTAL_PATH,
    RAW_MACRO_PATH,
    RAW_OHLCV_PATH,
    RAW_SUPPLY_PATH,
    RAW_UNIVERSE_PATH,
)

# ---------------------------------------------------------------------------
# 유틸리티
# ---------------------------------------------------------------------------

def _dir_stats(path: Path, pattern: str = "*.parquet") -> tuple[int, float]:
    """파일 수와 총 용량(MB)을 반환합니다."""
    if not path.exists():
        return 0, 0.0
    files = list(path.glob(pattern))
    total_bytes = sum(f.stat().st_size for f in files if f.is_file())
    return len(files), total_bytes / (1024 ** 2)


def _last_modified(path: Path, pattern: str = "*.parquet") -> str:
    """디렉토리 내 파일들의 가장 최근 수정 시각을 반환합니다."""
    if not path.exists():
        return "-"
    files = list(path.glob(pattern))
    if not files:
        return "-"
    latest = max(f.stat().st_mtime for f in files if f.is_file())
    return pd.Timestamp(latest, unit="s").strftime("%Y-%m-%d %H:%M")


def _load_sector_mapping() -> dict[str, dict]:
    """sector_mapping.json을 로드합니다. 파일 없으면 빈 dict 반환."""
    json_path = RAW_UNIVERSE_PATH / "sector_mapping.json"
    if not json_path.exists():
        return {}
    try:
        with open(json_path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _get_parquet_last_date(file_path: Path) -> str:
    """parquet 파일의 인덱스 마지막 날짜를 반환합니다."""
    try:
        df = pd.read_parquet(file_path, columns=[])
        if df.index.empty:
            return "-"
        last = df.index[-1]
        if hasattr(last, "strftime"):
            return last.strftime("%Y-%m-%d")
        return str(last)[:10]
    except Exception:
        return "-"


def _get_parquet_row_count(file_path: Path) -> int:
    """parquet 파일의 행 수를 반환합니다."""
    try:
        import pyarrow.parquet as pq
        pf = pq.read_metadata(file_path)
        return pf.num_rows
    except Exception:
        try:
            df = pd.read_parquet(file_path, columns=[])
            return len(df)
        except Exception:
            return -1


# ---------------------------------------------------------------------------
# 섹션별 렌더링 함수
# ---------------------------------------------------------------------------

def render_summary_cards() -> None:
    """수집 현황 요약 카드를 렌더링합니다."""
    st.subheader("수집 현황 요약")

    datasets = [
        ("OHLCV", RAW_OHLCV_PATH, "*.parquet"),
        ("수급", RAW_SUPPLY_PATH, "*.parquet"),
        ("매크로", RAW_MACRO_PATH, "*.parquet"),
        ("재무", RAW_FINANCIAL_PATH, "*.parquet"),
        ("펀더멘털", RAW_FUNDAMENTAL_PATH, "*.parquet"),
        ("베이스 피처", PROCESSED_BASE_PATH, "*.parquet"),
    ]

    cols = st.columns(len(datasets))
    for col, (label, path, pattern) in zip(cols, datasets):
        count, size_mb = _dir_stats(path, pattern)
        col.metric(
            label=label,
            value=f"{count:,} 파일",
            delta=f"{size_mb:.1f} MB" if size_mb > 0 else "0 MB",
            delta_color="off",
        )


def render_ticker_status_table() -> None:
    """종목별 수집 상태 테이블을 렌더링합니다."""
    st.subheader("종목별 수집 상태")

    sector_mapping = _load_sector_mapping()

    # OHLCV 파일 목록으로 ticker 집합 결정
    ohlcv_files = {f.stem: f for f in RAW_OHLCV_PATH.glob("*.parquet")} if RAW_OHLCV_PATH.exists() else {}
    supply_files = {f.stem for f in RAW_SUPPLY_PATH.glob("*.parquet")} if RAW_SUPPLY_PATH.exists() else set()
    fundamental_files = {f.stem for f in RAW_FUNDAMENTAL_PATH.glob("*.parquet")} if RAW_FUNDAMENTAL_PATH.exists() else set()

    # 재무 파일은 {ticker}_{YYYYMMDD}.parquet 형태이므로 ticker prefix 추출
    financial_tickers: set[str] = set()
    if RAW_FINANCIAL_PATH.exists():
        for f in RAW_FINANCIAL_PATH.glob("*.parquet"):
            parts = f.stem.rsplit("_", 1)
            if len(parts) == 2:
                financial_tickers.add(parts[0])

    tickers = sorted(ohlcv_files.keys())
    if not tickers:
        st.info("OHLCV 데이터가 없습니다. 먼저 파이프라인을 실행하세요.")
        return

    rows = []
    progress = st.progress(0, text="종목 상태 집계 중...")
    total = len(tickers)

    for i, ticker in enumerate(tickers):
        info = sector_mapping.get(ticker, {})
        name = info.get("name", "-") if isinstance(info, dict) else "-"
        sector = info.get("sector", "-") if isinstance(info, dict) else "-"

        has_ohlcv = ticker in ohlcv_files
        has_supply = ticker in supply_files
        has_fundamental = ticker in fundamental_files
        has_financial = ticker in financial_tickers

        last_date = _get_parquet_last_date(ohlcv_files[ticker]) if has_ohlcv else "-"

        rows.append({
            "티커": ticker,
            "종목명": name,
            "섹터": sector,
            "OHLCV": "✅" if has_ohlcv else "❌",
            "수급": "✅" if has_supply else "❌",
            "펀더멘털": "✅" if has_fundamental else "❌",
            "재무": "✅" if has_financial else "❌",
            "마지막 수집일": last_date,
        })
        progress.progress((i + 1) / total, text=f"종목 상태 집계 중... {i+1}/{total}")

    progress.empty()
    df = pd.DataFrame(rows)

    # 필터 UI
    col1, col2 = st.columns([2, 1])
    with col1:
        search = st.text_input("티커/종목명 검색", placeholder="예: 005930 또는 삼성전자")
    with col2:
        missing_only = st.checkbox("미수집 종목만 보기")

    if search:
        mask = df["티커"].str.contains(search, case=False) | df["종목명"].str.contains(search, case=False, na=False)
        df = df[mask]
    if missing_only:
        mask = (df["OHLCV"] == "❌") | (df["수급"] == "❌") | (df["펀더멘털"] == "❌")
        df = df[mask]

    st.dataframe(df, use_container_width=True, hide_index=True)
    st.caption(f"총 {len(df):,}개 종목 표시 / 전체 {len(tickers):,}개 종목")


def render_macro_status() -> None:
    """매크로 지표 상태 테이블을 렌더링합니다."""
    st.subheader("매크로 지표 상태")

    if not RAW_MACRO_PATH.exists():
        st.info("매크로 데이터 경로가 없습니다.")
        return

    macro_files = sorted(RAW_MACRO_PATH.glob("*.parquet"))
    if not macro_files:
        st.info("매크로 데이터가 없습니다. 먼저 파이프라인을 실행하세요.")
        return

    rows = []
    for f in macro_files:
        try:
            df = pd.read_parquet(f)
            n_rows = len(df)
            if df.index.empty:
                date_range = "-"
                last_date = "-"
            else:
                first = df.index[0]
                last = df.index[-1]
                first_str = first.strftime("%Y-%m-%d") if hasattr(first, "strftime") else str(first)[:10]
                last_str = last.strftime("%Y-%m-%d") if hasattr(last, "strftime") else str(last)[:10]
                date_range = f"{first_str} ~ {last_str}"
                last_date = last_str
        except Exception as e:
            n_rows = -1
            date_range = f"오류: {e}"
            last_date = "-"

        rows.append({
            "지표명": f.stem,
            "파일명": f.name,
            "행 수": n_rows,
            "날짜 범위": date_range,
            "마지막 날짜": last_date,
        })

    df_macro = pd.DataFrame(rows)
    st.dataframe(df_macro, use_container_width=True, hide_index=True)


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def main() -> None:
    st.title("📊 데이터 현황")
    st.markdown("수집된 데이터의 파일 수, 용량, 종목별 상태를 한눈에 확인합니다.")
    st.markdown("---")

    render_summary_cards()
    st.markdown("---")
    render_ticker_status_table()
    st.markdown("---")
    render_macro_status()


main()
