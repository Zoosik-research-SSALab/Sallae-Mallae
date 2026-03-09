"""
collectors/collect_financial.py
DART API를 사용한 분기 재무제표 수집 스크립트 (Point-in-Time 보장).

Point-in-Time 설계:
  - 파일명에 수집 날짜 포함: {ticker}_{YYYYMMDD}.parquet
  - 같은 ticker라도 수집 날짜가 다르면 별도 파일로 저장
  - 백테스트 시 특정 날짜 기준으로 그 이전 파일만 로드하여 미래 정보 누출 방지

저장 경로: RAW_FINANCIAL_PATH/{ticker}_{YYYYMMDD}.parquet
컬럼: ticker, fiscal_year, fiscal_quarter, revenue, operating_income,
      net_income, total_assets, total_equity, debt_ratio, roe, per, pbr,
      report_date, as_of_date

Python 3.10+, Google Colab 호환.
"""

from __future__ import annotations

import argparse
import time
from datetime import date

import pandas as pd
import requests

from config import (
    DART_API_KEY,
    PARQUET_COMPRESSION,
    RAW_FINANCIAL_PATH,
)
from utils.drive_utils import ensure_dir, save_parquet
from utils.logger import setup_logger

logger = setup_logger(__name__)

# ---------------------------------------------------------------------------
# 상수
# ---------------------------------------------------------------------------
DART_BASE_URL = "https://opendart.fss.or.kr/api"
_PLACEHOLDER_DART = {"your_dart_api_key_here", ""}

# DART 분기 보고서 코드
_QUARTER_REPORT_CODE: dict[int, str] = {
    1: "11013",  # 1분기 보고서
    2: "11012",  # 반기 보고서
    3: "11014",  # 3분기 보고서
    4: "11011",  # 사업보고서 (연간)
}

# DART 재무 항목 계정명 -> 표준 컬럼 매핑
_ACCOUNT_MAP: dict[str, str] = {
    # 매출액
    "매출액": "revenue",
    "수익(매출액)": "revenue",
    "영업수익": "revenue",
    # 영업이익
    "영업이익": "operating_income",
    "영업이익(손실)": "operating_income",
    # 당기순이익
    "당기순이익": "net_income",
    "당기순이익(손실)": "net_income",
    "연결당기순이익": "net_income",
    # 자산총계
    "자산총계": "total_assets",
    # 자본총계
    "자본총계": "total_equity",
    "자본합계": "total_equity",
}

# API 호출 간 딜레이 (초) - 일일 호출 제한 준수
_API_DELAY: float = 0.3


# ---------------------------------------------------------------------------
# API 키 검증
# ---------------------------------------------------------------------------
def _validate_dart_key() -> bool:
    """DART API 키가 유효한지 확인합니다."""
    if not DART_API_KEY or DART_API_KEY.strip().lower() in _PLACEHOLDER_DART:
        logger.error(
            "DART_API_KEY가 설정되지 않았거나 플레이스홀더입니다. "
            "환경 변수 DART_API_KEY를 설정하세요. 수집을 종료합니다."
        )
        return False
    return True


# ---------------------------------------------------------------------------
# DART 기업 고유번호 조회
# ---------------------------------------------------------------------------
def get_dart_corp_codes(tickers: list[str]) -> dict[str, str]:
    """
    DART corpCode.xml (ZIP) 을 한 번 다운로드하여 stock_code -> corp_code 매핑을 구축합니다.
    /company.json 은 corp_code 입력용이므로 stock_code 조회에 사용 불가.

    Args:
        tickers: 종목 코드 리스트 (예: ["005930", "000660"])

    Returns:
        {ticker: corp_code} 매핑 딕셔너리.
        조회 실패한 ticker는 결과에서 제외됩니다.
    """
    import io
    import xml.etree.ElementTree as ET
    import zipfile

    try:
        resp = requests.get(
            f"{DART_BASE_URL}/corpCode.xml",
            params={"crtfc_key": DART_API_KEY},
            timeout=30,
        )
        resp.raise_for_status()

        with zipfile.ZipFile(io.BytesIO(resp.content)) as zf:
            xml_bytes = zf.read(zf.namelist()[0])

        root = ET.fromstring(xml_bytes)
    except Exception as exc:
        logger.error("corpCode.xml 다운로드/파싱 실패: %s", exc)
        return {}

    # stock_code -> corp_code 전체 매핑 구축
    ticker_set = set(tickers)
    result: dict[str, str] = {}
    for corp in root.findall("list"):
        stock_code = (corp.findtext("stock_code") or "").strip()
        if stock_code in ticker_set:
            corp_code = (corp.findtext("corp_code") or "").strip()
            if corp_code:
                result[stock_code] = corp_code

    logger.info("corp_code 조회 완료: %d/%d 성공", len(result), len(tickers))
    return result


