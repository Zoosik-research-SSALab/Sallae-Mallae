"""
loaders/load_financials_to_db.py
fundamental_metrics.parquet → stock_financials DB 적재 스크립트.

DB 스키마에 있는 컬럼만 적재한다:
  stock_id, report_year, report_quarter, total_assets, total_liabilities,
  total_equity, revenue, operating_profit, net_income, operating_cash_flow,
  per, pbr, roe

변환:
  - ticker → stock_id (stocks 테이블 조회)
  - fiscal_year → report_year
  - fiscal_quarter (int) → report_quarter (varchar: "1Q", "2Q", ...)
  - operating_income → operating_profit

Python 3.10+ 호환.
"""

from __future__ import annotations

import argparse

import pandas as pd
from psycopg2.extras import execute_values

from config import PROCESSED_FUNDAMENTAL_PATH
from utils.db import get_connection, load_ticker_to_stock_id
from utils.logger import setup_logger

logger = setup_logger(__name__)


# ---------------------------------------------------------------------------
# parquet → DB 포맷 변환
# ---------------------------------------------------------------------------
def transform_for_db(df: pd.DataFrame, ticker_map: dict[str, int]) -> pd.DataFrame:
    """
    parquet DataFrame을 DB 스키마에 맞게 변환한다.

    - ticker → stock_id
    - fiscal_year → report_year
    - fiscal_quarter → report_quarter ("1Q", "2Q", ...)
    - operating_income → operating_profit
    - DB에 없는 파생 컬럼 제거
    """
    df = df.copy()

    # ticker → stock_id
    df["stock_id"] = df["ticker"].map(ticker_map)
    unmapped = df["stock_id"].isna().sum()
    if unmapped > 0:
        logger.warning("stock_id 매핑 실패: %d행 (제거됨)", unmapped)
        df = df.dropna(subset=["stock_id"])
    df["stock_id"] = df["stock_id"].astype(int)

    # 컬럼 리네이밍
    df = df.rename(columns={
        "fiscal_year": "report_year",
        "operating_income": "operating_profit",
    })

    # fiscal_quarter → report_quarter ("1Q", "2Q", ...)
    df["report_quarter"] = df["fiscal_quarter"].astype(int).astype(str) + "Q"

    # DB 스키마 컬럼만 추출
    db_columns = [
        "stock_id", "report_year", "report_quarter",
        "total_assets", "total_liabilities", "total_equity",
        "revenue", "operating_profit", "net_income",
        "operating_cash_flow", "per", "pbr", "roe",
    ]

    for col in db_columns:
        if col not in df.columns:
            df[col] = None

    df = df[db_columns]

    # BIGINT 컬럼: float → Python int (NaN은 None으로)
    # psycopg2가 numpy int64를 올바르게 처리하지 못할 수 있으므로 Python native int 사용
    bigint_cols = [
        "total_assets", "total_liabilities", "total_equity",
        "revenue", "operating_profit", "net_income", "operating_cash_flow",
    ]
    for col in bigint_cols:
        df[col] = df[col].apply(
            lambda x: int(x) if pd.notna(x) else None
        )

    logger.info("DB 포맷 변환 완료: %d행, %d컬럼", len(df), len(df.columns))
    return df


