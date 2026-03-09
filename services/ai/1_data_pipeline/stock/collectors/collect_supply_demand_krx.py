# -*- coding: utf-8 -*-
"""
collectors/collect_supply_demand_krx.py
pykrx KRX API를 사용한 코스피 200 수급 데이터 수집 모듈.
외국인/기관/개인 순매수 거래대금 및 누적 순매수 데이터를 수집합니다.
초기 수집(OHLCV와 동일 기간)과 증분 업데이트를 지원합니다.

[pykrx + KRX 세션 인증 방식]
- KRX가 2026-02-27부터 세션 인증을 강제화함에 따라 로그인 세션 주입이 필요합니다.
- utils.krx_session.ensure_krx_session()으로 pykrx에 세션을 주입합니다.
- 수집 함수: pykrx.stock.get_market_trading_value_by_date(start, end, ticker)

[KRX 계정 설정]
  .env 파일에 KRX_USER_ID, KRX_PASSWORD를 설정해야 합니다.
"""

import argparse
import time
from datetime import datetime, timedelta

import pandas as pd
from tqdm import tqdm

from config import (
    KRX_PASSWORD,
    KRX_USER_ID,
    OHLCV_START_DATE,
    PARQUET_COMPRESSION,
    PYKRX_DELAY,
    RAW_SUPPLY_PATH,
)
from utils.drive_utils import ensure_dir, file_is_valid, get_last_date, load_parquet, save_parquet
from utils.krx_session import ensure_krx_session
from utils.logger import setup_logger

logger = setup_logger(__name__)

_TODAY: str = datetime.today().strftime("%Y%m%d")

# ---------------------------------------------------------------------------
# 세션 초기화 상태 추적
# ---------------------------------------------------------------------------
_session_ready: bool = False


# ---------------------------------------------------------------------------
# pykrx 컬럼 매핑
# ---------------------------------------------------------------------------
# get_market_trading_value_by_date 반환 컬럼 (순매수거래대금 기준)
# 컬럼명은 pykrx 버전마다 다를 수 있어 여러 후보를 시도
_COL_CANDIDATES: dict[str, list[str]] = {
    "foreign_net_buy":     ["외국인합계", "외국인", "외국인 합계"],
    "institution_net_buy": ["기관합계", "기관계", "기관 합계"],
    "individual_net_buy":  ["개인"],
}


# ---------------------------------------------------------------------------
# 날짜 유틸리티
# ---------------------------------------------------------------------------

def _to_yyyymmdd(date_str: str) -> str:
    """'YYYY-MM-DD' → 'YYYYMMDD' 변환."""
    return date_str.replace("-", "")


def _next_day(date_str: str) -> str:
    """'YYYY-MM-DD' 날짜에 하루를 더해 'YYYYMMDD'로 반환."""
    dt = datetime.strptime(date_str, "%Y-%m-%d") + timedelta(days=1)
    return dt.strftime("%Y%m%d")


# ---------------------------------------------------------------------------
# 세션 초기화
# ---------------------------------------------------------------------------

def _init_session() -> bool:
    """
    KRX 세션을 초기화합니다. 모듈 수준에서 최초 1회만 실행합니다.
    이미 성공했으면 즉시 True를 반환합니다.

    Returns:
        세션 준비 성공 여부 (bool).
    """
    global _session_ready

    if _session_ready:
        return True

    success = ensure_krx_session(KRX_USER_ID, KRX_PASSWORD)
    if success:
        logger.info("KRX 세션 초기화 완료")
        _session_ready = True
    else:
        logger.warning("KRX 세션 초기화 실패 — KRX_USER_ID/KRX_PASSWORD를 확인하세요.")

    return success


# ---------------------------------------------------------------------------
# pykrx 수급 조회
# ---------------------------------------------------------------------------

