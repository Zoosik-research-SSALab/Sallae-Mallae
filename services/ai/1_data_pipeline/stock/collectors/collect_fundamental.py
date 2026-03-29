# -*- coding: utf-8 -*-
"""
collectors/collect_fundamental.py
pykrx get_market_fundamental_by_date()를 사용한 KOSPI200 종목별
일별 펀더멘털 데이터(BPS/PER/PBR/EPS/DIV/DPS) 수집 모듈.

[pykrx + KRX 세션 인증 방식]
- collect_supply_demand_krx.py 와 동일한 KRX 세션 인증 방식 사용.
- utils.krx_session.ensure_krx_session()으로 세션 주입.

[저장 경로]
  raw/fundamental/{ticker}.parquet

[컬럼]
  BPS, PER, PBR, EPS, DIV, DPS  (인덱스: date)

[실행]
  python collectors/collect_fundamental.py --initial       # 2014~ 전체 수집
  python collectors/collect_fundamental.py --incremental   # 마지막 날짜 이후만
  python collectors/collect_fundamental.py --initial --use-universe  # 편출 포함
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
    RAW_FUNDAMENTAL_PATH,
)
from utils.drive_utils import ensure_dir, file_is_valid, get_last_date, load_parquet, save_parquet
from utils.krx_session import ensure_krx_session
from utils.logger import setup_logger

logger = setup_logger(__name__)

_TODAY: str = datetime.today().strftime("%Y%m%d")

# OHLCV와 같은 시작일이지만 pykrx fundamental은 실질적으로 2014년부터 유효
_FUNDAMENTAL_START_DATE: str = "2014-01-01"

_session_ready: bool = False

# ---------------------------------------------------------------------------
# 컬럼명 매핑 (pykrx 반환 컬럼 → 저장 컬럼)
# ---------------------------------------------------------------------------
_COL_MAP: dict[str, str] = {
    "BPS": "bps",
    "PER": "per",
    "PBR": "pbr",
    "EPS": "eps",
    "DIV": "div",
    "DPS": "dps",
}


# ---------------------------------------------------------------------------
# 날짜 유틸리티
# ---------------------------------------------------------------------------

def _to_yyyymmdd(date_str: str) -> str:
    return date_str.replace("-", "")


def _next_day(date_str: str) -> str:
    dt = datetime.strptime(date_str, "%Y-%m-%d") + timedelta(days=1)
    return dt.strftime("%Y%m%d")


# ---------------------------------------------------------------------------
# 세션 초기화
# ---------------------------------------------------------------------------

def _init_session() -> bool:
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
# pykrx fundamental 조회
# ---------------------------------------------------------------------------

def _fetch_fundamental(ticker: str, start: str, end: str) -> pd.DataFrame:
    """
    pykrx get_market_fundamental_by_date()로 단일 종목 펀더멘털 조회.

    Args:
        ticker: 종목 코드
        start:  'YYYYMMDD'
        end:    'YYYYMMDD'

    Returns:
        컬럼 [bps, per, pbr, eps, div, dps], 인덱스 date.
        조회 실패 시 빈 DataFrame.
    """
    try:
        from pykrx import stock as pykrx_stock
        raw: pd.DataFrame = pykrx_stock.get_market_fundamental_by_date(start, end, ticker)
    except Exception as exc:
        logger.warning("[%s] pykrx fundamental 조회 실패 (%s~%s): %s", ticker, start, end, exc)
        return pd.DataFrame()
    finally:
        time.sleep(PYKRX_DELAY)

    if raw is None or raw.empty:
        return pd.DataFrame()

    # 날짜 필터
    start_ts = pd.Timestamp(datetime.strptime(start, "%Y%m%d"))
    end_ts   = pd.Timestamp(datetime.strptime(end,   "%Y%m%d"))
    raw = raw[(raw.index >= start_ts) & (raw.index <= end_ts)]

    if raw.empty:
        return pd.DataFrame()

    # 컬럼 매핑
    rename_map = {k: v for k, v in _COL_MAP.items() if k in raw.columns}
    df = raw.rename(columns=rename_map)
    df = df[[v for v in _COL_MAP.values() if v in df.columns]].copy()
    df.index.name = "date"

    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    return df


# ---------------------------------------------------------------------------
# 핵심 수집 함수 (연도별 청크)
# ---------------------------------------------------------------------------

def fetch_fundamental(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    """
    단일 종목 펀더멘털 데이터 수집 (연도별 분할 호출).

    Args:
        ticker:     종목 코드
        start_date: 'YYYYMMDD'
        end_date:   'YYYYMMDD'

    Returns:
        컬럼 [bps, per, pbr, eps, div, dps], 인덱스 date.
    """
    _init_session()

    start_year = int(start_date[:4])
    end_year   = int(end_date[:4])
    all_frames: list[pd.DataFrame] = []

    for year in range(start_year, end_year + 1):
        y_start = max(start_date, f"{year}0101")
        y_end   = min(end_date,   f"{year}1231")
        frame   = _fetch_fundamental(ticker, y_start, y_end)
        if not frame.empty:
            all_frames.append(frame)

    if not all_frames:
        return pd.DataFrame()

    combined = pd.concat(all_frames)
    combined = combined[~combined.index.duplicated(keep="last")]
    combined.sort_index(inplace=True)
    return combined


# ---------------------------------------------------------------------------
# 초기 수집
# ---------------------------------------------------------------------------

def collect_initial(tickers: list[str]) -> None:
    """
    전 종목 펀더멘털 초기 수집.
    수집 범위: _FUNDAMENTAL_START_DATE ~ 오늘.
    """
    ensure_dir(RAW_FUNDAMENTAL_PATH)

    start = _to_yyyymmdd(_FUNDAMENTAL_START_DATE)
    end   = _TODAY

    logger.info(
        "펀더멘털 초기 수집 시작 | 기간: %s ~ %s | 종목 수: %d",
        start, end, len(tickers),
    )

    saved, failed = [], []

    for ticker in tqdm(tickers, desc="펀더멘털 초기 수집", unit="종목"):
        try:
            df = fetch_fundamental(ticker, start, end)
            if df.empty:
                logger.warning("[%s] 수집 데이터 없음 - 저장 건너뜀", ticker)
            else:
                save_parquet(
                    df,
                    RAW_FUNDAMENTAL_PATH / f"{ticker}.parquet",
                    compression=PARQUET_COMPRESSION,
                )
                saved.append(ticker)
                logger.debug("[%s] 저장 완료 (%d 행)", ticker, len(df))
        except Exception as exc:
            logger.error("[%s] 수집 실패: %s", ticker, exc)
            failed.append(ticker)

    logger.info("펀더멘털 초기 수집 완료 | 성공: %d | 실패: %d", len(saved), len(failed))
    if failed:
        logger.warning("실패 종목: %s", ", ".join(failed))


# ---------------------------------------------------------------------------
# 증분 수집
# ---------------------------------------------------------------------------

def collect_incremental(tickers: list[str]) -> None:
    """
    마지막 저장 날짜 이후의 신규 펀더멘털만 수집하여 기존 파일에 병합.
    """
    ensure_dir(RAW_FUNDAMENTAL_PATH)

    end = _TODAY
    logger.info("펀더멘털 증분 수집 시작 | 종료일: %s | 종목 수: %d", end, len(tickers))

    saved, failed = [], []

    for ticker in tqdm(tickers, desc="펀더멘털 증분 수집", unit="종목"):
        parquet_path = RAW_FUNDAMENTAL_PATH / f"{ticker}.parquet"

        try:
            last_date = get_last_date(parquet_path)

            if last_date is None:
                start = _to_yyyymmdd(_FUNDAMENTAL_START_DATE)
                logger.info("[%s] 기존 파일 없음 - 전체 수집 전환 (시작: %s)", ticker, start)
            else:
                start = _next_day(last_date)
                if start > end:
                    logger.debug("[%s] 이미 최신 상태 (last: %s)", ticker, last_date)
                    continue

            new_df = fetch_fundamental(ticker, start, end)

            if new_df.empty:
                logger.debug("[%s] 신규 데이터 없음", ticker)
                continue

            if file_is_valid(parquet_path):
                existing_df = load_parquet(parquet_path)
                combined = pd.concat([existing_df, new_df])
                combined = combined[~combined.index.duplicated(keep="last")]
                combined.sort_index(inplace=True)
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

    logger.info("펀더멘털 증분 수집 완료 | 성공: %d | 실패: %d", len(saved), len(failed))
    if failed:
        logger.warning("실패 종목: %s", ", ".join(failed))


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="KOSPI200 펀더멘털(BPS/PER/PBR/EPS/DIV/DPS) 수집")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--initial",     action="store_true", help=f"초기 전체 수집 ({_FUNDAMENTAL_START_DATE} ~ 오늘)")
    group.add_argument("--incremental", action="store_true", help="증분 업데이트 (마지막 날짜 이후만)")
    parser.add_argument("--use-universe", action="store_true", help="유니버스 파일(편출 종목 포함)로 수집")
    args = parser.parse_args()

    if not _init_session():
        print("오류: KRX 세션 초기화 실패. .env의 KRX_USER_ID/KRX_PASSWORD를 확인하세요.")
        return

    from collectors.collect_ohlcv import get_kospi200_tickers, get_universe_tickers_for_ohlcv
    tickers = get_universe_tickers_for_ohlcv() if args.use_universe else get_kospi200_tickers()

    if args.initial:
        collect_initial(tickers)
    else:
        collect_incremental(tickers)


if __name__ == "__main__":
    main()
