# -*- coding: utf-8 -*-
"""
utils/sector_constants.py
GICS 섹터 및 ML 클러스터 상수 정의 모듈.

모든 코드에서 섹터/클러스터 값은 이 모듈의 enum을 통해 참조합니다.
문자열 직접 사용을 지양하여 typo 방지 및 IDE 자동완성을 지원합니다.

[사용 예시]
    from utils.sector_constants import GICSCluster, GICSSector, SECTOR_TO_CLUSTER

    cluster = GICSCluster.CLUSTER1          # "cluster1"
    sector  = GICSSector.IT                 # "Information Technology"

    # str 상속으로 JSON 비교 완전 호환
    assert GICSSector.IT == "Information Technology"   # True
    assert GICSCluster.CLUSTER1 == "cluster1"          # True
"""

from enum import Enum


# ---------------------------------------------------------------------------
# GICSCluster — ML 3+1 모델의 3개 클러스터
# ---------------------------------------------------------------------------

class GICSCluster(str, Enum):
    """
    ML 수익률 예측 모델의 섹터 클러스터.

    cluster1: IT·반도체·커뮤니케이션 (~60종목)
    cluster2: 금융·부동산            (~62종목)
    cluster3: 산업재·소재·기타        (~214종목)
    """
    CLUSTER1 = "cluster1"   # IT·반도체·커뮤니케이션 서비스
    CLUSTER2 = "cluster2"   # 금융·부동산
    CLUSTER3 = "cluster3"   # 산업재·소재·에너지·헬스케어·소비재·유틸리티


# ---------------------------------------------------------------------------
# GICSSector — GICS 11개 섹터
# ---------------------------------------------------------------------------

class GICSSector(str, Enum):
    """GICS 표준 11개 섹터."""
    ENERGY              = "Energy"
    MATERIALS           = "Materials"
    INDUSTRIALS         = "Industrials"
    CONSUMER_DISC       = "Consumer Discretionary"
    CONSUMER_STAPLES    = "Consumer Staples"
    HEALTH_CARE         = "Health Care"
    FINANCIALS          = "Financials"
    IT                  = "Information Technology"
    COMM_SERVICES       = "Communication Services"
    UTILITIES           = "Utilities"
    REAL_ESTATE         = "Real Estate"
    UNKNOWN             = "Unknown"


# ---------------------------------------------------------------------------
# SECTOR_TO_CLUSTER — GICSSector → GICSCluster 매핑
# ---------------------------------------------------------------------------

SECTOR_TO_CLUSTER: dict[GICSSector, GICSCluster] = {
    # cluster1: IT·커뮤니케이션
    GICSSector.IT:              GICSCluster.CLUSTER1,
    GICSSector.COMM_SERVICES:   GICSCluster.CLUSTER1,
    # cluster2: 금융·부동산
    GICSSector.FINANCIALS:      GICSCluster.CLUSTER2,
    GICSSector.REAL_ESTATE:     GICSCluster.CLUSTER2,
    # cluster3: 나머지
    GICSSector.ENERGY:          GICSCluster.CLUSTER3,
    GICSSector.MATERIALS:       GICSCluster.CLUSTER3,
    GICSSector.INDUSTRIALS:     GICSCluster.CLUSTER3,
    GICSSector.CONSUMER_DISC:   GICSCluster.CLUSTER3,
    GICSSector.CONSUMER_STAPLES:GICSCluster.CLUSTER3,
    GICSSector.HEALTH_CARE:     GICSCluster.CLUSTER3,
    GICSSector.UTILITIES:       GICSCluster.CLUSTER3,
    GICSSector.UNKNOWN:         GICSCluster.CLUSTER3,  # 폴백
}


def get_cluster(sector: str) -> GICSCluster:
    """
    GICS 섹터 문자열로 클러스터를 반환합니다.

    Args:
        sector: GICSSector 값 또는 동등한 문자열

    Returns:
        GICSCluster (매핑 없으면 CLUSTER3 폴백)

    Example:
        >>> get_cluster("Information Technology")
        <GICSCluster.CLUSTER1: 'cluster1'>
        >>> get_cluster("Financials")
        <GICSCluster.CLUSTER2: 'cluster2'>
    """
    try:
        return SECTOR_TO_CLUSTER[GICSSector(sector)]
    except ValueError:
        return GICSCluster.CLUSTER3


def get_all_clusters() -> list[str]:
    """모든 클러스터 값 리스트 반환."""
    return [c.value for c in GICSCluster]


def get_all_sectors() -> list[str]:
    """모든 GICS 섹터 값 리스트 반환 (Unknown 제외)."""
    return [s.value for s in GICSSector if s != GICSSector.UNKNOWN]


# ---------------------------------------------------------------------------
# KRX_TO_GICS11 — pykrx 업종명 → GICS 11섹터 매핑
# ---------------------------------------------------------------------------
# pykrx get_market_sector_classifications() 실제 반환 섹터명 기준 (가운뎃점· 포함)
# 이 딕셔너리는 sector_constants.py가 단일 진실 소스 역할을 합니다.

