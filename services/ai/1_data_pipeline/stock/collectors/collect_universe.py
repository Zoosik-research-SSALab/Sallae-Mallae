"""
collectors/collect_universe.py
KOSPI 200 역사적 유니버스 수집기.
2014-06-30 이후 반기별 구성 종목 스냅샷을 조회하여
편출 종목을 포함한 완전한 유니버스 JSON을 구축합니다.
생존편향(Survivorship Bias) 해결을 위한 수집기입니다.
pykrx 제약: 2014-05-01 이전 데이터 조회 불가.
"""

import argparse
import calendar
import json
import time
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

from config import KRX_PASSWORD, KRX_USER_ID, PYKRX_DELAY, RAW_UNIVERSE_PATH
from utils.drive_utils import ensure_dir
from utils.krx_session import ensure_krx_session
from utils.logger import setup_logger

logger = setup_logger(__name__)
_KOSPI200_INDEX_CODE = "1028"
_UNIVERSE_FILE = "kospi200_universe.json"


# ---------------------------------------------------------------------------
# 유틸리티
# ---------------------------------------------------------------------------

def _last_trading_day_of_month(year: int, month: int) -> str:
    """해당 연/월의 마지막 평일(주말 제외)을 'YYYYMMDD'로 반환합니다.

    calendar.monthrange로 마지막 날을 구하고, 토/일이면 하루씩 앞당깁니다.

    Args:
        year:  연도 (예: 2026)
        month: 월 (예: 6 또는 12)

    Returns:
        'YYYYMMDD' 형식의 날짜 문자열
    """
    _, last_day = calendar.monthrange(year, month)
    dt = datetime(year, month, last_day)
    # 토요일(5) → -1일, 일요일(6) → -2일
    while dt.weekday() >= 5:
        dt -= timedelta(days=1)
    return dt.strftime("%Y%m%d")


def _generate_snapshot_dates() -> list[str]:
    """2014-06 ~ 오늘까지 반기 말(6월, 12월) 날짜 목록을 생성합니다.

    각 연도의 6월 마지막 평일, 12월 마지막 평일을 포함하며,
    마지막 항목은 오늘 날짜(YYYYMMDD)를 추가합니다.

    Returns:
        'YYYYMMDD' 형식 날짜 문자열 목록
        예: ["20140630", "20141231", "20150630", ..., "20260304"]
    """
    today = datetime.today()
    today_str = today.strftime("%Y%m%d")

    dates: list[str] = []
    for year in range(2014, today.year + 1):
        for month in (6, 12):
            d = _last_trading_day_of_month(year, month)
            # 미래 날짜는 제외
            if d >= today_str:
                break
            dates.append(d)

    # 오늘 날짜 추가 (중복 방지)
    if today_str not in dates:
        dates.append(today_str)

    return dates


def _yyyymmdd_to_iso(date_str: str) -> str:
    """'YYYYMMDD' 형식을 'YYYY-MM-DD' 형식으로 변환합니다.

    Args:
        date_str: 'YYYYMMDD' 형식의 날짜 문자열

    Returns:
        'YYYY-MM-DD' 형식의 날짜 문자열
    """
    return f"{date_str[:4]}-{date_str[4:6]}-{date_str[6:]}"


def _fetch_snapshot(date: str) -> list[str]:
    """지정 날짜의 KOSPI 200 구성 종목을 pykrx로 조회합니다.

    pykrx `stock.get_index_portfolio_deposit_file("1028", date=date, alternative=True)`
    를 사용합니다. 실패 시 빈 리스트를 반환합니다.

    Args:
        date: 'YYYYMMDD' 형식의 조회 날짜

    Returns:
        종목 코드 문자열 리스트. 실패 시 빈 리스트.
    """
    from pykrx import stock

    try:
        tickers = stock.get_index_portfolio_deposit_file(
            _KOSPI200_INDEX_CODE, date=date, alternative=False
        )
        time.sleep(PYKRX_DELAY)
        if tickers:
            return list(tickers)
        return []
    except Exception as exc:
        logger.warning("[%s] 스냅샷 조회 실패: %s", date, exc)
        time.sleep(PYKRX_DELAY)
        return []


