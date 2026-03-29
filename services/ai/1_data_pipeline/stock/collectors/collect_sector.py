# -*- coding: utf-8 -*-
"""
collectors/collect_sector.py
pykrx get_market_sector_classifications()로 KOSPI200 전 종목의 GICS 섹터를 조회하고
raw/universe/sector_mapping.json 으로 저장합니다.

[저장 형식]
{
    "meta": {
        "last_updated": "2026-03-05T16:00:00",
        "source": "pykrx + DART fallback",
        "total_mapped": 320,
        "total_tickers": 336
    },
    "tickers": {
        "005930": {
            "name": "삼성전자",
            "krx_sector": "전기전자",
            "gics_sector": "Information Technology",
            "gics_cluster": "cluster1"
        },
        ...
    }
}

[실행]
    python collectors/collect_sector.py           # 전체 조회 및 저장
    python collectors/collect_sector.py --show    # 저장된 내용 출력
"""

import argparse
import json
import time
from datetime import datetime

from config import KRX_PASSWORD, KRX_USER_ID, PYKRX_DELAY, RAW_UNIVERSE_PATH
from utils.drive_utils import ensure_dir
from utils.logger import setup_logger
from utils.sector_constants import GICSCluster, GICSSector, KRX_TO_CLUSTER, KRX_TO_GICS11

logger = setup_logger(__name__)

# ---------------------------------------------------------------------------
# KRX 업종명 → ML 클러스터 매핑 — sector_constants.py 위임
# ---------------------------------------------------------------------------
# GICS 중간 변환 없이 KRX 업종명으로 직접 클러스터를 결정합니다.
# KRX_TO_CLUSTER은 utils/sector_constants.py에 정의됨 (단일 진실 소스)
def _krx_to_cluster(krx_sector: str) -> str:
    """KRX 업종명으로 GICSCluster 문자열 반환. 미등록 업종은 cluster3 폴백."""
    return KRX_TO_CLUSTER.get(krx_sector, GICSCluster.CLUSTER3.value)


# ---------------------------------------------------------------------------
# 수동 섹터 override — pykrx 조회 불가 편출 종목 확정 분류
# ---------------------------------------------------------------------------
# pykrx get_market_sector_classifications()는 현재 상장 종목만 반환.
# 편출 종목 중 Unknown이 된 20종목을 수동으로 확정 분류.
# 형식: {ticker: (krx_sector, gics_sector)}
MANUAL_SECTOR_OVERRIDE: dict[str, tuple[str, str]] = {
    # Financials → cluster2
    "000030": ("기타금융",   GICSSector.FINANCIALS.value),   # 우리은행
    "000060": ("보험",      GICSSector.FINANCIALS.value),   # 메리츠화재
    "003450": ("증권",      GICSSector.FINANCIALS.value),   # 현대증권 (KB증권 합병)
    "008560": ("증권",      GICSSector.FINANCIALS.value),   # 메리츠증권
    "037620": ("증권",      GICSSector.FINANCIALS.value),   # 미래에셋증권
    "053000": ("기타금융",   GICSSector.FINANCIALS.value),   # 우리금융
    # Information Technology → cluster1
    "004130": ("전기·전자",  GICSSector.IT.value),           # 대덕GDS (PCB)
    # Industrials → cluster3
    "000830": ("건설",       GICSSector.INDUSTRIALS.value),  # 삼성물산
    "003600": ("기계·장비",  GICSSector.INDUSTRIALS.value),  # SK (산업 지주사)
    "006390": ("비금속",     GICSSector.MATERIALS.value),    # 한일현대시멘트
    "010620": ("운송장비·부품", GICSSector.INDUSTRIALS.value), # HD현대미포 (조선)
    "042670": ("기계·장비",  GICSSector.INDUSTRIALS.value),  # HD현대인프라코어
    "051310": ("기계·장비",  GICSSector.INDUSTRIALS.value),  # 포스코플랜텍
    # Materials → cluster3
    "003410": ("화학",       GICSSector.MATERIALS.value),    # 쌍용C&E (시멘트)
    "008000": ("화학",       GICSSector.MATERIALS.value),    # 도레이케미칼
    "010520": ("금속",       GICSSector.MATERIALS.value),    # 현대하이스코 (철강)
    # Consumer Staples → cluster3
    "002270": ("음식료·담배", GICSSector.CONSUMER_STAPLES.value), # 롯데푸드
    "049770": ("음식료·담배", GICSSector.CONSUMER_STAPLES.value), # 동원F&B
    # Consumer Discretionary → cluster3
    "115390": ("유통",       GICSSector.CONSUMER_DISC.value),    # 락앤락
    # Health Care → cluster3
    "068870": ("제약",       GICSSector.HEALTH_CARE.value),      # LG생명과학 (LG화학 합병)
}

# ---------------------------------------------------------------------------
# 세션 초기화
# ---------------------------------------------------------------------------
_session_ready: bool = False


