"""
dashboard/pages/3_explore.py
종목별 원시 데이터 탐색 페이지.
OHLCV, 수급, 매크로, 펀더멘털 차트를 인터랙티브하게 제공합니다.
"""

from __future__ import annotations

import datetime
import json
import sys
from pathlib import Path

import pandas as pd
import streamlit as st

# 프로젝트 루트를 sys.path에 추가
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from config import (  # noqa: E402
    RAW_FUNDAMENTAL_PATH,
    RAW_MACRO_PATH,
    RAW_OHLCV_PATH,
    RAW_SUPPLY_PATH,
    RAW_UNIVERSE_PATH,
)

# ---------------------------------------------------------------------------
# plotly 임포트 (없으면 streamlit 기본 차트 사용)
# ---------------------------------------------------------------------------
try:
    import plotly.graph_objects as go
    from plotly.subplots import make_subplots

    _PLOTLY_AVAILABLE = True
except ImportError:
    _PLOTLY_AVAILABLE = False

# ---------------------------------------------------------------------------
# 캐시된 데이터 로더
# ---------------------------------------------------------------------------


@st.cache_data(show_spinner=False)
def _load_sector_mapping() -> dict[str, str]:
    """sector_mapping.json에서 {ticker: name} 딕셔너리 반환."""
    candidates = [
        Path(__file__).resolve().parent.parent.parent / "sector_mapping.json",
        RAW_UNIVERSE_PATH / "sector_mapping.json",
    ]
    for path in candidates:
        if path.exists():
            try:
                with open(path, encoding="utf-8") as f:
                    data = json.load(f)
                # 여러 형식 지원: {ticker: name} 또는 {ticker: {name: ..., ...}}
                result: dict[str, str] = {}
                for k, v in data.items():
                    if isinstance(v, dict):
                        result[k] = v.get("name", v.get("company_name", k))
                    else:
                        result[k] = str(v)
                return result
            except Exception:
                pass
    return {}


@st.cache_data(show_spinner=False)
def _list_tickers() -> list[str]:
    """RAW_OHLCV_PATH의 parquet 파일 목록에서 ticker 리스트 반환."""
    if not RAW_OHLCV_PATH.exists():
        return []
    return sorted(p.stem for p in RAW_OHLCV_PATH.glob("*.parquet"))


@st.cache_data(show_spinner=False)
def _load_ohlcv(ticker: str) -> pd.DataFrame | None:
    path = RAW_OHLCV_PATH / f"{ticker}.parquet"
    if not path.exists():
        return None
    df = pd.read_parquet(path)
    if not isinstance(df.index, pd.DatetimeIndex):
        # date 컬럼이 있으면 인덱스로 설정
        date_cols = [c for c in df.columns if c.lower() in ("date", "날짜")]
        if date_cols:
            df = df.set_index(date_cols[0])
        df.index = pd.to_datetime(df.index)
    df = df.sort_index()
    return df


@st.cache_data(show_spinner=False)
def _load_supply(ticker: str) -> pd.DataFrame | None:
    path = RAW_SUPPLY_PATH / f"{ticker}.parquet"
    if not path.exists():
        return None
    df = pd.read_parquet(path)
    if not isinstance(df.index, pd.DatetimeIndex):
        date_cols = [c for c in df.columns if c.lower() in ("date", "날짜")]
        if date_cols:
            df = df.set_index(date_cols[0])
        df.index = pd.to_datetime(df.index)
    return df.sort_index()


@st.cache_data(show_spinner=False)
def _list_macro_indicators() -> list[str]:
    if not RAW_MACRO_PATH.exists():
        return []
    return sorted(p.stem for p in RAW_MACRO_PATH.glob("*.parquet"))


@st.cache_data(show_spinner=False)
def _load_macro(indicator: str) -> pd.DataFrame | None:
    path = RAW_MACRO_PATH / f"{indicator}.parquet"
    if not path.exists():
        return None
    df = pd.read_parquet(path)
    if not isinstance(df.index, pd.DatetimeIndex):
        date_cols = [c for c in df.columns if c.lower() in ("date", "날짜")]
        if date_cols:
            df = df.set_index(date_cols[0])
        df.index = pd.to_datetime(df.index)
    return df.sort_index()


