"""
collectors/collect_supply_demand.py
한국투자증권 KIS Open API를 사용한 코스피 200 수급 데이터 수집 모듈.
외국인/기관/개인 순매수 거래대금 및 누적 순매수 데이터를 수집합니다.
초기 수집(5년치)과 증분 업데이트를 지원합니다.

[KIS API 사용]
TR_ID: FHKST01010900 (종목별 투자자 기간별 매매동향)
  - 1회 요청으로 지정 기간의 일별 데이터를 반환합니다.
  - KIS_CHUNK_DAYS(config) 단위로 날짜를 나눠 반복 요청합니다.
  - 인증: OAuth2 Bearer 토큰 (utils.kis_client.KISClient)

[KIS API 키 설정]
  .env 파일에 KIS_API_KEY, KIS_SECRET_KEY를 설정해야 합니다.
"""

import argparse
import time
from datetime import datetime, timedelta

import pandas as pd
from tqdm import tqdm

from config import (
    KIS_API_KEY,
    KIS_API_SECRET,
    KIS_DELAY,
    PARQUET_COMPRESSION,
    RAW_SUPPLY_PATH,
    SUPPLY_START_DATE,
)
from utils.drive_utils import ensure_dir, file_is_valid, get_last_date, load_parquet, save_parquet
from utils.kis_client import KISClient
from utils.logger import setup_logger

logger = setup_logger(__name__)

_TODAY: str = datetime.today().strftime("%Y%m%d")

# ---------------------------------------------------------------------------
# KIS API 클라이언트 (모듈 수준 싱글턴)
# ---------------------------------------------------------------------------
_kis: KISClient = KISClient(KIS_API_KEY or "", KIS_API_SECRET or "")


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


_KIS_MAX_PAGES: int = 300  # 역방향 페이지 상한 (300×30 거래일 ≈ 36년치)


# ---------------------------------------------------------------------------
# KIS 응답 파싱
# ---------------------------------------------------------------------------

# KIS output 필드 → 내부 컬럼 매핑
# frgn_ntby_tr_pbmn: 외국인 순매수 거래대금 (원)
# orgn_ntby_tr_pbmn: 기관계 순매수 거래대금 (원)
# prsn_ntby_tr_pbmn: 개인 순매수 거래대금 (원) — KIS API는 'indv_' 아닌 'prsn_' 접두사 사용
_KIS_FIELD_MAP: dict[str, str] = {
    "frgn_ntby_tr_pbmn": "foreign_net_buy",
    "orgn_ntby_tr_pbmn": "institution_net_buy",
    "prsn_ntby_tr_pbmn": "individual_net_buy",
}


def _parse_kis_records(records: list[dict]) -> pd.DataFrame:
    """
    KIS API output 레코드 리스트를 정규화된 DataFrame으로 변환합니다.

    Args:
        records: get_investor_trading() 반환 딕셔너리 리스트

    Returns:
        컬럼 [foreign_net_buy, institution_net_buy, individual_net_buy],
        인덱스 date (DatetimeIndex).
        레코드가 없거나 파싱 실패 시 빈 DataFrame 반환.
    """
    if not records:
        return pd.DataFrame()

    rows: list[dict] = []
    for rec in records:
        date_str = rec.get("stck_bsop_date", "")
        if not date_str or len(date_str) != 8:
            continue
        try:
            row = {"date": pd.to_datetime(date_str, format="%Y%m%d")}
            for kis_field, col in _KIS_FIELD_MAP.items():
                raw_val = rec.get(kis_field, "0") or "0"
                row[col] = float(raw_val)
            rows.append(row)
        except (ValueError, TypeError) as exc:
            logger.debug("KIS 레코드 파싱 건너뜀: %s | 오류: %s", rec, exc)
            continue

    if not rows:
        return pd.DataFrame()

    df = pd.DataFrame(rows).set_index("date")
    df.index.name = "date"
    df.sort_index(inplace=True)

    # 필수 컬럼 존재 여부 확인
    required = list(_KIS_FIELD_MAP.values())
    missing = [c for c in required if c not in df.columns]
    if missing:
        logger.warning(
            "KIS 수급 컬럼 누락: %s | 수신 필드: %s",
            missing,
            list(records[0].keys()) if records else [],
        )
        return pd.DataFrame()

    return df[required]