def _init_session() -> bool:
    global _session_ready
    if _session_ready:
        return True
    from utils.krx_session import ensure_krx_session
    success = ensure_krx_session(KRX_USER_ID, KRX_PASSWORD)
    if success:
        _session_ready = True
        logger.info("KRX 세션 초기화 완료")
    else:
        logger.warning("KRX 세션 초기화 실패")
    return success


# ---------------------------------------------------------------------------
# 유니버스 로드
# ---------------------------------------------------------------------------

def _load_universe() -> dict:
    universe_path = RAW_UNIVERSE_PATH / "kospi200_universe.json"
    if not universe_path.exists():
        raise FileNotFoundError(f"유니버스 파일 없음: {universe_path}")
    with open(universe_path, encoding="utf-8") as f:
        return json.load(f)


# ---------------------------------------------------------------------------
# pykrx 섹터 조회
# ---------------------------------------------------------------------------

def _fetch_sector_from_pykrx(tickers: list[str]) -> dict[str, str]:
    """
    pykrx get_market_sector_classifications()로 현재 날짜 기준 섹터 조회.
    Returns {ticker: krx_sector_name}.
    """
    try:
        from pykrx import stock as pykrx_stock
        base_date = datetime.today().strftime("%Y%m%d")
        df = pykrx_stock.get_market_sector_classifications(date=base_date, market="KOSPI")
        time.sleep(PYKRX_DELAY)
    except Exception as exc:
        logger.warning("pykrx 섹터 조회 실패: %s", exc)
        return {}

    if df is None or df.empty:
        return {}

    result: dict[str, str] = {}
    for ticker in tickers:
        if ticker in df.index:
            result[ticker] = str(df.loc[ticker, "업종명"])
    return result


def _fetch_sector_from_dart(tickers: list[str]) -> dict[str, str]:
    """
    DART API로 업종코드(KSIC) 조회 후 클러스터 직접 추정. pykrx 폴백용.
    Returns {ticker: cluster_value}.
    """
    try:
        import dart_fss as dart
    except Exception as exc:
        logger.debug("dart_fss import 실패 - DART 폴백 건너뜀: %s", exc)
        return {}
    from config import DART_API_KEY

    if not DART_API_KEY:
        return {}

    dart.set_api_key(DART_API_KEY)
    result: dict[str, str] = {}

    # GICS 중간 변환 없이 KSIC → 클러스터 직접 매핑
    KSIC_TO_CLUSTER: dict[str, str] = {
        # cluster1: 기술·성장 (전자부품·반도체·IT서비스·통신·미디어·엔터)
        "26": GICSCluster.CLUSTER1.value,  # 전자부품·컴퓨터·반도체
        "58": GICSCluster.CLUSTER1.value,  # 출판·영상·방송
        "59": GICSCluster.CLUSTER1.value,  # 통신
        "60": GICSCluster.CLUSTER1.value,  # 정보서비스
        "61": GICSCluster.CLUSTER1.value,  # 통신업
        "62": GICSCluster.CLUSTER1.value,  # 소프트웨어
        "63": GICSCluster.CLUSTER1.value,  # 정보서비스
        "90": GICSCluster.CLUSTER1.value,  # 창작·예술 (엔터)
        "91": GICSCluster.CLUSTER1.value,  # 도서관·여가 (엔터)
        # cluster2: 금리·신용 민감 (금융·보험·부동산)
        "64": GICSCluster.CLUSTER2.value,  # 금융업
        "65": GICSCluster.CLUSTER2.value,  # 보험업
        "66": GICSCluster.CLUSTER2.value,  # 금융지원
        "68": GICSCluster.CLUSTER2.value,  # 부동산
        # cluster3: 나머지 (소재·산업재·소비재·에너지·유틸리티·헬스케어)
    }

    try:
        corp_list = dart.get_corp_list()
        for ticker in tickers:
            try:
                corp = corp_list.find_by_stock_code(ticker)
                if corp and hasattr(corp, "induty_code") and corp.induty_code:
                    prefix = corp.induty_code[:2]
                    result[ticker] = KSIC_TO_CLUSTER.get(prefix, GICSCluster.CLUSTER3.value)
                time.sleep(0.1)
            except Exception:
                pass
    except Exception as exc:
        logger.warning("DART 클러스터 조회 실패: %s", exc)

    return result


# ---------------------------------------------------------------------------
# 메인 빌드 함수
# ---------------------------------------------------------------------------