KRX_TO_GICS11: dict[str, str] = {
    # Materials
    "화학":           GICSSector.MATERIALS.value,
    "금속":           GICSSector.MATERIALS.value,
    "비금속":         GICSSector.MATERIALS.value,
    "종이·목재":      GICSSector.MATERIALS.value,
    "기타제조":       GICSSector.MATERIALS.value,
    # Industrials
    "기계·장비":      GICSSector.INDUSTRIALS.value,
    "운송장비·부품":  GICSSector.INDUSTRIALS.value,
    "건설":           GICSSector.INDUSTRIALS.value,
    "운송·창고":      GICSSector.INDUSTRIALS.value,
    # Consumer Discretionary
    "섬유·의류":      GICSSector.CONSUMER_DISC.value,
    "유통":           GICSSector.CONSUMER_DISC.value,
    "오락·문화":      GICSSector.CONSUMER_DISC.value,
    # Consumer Staples
    "음식료·담배":    GICSSector.CONSUMER_STAPLES.value,
    # Health Care
    "제약":           GICSSector.HEALTH_CARE.value,
    "의료·정밀기기":  GICSSector.HEALTH_CARE.value,
    # Financials
    "기타금융":       GICSSector.FINANCIALS.value,
    "은행":           GICSSector.FINANCIALS.value,
    "증권":           GICSSector.FINANCIALS.value,
    "보험":           GICSSector.FINANCIALS.value,
    # Information Technology
    "전기·전자":      GICSSector.IT.value,
    "IT 서비스":      GICSSector.IT.value,
    # Communication Services
    "통신":           GICSSector.COMM_SERVICES.value,
    "일반서비스":     GICSSector.COMM_SERVICES.value,
    # Utilities
    "전기·가스":      GICSSector.UTILITIES.value,
    # Real Estate
    "부동산":         GICSSector.REAL_ESTATE.value,
    # Consumer Staples (식품 원자재 생산 — Energy 아님)
    "농업 임업 및 어업": GICSSector.CONSUMER_STAPLES.value,
}


# ---------------------------------------------------------------------------
# KRX_TO_CLUSTER — KRX 업종명 → ML 클러스터 직접 매핑
# ---------------------------------------------------------------------------
# GICS 중간 변환 없이 KRX 업종 → 클러스터를 직접 매핑합니다.
# KRX 업종 단위의 한국 시장 가격 행동 패턴이 GICS 섹터보다 더 직접적으로
# 클러스터 구분과 일치하므로, 이 매핑을 클러스터 배정의 단일 진실 소스로 사용합니다.
#
# cluster1: 기술·성장주   — 금리보다 성장 사이클에 민감
# cluster2: 금리·신용 민감 — 이자마진·크레딧 사이클에 민감
# cluster3: 경기순환·소재·소비재 — 나머지
KRX_TO_CLUSTER: dict[str, str] = {
    # ── cluster1: 기술·성장 ──
    "전기·전자":      GICSCluster.CLUSTER1.value,   # 삼성전자·SK하이닉스 등 반도체
    "IT 서비스":      GICSCluster.CLUSTER1.value,   # NAVER·카카오·넷마블·크래프톤
    "통신":           GICSCluster.CLUSTER1.value,   # SK텔레콤·KT·LG유플러스
    "오락·문화":      GICSCluster.CLUSTER1.value,   # 하이브·SBS·스튜디오드래곤
    # ── cluster2: 금리·신용 민감 ──
    "기타금융":       GICSCluster.CLUSTER2.value,
    "은행":           GICSCluster.CLUSTER2.value,
    "증권":           GICSCluster.CLUSTER2.value,
    "보험":           GICSCluster.CLUSTER2.value,
    "부동산":         GICSCluster.CLUSTER2.value,
    # ── cluster3: 경기순환·소재·소비재·산업재 ──
    "화학":           GICSCluster.CLUSTER3.value,
    "금속":           GICSCluster.CLUSTER3.value,
    "비금속":         GICSCluster.CLUSTER3.value,
    "종이·목재":      GICSCluster.CLUSTER3.value,
    "기타제조":       GICSCluster.CLUSTER3.value,
    "기계·장비":      GICSCluster.CLUSTER3.value,
    "운송장비·부품":  GICSCluster.CLUSTER3.value,   # 자동차+조선 혼재 → 경기순환
    "건설":           GICSCluster.CLUSTER3.value,
    "운송·창고":      GICSCluster.CLUSTER3.value,
    "섬유·의류":      GICSCluster.CLUSTER3.value,
    "유통":           GICSCluster.CLUSTER3.value,
    "음식료·담배":    GICSCluster.CLUSTER3.value,
    "제약":           GICSCluster.CLUSTER3.value,
    "의료·정밀기기":  GICSCluster.CLUSTER3.value,
    "전기·가스":      GICSCluster.CLUSTER3.value,
    "일반서비스":     GICSCluster.CLUSTER3.value,   # 교육·광고·보안·엔지니어링 혼재
    "농업 임업 및 어업": GICSCluster.CLUSTER3.value,
}
