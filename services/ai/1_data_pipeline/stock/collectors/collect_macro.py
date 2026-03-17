"""
collectors/collect_macro.py
매크로 지표 수집 스크립트.

수집 대상 (9개):
  nasdaq, sp500, usd_krw, dxy, vix, us_bond_10y, sox  -> yfinance
  kospi200                                              -> pykrx
  kr_bond_3y                                            -> 한국은행 ECOS API (817Y002/010190000, 일별)

저장 경로: RAW_MACRO_PATH/{indicator_name}.parquet
인덱스: DatetimeIndex (이름 "date")
컬럼: close (필수), open, high, low, volume (가능한 경우)

Python 3.10+, Google Colab 호환.
"""

from __future__ import annotations

import argparse
import time
from datetime import date, timedelta

import pandas as pd

from config import (
    DART_API_KEY,
    ECOS_API_KEY,
    FRED_API_KEY,
    PARQUET_COMPRESSION,
    PYKRX_DELAY,
    RAW_FINANCIAL_PATH,
    RAW_MACRO_PATH,
)
from utils.drive_utils import ensure_dir, get_last_date, load_parquet, save_parquet
from utils.logger import setup_logger

logger = setup_logger(__name__)


# ---------------------------------------------------------------------------
# 타임아웃 헬퍼
# ---------------------------------------------------------------------------
def _call_with_timeout(fn, *args, timeout: int = 120, **kwargs):
    """외부 라이브러리 호출을 timeout 제한 하에 실행합니다."""
    from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
    with ThreadPoolExecutor(max_workers=1) as pool:
        future = pool.submit(fn, *args, **kwargs)
        try:
            return future.result(timeout=timeout)
        except FuturesTimeout:
            logger.error("외부 API 호출 timeout (%d초 초과): %s", timeout, fn.__name__)
            return None


# ---------------------------------------------------------------------------
# 수집 대상 정의
# ---------------------------------------------------------------------------
MACRO_SOURCES: dict[str, dict] = {
    "nasdaq":      {"source": "yfinance", "ticker": "^IXIC"},
    "sp500":       {"source": "yfinance", "ticker": "^GSPC"},
    "usd_krw":     {"source": "yfinance", "ticker": "KRW=X"},
    "dxy":         {"source": "yfinance", "ticker": "DX-Y.NYB"},
    "vix":         {"source": "yfinance", "ticker": "^VIX"},
    "us_bond_10y": {"source": "yfinance", "ticker": "^TNX"},
    "sox":         {"source": "yfinance", "ticker": "^SOX"},
    "kospi200":    {"source": "pykrx",    "ticker": "1028"},
    "kr_bond_3y":  {"source": "ecos",     "stat_code": "817Y002", "item_code": "010190000"},
}

_PLACEHOLDER_FRED = {"your_fred_api_key_here", ""}


# ---------------------------------------------------------------------------
# 내부 헬퍼
# ---------------------------------------------------------------------------
def _to_pykrx_date(d: str) -> str:
    """'YYYY-MM-DD' -> 'YYYYMMDD'"""
    return d.replace("-", "")


