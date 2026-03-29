"""
collectors/collect_ohlcv.py
pykrx를 사용한 코스피 200 OHLCV 데이터 수집 모듈.
초기 수집(10년치)과 증분 업데이트를 지원합니다.
Python 3.10+ 호환, Google Colab 동작 지원.
"""

import argparse
import time
from datetime import datetime, timedelta

import pandas as pd
from tqdm import tqdm

from config import (
    OHLCV_START_DATE,
    PARQUET_COMPRESSION,
    PYKRX_DELAY,
    RAW_OHLCV_PATH,
)
from utils.drive_utils import ensure_dir, file_is_valid, get_last_date, load_parquet, save_parquet
from utils.logger import setup_logger

logger = setup_logger(__name__)

# pykrx 코스피 200 인덱스 코드
_KOSPI200_INDEX_CODE = "1028"

# OHLCV 컬럼 한글 -> 영문 매핑 (pykrx 반환값 기준)
_OHLCV_COLUMN_MAP: dict[str, str] = {
    "시가": "open",
    "고가": "high",
    "저가": "low",
    "종가": "close",
    "거래량": "volume",
}

_TODAY: str = datetime.today().strftime("%Y%m%d")


# ---------------------------------------------------------------------------
# 유틸리티
# ---------------------------------------------------------------------------

def _to_pykrx_date(date_str: str) -> str:
    """'YYYY-MM-DD' 형식을 pykrx 요구 형식 'YYYYMMDD'로 변환합니다."""
    return date_str.replace("-", "")


def _next_day(date_str: str) -> str:
    """'YYYY-MM-DD' 형식 날짜에 하루를 더해 'YYYYMMDD' 형식으로 반환합니다."""
    dt = datetime.strptime(date_str, "%Y-%m-%d") + timedelta(days=1)
    return dt.strftime("%Y%m%d")


# ---------------------------------------------------------------------------
# 핵심 함수
# ---------------------------------------------------------------------------

def _fetch_kospi200_from_naver() -> list[str]:
    """Naver Finance에서 코스피 200 구성 종목을 스크래핑합니다.

    KRX API는 세션 인증이 필요하므로 Naver Finance를 사용합니다.
    페이지당 10종목, 총 20페이지 = 200종목.
    """
    import re
    import requests

    headers = {"User-Agent": "Mozilla/5.0"}
    tickers: list[str] = []
    seen: set[str] = set()

    for page in range(1, 25):  # 최대 24페이지 (여유분)
        url = f"https://finance.naver.com/sise/entryJongmok.nhn?code=KPI200&page={page}"
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            resp.raise_for_status()
        except Exception:
            break

        codes = re.findall(r'code=(\d{6})', resp.text)
        new_codes = [c for c in dict.fromkeys(codes) if c not in seen]
        if not new_codes:
            break  # 더 이상 새로운 종목 없으면 종료
        for c in new_codes:
            seen.add(c)
            tickers.append(c)

        if len(tickers) >= 200:
            break

    return tickers[:200]


def get_universe_tickers_for_ohlcv() -> list[str]:
    """
    유니버스 파일(편출 종목 포함)에서 역대 전체 종목 코드를 반환합니다.

    파일이 없으면 WARNING 로그를 출력하고 get_kospi200_tickers()로 폴백합니다.

    Returns:
        종목 코드 문자열 리스트
    """
    try:
        from collectors.collect_universe import get_universe_tickers
        tickers = get_universe_tickers(active_only=False)
        logger.info("유니버스 파일에서 %d개 종목 로드 (편출 종목 포함)", len(tickers))
        return tickers
    except FileNotFoundError:
        logger.warning(
            "유니버스 파일 없음 — get_kospi200_tickers()로 폴백. "
            "먼저 python collectors/collect_universe.py 실행 권장"
        )
        return get_kospi200_tickers()
    except Exception as exc:
        logger.warning("유니버스 로드 실패 (%s) — get_kospi200_tickers()로 폴백", exc)
        return get_kospi200_tickers()


