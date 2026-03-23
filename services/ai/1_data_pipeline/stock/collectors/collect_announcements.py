"""
collectors/collect_announcements.py
DART API를 사용한 정기공시 메타데이터 수집 → stock_announcements DB 적재.

수집 대상:
  - 정기공시(A): 1분기보고서, 반기보고서, 3분기보고서, 사업보고서

DART /list.json 응답 → stock_announcements 테이블 매핑:
  - rcept_dt     → announced_at (공시 접수일)
  - report_nm    → title (보고서명)
  - rcept_no     → url (DART 뷰어 링크 조합)
  - report_nm    → target_year (파싱), has_financial_analysis, has_operating_profit

CLI 사용:
  python collectors/collect_announcements.py --initial
  python collectors/collect_announcements.py --incremental
  python collectors/collect_announcements.py --initial --start-year 2020

Python 3.10+ 호환.
"""

from __future__ import annotations

import argparse
import re
import time
from datetime import date, timedelta

import requests

from config import DART_API_KEY, RAW_OHLCV_PATH
from utils.db import get_connection, load_ticker_to_stock_id
from utils.logger import setup_logger

logger = setup_logger(__name__)

# ---------------------------------------------------------------------------
# 상수
# ---------------------------------------------------------------------------
DART_BASE_URL = "https://opendart.fss.or.kr/api"
DART_VIEWER_URL = "https://dart.fss.or.kr/dsaf001/main.do?rcept_no={rcept_no}"
_PLACEHOLDER_DART = {"your_dart_api_key_here", ""}
_API_DELAY: float = 0.3

# 정기공시 유형 코드
_PBLNTF_TY = "A"  # A=정기공시


# ---------------------------------------------------------------------------
# API 키 검증
# ---------------------------------------------------------------------------
def _validate_dart_key() -> bool:
    """DART API 키가 유효한지 확인한다."""
    if not DART_API_KEY or DART_API_KEY.strip().lower() in _PLACEHOLDER_DART:
        logger.error(
            "DART_API_KEY가 설정되지 않았거나 플레이스홀더입니다. "
            "환경 변수 DART_API_KEY를 설정하세요."
        )
        return False
    return True


# ---------------------------------------------------------------------------
# DART corp_code 조회 (collect_financial.py 재사용)
# ---------------------------------------------------------------------------
def _get_corp_codes(tickers: list[str]) -> dict[str, str]:
    """collect_financial의 corp_code 조회를 재사용한다."""
    from collectors.collect_financial import get_dart_corp_codes
    return get_dart_corp_codes(tickers)


# ---------------------------------------------------------------------------
# DART /list.json 호출
# ---------------------------------------------------------------------------
def _fetch_disclosure_list(
    corp_code: str,
    bgn_de: str,
    end_de: str,
) -> list[dict]:
    """
    DART /list.json으로 정기공시 목록을 조회한다.

    Args:
        corp_code: DART 기업 고유번호
        bgn_de: 조회 시작일 (YYYYMMDD)
        end_de: 조회 종료일 (YYYYMMDD)

    Returns:
        공시 항목 리스트. 각 항목은 DART API 응답 그대로.
    """
    all_items: list[dict] = []
    page_no = 1

    while True:
        try:
            resp = requests.get(
                f"{DART_BASE_URL}/list.json",
                params={
                    "crtfc_key": DART_API_KEY,
                    "corp_code": corp_code,
                    "bgn_de": bgn_de,
                    "end_de": end_de,
                    "pblntf_ty": _PBLNTF_TY,
                    "page_no": str(page_no),
                    "page_count": "100",
                },
                timeout=15,
            )
            resp.raise_for_status()
            data = resp.json()

            status = data.get("status", "")
            if status == "013":
                # 조회 결과 없음 (정상)
                break
            if status != "000":
                logger.warning(
                    "DART /list.json 오류: status=%s, message=%s",
                    status, data.get("message", ""),
                )
                break

            items = data.get("list", [])
            all_items.extend(items)

            # 페이징: total_page 확인
            total_page = int(data.get("total_page", 1))
            if page_no >= total_page:
                break
            page_no += 1
            time.sleep(_API_DELAY)

        except Exception as exc:
            logger.warning("DART /list.json 호출 실패 (corp_code=%s): %s", corp_code, exc)
            break

    return all_items


