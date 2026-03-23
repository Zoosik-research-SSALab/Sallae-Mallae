"""
pipeline.py
KOSPI 200 데이터 파이프라인 통합 실행 스크립트.

실행 단계:
1. Drive 폴더 구조 확인
2. 데이터 수집 (OHLCV → 수급 → 매크로 → 재무)
3. 베이스 피처 생성
4. 데이터 품질 검증
5. 완료 요약 로그

CLI 사용 예:
    python pipeline.py --mode initial
    python pipeline.py --mode incremental
    python pipeline.py --mode incremental --skip-features
    python pipeline.py --mode incremental --skip-validation

Python 3.10+ 호환, Google Colab 동작 지원.
"""

from __future__ import annotations

import argparse
import sys
import time
from datetime import datetime

from config import (
    BASE_PATH,
    LOGS_PATH,
    PROCESSED_BASE_PATH,
    PROCESSED_FUNDAMENTAL_PATH,
    RAW_FINANCIAL_PATH,
    RAW_MACRO_PATH,
    RAW_OHLCV_PATH,
    RAW_SUPPLY_PATH,
    RCLONE_AUTO_SYNC,
    RCLONE_REMOTE,
    RCLONE_SYNC_DIRS,
)
from utils.logger import setup_logger

logger = setup_logger(__name__)


# ---------------------------------------------------------------------------
# 재무 데이터 볼륨 상태 감지 및 자동 복구
# ---------------------------------------------------------------------------

def _ensure_financial_data() -> bool:
    """재무 데이터 볼륨 상태를 확인하고 부족하면 Drive에서 다운로드."""
    from utils.financial_check import ensure_financial_volume
    return ensure_financial_volume(
        BASE_PATH, RAW_FINANCIAL_PATH, RAW_OHLCV_PATH,
        RCLONE_AUTO_SYNC, RCLONE_REMOTE,
    )


# ---------------------------------------------------------------------------
# 수집 단계
# ---------------------------------------------------------------------------

def run_collection(mode: str = "incremental", use_universe: bool = False) -> tuple[bool, list[str]]:
    """
    데이터 수집 단계를 실행합니다.

    OHLCV → 수급 → 매크로 → 재무 순서로 수집합니다.
    각 수집기 실패 시 해당 항목을 건너뛰고 다음으로 진행합니다.

    Args:
        mode: "initial" (전체 초기 수집) 또는 "incremental" (증분 업데이트)
        use_universe: True이면 유니버스 파일(편출 종목 포함)로 OHLCV 수집

    Returns:
        (성공 여부, 신규 저장된 재무 파일명 리스트)
    """
    logger.info("=== 데이터 수집 시작 | mode=%s | use_universe=%s ===", mode, use_universe)
    success_count = 0
    fail_count = 0

    # --- OHLCV 수집 ---
    try:
        logger.info("[수집 1/4] OHLCV 수집 시작")
        from collectors.collect_ohlcv import (
            collect_incremental,
            collect_initial,
            get_kospi200_tickers,
            get_universe_tickers_for_ohlcv,
        )
        tickers = get_universe_tickers_for_ohlcv() if use_universe else get_kospi200_tickers()
        if mode == "initial":
            collect_initial(tickers)
        else:
            collect_incremental(tickers)
        logger.info("[수집 1/4] OHLCV 수집 완료")
        success_count += 1
    except ImportError:
        logger.warning("[수집 1/4] collectors.collect_ohlcv 모듈 없음 - 건너뜀")
        fail_count += 1
    except Exception as exc:
        logger.error("[수집 1/4] OHLCV 수집 실패: %s", exc)
        fail_count += 1

    # --- 수급 데이터 수집 (pykrx KRX 세션 방식) ---
    try:
        logger.info("[수집 2/4] 수급 데이터 수집 시작 (pykrx KRX)")
        from collectors.collect_supply_demand_krx import (
            collect_incremental as supply_incremental,
            collect_initial as supply_initial,
        )
        if mode == "initial":
            supply_initial(tickers)
        else:
            supply_incremental(tickers)
        logger.info("[수집 2/4] 수급 데이터 수집 완료")
        success_count += 1
    except ImportError:
        logger.warning("[수집 2/4] collectors.collect_supply_demand_krx 모듈 없음 - 건너뜀")
        fail_count += 1
    except Exception as exc:
        logger.error("[수집 2/4] 수급 데이터 수집 실패: %s", exc)
        fail_count += 1

    # --- 매크로 데이터 수집 ---
    try:
        logger.info("[수집 3/4] 매크로 데이터 수집 시작")
        from collectors.collect_macro import (
            collect_all as macro_collect_all,
            collect_incremental as macro_collect_incremental,
        )
        if mode == "initial":
            macro_collect_all()
        else:
            macro_collect_incremental()
        logger.info("[수집 3/4] 매크로 데이터 수집 완료")
        success_count += 1
    except ImportError:
        logger.warning("[수집 3/4] collectors.collect_macro 모듈 없음 - 건너뜀")
        fail_count += 1
    except Exception as exc:
        logger.error("[수집 3/4] 매크로 데이터 수집 실패: %s", exc)
        fail_count += 1

    # --- 재무 데이터 수집 ---
    financial_new_files: list[str] = []
    try:
        logger.info("[수집 4/4] 재무 데이터 수집 시작")
        from collectors.collect_financial import collect_recent_quarters
        financial_new_files = collect_recent_quarters(tickers)
        logger.info("[수집 4/4] 재무 데이터 수집 완료 (신규 %d건)", len(financial_new_files))
        success_count += 1
    except ImportError:
        logger.warning("[수집 4/4] collectors.collect_financial 모듈 없음 - 건너뜀")
        fail_count += 1
    except Exception as exc:
        logger.error("[수집 4/4] 재무 데이터 수집 실패: %s", exc)
        fail_count += 1

    logger.info(
        "=== 데이터 수집 완료 | 성공: %d / 실패: %d ===",
        success_count, fail_count,
    )
    return success_count > 0, financial_new_files