def _fetch_ticker_name(ticker: str) -> str:
    """종목 코드로 종목명을 조회합니다. 실패 시 종목 코드를 그대로 반환합니다.

    Args:
        ticker: 종목 코드 (예: "005930")

    Returns:
        종목명 문자열. 조회 실패 시 ticker 코드.
    """
    from pykrx import stock

    try:
        name = stock.get_market_ticker_name(ticker)
        if name:
            return name
        return ticker
    except Exception:
        return ticker


def _build_ticker_periods(
    snapshots: dict[str, list[str]],
    snapshot_dates: list[str],
) -> dict[str, list[list[str | None]]]:
    """스냅샷 비교로 ticker별 membership period를 구축합니다.

    편입/편출 이벤트를 감지하여 각 종목의 활동 구간(period) 목록을 반환합니다.
    재편입 종목은 periods 리스트에 복수의 원소를 가집니다.

    Args:
        snapshots:      {날짜(YYYYMMDD): 종목코드 리스트} 딕셔너리
        snapshot_dates: 정렬된 스냅샷 날짜 목록 (YYYYMMDD)

    Returns:
        {ticker: [[start_iso, end_iso|None], ...]} 형태의 딕셔너리
    """
    active_since: dict[str, str] = {}  # {ticker: 편입 스냅샷 날짜 (YYYYMMDD)}
    ticker_periods: dict[str, list[list[str | None]]] = defaultdict(list)

    for i, snap_date in enumerate(snapshot_dates):
        if snap_date not in snapshots or not snapshots[snap_date]:
            continue

        current_set = set(snapshots[snap_date])
        if i > 0 and snapshot_dates[i - 1] in snapshots:
            prev_set = set(snapshots[snapshot_dates[i - 1]])
        else:
            prev_set = set()

        # 편입: current에만 있는 종목
        for t in current_set - prev_set:
            active_since[t] = snap_date

        # 편출: prev에만 있는 종목
        for t in prev_set - current_set:
            start = active_since.pop(t, snapshot_dates[0])
            ticker_periods[t].append([_yyyymmdd_to_iso(start), _yyyymmdd_to_iso(snap_date)])

    # 루프 후 아직 active 종목 → end_date = None (현재까지 구성 중)
    for t, start in active_since.items():
        ticker_periods[t].append([_yyyymmdd_to_iso(start), None])

    return dict(ticker_periods)


# ---------------------------------------------------------------------------
# 핵심 함수
# ---------------------------------------------------------------------------