# ---------------------------------------------------------------------------
# DB 적재
# ---------------------------------------------------------------------------
def _has_unique_constraint(conn) -> bool:
    """stock_financials에 (stock_id, report_year, report_quarter) UNIQUE 제약이 있는지 확인."""
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT 1 FROM pg_constraint
            WHERE conrelid = 'stock_financials'::regclass
              AND contype = 'u'
              AND pg_get_constraintdef(oid) LIKE '%stock_id%report_year%report_quarter%'
            LIMIT 1
        """)
        return cur.fetchone() is not None
    finally:
        cur.close()


def load_to_db(conn, df: pd.DataFrame) -> int:
    """
    stock_financials 테이블에 적재한다.

    UNIQUE 제약이 있으면 upsert (ON CONFLICT → UPDATE),
    없으면 단순 INSERT.

    Returns:
        적재된 행 수
    """
    if df.empty:
        logger.warning("적재할 데이터 없음")
        return 0

    cur = conn.cursor()

    # NaN → None 변환 (dict 리스트로 직접 변환)
    col_names = df.columns.tolist()
    dict_records = [
        {col: (None if pd.isna(val) else val) for col, val in zip(col_names, row)}
        for row in df.values.tolist()
    ]

    use_upsert = _has_unique_constraint(conn)

    if use_upsert:
        logger.info("UNIQUE 제약 감지 — upsert 모드")
        sql = """
            INSERT INTO stock_financials (
                stock_id, report_year, report_quarter,
                total_assets, total_liabilities, total_equity,
                revenue, operating_profit, net_income,
                operating_cash_flow, per, pbr, roe
            ) VALUES %s
            ON CONFLICT (stock_id, report_year, report_quarter)
            DO UPDATE SET
                total_assets = EXCLUDED.total_assets,
                total_liabilities = EXCLUDED.total_liabilities,
                total_equity = EXCLUDED.total_equity,
                revenue = EXCLUDED.revenue,
                operating_profit = EXCLUDED.operating_profit,
                net_income = EXCLUDED.net_income,
                operating_cash_flow = EXCLUDED.operating_cash_flow,
                per = EXCLUDED.per,
                pbr = EXCLUDED.pbr,
                roe = EXCLUDED.roe
        """
    else:
        logger.info("UNIQUE 제약 없음 — INSERT 모드")
        sql = """
            INSERT INTO stock_financials (
                stock_id, report_year, report_quarter,
                total_assets, total_liabilities, total_equity,
                revenue, operating_profit, net_income,
                operating_cash_flow, per, pbr, roe
            ) VALUES %s
        """

    template = (
        "(%(stock_id)s, %(report_year)s, %(report_quarter)s,"
        " %(total_assets)s::BIGINT, %(total_liabilities)s::BIGINT, %(total_equity)s::BIGINT,"
        " %(revenue)s::BIGINT, %(operating_profit)s::BIGINT, %(net_income)s::BIGINT,"
        " %(operating_cash_flow)s::BIGINT, %(per)s::REAL, %(pbr)s::REAL, %(roe)s::REAL)"
    )

    try:
        execute_values(cur, sql, dict_records, template=template)
        conn.commit()
        count = len(records)
        logger.info("DB 적재 완료: %d행 (%s)", count, "upsert" if use_upsert else "insert")
        return count
    except Exception as exc:
        conn.rollback()
        logger.error("DB 적재 실패: %s", exc)
        raise
    finally:
        cur.close()


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------
def main() -> None:
    """fundamental_metrics.parquet → stock_financials DB 적재."""
    parser = argparse.ArgumentParser(description="재무 데이터 DB 적재")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="실제 적재 없이 변환 결과만 확인",
    )
    args = parser.parse_args()

    # 1. parquet 로드
    src = PROCESSED_FUNDAMENTAL_PATH / "fundamental_metrics.parquet"
    if not src.exists():
        logger.error("입력 파일 없음: %s", src)
        logger.info("먼저 python processors/build_fundamental_metrics.py 를 실행하세요.")
        return

    df = pd.read_parquet(src)
    logger.info("parquet 로드: %d행, %d컬럼", len(df), len(df.columns))

    # 2. DB 연결 및 매핑 조회
    conn = get_connection()
    try:
        ticker_map = load_ticker_to_stock_id(conn)

        # 3. 변환
        db_df = transform_for_db(df, ticker_map)

        if args.dry_run:
            logger.info("=== DRY RUN ===")
            print(db_df.head(10).to_string())
            print(f"\n총 {len(db_df)}행 적재 예정")
            return

        # 4. 적재
        count = load_to_db(conn, db_df)
        logger.info("=== 적재 완료: %d행 → stock_financials ===", count)

    finally:
        conn.close()


if __name__ == "__main__":
    main()
