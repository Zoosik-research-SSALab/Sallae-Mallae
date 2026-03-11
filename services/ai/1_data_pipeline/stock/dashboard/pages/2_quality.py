"""
dashboard/pages/2_quality.py
데이터 품질 페이지 — OHLCV/수급/매크로/재무 파일의 결측치·이상치를 점검합니다.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd
import streamlit as st

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from config import (
    RAW_FINANCIAL_PATH,
    RAW_MACRO_PATH,
    RAW_OHLCV_PATH,
    RAW_SUPPLY_PATH,
)

# ---------------------------------------------------------------------------
# 상수
# ---------------------------------------------------------------------------

RETURN_OUTLIER_THRESHOLD = 0.30  # 일별 수익률 ±30% 초과 시 이상치
MISSING_RATE_THRESHOLD = 0.01    # 결측률 1% 초과 시 경고


# ---------------------------------------------------------------------------
# 유틸리티
# ---------------------------------------------------------------------------

def _missing_rate(df: pd.DataFrame) -> float:
    if df.empty:
        return 1.0
    total = df.size
    missing = int(df.isnull().sum().sum())
    return missing / total if total > 0 else 1.0


def _detect_return_outliers(df: pd.DataFrame, col: str = "close") -> int:
    if col not in df.columns or len(df) < 2:
        return 0
    ret = df[col].pct_change().dropna()
    return int((ret.abs() > RETURN_OUTLIER_THRESHOLD).sum())


def _status_badge(ok: bool) -> str:
    return "✅ 정상" if ok else "⚠️ 경고"


# ---------------------------------------------------------------------------
# 캐시된 품질 검사 함수
# ---------------------------------------------------------------------------

@st.cache_data(ttl=300, show_spinner=False)
def _check_ohlcv_quality() -> pd.DataFrame:
    if not RAW_OHLCV_PATH.exists():
        return pd.DataFrame()
    rows = []
    for f in sorted(RAW_OHLCV_PATH.glob("*.parquet")):
        ticker = f.stem
        try:
            df = pd.read_parquet(f)
            n_rows = len(df)
            missing = _missing_rate(df)
            n_outliers = _detect_return_outliers(df)
            last_date = str(df.index[-1])[:10] if not df.index.empty else "-"
            missing_ok = missing <= MISSING_RATE_THRESHOLD
            outlier_ok = n_outliers == 0
            status = "정상" if (missing_ok and outlier_ok) else "경고"
        except Exception as e:
            n_rows, missing, n_outliers, last_date = -1, 1.0, -1, "-"
            missing_ok = outlier_ok = False
            status = f"오류: {e}"
        rows.append({
            "티커": ticker,
            "행 수": n_rows,
            "결측률": f"{missing*100:.2f}%",
            "결측 상태": _status_badge(missing_ok),
            "이상치 수": n_outliers,
            "이상치 상태": _status_badge(outlier_ok),
            "마지막 날짜": last_date,
            "종합": status,
        })
    return pd.DataFrame(rows)


@st.cache_data(ttl=300, show_spinner=False)
def _check_supply_quality() -> pd.DataFrame:
    if not RAW_SUPPLY_PATH.exists():
        return pd.DataFrame()
    rows = []
    for f in sorted(RAW_SUPPLY_PATH.glob("*.parquet")):
        ticker = f.stem
        try:
            df = pd.read_parquet(f)
            n_rows = len(df)
            missing = _missing_rate(df)
            last_date = str(df.index[-1])[:10] if not df.index.empty else "-"
            missing_ok = missing <= MISSING_RATE_THRESHOLD
            status = "정상" if missing_ok else "경고"
        except Exception as e:
            n_rows, missing, last_date = -1, 1.0, "-"
            missing_ok = False
            status = f"오류: {e}"
        rows.append({
            "티커": ticker,
            "행 수": n_rows,
            "결측률": f"{missing*100:.2f}%",
            "결측 상태": _status_badge(missing_ok),
            "마지막 날짜": last_date,
            "종합": status,
        })
    return pd.DataFrame(rows)


@st.cache_data(ttl=300, show_spinner=False)
def _check_macro_quality() -> pd.DataFrame:
    if not RAW_MACRO_PATH.exists():
        return pd.DataFrame()
    rows = []
    for f in sorted(RAW_MACRO_PATH.glob("*.parquet")):
        try:
            df = pd.read_parquet(f)
            n_rows = len(df)
            missing = _missing_rate(df)
            last_date = str(df.index[-1])[:10] if not df.index.empty else "-"
            missing_ok = missing <= MISSING_RATE_THRESHOLD
            status = "정상" if missing_ok else "경고"
        except Exception as e:
            n_rows, missing, last_date = -1, 1.0, "-"
            missing_ok = False
            status = f"오류: {e}"
        rows.append({
            "지표": f.stem,
            "행 수": n_rows,
            "결측률": f"{missing*100:.2f}%",
            "결측 상태": _status_badge(missing_ok),
            "마지막 날짜": last_date,
            "종합": status,
        })
    return pd.DataFrame(rows)


@st.cache_data(ttl=300, show_spinner=False)
def _check_financial_quality(sample_size: int = 100) -> tuple[pd.DataFrame, int]:
    if not RAW_FINANCIAL_PATH.exists():
        return pd.DataFrame(), 0
    import random
    all_files = sorted(RAW_FINANCIAL_PATH.glob("*.parquet"))
    total = len(all_files)
    if total > sample_size:
        files = random.sample(all_files, sample_size)
    else:
        files = all_files
    rows = []
    for f in files:
        try:
            df = pd.read_parquet(f)
            n_rows = len(df)
            missing = _missing_rate(df)
            missing_ok = missing <= MISSING_RATE_THRESHOLD
            status = "정상" if missing_ok else "경고"
        except Exception as e:
            n_rows, missing = -1, 1.0
            missing_ok = False
            status = f"오류: {e}"
        rows.append({
            "파일명": f.name,
            "행 수": n_rows,
            "결측률": f"{missing*100:.2f}%",
            "결측 상태": _status_badge(missing_ok),
            "종합": status,
        })
    return pd.DataFrame(rows), total


def _summary_metrics(df: pd.DataFrame, status_col: str = "종합") -> tuple[int, int, int]:
    if df.empty:
        return 0, 0, 0
    total = len(df)
    ok = int((df[status_col] == "정상").sum())
    return total, ok, total - ok


def _render_section(
    title: str,
    df: pd.DataFrame,
    warn_key: str,
    empty_msg: str,
) -> None:
    st.subheader(title)
    if df.empty:
        st.info(empty_msg)
        return
    total, ok, warn = _summary_metrics(df)
    c1, c2, c3 = st.columns(3)
    c1.metric("전체", total)
    c2.metric("정상", ok, delta_color="off")
    c3.metric("경고", warn, delta_color="inverse" if warn > 0 else "off")

    filter_warn = st.checkbox("경고만 보기", key=warn_key)
    view = df[df["종합"] != "정상"] if filter_warn else df
    st.dataframe(view, use_container_width=True, hide_index=True)


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def main() -> None:
    st.title("🔍 데이터 품질")
    st.markdown(
        "수집된 원시 데이터의 결측치와 이상치를 데이터셋별로 점검합니다. "
        "결과는 5분간 캐시됩니다."
    )

    if st.button("캐시 초기화 및 재검사"):
        st.cache_data.clear()
        st.rerun()

    st.markdown("---")

    with st.spinner("OHLCV 품질 검사 중..."):
        df_ohlcv = _check_ohlcv_quality()
    _render_section("OHLCV 품질", df_ohlcv, "ohlcv_warn", "OHLCV 데이터가 없습니다.")

    st.markdown("---")

    with st.spinner("수급 품질 검사 중..."):
        df_supply = _check_supply_quality()
    _render_section("수급 품질", df_supply, "supply_warn", "수급 데이터가 없습니다.")

    st.markdown("---")

    with st.spinner("매크로 품질 검사 중..."):
        df_macro = _check_macro_quality()
    _render_section("매크로 품질", df_macro, "macro_warn", "매크로 데이터가 없습니다.")

    st.markdown("---")

    with st.spinner("재무 품질 검사 중..."):
        df_fin, fin_total = _check_financial_quality()
    _render_section("재무 품질", df_fin, "fin_warn", "재무 데이터가 없습니다.")
    if not df_fin.empty:
        st.caption(f"전체 {fin_total}개 파일 중 {len(df_fin)}개 샘플 검사")

    st.markdown("---")
    st.caption(
        f"결측률 기준: {MISSING_RATE_THRESHOLD*100:.0f}% 초과 시 경고 | "
        f"OHLCV 이상치 기준: 일별 종가 수익률 ±{RETURN_OUTLIER_THRESHOLD*100:.0f}% 초과"
    )


main()