def build_sector_mapping() -> dict:
    """
    전체 유니버스 336종목의 섹터를 조회하고 sector_mapping.json 저장.

    Returns:
        저장된 전체 딕셔너리.
    """
    ensure_dir(RAW_UNIVERSE_PATH)
    _init_session()

    universe = _load_universe()
    tickers = list(universe["tickers"].keys())
    logger.info("섹터 조회 시작 | 종목 수: %d", len(tickers))

    # 1차: pykrx
    krx_sector_map = _fetch_sector_from_pykrx(tickers)
    mapped = sum(1 for t in tickers if t in krx_sector_map)
    logger.info("pykrx 섹터 조회 완료: %d/%d", mapped, len(tickers))

    # 2차 폴백: DART (pykrx 미매핑 종목)
    unmapped = [t for t in tickers if t not in krx_sector_map]
    dart_sector_map: dict[str, str] = {}
    if unmapped:
        logger.info("DART 폴백 조회: %d종목", len(unmapped))
        dart_sector_map = _fetch_sector_from_dart(unmapped)

    # 결과 조합
    ticker_data: dict[str, dict] = {}
    total_mapped = 0
    override_applied = 0

    for ticker, info in universe["tickers"].items():
        name = info.get("name", "")

        # 자동 분류: pykrx(KRX업종 → GICS+클러스터) 또는 DART(클러스터 직접)
        if ticker in krx_sector_map:
            # pykrx 성공: KRX업종 → GICS·클러스터 변환
            krx_sector = krx_sector_map[ticker]
            gics_sector = KRX_TO_GICS11.get(krx_sector, GICSSector.UNKNOWN.value)
            gics_cluster = _krx_to_cluster(krx_sector)
        elif ticker in dart_sector_map:
            # DART 폴백: KRX업종 미상, 클러스터만 직접 추정
            krx_sector = GICSSector.UNKNOWN.value
            gics_sector = GICSSector.UNKNOWN.value
            gics_cluster = dart_sector_map[ticker]
        else:
            krx_sector = GICSSector.UNKNOWN.value
            gics_sector = GICSSector.UNKNOWN.value
            gics_cluster = GICSCluster.CLUSTER3.value

        # 수동 override 적용 (MANUAL_SECTOR_OVERRIDE 우선)
        if ticker in MANUAL_SECTOR_OVERRIDE:
            krx_sector, gics_sector = MANUAL_SECTOR_OVERRIDE[ticker]
            gics_cluster = _krx_to_cluster(krx_sector)
            override_applied += 1

        ticker_data[ticker] = {
            "name": name,
            "krx_sector": krx_sector,
            "gics_sector": gics_sector,
            "gics_cluster": gics_cluster,
        }

        if gics_sector != GICSSector.UNKNOWN.value:
            total_mapped += 1

    logger.info("수동 override 적용: %d종목", override_applied)

    output = {
        "meta": {
            "last_updated": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
            "source": "pykrx + DART fallback + manual override",
            "total_mapped": total_mapped,
            "total_tickers": len(tickers),
            "manual_override_count": override_applied,
        },
        "tickers": ticker_data,
    }

    save_path = RAW_UNIVERSE_PATH / "sector_mapping.json"
    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    logger.info(
        "sector_mapping.json 저장 완료 | 매핑: %d/%d | 경로: %s",
        total_mapped, len(tickers), save_path,
    )

    # 클러스터별 통계 출력
    from collections import Counter
    cluster_counts = Counter(v["gics_cluster"] for v in ticker_data.values())
    sector_counts = Counter(v["gics_sector"] for v in ticker_data.values())
    logger.info("클러스터 분포: %s", dict(cluster_counts))
    logger.info("섹터 분포: %s", dict(sorted(sector_counts.items())))

    return output


def load_sector_mapping() -> dict | None:
    """저장된 sector_mapping.json 로드. 없으면 None."""
    path = RAW_UNIVERSE_PATH / "sector_mapping.json"
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def get_cluster_tickers(cluster: str) -> list[str]:
    """
    특정 클러스터의 종목 코드 리스트 반환.

    Args:
        cluster: "cluster1" | "cluster2" | "cluster3"

    Returns:
        해당 클러스터 종목 코드 리스트.
    """
    mapping = load_sector_mapping()
    if mapping is None:
        return []
    return [t for t, v in mapping["tickers"].items() if v["gics_cluster"] == cluster]


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="KOSPI200 GICS 섹터 매핑 생성")
    parser.add_argument("--show", action="store_true", help="저장된 sector_mapping.json 내용 출력")
    args = parser.parse_args()

    if args.show:
        mapping = load_sector_mapping()
        if mapping is None:
            print("sector_mapping.json 없음. 먼저 실행하세요.")
            return
        print(f"총 종목: {mapping['meta']['total_tickers']} / 매핑 완료: {mapping['meta']['total_mapped']}")
        print(f"최종 업데이트: {mapping['meta']['last_updated']}")
        from collections import Counter
        clusters = Counter(v["gics_cluster"] for v in mapping["tickers"].values())
        sectors = Counter(v["gics_sector"] for v in mapping["tickers"].values())
        print("\n[클러스터 분포]")
        for k, v in sorted(clusters.items()):
            print(f"  {k}: {v}종목")
        print("\n[GICS 섹터 분포]")
        for k, v in sorted(sectors.items(), key=lambda x: -x[1]):
            print(f"  {v:3d}  {k}")
        return

    build_sector_mapping()


if __name__ == "__main__":
    main()