# ---------------------------------------------------------------------------
# 피처 엔지니어링 단계
# ---------------------------------------------------------------------------

def run_feature_engineering() -> bool:
    """
    베이스 피처 생성 단계를 실행합니다.

    OHLCV + 수급 + 매크로 + 메타 피처를 결합하여
    processed/base_features/base_features.parquet 로 저장합니다.

    Returns:
        성공 여부
    """
    logger.info("=== 베이스 피처 생성 시작 ===")

    try:
        from processors.build_base_features import main as base_features_main
        base_features_main()
        logger.info("=== 베이스 피처 생성 완료 ===")
        return True
    except ImportError:
        logger.warning("processors.build_base_features 모듈 없음 - 건너뜀")
        return False
    except Exception as exc:
        logger.error("베이스 피처 생성 실패: %s", exc)
        return False


# ---------------------------------------------------------------------------
# 펀더멘탈 파생 지표 단계
# ---------------------------------------------------------------------------

def run_fundamental_metrics() -> bool:
    """
    재무 파생 지표(비율, 성장률) 생성 단계를 실행합니다.

    raw/financial/ 데이터에서 operating_margin, net_margin, roa,
    revenue_yoy/qoq, operating_profit_yoy/qoq, net_income_yoy 등을 계산하여
    processed/fundamental/fundamental_metrics.parquet 로 저장합니다.

    Returns:
        성공 여부
    """
    logger.info("=== 펀더멘탈 파생 지표 생성 시작 ===")

    try:
        from processors.build_fundamental_metrics import main as fundamental_main
        fundamental_main()
        logger.info("=== 펀더멘탈 파생 지표 생성 완료 ===")
        return True
    except ImportError:
        logger.warning("processors.build_fundamental_metrics 모듈 없음 - 건너뜀")
        return False
    except Exception as exc:
        logger.error("펀더멘탈 파생 지표 생성 실패: %s", exc)
        return False


# ---------------------------------------------------------------------------
# DB 적재 단계
# ---------------------------------------------------------------------------

def run_db_load_financials() -> bool:
    """
    펀더멘탈 파생 지표를 stock_financials DB 테이블에 적재합니다.

    processed/fundamental/fundamental_metrics.parquet → DB INSERT/UPSERT.

    Returns:
        성공 여부
    """
    logger.info("=== 재무 데이터 DB 적재 시작 ===")
    try:
        from loaders.load_financials_to_db import load_to_db, transform_for_db
        from utils.db import get_connection, load_ticker_to_stock_id

        src = PROCESSED_FUNDAMENTAL_PATH / "fundamental_metrics.parquet"
        if not src.exists():
            logger.warning("fundamental_metrics.parquet 없음 — DB 적재 건너뜀")
            return False

        import pandas as pd
        df = pd.read_parquet(src)

        conn = get_connection()
        try:
            ticker_map = load_ticker_to_stock_id(conn)
            db_df = transform_for_db(df, ticker_map)
            count = load_to_db(conn, db_df)
            logger.info("=== 재무 데이터 DB 적재 완료: %d행 ===", count)
            return True
        finally:
            conn.close()
    except ImportError:
        logger.warning("loaders.load_financials_to_db 모듈 없음 — 건너뜀")
        return False
    except Exception as exc:
        logger.error("재무 데이터 DB 적재 실패: %s", exc)
        return False