def _fetch_trading_value(ticker: str, start: str, end: str) -> pd.DataFrame:
    """
    pykrx get_market_trading_value_by_date로 단일 종목의 수급 데이터를 조회합니다.

    Args:
        ticker: 종목 코드 (예: "005930")
        start:  조회 시작일 'YYYYMMDD'
        end:    조회 종료일 'YYYYMMDD'

    Returns:
        컬럼 [foreign_net_buy, institution_net_buy, individual_net_buy],
        인덱스 date (DatetimeIndex).
        조회 실패 또는 컬럼 매핑 불가 시 빈 DataFrame 반환.
    """
    try:
        from pykrx import stock as pykrx_stock

        raw: pd.DataFrame = pykrx_stock.get_market_trading_value_by_date(
            start, end, ticker
        )
    except Exception as exc:
        logger.warning("[%s] pykrx 조회 실패 (%s ~ %s): %s", ticker, start, end, exc)
        return pd.DataFrame()
    finally:
        time.sleep(PYKRX_DELAY)

    if raw is None or raw.empty:
        return pd.DataFrame()

    # pykrx가 가끔 요청 범위 밖 데이터를 포함하므로 필터링
    start_ts = pd.Timestamp(datetime.strptime(start, "%Y%m%d"))
    end_ts = pd.Timestamp(datetime.strptime(end, "%Y%m%d"))
    raw = raw[(raw.index >= start_ts) & (raw.index <= end_ts)]

    if raw.empty:
        return pd.DataFrame()

    # 한글 컬럼 → 영문 컬럼 매핑
    rename_map: dict[str, str] = {}
    for eng_col, candidates in _COL_CANDIDATES.items():
        matched = next((c for c in candidates if c in raw.columns), None)
        if matched:
            rename_map[matched] = eng_col
        else:
            logger.warning(
                "[%s] 컬럼 '%s' 후보를 찾지 못했습니다. 실제 컬럼: %s",
                ticker,
                eng_col,
                list(raw.columns),
            )
            return pd.DataFrame()

    df = raw.rename(columns=rename_map)
    required_cols = list(_COL_CANDIDATES.keys())
    df = df[required_cols].copy()
    df.index.name = "date"

    for col in required_cols:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)

    return df


# ---------------------------------------------------------------------------
# 누적 순매수 계산
# ---------------------------------------------------------------------------

def _add_cumsum(df: pd.DataFrame) -> pd.DataFrame:
    """순매수 컬럼에서 누적 순매수 컬럼을 계산하여 추가합니다."""
    df = df.copy()
    df["foreign_cum_buy"] = df["foreign_net_buy"].cumsum()
    df["institution_cum_buy"] = df["institution_net_buy"].cumsum()
    return df


def _merge_cumsum(existing: pd.DataFrame, new: pd.DataFrame) -> pd.DataFrame:
    """
    기존 데이터와 신규 데이터를 병합한 뒤 누적 순매수를 전체 기간 기준으로 재계산합니다.

    Args:
        existing: 기존 저장된 DataFrame (누적 컬럼 포함)
        new:      신규 수집된 DataFrame (누적 컬럼 포함 또는 미포함)

    Returns:
        병합 및 누적 재계산된 DataFrame.
    """
    net_cols = ["foreign_net_buy", "institution_net_buy", "individual_net_buy"]
    combined = pd.concat([existing[net_cols], new[net_cols]])
    combined = combined[~combined.index.duplicated(keep="last")]
    combined.sort_index(inplace=True)
    combined["foreign_cum_buy"] = combined["foreign_net_buy"].cumsum()
    combined["institution_cum_buy"] = combined["institution_net_buy"].cumsum()
    return combined


# ---------------------------------------------------------------------------
# 핵심 수집 함수
# ---------------------------------------------------------------------------

