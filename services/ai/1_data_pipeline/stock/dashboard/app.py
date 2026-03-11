"""
dashboard/app.py
KOSPI200 데이터 파이프라인 Streamlit 대시보드 진입점.
"""

import sys
from pathlib import Path

import streamlit as st

# 프로젝트 루트를 sys.path에 추가
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# 페이지 설정 (최초 1회만 호출)
st.set_page_config(
    page_title="KOSPI200 데이터 파이프라인",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded",
)

from config import BASE_PATH  # noqa: E402


def main() -> None:
    st.sidebar.title("KOSPI200 데이터 파이프라인")
    st.sidebar.markdown("---")
    st.sidebar.caption(f"데이터 경로: `{BASE_PATH}`")

    # 메인 화면 — 사용자가 사이드바 네비게이션으로 페이지를 이동
    st.title("KOSPI200 데이터 파이프라인 대시보드")
    st.markdown(
        """
        왼쪽 사이드바에서 페이지를 선택하세요.

        | 페이지 | 설명 |
        |--------|------|
        | 📊 데이터 현황 | 수집된 파일 수, 용량, 종목별 상태 |
        | 🔍 데이터 품질 | 결측치·이상치 품질 리포트 |
        | 📈 데이터 탐색 | 종목별 OHLCV·수급 차트 |
        """
    )

    st.info("사이드바의 **Pages** 메뉴에서 페이지를 선택하세요.", icon="ℹ️")


if __name__ == "__main__":
    main()