def run_db_load_announcements() -> bool:
    """
    DART 정기공시 메타데이터를 stock_announcements DB 테이블에 적재합니다.

    증분 수집(최근 90일)으로 실행됩니다.

    Returns:
        성공 여부
    """
    logger.info("=== 공시 메타데이터 DB 적재 시작 ===")
    try:
        from collectors.collect_announcements import collect_incremental
        inserted = collect_incremental()
        logger.info("=== 공시 메타데이터 DB 적재 완료: %d건 ===", inserted)
        return True
    except ImportError:
        logger.warning("collectors.collect_announcements 모듈 없음 — 건너뜀")
        return False
    except Exception as exc:
        logger.error("공시 메타데이터 DB 적재 실패: %s", exc)
        return False


# ---------------------------------------------------------------------------
# 품질 검증 단계
# ---------------------------------------------------------------------------

def run_quality_check() -> dict:
    """
    데이터 품질 검증 단계를 실행합니다.

    validators.data_quality.generate_quality_report 를 호출하여
    전체 품질 리포트를 생성하고 반환합니다.

    Returns:
        품질 리포트 딕셔너리. 실패 시 {"error": "..."} 반환.
    """
    logger.info("=== 데이터 품질 검증 시작 ===")
    try:
        from validators.data_quality import generate_quality_report
        report = generate_quality_report()
        summary = report.get("summary", {})
        logger.info(
            "=== 품질 검증 완료 | 종목: %d | 이슈: %d건 ===",
            summary.get("total_tickers", 0),
            summary.get("total_issues", 0),
        )
        return report
    except Exception as exc:
        logger.error("품질 검증 실패: %s", exc)
        return {"error": str(exc)}


# ---------------------------------------------------------------------------
# Drive 폴더 구조 확인
# ---------------------------------------------------------------------------

def _check_drive_structure() -> None:
    """
    BASE_PATH 의 필수 폴더 구조를 확인합니다.
    폴더가 없으면 setup_drive 를 실행하여 생성합니다.
    """
    required_paths = [
        RAW_OHLCV_PATH,
        RAW_SUPPLY_PATH,
        RAW_MACRO_PATH,
        RAW_FINANCIAL_PATH,
        PROCESSED_BASE_PATH,
        PROCESSED_FUNDAMENTAL_PATH,
        LOGS_PATH,
    ]

    missing = [p for p in required_paths if not p.exists()]

    if missing:
        logger.info("필수 폴더 %d개 없음 - setup_drive 실행", len(missing))
        try:
            from setup_drive import setup_drive
            setup_drive()
        except Exception as exc:
            logger.warning("setup_drive 실행 실패 (계속 진행): %s", exc)
            # 직접 생성 시도
            for p in missing:
                try:
                    p.mkdir(parents=True, exist_ok=True)
                except Exception:
                    pass
    else:
        logger.info("Drive 폴더 구조 정상 확인 완료")


# ---------------------------------------------------------------------------
# 전체 파이프라인
# ---------------------------------------------------------------------------