@st.cache_data(show_spinner=False)
def _load_fundamental(ticker: str) -> pd.DataFrame | None:
    """RAW_FUNDAMENTAL_PATH / {ticker}.parquet 읽기."""
    path = RAW_FUNDAMENTAL_PATH / f"{ticker}.parquet"
    if not path.exists():
        return None
    df = pd.read_parquet(path)
    if not isinstance(df.index, pd.DatetimeIndex):
        date_cols = [c for c in df.columns if c.lower() in ("date", "날짜")]
        if date_cols:
            df = df.set_index(date_cols[0])
        df.index = pd.to_datetime(df.index)
    return df.sort_index()


# ---------------------------------------------------------------------------
# 차트 헬퍼
# ---------------------------------------------------------------------------


def _plotly_ohlcv(df: pd.DataFrame, ticker: str, date_range: tuple[pd.Timestamp, pd.Timestamp]) -> None:
    """종가 라인 + 거래량 바 차트 (plotly)."""
    start, end = date_range
    mask = (df.index >= start) & (df.index <= end)
    sub = df.loc[mask]

    close_col = _find_col(df, ["close", "종가", "Close"])
    vol_col = _find_col(df, ["volume", "거래량", "Volume"])

    if close_col is None:
        st.warning("종가(close) 컬럼을 찾을 수 없습니다.")
        return

    has_vol = vol_col is not None and vol_col in sub.columns

    rows = 2 if has_vol else 1
    row_heights = [0.7, 0.3] if has_vol else [1.0]

    fig = make_subplots(
        rows=rows,
        cols=1,
        shared_xaxes=True,
        vertical_spacing=0.03,
        row_heights=row_heights,
    )

    fig.add_trace(
        go.Scatter(
            x=sub.index,
            y=sub[close_col],
            mode="lines",
            name="종가",
            line=dict(color="#1f77b4", width=1.5),
        ),
        row=1,
        col=1,
    )

    if has_vol:
        fig.add_trace(
            go.Bar(
                x=sub.index,
                y=sub[vol_col],
                name="거래량",
                marker_color="rgba(100,149,237,0.5)",
            ),
            row=2,
            col=1,
        )
        fig.update_yaxes(title_text="거래량", row=2, col=1)

    fig.update_layout(
        title=f"{ticker} OHLCV",
        xaxis_title="날짜",
        yaxis_title="종가 (원)",
        height=450,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=0, r=0, t=40, b=0),
    )
    st.plotly_chart(fig, use_container_width=True)


def _streamlit_ohlcv(df: pd.DataFrame, ticker: str, date_range: tuple[pd.Timestamp, pd.Timestamp]) -> None:
    """종가 라인 + 거래량 바 차트 (streamlit 기본)."""
    start, end = date_range
    mask = (df.index >= start) & (df.index <= end)
    sub = df.loc[mask]

    close_col = _find_col(df, ["close", "종가", "Close"])
    vol_col = _find_col(df, ["volume", "거래량", "Volume"])

    if close_col is None:
        st.warning("종가(close) 컬럼을 찾을 수 없습니다.")
        return

    st.line_chart(sub[[close_col]], height=250)
    if vol_col and vol_col in sub.columns:
        st.bar_chart(sub[[vol_col]], height=150)


def _plotly_supply(df: pd.DataFrame, ticker: str, date_range: tuple[pd.Timestamp, pd.Timestamp]) -> None:
    """외국인/기관/개인 순매수 라인 차트 (plotly)."""
    start, end = date_range
    mask = (df.index >= start) & (df.index <= end)
    sub = df.loc[mask]

    foreign_col = _find_col(df, ["foreign_net", "외국인_순매수", "foreign", "외국인"])
    inst_col = _find_col(df, ["institution_net", "기관_순매수", "institution", "기관"])
    indiv_col = _find_col(df, ["individual_net", "개인_순매수", "individual", "개인"])

    traces = []
    for col, name, color in [
        (foreign_col, "외국인", "#e74c3c"),
        (inst_col, "기관", "#2ecc71"),
        (indiv_col, "개인", "#3498db"),
    ]:
        if col and col in sub.columns:
            traces.append(
                go.Scatter(
                    x=sub.index,
                    y=sub[col],
                    mode="lines",
                    name=name,
                    line=dict(color=color, width=1.5),
                )
            )

    if not traces:
        st.info("수급 데이터에서 외국인/기관/개인 컬럼을 찾을 수 없습니다.")
        st.dataframe(sub.head(5))
        return

    fig = go.Figure(data=traces)
    fig.update_layout(
        title=f"{ticker} 수급 (순매수)",
        xaxis_title="날짜",
        yaxis_title="순매수 (주)",
        height=350,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=0, r=0, t=40, b=0),
    )
    st.plotly_chart(fig, use_container_width=True)