# ---------------------------------------------------------------------------
# 단일 기업 분기 재무제표 수집
# ---------------------------------------------------------------------------
def fetch_financial_statements(
    corp_code: str,
    ticker: str,
    year: int,
    quarter: int,
) -> pd.DataFrame:
    """
    DART API로 단일 기업의 분기 재무제표를 수집합니다.
    연결 재무제표(CFS) 우선, 없으면 별도 재무제표(OFS)를 사용합니다.

    Args:
        corp_code: DART 기업 고유번호
        ticker: 종목 코드 (파싱 결과에 포함)
        year: 회계연도 (예: 2024)
        quarter: 분기 (1~4)

    Returns:
        파싱된 재무 데이터 DataFrame. 수집 실패 시 빈 DataFrame.
    """
    reprt_code = _QUARTER_REPORT_CODE.get(quarter)
    if reprt_code is None:
        logger.error("유효하지 않은 분기: %d (1~4 사이여야 합니다)", quarter)
        return pd.DataFrame()

    # 연결(CFS) 우선, 실패 시 별도(OFS) 시도
    for fs_div in ("CFS", "OFS"):
        time.sleep(_API_DELAY)
        try:
            resp = requests.get(
                f"{DART_BASE_URL}/fnlttSinglAcntAll.json",
                params={
                    "crtfc_key": DART_API_KEY,
                    "corp_code": corp_code,
                    "bsns_year": str(year),
                    "reprt_code": reprt_code,
                    "fs_div": fs_div,
                },
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()

            status = data.get("status")
            if status == "000" and data.get("list"):
                logger.debug(
                    "DART 재무제표 수집 성공: ticker=%s, %dQ%d, fs_div=%s",
                    ticker, year, quarter, fs_div,
                )
                return parse_financial_data(data, ticker, year, quarter)

            if status == "013":
                # 데이터 없음 - 다음 fs_div 시도
                logger.debug(
                    "DART 재무제표 없음: ticker=%s, %dQ%d, fs_div=%s (다음 시도)",
                    ticker, year, quarter, fs_div,
                )
                continue

            logger.warning(
                "DART 재무제표 조회 실패: ticker=%s, %dQ%d, fs_div=%s, status=%s, msg=%s",
                ticker, year, quarter, fs_div,
                status, data.get("message"),
            )
            # 명확한 오류는 OFS 시도 없이 종료
            break

        except requests.HTTPError as exc:
            logger.error(
                "DART 재무제표 HTTP 오류: ticker=%s, %dQ%d, fs_div=%s, %s",
                ticker, year, quarter, fs_div, exc,
            )
            break
        except Exception as exc:
            logger.error(
                "DART 재무제표 예외: ticker=%s, %dQ%d, fs_div=%s, %s",
                ticker, year, quarter, fs_div, exc,
            )
            break

    return pd.DataFrame()


# ---------------------------------------------------------------------------
# DART 응답 파싱
# ---------------------------------------------------------------------------
def parse_financial_data(
    raw_data: dict,
    ticker: str,
    fiscal_year: int,
    fiscal_quarter: int,
) -> pd.DataFrame:
    """
    DART API 응답을 표준 컬럼 형식으로 파싱합니다.

    Args:
        raw_data: DART API JSON 응답 딕셔너리
        ticker: 종목 코드
        fiscal_year: 회계연도
        fiscal_quarter: 분기

    Returns:
        표준 컬럼을 가진 단일 행 DataFrame.
        파싱 실패 시 빈 DataFrame.
    """
    items = raw_data.get("list", [])
    if not items:
        logger.warning("parse_financial_data: 빈 list - ticker=%s, %dQ%d", ticker, fiscal_year, fiscal_quarter)
        return pd.DataFrame()

    # 계정명 -> 당기 금액 매핑 구성
    values: dict[str, float | None] = {}
    report_date: str | None = None

    for item in items:
        acnt_nm: str = item.get("account_nm", "").strip()
        std_col = _ACCOUNT_MAP.get(acnt_nm)
        if std_col and std_col not in values:
            raw_val = item.get("thstrm_amount", "").replace(",", "").strip()
            try:
                values[std_col] = float(raw_val) if raw_val else None
            except ValueError:
                values[std_col] = None

        # 보고서 날짜 추출 (최초 유효 값 사용)
        if report_date is None:
            rd = item.get("thstrm_dt", "").strip()
            if rd:
                report_date = rd

    # 파생 지표 계산
    total_assets = values.get("total_assets")
    total_equity = values.get("total_equity")
    net_income = values.get("net_income")

    debt_ratio: float | None = None
    roe: float | None = None

    if total_assets and total_equity and total_assets != 0:
        total_debt = total_assets - total_equity
        debt_ratio = round(total_debt / total_equity * 100, 2) if total_equity != 0 else None

    if net_income is not None and total_equity and total_equity != 0:
        roe = round(net_income / total_equity * 100, 2)

    as_of_date: str = date.today().isoformat()

    row = {
        "ticker": ticker,
        "fiscal_year": fiscal_year,
        "fiscal_quarter": fiscal_quarter,
        "revenue": values.get("revenue"),
        "operating_income": values.get("operating_income"),
        "net_income": net_income,
        "total_assets": total_assets,
        "total_equity": total_equity,
        "debt_ratio": debt_ratio,
        "roe": roe,
        "per": None,   # DART 재무제표에 미포함 - 별도 수집 필요
        "pbr": None,   # DART 재무제표에 미포함 - 별도 수집 필요
        "report_date": report_date,
        "as_of_date": as_of_date,
    }

    df = pd.DataFrame([row])
    logger.debug(
        "parse_financial_data 완료: ticker=%s, %dQ%d, revenue=%s",
        ticker, fiscal_year, fiscal_quarter, row["revenue"],
    )
    return df


# ---------------------------------------------------------------------------
# 분기 수집 및 저장
# ---------------------------------------------------------------------------
def collect_quarter(
    tickers: list[str],
    year: int,
    quarter: int,
    corp_codes: dict[str, str] | None = None,
) -> None:
    """
    지정한 분기의 재무 데이터를 수집하여 Point-in-Time 파일로 저장합니다.

    저장 파일명: RAW_FINANCIAL_PATH/{ticker}_{YYYYMMDD}.parquet
    YYYYMMDD는 수집 시점(오늘) 날짜입니다.

    Args:
        tickers: 수집할 종목 코드 리스트
        year: 회계연도
        quarter: 분기 (1~4)
        corp_codes: 미리 조회한 {ticker: corp_code} 딕셔너리. None이면 내부에서 조회.
    """
    if not _validate_dart_key():
        return

    ensure_dir(RAW_FINANCIAL_PATH)
    today_str: str = date.today().strftime("%Y%m%d")
    logger.info("분기 수집 시작: %dQ%d, 종목 수=%d, as_of=%s", year, quarter, len(tickers), today_str)

    if corp_codes is None:
        corp_codes = get_dart_corp_codes(tickers)
    if not corp_codes:
        logger.error("유효한 corp_code가 없습니다. 수집을 종료합니다.")
        return

    success_count = 0
    for ticker in tickers:
        corp_code = corp_codes.get(ticker)
        if not corp_code:
            logger.warning("[%s] corp_code 없음. 건너뜁니다.", ticker)
            continue

        logger.info("[%s] 재무제표 수집 중: %dQ%d", ticker, year, quarter)
        df = fetch_financial_statements(corp_code, ticker, year, quarter)

        if df.empty:
            logger.warning("[%s] %dQ%d 재무 데이터 없음. 저장 건너뜁니다.", ticker, year, quarter)
            continue

        # as_of_date 필드 검증 - 없으면 저장 거부
        if "as_of_date" not in df.columns or df["as_of_date"].isna().all():
            logger.error(
                "[%s] as_of_date 필드 없음. Point-in-Time 보장 불가. 저장을 거부합니다.",
                ticker,
            )
            continue

        dest = RAW_FINANCIAL_PATH / f"{ticker}_{year}Q{quarter:02d}_{today_str}.parquet"
        save_parquet(df, dest, compression=PARQUET_COMPRESSION)
        logger.info("[%s] 저장 완료 -> %s", ticker, dest)
        success_count += 1

    logger.info(
        "분기 수집 완료: %dQ%d, 성공=%d/%d",
        year, quarter, success_count, len(tickers),
    )


# ---------------------------------------------------------------------------
# 최근 N개 분기 수집
# ---------------------------------------------------------------------------
def collect_recent_quarters(tickers: list[str], n_quarters: int = 8) -> None:
    """
    오늘 기준으로 최근 N개 분기의 재무 데이터를 수집합니다.

    Args:
        tickers: 수집할 종목 코드 리스트
        n_quarters: 수집할 분기 수 (기본값 8, 약 2년치)
    """
    if not _validate_dart_key():
        return

    # 최근 N개 분기 목록 생성 (역순: 가장 최근 분기부터)
    quarters: list[tuple[int, int]] = []
    today = date.today()
    current_year = today.year
    # 현재 분기 추정 (현재 월 기준)
    current_quarter = (today.month - 1) // 3 + 1

    y, q = current_year, current_quarter
    for _ in range(n_quarters):
        quarters.append((y, q))
        q -= 1
        if q == 0:
            q = 4
            y -= 1

    logger.info(
        "최근 %d개 분기 수집 시작: %dQ%d ~ %dQ%d",
        n_quarters,
        quarters[-1][0], quarters[-1][1],
        quarters[0][0], quarters[0][1],
    )

    # corp_code는 분기마다 동일 — 한 번만 조회
    corp_codes = get_dart_corp_codes(tickers)
    if not corp_codes:
        logger.error("유효한 corp_code가 없습니다. 수집을 종료합니다.")
        return

    for year, quarter in quarters:
        logger.info("--- %dQ%d 수집 ---", year, quarter)
        collect_quarter(tickers, year, quarter, corp_codes=corp_codes)


# ---------------------------------------------------------------------------
# CLI 진입점
# ---------------------------------------------------------------------------
def main() -> None:
    """
    CLI 사용:
      python collect_financial.py --year 2024 --quarter 3 --tickers 005930 000660
      python collect_financial.py --recent 8 --tickers 005930 000660
      python collect_financial.py --recent 4  (tickers 파일에서 로드하는 경우 확장 가능)
    """
    parser = argparse.ArgumentParser(description="DART 재무제표 수집기")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--year", type=int, help="수집할 회계연도 (--quarter와 함께 사용)")
    group.add_argument("--recent", type=int, metavar="N", help="최근 N개 분기 수집")

    parser.add_argument("--quarter", type=int, choices=[1, 2, 3, 4], help="수집할 분기 (1~4)")
    parser.add_argument(
        "--tickers",
        nargs="+",
        default=None,
        help="수집할 종목 코드 (예: 005930 000660 035720). --use-universe와 함께 생략 가능",
    )
    parser.add_argument(
        "--use-universe",
        action="store_true",
        help="유니버스 파일(편출 종목 포함)로 재무 수집",
    )

    args = parser.parse_args()

    # 종목 목록 결정
    if args.use_universe:
        from collectors.collect_ohlcv import get_universe_tickers_for_ohlcv
        tickers = get_universe_tickers_for_ohlcv()
    elif args.tickers:
        tickers = args.tickers
    else:
        parser.error("--tickers 또는 --use-universe 중 하나를 지정해야 합니다.")

    if args.year is not None:
        if args.quarter is None:
            parser.error("--year 사용 시 --quarter도 지정해야 합니다.")
        collect_quarter(tickers, args.year, args.quarter)
    else:
        collect_recent_quarters(tickers, n_quarters=args.recent)


if __name__ == "__main__":
    main()