def fetch_supply_demand(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    """
    단일 종목의 수급 데이터를 pykrx KRX API로 수집합니다.

    pykrx는 한 번 호출로 전체 기간 반환이 가능하지만, 기간이 길면 연도별로
    나눠 호출하여 안정성을 높입니다.

    Args:
        ticker:     종목 코드 (예: "005930")
        start_date: 수집 시작일 'YYYYMMDD'
        end_date:   수집 종료일 'YYYYMMDD'

    Returns:
        컬럼 [foreign_net_buy, institution_net_buy, individual_net_buy,
               foreign_cum_buy, institution_cum_buy],
        인덱스 date (DatetimeIndex).
        데이터 없을 경우 빈 DataFrame 반환.
    """
    _init_session()

    start_year = int(start_date[:4])
    end_year = int(end_date[:4])
    all_frames: list[pd.DataFrame] = []

    for year in range(start_year, end_year + 1):
        y_start = max(start_date, f"{year}0101")
        y_end = min(end_date, f"{year}1231")

        frame = _fetch_trading_value(ticker, y_start, y_end)
        if not frame.empty:
            all_frames.append(frame)

    if not all_frames:
        return pd.DataFrame()

    combined = pd.concat(all_frames)
    combined = combined[~combined.index.duplicated(keep="last")]
    combined.sort_index(inplace=True)
    return _add_cumsum(combined)


# ---------------------------------------------------------------------------
# 초기 / 증분 수집
# ---------------------------------------------------------------------------

def collect_initial(tickers: list[str]) -> None:
    """
    코스피 200 전 종목의 초기 수급 데이터를 수집합니다.
    수집 범위: OHLCV_START_DATE (config) ~ 오늘.

    Args:
        tickers: 수집 대상 종목 코드 리스트
    """
    ensure_dir(RAW_SUPPLY_PATH)

    start = _to_yyyymmdd(OHLCV_START_DATE)
    end = _TODAY

    logger.info(
        "수급 초기 수집 시작 (pykrx KRX API) | 기간: %s ~ %s | 종목 수: %d",
        start, end, len(tickers),
    )

    saved: list[str] = []
    failed: list[str] = []

    for ticker in tqdm(tickers, desc="수급 초기 수집", unit="종목"):
        try:
            df = fetch_supply_demand(ticker, start, end)
            if df.empty:
                logger.warning("[%s] 수집 데이터 없음 - 저장 건너뜀", ticker)
            else:
                save_parquet(
                    df,
                    RAW_SUPPLY_PATH / f"{ticker}.parquet",
                    compression=PARQUET_COMPRESSION,
                )
                saved.append(ticker)
                logger.debug("[%s] 저장 완료 (%d 행)", ticker, len(df))
        except Exception as exc:
            logger.error("[%s] 수집 실패: %s", ticker, exc)
            failed.append(ticker)

    logger.info("수급 초기 수집 완료 | 성공: %d | 실패: %d", len(saved), len(failed))
    if failed:
        logger.warning("실패 종목: %s", ", ".join(failed))


def collect_incremental(tickers: list[str]) -> None:
    """
    마지막 저장 날짜 이후의 신규 수급 데이터만 수집하여 기존 파일에 병합합니다.
    누적 순매수는 전체 기간 기준으로 재계산합니다.

    Args:
        tickers: 수집 대상 종목 코드 리스트
    """
    ensure_dir(RAW_SUPPLY_PATH)

    end = _TODAY
    logger.info(
        "수급 증분 수집 시작 (pykrx KRX API) | 종료일: %s | 종목 수: %d",
        end, len(tickers),
    )

    saved: list[str] = []
    failed: list[str] = []

    for ticker in tqdm(tickers, desc="수급 증분 수집", unit="종목"):
        parquet_path = RAW_SUPPLY_PATH / f"{ticker}.parquet"

        try:
            last_date: str | None = get_last_date(parquet_path)

            if last_date is None:
                start = _to_yyyymmdd(OHLCV_START_DATE)
                logger.info("[%s] 기존 파일 없음 - 전체 수집으로 전환 (시작: %s)", ticker, start)
            else:
                start = _next_day(last_date)
                if start > end:
                    logger.debug("[%s] 이미 최신 상태 (last: %s)", ticker, last_date)
                    continue

            new_df = fetch_supply_demand(ticker, start, end)

            if new_df.empty:
                logger.debug("[%s] 신규 데이터 없음", ticker)
                continue

            if file_is_valid(parquet_path):
                existing_df = load_parquet(parquet_path)
                combined = _merge_cumsum(existing_df, new_df)
            else:
                combined = new_df

            save_parquet(combined, parquet_path, compression=PARQUET_COMPRESSION)
            saved.append(ticker)
            logger.debug(
                "[%s] 증분 저장 완료 (신규: %d 행, 전체: %d 행)",
                ticker, len(new_df), len(combined),
            )

        except Exception as exc:
            logger.error("[%s] 증분 수집 실패: %s", ticker, exc)
            failed.append(ticker)

    logger.info("수급 증분 수집 완료 | 성공: %d | 실패: %d", len(saved), len(failed))
    if failed:
        logger.warning("실패 종목: %s", ", ".join(failed))


# ---------------------------------------------------------------------------
# CLI 엔트리포인트
# ---------------------------------------------------------------------------

def main() -> None:
    """
    CLI 엔트리포인트.
    --initial     : 초기 전체 수집
    --incremental : 증분 업데이트 (기본값)
    """
    parser = argparse.ArgumentParser(
        description="코스피 200 수급 데이터 수집 (pykrx KRX API)"
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--initial",
        action="store_true",
        help=f"초기 전체 수집 ({OHLCV_START_DATE} ~ 오늘)",
    )
    group.add_argument(
        "--incremental",
        action="store_true",
        help="증분 업데이트 (마지막 저장 날짜 이후만 수집, 기본값)",
    )
    parser.add_argument(
        "--use-universe",
        action="store_true",
        help="유니버스 파일(편출 종목 포함)로 수급 수집",
    )
    args = parser.parse_args()

    # 세션 명시적 초기화
    if not _init_session():
        print(
            "오류: KRX 세션 초기화에 실패했습니다. "
            ".env 파일에 KRX_USER_ID와 KRX_PASSWORD가 올바르게 설정되어 있는지 확인하세요."
        )
        return

    from collectors.collect_ohlcv import get_kospi200_tickers, get_universe_tickers_for_ohlcv

    tickers = get_universe_tickers_for_ohlcv() if args.use_universe else get_kospi200_tickers()

    if args.initial:
        collect_initial(tickers)
    else:
        collect_incremental(tickers)


if __name__ == "__main__":
    main()