def _streamlit_supply(df: pd.DataFrame, date_range: tuple[pd.Timestamp, pd.Timestamp]) -> None:
    start, end = date_range
    mask = (df.index >= start) & (df.index <= end)
    sub = df.loc[mask]

    cols = [c for c in df.columns if any(k in c.lower() for k in ["foreign", "institution", "individual", "외국인", "기관", "개인"])]
    if cols:
        st.line_chart(sub[cols], height=300)
    else:
        st.line_chart(sub.select_dtypes("number"), height=300)


def _plotly_macro(
    data: dict[str, pd.DataFrame],
    date_range: tuple[pd.Timestamp, pd.Timestamp],
    normalize: bool,
) -> None:
    """선택한 매크로 지표 라인 차트 (plotly)."""
    start, end = date_range
    fig = go.Figure()

    colors = [
        "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
        "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
    ]

    for i, (indicator, df) in enumerate(data.items()):
        mask = (df.index >= start) & (df.index <= end)
        sub = df.loc[mask]
        close_col = _find_col(df, ["close", "Close", "value", "값"])
        if close_col is None:
            close_col = sub.select_dtypes("number").columns[0] if len(sub.select_dtypes("number").columns) > 0 else None
        if close_col is None:
            continue
        series = sub[close_col].dropna()
        if normalize and len(series) > 0:
            first = series.iloc[0]
            if first != 0:
                series = (series / first - 1) * 100

        fig.add_trace(
            go.Scatter(
                x=series.index,
                y=series,
                mode="lines",
                name=indicator,
                line=dict(color=colors[i % len(colors)], width=1.5),
            )
        )

    ylabel = "변화율 (%)" if normalize else "값"
    fig.update_layout(
        title="매크로 지표",
        xaxis_title="날짜",
        yaxis_title=ylabel,
        height=380,
        legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1),
        margin=dict(l=0, r=0, t=40, b=0),
    )
    st.plotly_chart(fig, use_container_width=True)


def _plotly_fundamental(df: pd.DataFrame, ticker: str, date_range: tuple[pd.Timestamp, pd.Timestamp]) -> None:
    """PER / PBR / EPS 차트 (plotly)."""
    start, end = date_range
    mask = (df.index >= start) & (df.index <= end)
    sub = df.loc[mask]

    metrics = {}
    for key, candidates in [
        ("PER", ["per", "PER", "p_e_ratio"]),
        ("PBR", ["pbr", "PBR", "p_b_ratio"]),
        ("EPS", ["eps", "EPS", "earnings_per_share"]),
    ]:
        col = _find_col(df, candidates)
        if col and col in sub.columns:
            metrics[key] = sub[col].dropna()

    if not metrics:
        st.info("펀더멘털 데이터에서 PER/PBR/EPS 컬럼을 찾을 수 없습니다.")
        st.dataframe(sub.head(5))
        return

    n = len(metrics)
    fig = make_subplots(rows=n, cols=1, shared_xaxes=True, vertical_spacing=0.05)
    colors = ["#e74c3c", "#2ecc71", "#3498db"]

    for idx, (name, series) in enumerate(metrics.items(), start=1):
        fig.add_trace(
            go.Scatter(
                x=series.index,
                y=series,
                mode="lines+markers",
                name=name,
                line=dict(color=colors[(idx - 1) % len(colors)], width=1.5),
                marker=dict(size=4),
            ),
            row=idx,
            col=1,
        )
        fig.update_yaxes(title_text=name, row=idx, col=1)

    fig.update_layout(
        title=f"{ticker} 펀더멘털",
        height=120 * n + 80,
        showlegend=False,
        margin=dict(l=0, r=0, t=40, b=0),
    )
    st.plotly_chart(fig, use_container_width=True)