def build_universe(force_rebuild: bool = False) -> dict:
    """KOSPI 200 역사적 유니버스를 빌드하여 JSON으로 저장하고 반환합니다.

    기존 파일이 있고 force_rebuild=False이면 마지막 스냅샷 이후만 증분 업데이트합니다.

    Args:
        force_rebuild: True이면 기존 파일 무시하고 전체 재빌드

    Returns:
        빌드된 유니버스 딕셔너리 (JSON 스키마와 동일한 구조)
    """
    ensure_dir(RAW_UNIVERSE_PATH)
    universe_path = RAW_UNIVERSE_PATH / _UNIVERSE_FILE

    # KRX API는 2026-02-27부터 세션 인증 필수
    if not ensure_krx_session(KRX_USER_ID, KRX_PASSWORD):
        logger.warning("KRX 세션 인증 실패 — 수집이 실패하거나 빈 결과가 반환될 수 있습니다")

    existing: dict | None = load_universe()

    # 스냅샷 날짜 목록 결정
    all_snapshot_dates = _generate_snapshot_dates()

    if force_rebuild or existing is None:
        # 전체 재빌드
        dates_to_fetch = all_snapshot_dates
        existing_snapshots: dict[str, list[str]] = {}
        existing_tickers: dict[str, dict] = {}
        logger.info("유니버스 전체 빌드 시작 | 스냅샷 날짜 수: %d", len(dates_to_fetch))
    else:
        # 증분 업데이트: 기존 마지막 스냅샷 이후 날짜만 조회
        existing_snap_dates: list[str] = existing.get("meta", {}).get("snapshot_dates", [])
        last_existing = existing_snap_dates[-1] if existing_snap_dates else ""

        dates_to_fetch = [d for d in all_snapshot_dates if d > last_existing]
        existing_snapshots = {}
        existing_tickers = existing.get("tickers", {})
        logger.info(
            "유니버스 증분 업데이트 | 기존 마지막: %s | 신규 스냅샷 수: %d",
            last_existing,
            len(dates_to_fetch),
        )

    if not dates_to_fetch:
        logger.info("업데이트할 스냅샷 없음. 기존 유니버스 반환.")
        return existing or {}

    # 스냅샷 수집
    new_snapshots: dict[str, list[str]] = {}
    for date in dates_to_fetch:
        tickers_on_date = _fetch_snapshot(date)
        if not tickers_on_date:
            logger.warning("[%s] 스냅샷 결과 없음 — 건너뜀", date)
            continue
        new_snapshots[date] = tickers_on_date
        logger.debug("[%s] 스냅샷 수집 완료 (%d종목)", date, len(tickers_on_date))

    if not new_snapshots:
        logger.warning("수집된 신규 스냅샷 없음. 기존 유니버스 반환.")
        return existing or {}

    # 증분 업데이트 시: 기존 마지막 스냅샷도 비교 기준으로 포함
    if existing is not None and not force_rebuild:
        existing_snap_dates = existing.get("meta", {}).get("snapshot_dates", [])
        if existing_snap_dates:
            last_date = existing_snap_dates[-1]
            # 기존 마지막 스냅샷의 구성 종목 재구성 (period 비교 기준으로 사용)
            last_active = [
                ticker
                for ticker, info in existing_tickers.items()
                if any(p[1] is None for p in info.get("periods", []))
            ]
            existing_snapshots[last_date] = last_active

    # 전체 스냅샷 병합 (기존 + 신규)
    all_snapshots = {**existing_snapshots, **new_snapshots}

    # 비교에 사용할 정렬된 날짜 목록
    if existing is not None and not force_rebuild:
        existing_snap_dates = existing.get("meta", {}).get("snapshot_dates", [])
        compare_dates = sorted(set(existing_snap_dates) | set(new_snapshots.keys()))
    else:
        compare_dates = sorted(new_snapshots.keys())

    # period 구축
    new_ticker_periods = _build_ticker_periods(all_snapshots, compare_dates)

    # 증분 업데이트 시: 기존 종목 정보와 병합
    if existing is not None and not force_rebuild:
        merged_tickers: dict[str, dict] = {}

        for ticker, info in existing_tickers.items():
            old_periods = info.get("periods", [])
            # 기존에서 active(end=None)였던 period는 새 계산으로 교체
            closed_periods = [p for p in old_periods if p[1] is not None]
            if ticker in new_ticker_periods:
                merged_tickers[ticker] = {
                    "name": info.get("name", ticker),
                    "periods": closed_periods + new_ticker_periods[ticker],
                }
            else:
                # 신규 스냅샷에 등장하지 않은 종목은 기존 그대로 유지
                merged_tickers[ticker] = info

        # 신규 종목 추가
        for ticker, periods in new_ticker_periods.items():
            if ticker not in merged_tickers:
                name = _fetch_ticker_name(ticker)
                merged_tickers[ticker] = {"name": name, "periods": periods}

        final_tickers = merged_tickers
    else:
        # 전체 빌드: 신규 종목명 일괄 조회
        final_tickers = {}
        all_new_tickers = set(new_ticker_periods.keys())
        logger.info("종목명 조회 시작 | 총 %d종목", len(all_new_tickers))
        for ticker, periods in new_ticker_periods.items():
            name = _fetch_ticker_name(ticker)
            final_tickers[ticker] = {"name": name, "periods": periods}

    # meta 구축
    all_collected_dates = sorted(
        (existing.get("meta", {}).get("snapshot_dates", []) if existing and not force_rebuild else [])
        + list(new_snapshots.keys())
    )
    # 중복 제거 및 정렬
    all_collected_dates = sorted(set(all_collected_dates))

    active_count = sum(
        1 for info in final_tickers.values()
        if any(p[1] is None for p in info.get("periods", []))
    )

    universe = {
        "meta": {
            "last_updated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
            "snapshot_dates": all_collected_dates,
            "total_tickers": len(final_tickers),
            "index_code": _KOSPI200_INDEX_CODE,
        },
        "tickers": final_tickers,
    }

    # JSON 저장
    with open(universe_path, "w", encoding="utf-8") as f:
        json.dump(universe, f, ensure_ascii=False, indent=2)

    logger.info(
        "유니버스 저장 완료 | 전체: %d종목 | 현재 구성: %d종목 | 경로: %s",
        len(final_tickers),
        active_count,
        universe_path,
    )
    return universe