def get_kospi200_tickers() -> list[str]:
    """
    코스피 200 구성 종목 코드 리스트를 반환합니다.

    1차: KRX 웹 API 직접 호출
    2차: pykrx get_index_portfolio_deposit_file (alternative=True)
    3차: pykrx get_market_ticker_list 전체 반환

    Returns:
        종목 코드 문자열 리스트 (예: ["005930", "000660", ...])
    """
    from pykrx import stock

    # 1차: Naver Finance 스크래핑
    try:
        tickers = _fetch_kospi200_from_naver()
        if len(tickers) >= 150:
            logger.info("코스피 200 종목 %d개 로드 완료 (Naver Finance)", len(tickers))
            return tickers
        logger.warning("Naver Finance 결과 부족 (%d개), pykrx 폴백 시도", len(tickers))
    except Exception as exc:
        logger.warning("Naver Finance 호출 실패, pykrx 사용: %s", exc)

    # 2차: pykrx
    try:
        tickers = stock.get_index_portfolio_deposit_file(
            _KOSPI200_INDEX_CODE, alternative=True
        )
        if tickers:
            logger.info("코스피 200 종목 %d개 로드 완료 (pykrx)", len(tickers))
            return tickers
    except Exception as exc:
        logger.warning("get_index_portfolio_deposit_file 실패: %s", exc)

    # 3차: 전체 KOSPI 목록 반환 (200개 초과할 수 있음)
    try:
        tickers = stock.get_market_ticker_list(market="KOSPI")
        if tickers:
            logger.warning("코스피 전체 %d개 반환 (코스피 200 조회 실패)", len(tickers))
            return tickers
    except Exception as exc:
        logger.error("모든 종목 조회 방법 실패: %s", exc)

    return []