# ---------------------------------------------------------------------------
# 유틸리티
# ---------------------------------------------------------------------------


def _find_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
    """컬럼 이름 후보 목록에서 첫 번째 매칭 컬럼 반환."""
    for c in candidates:
        if c in df.columns:
            return c
    # 대소문자 무시
    lower_map = {col.lower(): col for col in df.columns}
    for c in candidates:
        if c.lower() in lower_map:
            return lower_map[c.lower()]
    return None


def _date_range_slider(df: pd.DataFrame, key_prefix: str) -> tuple[pd.Timestamp, pd.Timestamp]:
    """날짜 범위 슬라이더 위젯 반환."""
    min_date = df.index.min().to_pydatetime()
    max_date = df.index.max().to_pydatetime()

    selected = st.slider(
        "날짜 범위",
        min_value=min_date,
        max_value=max_date,
        value=(min_date, max_date),
        format="YYYY-MM-DD",
        key=f"{key_prefix}_date_slider",
    )
    return pd.Timestamp(selected[0]), pd.Timestamp(selected[1])


# ---------------------------------------------------------------------------
# 메인 페이지
# ---------------------------------------------------------------------------


def main() -> None:
    st.title("데이터 탐색")
    st.caption("종목별 OHLCV, 수급, 매크로, 펀더멘털 데이터를 시각화합니다.")

    # ------------------------------------------------------------------
    # 사이드바 — 종목 선택
    # ------------------------------------------------------------------
    st.sidebar.header("종목 선택")

    tickers = _list_tickers()
    if not tickers:
        st.sidebar.warning(f"OHLCV 데이터가 없습니다.\n경로: `{RAW_OHLCV_PATH}`")
        st.warning("수집된 OHLCV 데이터가 없습니다. 먼저 데이터를 수집하세요.")
        return

    sector_map = _load_sector_mapping()

    def _label(t: str) -> str:
        name = sector_map.get(t, "")
        return f"{t} - {name}" if name else t

    ticker_labels = [_label(t) for t in tickers]
    selected_label = st.sidebar.selectbox("종목", ticker_labels, key="ticker_select")
    ticker = tickers[ticker_labels.index(selected_label)]

    st.sidebar.markdown("---")
    st.sidebar.caption(f"선택 종목: **{ticker}**")

    # ------------------------------------------------------------------
    # OHLCV 탭 / 수급 탭 / 매크로 탭 / 펀더멘털 탭
    # ------------------------------------------------------------------
    tab_ohlcv, tab_supply, tab_macro, tab_fundamental = st.tabs(
        ["OHLCV", "수급", "매크로", "펀더멘털"]
    )

    # ---- OHLCV --------------------------------------------------------
    with tab_ohlcv:
        st.subheader(f"{ticker} OHLCV")
        with st.spinner("로딩 중..."):
            ohlcv_df = _load_ohlcv(ticker)

        if ohlcv_df is None or ohlcv_df.empty:
            st.warning(f"{ticker} OHLCV 파일이 없습니다.")
        else:
            st.caption(f"기간: {ohlcv_df.index.min().date()} ~ {ohlcv_df.index.max().date()} / {len(ohlcv_df):,}행")
            date_range = _date_range_slider(ohlcv_df, "ohlcv")

            if _PLOTLY_AVAILABLE:
                _plotly_ohlcv(ohlcv_df, ticker, date_range)
            else:
                _streamlit_ohlcv(ohlcv_df, ticker, date_range)

            with st.expander("원시 데이터 미리보기"):
                st.dataframe(ohlcv_df.tail(20))

    # ---- 수급 ---------------------------------------------------------
    with tab_supply:
        st.subheader(f"{ticker} 수급")
        with st.spinner("로딩 중..."):
            supply_df = _load_supply(ticker)

        if supply_df is None or supply_df.empty:
            st.info(f"{ticker} 수급 데이터 없음 (경로: `{RAW_SUPPLY_PATH / f'{ticker}.parquet'}`)")
        else:
            st.caption(f"기간: {supply_df.index.min().date()} ~ {supply_df.index.max().date()} / {len(supply_df):,}행")
            date_range_s = _date_range_slider(supply_df, "supply")

            if _PLOTLY_AVAILABLE:
                _plotly_supply(supply_df, ticker, date_range_s)
            else:
                _streamlit_supply(supply_df, date_range_s)

            with st.expander("원시 데이터 미리보기"):
                st.dataframe(supply_df.tail(20))

    # ---- 매크로 -------------------------------------------------------
    with tab_macro:
        st.subheader("매크로 지표")
        macro_indicators = _list_macro_indicators()

        if not macro_indicators:
            st.info(f"매크로 데이터 없음 (경로: `{RAW_MACRO_PATH}`)")
        else:
            selected_indicators = st.multiselect(
                "지표 선택",
                macro_indicators,
                default=macro_indicators[:3] if len(macro_indicators) >= 3 else macro_indicators,
                key="macro_select",
            )
            normalize = st.checkbox("정규화 (기준일 대비 변화율 %)", value=False, key="macro_normalize")

            if not selected_indicators:
                st.info("하나 이상의 지표를 선택하세요.")
            else:
                macro_data: dict[str, pd.DataFrame] = {}
                with st.spinner("로딩 중..."):
                    for ind in selected_indicators:
                        df_m = _load_macro(ind)
                        if df_m is not None and not df_m.empty:
                            macro_data[ind] = df_m

                if not macro_data:
                    st.warning("선택한 지표 데이터를 읽을 수 없습니다.")
                else:
                    # 전체 기간 결정 (모든 지표의 union)
                    all_dates = pd.concat([df.index.to_series() for df in macro_data.values()])
                    min_d = all_dates.min().to_pydatetime()
                    max_d = all_dates.max().to_pydatetime()

                    macro_range = st.slider(
                        "날짜 범위",
                        min_value=min_d,
                        max_value=max_d,
                        value=(min_d, max_d),
                        format="YYYY-MM-DD",
                        key="macro_date_slider",
                    )
                    macro_ts = (pd.Timestamp(macro_range[0]), pd.Timestamp(macro_range[1]))

                    if _PLOTLY_AVAILABLE:
                        _plotly_macro(macro_data, macro_ts, normalize)
                    else:
                        # fallback: 단순 라인 차트
                        combined = pd.DataFrame()
                        for ind, df_m in macro_data.items():
                            close_col = _find_col(df_m, ["close", "Close", "value"])
                            if close_col:
                                s = df_m[close_col].rename(ind)
                                if normalize and s.iloc[0] != 0:
                                    s = (s / s.iloc[0] - 1) * 100
                                combined = pd.concat([combined, s], axis=1)
                        if not combined.empty:
                            mask = (combined.index >= macro_ts[0]) & (combined.index <= macro_ts[1])
                            st.line_chart(combined.loc[mask], height=350)

    # ---- 펀더멘털 -----------------------------------------------------
    with tab_fundamental:
        st.subheader(f"{ticker} 펀더멘털")
        with st.spinner("로딩 중..."):
            fund_df = _load_fundamental(ticker)

        if fund_df is None or fund_df.empty:
            st.info(f"{ticker} 펀더멘털 데이터 없음 (경로: `{RAW_FUNDAMENTAL_PATH / f'{ticker}.parquet'}`)")
        else:
            st.caption(f"기간: {fund_df.index.min().date()} ~ {fund_df.index.max().date()} / {len(fund_df):,}행")
            date_range_f = _date_range_slider(fund_df, "fundamental")

            if _PLOTLY_AVAILABLE:
                _plotly_fundamental(fund_df, ticker, date_range_f)
            else:
                numeric_cols = fund_df.select_dtypes("number").columns.tolist()
                target_cols = [c for c in numeric_cols if any(k in c.lower() for k in ["per", "pbr", "eps"])]
                cols_to_show = target_cols if target_cols else numeric_cols[:3]
                if cols_to_show:
                    mask = (fund_df.index >= date_range_f[0]) & (fund_df.index <= date_range_f[1])
                    st.line_chart(fund_df.loc[mask, cols_to_show], height=300)

            with st.expander("원시 데이터 미리보기"):
                st.dataframe(fund_df.tail(20))


if __name__ == "__main__":
    main()
else:
    main()