def load_universe() -> dict | None:
    """유니버스 JSON을 로드합니다.

    Returns:
        파싱된 유니버스 딕셔너리. 파일 없거나 파싱 실패 시 None.
    """
    universe_path = RAW_UNIVERSE_PATH / _UNIVERSE_FILE
    if not universe_path.is_file():
        return None
    try:
        with open(universe_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:
        logger.warning("유니버스 파일 파싱 실패: %s", exc)
        return None


def get_universe_tickers(active_only: bool = False) -> list[str]:
    """유니버스에서 종목 코드 목록을 반환합니다.

    Args:
        active_only: True이면 현재 구성 종목만 (periods 중 end_date=None인 것),
                     False이면 역대 전체 종목 (편출 포함).

    Returns:
        종목 코드 문자열 리스트.

    Raises:
        FileNotFoundError: 유니버스 파일이 없을 때.
    """
    universe = load_universe()
    if universe is None:
        raise FileNotFoundError(
            f"유니버스 파일을 찾을 수 없습니다: {RAW_UNIVERSE_PATH / _UNIVERSE_FILE}\n"
            "먼저 `python collectors/collect_universe.py` 를 실행하세요."
        )

    tickers_info: dict = universe.get("tickers", {})

    if not active_only:
        return sorted(tickers_info.keys())

    # active_only=True: end_date가 None인 period를 가진 종목만 반환
    active = [
        ticker
        for ticker, info in tickers_info.items()
        if any(p[1] is None for p in info.get("periods", []))
    ]
    return sorted(active)


# ---------------------------------------------------------------------------
# CLI 엔트리포인트
# ---------------------------------------------------------------------------

def main() -> None:
    """CLI 엔트리포인트.

    --force      : 전체 재빌드
    --active-only: 현재 구성 종목만 출력 (저장 없이)
    """
    parser = argparse.ArgumentParser(
        description="KOSPI 200 역사적 유니버스 수집 (생존편향 제거)"
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="전체 재빌드",
    )
    parser.add_argument(
        "--active-only",
        action="store_true",
        help="현재 구성 종목만 출력 (저장 없이)",
    )
    args = parser.parse_args()

    if args.active_only:
        try:
            active_tickers = get_universe_tickers(active_only=True)
            print(f"현재 KOSPI 200 구성 종목 ({len(active_tickers)}개):")
            for t in active_tickers:
                print(f"  {t}")
        except FileNotFoundError as exc:
            print(exc)
        return

    universe = build_universe(force_rebuild=args.force)

    if not universe:
        print("유니버스 빌드 실패.")
        return

    meta = universe.get("meta", {})
    tickers_info = universe.get("tickers", {})
    snap_dates = meta.get("snapshot_dates", [])
    total = len(tickers_info)
    active_count = sum(
        1 for info in tickers_info.values()
        if any(p[1] is None for p in info.get("periods", []))
    )
    exited_count = total - active_count
    first_snap = snap_dates[0] if snap_dates else "-"
    last_snap = snap_dates[-1] if snap_dates else "-"

    print(
        f"\n유니버스 빌드 완료\n"
        f"  스냅샷 수    : {len(snap_dates)}개 ({first_snap} ~ {last_snap})\n"
        f"  전체 종목 수 : {total}개\n"
        f"  현재 구성    : {active_count}개\n"
        f"  편출 종목    : {exited_count}개\n"
        f"  저장 경로    : {RAW_UNIVERSE_PATH / _UNIVERSE_FILE}"
    )


if __name__ == "__main__":
    main()