def run_full_pipeline(
    mode: str = "incremental",
    skip_features: bool = False,
    skip_validation: bool = False,
    use_universe: bool = False,
    ensure_financial: bool = False,
) -> None:
    """
    전체 데이터 파이프라인을 실행합니다.

    실행 순서:
    1. Drive 폴더 구조 확인
    2. 데이터 수집 (mode 에 따라 초기/증분)
    3. 피처 엔지니어링 (skip_features=True 이면 건너뜀)
    4. 데이터 품질 검증 (skip_validation=True 이면 건너뜀)
    5. 완료 요약 로그

    수집 실패 시에도 이후 단계를 계속 진행합니다.
    전체 파이프라인이 비정상 종료되면 sys.exit(1) 을 호출합니다.

    Args:
        mode:            "initial" 또는 "incremental"
        skip_features:   True 이면 피처 엔지니어링 건너뜀
        skip_validation: True 이면 품질 검증 건너뜀
        use_universe:    True 이면 유니버스 파일(편출 종목 포함)로 OHLCV 수집
        ensure_financial: True 이면 rclone DOWN 단계 후 재무 데이터 볼륨 확인
    """
    pipeline_start = time.monotonic()
    start_dt = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logger.info("##################################################")
    logger.info("# KOSPI 200 데이터 파이프라인 시작")
    logger.info("# 시작 시각: %s | mode=%s", start_dt, mode)
    logger.info("##################################################")

    step_results: dict[str, str] = {}
    fatal = False

    # 0. rclone 다운로드 동기화 (Drive → 로컬, 대상 디렉토리만)
    if RCLONE_AUTO_SYNC and RCLONE_REMOTE:
        from utils.drive_utils import rclone_sync_down
        failed = []
        for subdir in RCLONE_SYNC_DIRS:
            logger.info("rclone 다운로드: %s/%s → %s", RCLONE_REMOTE, subdir, BASE_PATH / subdir)
            try:
                if not rclone_sync_down(RCLONE_REMOTE, BASE_PATH, subdir=subdir):
                    failed.append(subdir)
            except Exception as exc:
                logger.error("rclone 다운로드 실패 (%s): %s", subdir, exc)
                failed.append(subdir)
        if failed:
            step_results["rclone_down"] = f"PARTIAL (실패: {', '.join(failed)})"
        else:
            step_results["rclone_down"] = "OK"
    else:
        step_results["rclone_down"] = "SKIPPED"

    # 0-1. 재무 데이터 볼륨 상태 확인 (--ensure-financial 지정 시)
    if ensure_financial:
        try:
            _ensure_financial_data()
            step_results["ensure_financial"] = "OK"
        except Exception as exc:
            logger.error("재무 데이터 확인 실패: %s", exc)
            step_results["ensure_financial"] = f"FAIL: {exc}"

    # 1. Drive 폴더 구조 확인
    try:
        _check_drive_structure()
        step_results["drive_check"] = "OK"
    except Exception as exc:
        logger.error("Drive 구조 확인 실패: %s", exc)
        step_results["drive_check"] = f"FAIL: {exc}"

    # 2. 데이터 수집
    financial_new_files: list[str] = []
    try:
        collection_ok, financial_new_files = run_collection(mode=mode, use_universe=use_universe)
        step_results["collection"] = "OK" if collection_ok else "PARTIAL"
    except Exception as exc:
        logger.error("수집 단계 예외: %s", exc)
        step_results["collection"] = f"FAIL: {exc}"

    # 3. 피처 엔지니어링
    if skip_features:
        logger.info("피처 엔지니어링 건너뜀 (--skip-features)")
        step_results["feature_engineering"] = "SKIPPED"
    else:
        try:
            fe_ok = run_feature_engineering()
            step_results["feature_engineering"] = "OK" if fe_ok else "PARTIAL"
        except Exception as exc:
            logger.error("피처 엔지니어링 단계 예외: %s", exc)
            step_results["feature_engineering"] = f"FAIL: {exc}"

    # 3-1. 펀더멘탈 파생 지표
    if skip_features:
        logger.info("펀더멘탈 파생 지표 건너뜀 (--skip-features)")
        step_results["fundamental_metrics"] = "SKIPPED"
    else:
        try:
            fm_ok = run_fundamental_metrics()
            step_results["fundamental_metrics"] = "OK" if fm_ok else "PARTIAL"
        except Exception as exc:
            logger.error("펀더멘탈 파생 지표 단계 예외: %s", exc)
            step_results["fundamental_metrics"] = f"FAIL: {exc}"

    # 3-2. 재무 데이터 DB 적재 (펀더멘탈 지표 생성 후)
    if skip_features:
        logger.info("재무 DB 적재 건너뜀 (--skip-features)")
        step_results["db_load_financials"] = "SKIPPED"
    else:
        try:
            db_ok = run_db_load_financials()
            step_results["db_load_financials"] = "OK" if db_ok else "PARTIAL"
        except Exception as exc:
            logger.error("재무 DB 적재 단계 예외: %s", exc)
            step_results["db_load_financials"] = f"FAIL: {exc}"

    # 3-3. 공시 메타데이터 DB 적재
    if skip_features:
        logger.info("공시 DB 적재 건너뜀 (--skip-features)")
        step_results["db_load_announcements"] = "SKIPPED"
    else:
        try:
            ann_ok = run_db_load_announcements()
            step_results["db_load_announcements"] = "OK" if ann_ok else "PARTIAL"
        except Exception as exc:
            logger.error("공시 DB 적재 단계 예외: %s", exc)
            step_results["db_load_announcements"] = f"FAIL: {exc}"

    # 4. 품질 검증
    if skip_validation:
        logger.info("데이터 품질 검증 건너뜀 (--skip-validation)")
        step_results["quality_check"] = "SKIPPED"
    else:
        try:
            report = run_quality_check()
            if "error" in report:
                step_results["quality_check"] = f"FAIL: {report['error']}"
            else:
                issues = report.get("summary", {}).get("total_issues", 0)
                step_results["quality_check"] = f"OK (이슈 {issues}건)"
        except Exception as exc:
            logger.error("품질 검증 단계 예외: %s", exc)
            step_results["quality_check"] = f"FAIL: {exc}"

    # 5. rclone 업로드 동기화 (로컬 → Drive, 대상 디렉토리만)
    if RCLONE_AUTO_SYNC and RCLONE_REMOTE:
        from utils.drive_utils import rclone_copy_file, rclone_sync_up
        failed = []
        for subdir in RCLONE_SYNC_DIRS:
            logger.info("rclone 업로드: %s → %s/%s", BASE_PATH / subdir, RCLONE_REMOTE, subdir)
            try:
                if not rclone_sync_up(BASE_PATH, RCLONE_REMOTE, subdir=subdir):
                    failed.append(subdir)
            except Exception as exc:
                logger.error("rclone 업로드 실패 (%s): %s", subdir, exc)
                failed.append(subdir)

        # 재무 데이터: 신규 파일만 개별 copy (rclone sync 대신)
        if financial_new_files:
            fin_remote = f"{RCLONE_REMOTE}/raw/financial"
            fin_ok = 0
            fin_fail = 0
            for filename in financial_new_files:
                filepath = RAW_FINANCIAL_PATH / filename
                if rclone_copy_file(filepath, fin_remote):
                    fin_ok += 1
                else:
                    fin_fail += 1
            logger.info(
                "재무 데이터 개별 업로드: 성공=%d / 실패=%d", fin_ok, fin_fail,
            )
            if fin_fail > 0:
                failed.append("raw/financial (일부)")

        if failed:
            step_results["rclone_up"] = f"PARTIAL (실패: {', '.join(failed)})"
        else:
            step_results["rclone_up"] = "OK"
    else:
        step_results["rclone_up"] = "SKIPPED"

    # 6. 완료 요약 로그
    elapsed = time.monotonic() - pipeline_start
    end_dt = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    logger.info("##################################################")
    logger.info("# 파이프라인 완료 요약")
    logger.info("# 종료 시각: %s | 소요 시간: %.1f초", end_dt, elapsed)
    for step, result in step_results.items():
        logger.info("#   %-25s : %s", step, result)
    logger.info("##################################################")

    # 수집 단계가 완전 실패하면 exit code 1
    if step_results.get("collection", "").startswith("FAIL"):
        fatal = True

    if fatal:
        logger.error("파이프라인 치명적 오류 - exit code 1")
        sys.exit(1)