# ---------------------------------------------------------------------------
# 보고서명 파싱
# ---------------------------------------------------------------------------
def _parse_target_year(report_nm: str) -> int | None:
    """보고서명에서 대상 연도를 추출한다. (예: '[기재정정]분기보고서 (2025.09)' → 2025)"""
    match = re.search(r"\((\d{4})\.", report_nm)
    if match:
        return int(match.group(1))
    # 폴백: 4자리 연도 탐색
    match = re.search(r"(\d{4})", report_nm)
    if match:
        return int(match.group(1))
    return None


def _is_financial_report(report_nm: str) -> bool:
    """보고서명이 실적 관련 정기공시인지 확인한다."""
    keywords = ["분기보고서", "반기보고서", "사업보고서"]
    return any(kw in report_nm for kw in keywords)


# ---------------------------------------------------------------------------
# 공시 데이터 → DB 행 변환
# ---------------------------------------------------------------------------
def _to_db_row(
    item: dict,
    stock_id: int,
) -> dict | None:
    """
    DART /list.json 응답 항목을 stock_announcements DB 행으로 변환한다.

    Args:
        item: DART API 응답의 개별 공시 항목
        stock_id: stocks 테이블의 PK

    Returns:
        DB INSERT용 딕셔너리. 변환 불가 시 None.
    """
    rcept_dt = item.get("rcept_dt", "")
    report_nm = item.get("report_nm", "")
    rcept_no = item.get("rcept_no", "")

    if not rcept_dt or not report_nm or not rcept_no:
        return None

    # announced_at: YYYYMMDD → YYYY-MM-DD
    try:
        announced_at = f"{rcept_dt[:4]}-{rcept_dt[4:6]}-{rcept_dt[6:8]}"
    except (IndexError, ValueError):
        return None

    return {
        "stock_id": stock_id,
        "announced_at": announced_at,
        "title": report_nm[:255],
        "url": DART_VIEWER_URL.format(rcept_no=rcept_no),
        "content": None,  # 원문 수집은 후순위
        "target_year": _parse_target_year(report_nm),
        "has_financial_analysis": _is_financial_report(report_nm),
        "has_operating_profit": _is_financial_report(report_nm),  # 정기 재무보고서는 영업이익 포함
    }


# ---------------------------------------------------------------------------
# DB INSERT (UPSERT)
# ---------------------------------------------------------------------------
def _insert_announcements(conn, rows: list[dict]) -> int:
    """
    stock_announcements 테이블에 공시 데이터를 삽입한다.

    (stock_id, announced_at, title) 조합이 중복이면 건너뛴다.

    Args:
        conn: psycopg2 연결
        rows: _to_db_row()의 결과 리스트

    Returns:
        삽입된 행 수
    """
    if not rows:
        return 0

    from psycopg2.extras import execute_values

    # UNIQUE 제약 없이도 중복 방지: INSERT 전 기존 (stock_id, announced_at, title) 확인
    sql = """
        INSERT INTO stock_announcements
            (stock_id, announced_at, title, url, content,
             target_year, has_financial_analysis, has_operating_profit)
        SELECT v.stock_id::bigint, v.announced_at::date, v.title::varchar,
               v.url::varchar, v.content::text,
               v.target_year::int, v.has_financial_analysis::boolean,
               v.has_operating_profit::boolean
        FROM (VALUES %s) AS v(
            stock_id, announced_at, title, url, content,
            target_year, has_financial_analysis, has_operating_profit
        )
        WHERE NOT EXISTS (
            SELECT 1 FROM stock_announcements sa
            WHERE sa.stock_id = v.stock_id::bigint
              AND sa.announced_at = v.announced_at::date
              AND sa.title = v.title::varchar
        )
    """

    values = [
        (
            r["stock_id"], r["announced_at"], r["title"], r["url"], r["content"],
            r["target_year"], r["has_financial_analysis"], r["has_operating_profit"],
        )
        for r in rows
    ]

    cur = conn.cursor()
    try:
        execute_values(cur, sql, values)
        inserted = cur.rowcount
        conn.commit()
        return inserted
    except Exception as exc:
        conn.rollback()
        logger.error("DB INSERT 실패: %s", exc)
        return 0
    finally:
        cur.close()


# ---------------------------------------------------------------------------
# 종목 목록 로드
# ---------------------------------------------------------------------------
def _get_tickers() -> list[str]:
    """RAW_OHLCV_PATH에서 종목 코드 목록을 가져온다."""
    if not RAW_OHLCV_PATH.exists():
        logger.error("OHLCV 디렉토리 없음: %s", RAW_OHLCV_PATH)
        return []
    return [p.stem for p in sorted(RAW_OHLCV_PATH.glob("*.parquet"))]