# ---------------------------------------------------------------------------
# yfinance 수집
# ---------------------------------------------------------------------------
def fetch_yfinance(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    """
    yfinance로 단일 종목/지수를 수집합니다.

    Returns:
        컬럼 close, open, high, low, volume 을 가진 DatetimeIndex DataFrame.
        수집 실패 시 빈 DataFrame 반환.
    """
    try:
        import yfinance as yf
    except ImportError:
        logger.error("yfinance 패키지가 설치되지 않았습니다: pip install yfinance")
        return pd.DataFrame()

    for attempt in range(2):  # 최대 2회 시도
        try:
            raw = _call_with_timeout(
                yf.download,
                ticker,
                start=start_date,
                end=end_date,
                progress=False,
                auto_adjust=True,
                timeout=120,
            )
            if raw is None or raw.empty:
                logger.warning("yfinance: %s 결과가 비어 있습니다 (start=%s, end=%s)", ticker, start_date, end_date)
                return pd.DataFrame()

            # MultiIndex 컬럼 처리 (yfinance >= 0.2.x 는 단일 ticker 시 flat)
            if isinstance(raw.columns, pd.MultiIndex):
                raw = raw.droplevel(1, axis=1)

            raw = raw.rename(
                columns={
                    "Close": "close",
                    "Open": "open",
                    "High": "high",
                    "Low": "low",
                    "Volume": "volume",
                    "Adj Close": "close",
                }
            )
            # 존재하는 컬럼만 선택
            keep = [c for c in ["close", "open", "high", "low", "volume"] if c in raw.columns]
            df = raw[keep].copy()
            df.index = pd.to_datetime(df.index)
            df.index.name = "date"
            df = df.sort_index()
            logger.info("yfinance: %s 수집 완료 (%d 행)", ticker, len(df))
            return df

        except Exception as exc:
            if attempt == 0:
                logger.warning("yfinance: %s 수집 실패 (시도 1/2) - %s. 재시도합니다.", ticker, exc)
                time.sleep(2)
            else:
                logger.error("yfinance: %s 수집 실패 (시도 2/2) - %s", ticker, exc)

    return pd.DataFrame()


# ---------------------------------------------------------------------------
# pykrx 수집
# ---------------------------------------------------------------------------
def fetch_kospi200(start_date: str, end_date: str) -> pd.DataFrame:
    """
    코스피200 지수를 수집합니다.

    pykrx(티커 1028)를 우선 시도하고, 실패하면 yfinance(^KS200)로 폴백합니다.
    pykrx의 get_index_ohlcv_by_date는 내부적으로 KRX 지수명 API를 호출하는데
    (name_display=True 기본값), 해당 API 응답 실패 시 '지수명' KeyError가 발생합니다.
    이를 name_display=False로 우회하거나, API 자체가 빈 응답을 반환할 경우
    yfinance로 폴백합니다.

    Returns:
        컬럼 open, high, low, close, volume 을 가진 DatetimeIndex DataFrame.
        실패 시 빈 DataFrame.
    """
    # --- pykrx 시도 ---
    try:
        from pykrx import stock as krx

        s = _to_pykrx_date(start_date)
        e = _to_pykrx_date(end_date)

        # name_display=False: 지수명 조회 API(IndexTicker) 호출을 건너뜀.
        # pykrx >= 1.0.x 의 stock_api.get_index_ohlcv_by_date 는 name_display 파라미터를
        # 지원하지만, 내부 wrap.get_index_ohlcv_by_date 에는 없으므로 stock API를 통해 호출.
        df = krx.get_index_ohlcv_by_date(s, e, "1028", name_display=False)
        if df is not None and not df.empty:
            # 한글 컬럼명 처리 (시가/고가/저가/종가/거래량)
            col_map = {
                "시가": "open", "고가": "high", "저가": "low",
                "종가": "close", "거래량": "volume",
            }
            df = df.rename(columns=col_map)
            df.columns = [c.lower() for c in df.columns]
            keep = [c for c in ["open", "high", "low", "close", "volume"] if c in df.columns]
            df = df[keep].copy()
            df.index = pd.to_datetime(df.index)
            df.index.name = "date"
            df = df.sort_index()
            logger.info("pykrx KOSPI200 수집 완료 (%d 행)", len(df))
            return df
        else:
            logger.warning("pykrx KOSPI200: 결과가 비어 있습니다 (start=%s, end=%s). yfinance로 폴백합니다.", s, e)

    except ImportError:
        logger.error("pykrx 패키지가 설치되지 않았습니다: pip install pykrx. yfinance로 폴백합니다.")
    except Exception as exc:
        logger.warning("pykrx KOSPI200 수집 실패: %s. yfinance(^KS200)로 폴백합니다.", exc)

    # --- yfinance 폴백: ^KS200 = 코스피200 ---
    logger.info("KOSPI200: yfinance ^KS200 으로 수집을 시도합니다.")
    df = fetch_yfinance("^KS200", start_date, end_date)
    if not df.empty:
        logger.info("yfinance ^KS200 폴백 수집 완료 (%d 행)", len(df))
    else:
        logger.error("KOSPI200: pykrx 및 yfinance 모두 수집 실패.")
    return df


# ---------------------------------------------------------------------------
# FRED 수집
# ---------------------------------------------------------------------------
def fetch_fred(series_id: str, start_date: str, end_date: str) -> pd.DataFrame:
    """
    FRED API로 경제 지표를 수집합니다.

    Returns:
        컬럼 close 를 가진 DatetimeIndex DataFrame.
        API 키 미설정 또는 실패 시 빈 DataFrame.
    """
    if not FRED_API_KEY or FRED_API_KEY.lower().strip() in _PLACEHOLDER_FRED:
        logger.warning(
            "FRED_API_KEY가 설정되지 않았습니다. %s 수집을 건너뜁니다. "
            "환경 변수 FRED_API_KEY를 설정하세요.",
            series_id,
        )
        return pd.DataFrame()

    try:
        from fredapi import Fred
    except ImportError:
        logger.error("fredapi 패키지가 설치되지 않았습니다: pip install fredapi")
        return pd.DataFrame()

    try:
        fred = Fred(api_key=FRED_API_KEY)
        series = _call_with_timeout(
            fred.get_series,
            series_id,
            observation_start=start_date,
            observation_end=end_date,
            timeout=60,
        )
        if series is None or series.empty:
            logger.warning("FRED: %s 결과가 비어 있습니다", series_id)
            return pd.DataFrame()

        df = series.rename("close").to_frame()
        df.index = pd.to_datetime(df.index)
        df.index.name = "date"
        df = df.sort_index().dropna()
        logger.info("FRED: %s 수집 완료 (%d 행)", series_id, len(df))
        return df

    except Exception as exc:
        logger.error("FRED: %s 수집 실패 - %s", series_id, exc)
        return pd.DataFrame()


# ---------------------------------------------------------------------------
# ECOS (한국은행) 수집
# ---------------------------------------------------------------------------
def fetch_ecos(stat_code: str, item_code: str, start_date: str, end_date: str) -> pd.DataFrame:
    """
    한국은행 ECOS API로 경제 지표를 수집합니다.

    Args:
        stat_code:  ECOS 통계표 코드 (예: "817Y002" = 시장금리)
        item_code:  항목 코드 (예: "010190000" = 국고채 3년)
        start_date: 수집 시작일 (YYYY-MM-DD)
        end_date:   수집 종료일 (YYYY-MM-DD)

    Returns:
        컬럼 close 를 가진 DatetimeIndex DataFrame.
        API 키 미설정 또는 실패 시 빈 DataFrame.
    """
    if not ECOS_API_KEY:
        logger.warning("ECOS_API_KEY가 설정되지 않았습니다. .env에 ECOS_API_KEY를 설정하세요.")
        return pd.DataFrame()

    try:
        import requests
    except ImportError:
        logger.error("requests 패키지가 필요합니다: pip install requests")
        return pd.DataFrame()

    # ECOS API 날짜 형식: YYYYMMDD
    s = start_date.replace("-", "")
    e = end_date.replace("-", "")

    url = (
        f"https://ecos.bok.or.kr/api/StatisticSearch"
        f"/{ECOS_API_KEY}/json/kr/1/100000"
        f"/{stat_code}/D/{s}/{e}/{item_code}"
    )

    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        rows = data.get("StatisticSearch", {}).get("row", [])
        if not rows:
            logger.warning("ECOS: %s/%s 결과가 비어 있습니다", stat_code, item_code)
            return pd.DataFrame()

        df = pd.DataFrame(rows)[["TIME", "DATA_VALUE"]].copy()
        df["DATA_VALUE"] = pd.to_numeric(df["DATA_VALUE"], errors="coerce")
        df = df.dropna(subset=["DATA_VALUE"])
        df.index = pd.to_datetime(df["TIME"], format="%Y%m%d")
        df.index.name = "date"
        df = df[["DATA_VALUE"]].rename(columns={"DATA_VALUE": "close"}).sort_index()
        logger.info("ECOS: %s/%s 수집 완료 (%d 행)", stat_code, item_code, len(df))
        return df

    except Exception as exc:
        logger.error("ECOS: %s/%s 수집 실패 - %s", stat_code, item_code, exc)
        return pd.DataFrame()


# ---------------------------------------------------------------------------
# 단일 지표 수집 라우터
# ---------------------------------------------------------------------------
def _collect_one(name: str, cfg: dict, start_date: str, end_date: str) -> pd.DataFrame:
    """지표 이름과 설정으로 적절한 수집 함수를 호출합니다."""
    source = cfg["source"]

    if source == "yfinance":
        return fetch_yfinance(cfg["ticker"], start_date, end_date)

    if source == "pykrx":
        time.sleep(PYKRX_DELAY)
        if cfg["ticker"] == "1028":
            return fetch_kospi200(start_date, end_date)
        logger.warning("알 수 없는 pykrx 티커: %s", cfg["ticker"])
        return pd.DataFrame()

    if source == "fred":
        return fetch_fred(cfg["series_id"], start_date, end_date)

    if source == "ecos":
        return fetch_ecos(cfg["stat_code"], cfg["item_code"], start_date, end_date)

    logger.warning("알 수 없는 소스: %s (지표: %s)", source, name)
    return pd.DataFrame()


# ---------------------------------------------------------------------------
# 저장 헬퍼
# ---------------------------------------------------------------------------
def _save_indicator(name: str, df: pd.DataFrame, existing_path) -> None:
    """기존 데이터와 병합 후 저장합니다."""
    if df.empty:
        logger.warning("%s: 저장할 데이터가 없습니다.", name)
        return

    existing = load_parquet(existing_path)
    if existing is not None and not existing.empty:
        combined = pd.concat([existing, df])
        combined = combined[~combined.index.duplicated(keep="last")].sort_index()
    else:
        combined = df

    save_parquet(combined, existing_path, compression=PARQUET_COMPRESSION)
    logger.info("%s: %d 행 저장 -> %s", name, len(combined), existing_path)


# ---------------------------------------------------------------------------
# 공개 수집 함수
# ---------------------------------------------------------------------------
def collect_all(start_date: str = "2015-01-01") -> None:
    """
    모든 매크로 지표를 start_date부터 오늘까지 수집하여 저장합니다.

    Args:
        start_date: 수집 시작일 (YYYY-MM-DD)
    """
    ensure_dir(RAW_MACRO_PATH)
    end_date: str = date.today().isoformat()
    logger.info("전체 수집 시작: %s ~ %s", start_date, end_date)

    for name, cfg in MACRO_SOURCES.items():
        logger.info("[%s] 수집 시작", name)
        df = _collect_one(name, cfg, start_date, end_date)
        dest = RAW_MACRO_PATH / f"{name}.parquet"
        _save_indicator(name, df, dest)

    logger.info("전체 수집 완료.")


def collect_incremental() -> None:
    """
    각 지표별 마지막 저장 날짜 이후 데이터만 증분 수집합니다.
    저장 파일이 없으면 2015-01-01부터 전체 수집합니다.
    """
    ensure_dir(RAW_MACRO_PATH)
    end_date: str = date.today().isoformat()
    logger.info("증분 수집 시작 (end=%s)", end_date)

    for name, cfg in MACRO_SOURCES.items():
        dest = RAW_MACRO_PATH / f"{name}.parquet"
        last = get_last_date(dest)

        if last is None:
            start_date = "2015-01-01"
            logger.info("[%s] 기존 파일 없음 -> 전체 수집 시작 (%s)", name, start_date)
        else:
            # 마지막 날짜 다음 날부터 수집
            next_day = (pd.Timestamp(last) + timedelta(days=1)).strftime("%Y-%m-%d")
            if next_day > end_date:
                logger.info("[%s] 이미 최신 상태 (last=%s). 건너뜁니다.", name, last)
                continue
            start_date = next_day
            logger.info("[%s] 증분 수집: %s ~ %s", name, start_date, end_date)

        df = _collect_one(name, cfg, start_date, end_date)
        _save_indicator(name, df, dest)

    logger.info("증분 수집 완료.")


# ---------------------------------------------------------------------------
# CLI 진입점
# ---------------------------------------------------------------------------
def main() -> None:
    """
    CLI 사용:
      python collect_macro.py --initial              전체 수집 (2015-01-01~오늘)
      python collect_macro.py --initial --start 2020-01-01  시작일 지정
      python collect_macro.py --incremental          증분 수집
    """
    parser = argparse.ArgumentParser(description="매크로 지표 수집기")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--initial", action="store_true", help="전체 수집")
    group.add_argument("--incremental", action="store_true", help="증분 수집")
    parser.add_argument("--start", default="2015-01-01", help="전체 수집 시작일 (YYYY-MM-DD)")
    args = parser.parse_args()

    if args.initial:
        collect_all(start_date=args.start)
    else:
        collect_incremental()


if __name__ == "__main__":
    main()