# ---------------------------------------------------------------------------
# CLI 엔트리포인트
# ---------------------------------------------------------------------------

def main() -> None:
    """
    CLI 엔트리포인트.

    사용 예:
        python pipeline.py --mode initial
        python pipeline.py --mode incremental
        python pipeline.py --mode incremental --skip-features
        python pipeline.py --mode incremental --skip-validation
    """
    parser = argparse.ArgumentParser(
        description="KOSPI 200 데이터 파이프라인 통합 실행",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "예시:\n"
            "  python pipeline.py --mode initial          # 초기 전체 수집\n"
            "  python pipeline.py --mode incremental      # 증분 업데이트 (기본값)\n"
            "  python pipeline.py --mode incremental --skip-features  # 수집만\n"
            "  python pipeline.py --mode incremental --skip-validation # 검증 생략\n"
        ),
    )
    parser.add_argument(
        "--mode",
        choices=["initial", "incremental"],
        default="incremental",
        help="수집 모드: initial=전체 초기 수집, incremental=증분 업데이트 (기본값: incremental)",
    )
    parser.add_argument(
        "--skip-features",
        action="store_true",
        help="피처 엔지니어링 단계를 건너뜁니다",
    )
    parser.add_argument(
        "--skip-validation",
        action="store_true",
        help="데이터 품질 검증 단계를 건너뜁니다",
    )
    parser.add_argument(
        "--use-universe",
        action="store_true",
        help="유니버스 파일(편출 종목 포함)로 OHLCV 수집 (생존편향 해결)",
    )
    parser.add_argument(
        "--ensure-financial",
        action="store_true",
        help="재무 데이터 볼륨 상태를 확인하고 부족하면 Drive에서 다운로드합니다",
    )
    args = parser.parse_args()

    run_full_pipeline(
        mode=args.mode,
        skip_features=args.skip_features,
        skip_validation=args.skip_validation,
        use_universe=args.use_universe,
        ensure_financial=args.ensure_financial,
    )


if __name__ == "__main__":
    main()