def fetch_ohlcv(ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
    """
    단일 종목의 OHLCV 데이터를 수집합니다.

    Args:
        ticker:     종목 코드 (예: "005930")
        start_date: 수집 시작일, 'YYYYMMDD' 형식
        end_date:   수집 종료일, 'YYYYMMDD' 형식

    Returns:
        컬럼 [open, high, low, close, volume], 인덱스 date (DatetimeIndex).
        데이터 없으면 빈 DataFrame 반환.
    """
    from pykrx import stock

    raw: pd.DataFrame = stock.get_market_ohlcv(start_date, end_date, ticker)

    if raw is None or raw.empty:
        return pd.DataFrame()

    # 한글 컬럼명 -> 영문 변환
    raw = raw.rename(columns=_OHLCV_COLUMN_MAP)

    # 필요한 컬럼만 선택 (존재하는 컬럼만)
    target_cols = ["open", "high", "low", "close", "volume"]
    available = [c for c in target_cols if c in raw.columns]
    df = raw[available].copy()

    # 인덱스를 DatetimeIndex 로 정규화
    df.index = pd.to_datetime(df.index)
    df.index.name = "date"

    # open/high/low 가 모두 0인 행 제거 (액면분할 전후 pykrx 반환 오류)
    invalid_mask = (df["open"] == 0) & (df["high"] == 0) & (df["low"] == 0)
    if invalid_mask.any():
        logger.warning(
            "[%s] open/high/low=0 비정상 행 %d건 제거: %s",
            ticker,
            invalid_mask.sum(),
            df.index[invalid_mask].strftime("%Y-%m-%d").tolist(),
        )
        df = df[~invalid_mask]

    # OHLC 논리 위반 교정: pykrx 수정주가 반올림 오류로 close > high 또는 close < low 발생
    # close 를 기준으로 high/low 를 확장 (close 는 가장 신뢰도 높은 값)
    if "high" in df.columns and "low" in df.columns and "close" in df.columns:
        fix_high = df["close"] > df["high"]
        fix_low = df["close"] < df["low"]
        if fix_high.any():
            logger.warning(
                "[%s] close>high 반올림 오류 %d건 교정: %s",
                ticker,
                fix_high.sum(),
                df.index[fix_high].strftime("%Y-%m-%d").tolist(),
            )
            df.loc[fix_high, "high"] = df.loc[fix_high, "close"]
        if fix_low.any():
            logger.warning(
                "[%s] close<low 반올림 오류 %d건 교정: %s",
                ticker,
                fix_low.sum(),
                df.index[fix_low].strftime("%Y-%m-%d").tolist(),
            )
            df.loc[fix_low, "low"] = df.loc[fix_low, "close"]

    return df


def collect_initial(tickers: list[str]) -> None:
    """
    코스피 200 전 종목의 초기 OHLCV 데이터를 수집합니다.
    수집 범위: OHLCV_START_DATE (config) ~ 오늘.

    Args:
        tickers: 수집 대상 종목 코드 리스트
    """
    ensure_dir(RAW_OHLCV_PATH)

    start = _to_pykrx_date(OHLCV_START_DATE)
    end = _TODAY

    logger.info("OHLCV 초기 수집 시작 | 기간: %s ~ %s | 종목 수: %d", start, end, len(tickers))

    failed: list[str] = []

    for ticker in tqdm(tickers, desc="OHLCV 초기 수집", unit="종목"):
        try:
            df = fetch_ohlcv(ticker, start, end)

            if df.empty:
                logger.warning("[%s] 수집 데이터 없음 - 저장 건너뜀", ticker)
            else:
                save_parquet(df, RAW_OHLCV_PATH / f"{ticker}.parquet", compression=PARQUET_COMPRESSION)
                logger.debug("[%s] 저장 완료 (%d 행)", ticker, len(df))

        except Exception as exc:
            logger.error("[%s] 수집 실패: %s", ticker, exc)
            failed.append(ticker)

        time.sleep(PYKRX_DELAY)

    logger.info(
        "OHLCV 초기 수집 완료 | 성공: %d | 실패: %d",
        len(tickers) - len(failed),
        len(failed),
    )
    if failed:
        logger.warning("실패 종목: %s", ", ".join(failed))


def collect_incremental(tickers: list[str]) -> None:
    """
    마지막 저장 날짜 이후의 신규 OHLCV 데이터만 수집하여 기존 파일에 병합합니다.

    Args:
        tickers: 수집 대상 종목 코드 리스트
    """
    ensure_dir(RAW_OHLCV_PATH)

    end = _TODAY
    logger.info("OHLCV 증분 수집 시작 | 종료일: %s | 종목 수: %d", end, len(tickers))

    failed: list[str] = []

    for ticker in tqdm(tickers, desc="OHLCV 증분 수집", unit="종목"):
        parquet_path = RAW_OHLCV_PATH / f"{ticker}.parquet"

        try:
            # 마지막 저장 날짜 확인
            last_date: str | None = get_last_date(parquet_path)

            if last_date is None:
                # 기존 파일이 없으면 전체 수집
                start = _to_pykrx_date(OHLCV_START_DATE)
                logger.info("[%s] 기존 파일 없음 - 전체 수집으로 전환 (시작: %s)", ticker, start)
            else:
                start = _next_day(last_date)
                if start > end:
                    logger.debug("[%s] 이미 최신 상태 (last: %s)", ticker, last_date)
                    time.sleep(PYKRX_DELAY)
                    continue

            new_df = fetch_ohlcv(ticker, start, end)

            if new_df.empty:
                logger.debug("[%s] 신규 데이터 없음", ticker)
                time.sleep(PYKRX_DELAY)
                continue

            # 기존 데이터와 병합 (파일이 있고 유효한 경우)
            if file_is_valid(parquet_path):
                existing_df = load_parquet(parquet_path)
                combined = pd.concat([existing_df, new_df])
                combined = combined[~combined.index.duplicated(keep="last")]
                combined.sort_index(inplace=True)
            else:
                combined = new_df

            save_parquet(combined, parquet_path, compression=PARQUET_COMPRESSION)
            logger.debug("[%s] 증분 저장 완료 (신규: %d 행, 전체: %d 행)", ticker, len(new_df), len(combined))

        except Exception as exc:
            logger.error("[%s] 증분 수집 실패: %s", ticker, exc)
            failed.append(ticker)

        time.sleep(PYKRX_DELAY)

    logger.info(
        "OHLCV 증분 수집 완료 | 성공: %d | 실패: %d",
        len(tickers) - len(failed),
        len(failed),
    )
    if failed:
        logger.warning("실패 종목: %s", ", ".join(failed))


# ---------------------------------------------------------------------------
# CLI 엔트리포인트
# ---------------------------------------------------------------------------

def main() -> None:
    """
    CLI 엔트리포인트.
    --initial  : 초기 전체 수집
    --incremental : 증분 업데이트 (기본값)
    """
    parser = argparse.ArgumentParser(description="코스피 200 OHLCV 데이터 수집")
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
        help="유니버스 파일(편출 종목 포함)로 OHLCV 수집",
    )
    args = parser.parse_args()

    tickers = get_universe_tickers_for_ohlcv() if args.use_universe else get_kospi200_tickers()

    if args.initial:
        collect_initial(tickers)
    else:
        # --incremental 이 명시되거나 플래그 없이 실행 시 증분 수집
        collect_incremental(tickers)


if __name__ == "__main__":
    main()