def _add_cumsum(df: pd.DataFrame) -> pd.DataFrame:
    """순매수 컬럼에서 누적 순매수 컬럼을 계산하여 추가합니다."""
    df = df.copy()
    df["foreign_cum_buy"] = df["foreign_net_buy"].cumsum()
    df["institution_cum_buy"] = df["institution_net_buy"].cumsum()
    return df


def _merge_cumsum(existing: pd.DataFrame, new: pd.DataFrame) -> pd.DataFrame:
    """
    기존 데이터와 신규 데이터를 병합한 뒤 누적 순매수를 전체 기간 기준으로 재계산합니다.
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
    단일 종목의 수급 데이터를 KIS API로 수집합니다.

    [KIS API 동작 특성]
    FHKST01010900 엔드포인트는 FID_INPUT_DATE_2(종료일) 기준
    최근 30 거래일 데이터만 반환합니다. FID_INPUT_DATE_1(시작일)은 무시됩니다.
    따라서 종료일에서 역방향으로 30 거래일씩 페이지를 넘기며 start_date까지 수집합니다.

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
    start_ts = pd.Timestamp(datetime.strptime(start_date, "%Y%m%d"))
    all_frames: list[pd.DataFrame] = []
    current_end = end_date

    for page in range(_KIS_MAX_PAGES):
        if page > 0:
            time.sleep(KIS_DELAY)

        try:
            records = _kis.get_investor_trading(ticker, start_date, current_end)
        except Exception as exc:
            logger.warning("[%s] KIS 조회 실패 (end=%s): %s", ticker, current_end, exc)
            break

        frame = _parse_kis_records(records)
        if frame.empty:
            break

        # start_date 이후 데이터만 보관
        frame_in_range = frame[frame.index >= start_ts]
        if not frame_in_range.empty:
            all_frames.append(frame_in_range)

        # 이 페이지에서 가장 오래된 날짜가 start_date 이하이면 수집 완료
        oldest = frame.index.min()
        if oldest <= start_ts:
            break

        # 다음 페이지 종료일: 현재 페이지 가장 오래된 날짜 하루 전
        current_end = (oldest - timedelta(days=1)).strftime("%Y%m%d")

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
    수집 범위: SUPPLY_START_DATE (config) ~ 오늘.

    Args:
        tickers: 수집 대상 종목 코드 리스트
    """
    ensure_dir(RAW_SUPPLY_PATH)

    start = _to_yyyymmdd(SUPPLY_START_DATE)
    end = _TODAY

    logger.info(
        "수급 초기 수집 시작 (KIS API) | 기간: %s ~ %s | 종목 수: %d",
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

        time.sleep(KIS_DELAY)

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
    logger.info("수급 증분 수집 시작 (KIS API) | 종료일: %s | 종목 수: %d", end, len(tickers))

    saved: list[str] = []
    failed: list[str] = []

    for ticker in tqdm(tickers, desc="수급 증분 수집", unit="종목"):
        parquet_path = RAW_SUPPLY_PATH / f"{ticker}.parquet"

        try:
            last_date: str | None = get_last_date(parquet_path)

            if last_date is None:
                start = _to_yyyymmdd(SUPPLY_START_DATE)
                logger.info("[%s] 기존 파일 없음 - 전체 수집으로 전환 (시작: %s)", ticker, start)
            else:
                start = _next_day(last_date)
                if start > end:
                    logger.debug("[%s] 이미 최신 상태 (last: %s)", ticker, last_date)
                    time.sleep(KIS_DELAY)
                    continue

            new_df = fetch_supply_demand(ticker, start, end)

            if new_df.empty:
                logger.debug("[%s] 신규 데이터 없음", ticker)
                time.sleep(KIS_DELAY)
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

        time.sleep(KIS_DELAY)

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
    parser = argparse.ArgumentParser(description="코스피 200 수급 데이터 수집 (KIS API)")
    group = parser.add_mutually_exclusive_group()
    group.add_argument(
        "--initial",
        action="store_true",
        help=f"초기 전체 수집 ({SUPPLY_START_DATE} ~ 오늘)",
    )
    group.add_argument(
        "--incremental",
        action="store_true",
        help="증분 업데이트 (마지막 저장 날짜 이후만 수집, 기본값)",
    )
    args = parser.parse_args()

    from collectors.collect_ohlcv import get_kospi200_tickers

    tickers = get_kospi200_tickers()

    if args.initial:
        collect_initial(tickers)
    else:
        collect_incremental(tickers)


if __name__ == "__main__":
    main()