# ---------------------------------------------------------------------------
# 수집 메인 함수
# ---------------------------------------------------------------------------
def collect_announcements(
    tickers: list[str] | None = None,
    start_date: str = "20200101",
    end_date: str | None = None,
) -> int:
    """
    DART 정기공시 메타데이터를 수집하여 DB에 저장한다.

    Args:
        tickers: 종목 코드 리스트. None이면 OHLCV 파일에서 자동 로드.
        start_date: 조회 시작일 (YYYYMMDD). 기본값 2020-01-01.
        end_date: 조회 종료일 (YYYYMMDD). None이면 오늘.

    Returns:
        총 삽입된 행 수
    """
    if not _validate_dart_key():
        return 0

    if tickers is None:
        tickers = _get_tickers()
    if not tickers:
        logger.error("수집 대상 종목이 없습니다.")
        return 0

    if end_date is None:
        end_date = date.today().strftime("%Y%m%d")

    logger.info(
        "공시 수집 시작: %d종목, 기간 %s ~ %s",
        len(tickers), start_date, end_date,
    )

    # 1. corp_code 조회
    corp_codes = _get_corp_codes(tickers)
    if not corp_codes:
        logger.error("유효한 corp_code가 없습니다.")
        return 0

    # 2. DB 연결 + ticker → stock_id 매핑
    try:
        conn = get_connection()
    except Exception as exc:
        logger.error("DB 연결 실패: %s", exc)
        return 0

    # 3. 종목별 공시 수집 + DB 적재
    total_inserted = 0
    success_count = 0
    skip_count = 0

    try:
        ticker_map = load_ticker_to_stock_id(conn)

        for i, ticker in enumerate(tickers, 1):
            corp_code = corp_codes.get(ticker)
            if not corp_code:
                skip_count += 1
                continue

            stock_id = ticker_map.get(ticker)
            if not stock_id:
                logger.debug("[%s] stocks 테이블에 없음. 건너뜀.", ticker)
                skip_count += 1
                continue

            # DART API 호출
            items = _fetch_disclosure_list(corp_code, start_date, end_date)
            if not items:
                logger.debug("[%s] 정기공시 없음 (기간: %s~%s)", ticker, start_date, end_date)
                continue

            # DB 행 변환
            rows = []
            for item in items:
                row = _to_db_row(item, stock_id)
                if row:
                    rows.append(row)

            # DB 삽입
            if rows:
                inserted = _insert_announcements(conn, rows)
                total_inserted += inserted
                if inserted > 0:
                    success_count += 1
                logger.info(
                    "[%d/%d] %s: 공시 %d건 조회, %d건 삽입",
                    i, len(tickers), ticker, len(rows), inserted,
                )

            time.sleep(_API_DELAY)
    finally:
        conn.close()

    logger.info(
        "공시 수집 완료: %d종목 성공, %d종목 건너뜀, 총 %d건 삽입",
        success_count, skip_count, total_inserted,
    )
    return total_inserted


def collect_incremental(tickers: list[str] | None = None) -> int:
    """
    증분 수집: 최근 90일간의 공시를 수집한다.

    WHERE NOT EXISTS 서브쿼리로 중복은 자동 무시된다.
    """
    start = (date.today() - timedelta(days=90)).strftime("%Y%m%d")
    return collect_announcements(tickers=tickers, start_date=start)


def collect_initial(
    tickers: list[str] | None = None,
    start_year: int = 2020,
) -> int:
    """
    초기 수집: start_year부터 현재까지 전체 공시를 수집한다.
    """
    start = f"{start_year}0101"
    return collect_announcements(tickers=tickers, start_date=start)


# ---------------------------------------------------------------------------
# CLI 엔트리포인트
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description="DART 정기공시 메타데이터 수집기")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--initial", action="store_true", help="초기 전체 수집")
    group.add_argument("--incremental", action="store_true", help="증분 수집 (최근 90일)")

    parser.add_argument(
        "--start-year", type=int, default=2020,
        help="초기 수집 시작 연도 (기본값: 2020)",
    )
    args = parser.parse_args()

    if args.initial:
        collect_initial(start_year=args.start_year)
    else:
        collect_incremental()


if __name__ == "__main__":
    main()
