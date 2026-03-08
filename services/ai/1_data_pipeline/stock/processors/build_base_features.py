"""
processors/build_base_features.py
범용 베이스 피처 데이터셋 생성 모듈.

모델 구조와 무관하게 다른 모델에도 쓸 수 있는 범용 피처만 생성합니다.
타겟 레이블(return_5d_class)은 포함하지 않습니다.

입력:
  RAW_OHLCV_PATH/{ticker}.parquet
  RAW_SUPPLY_PATH/{ticker}.parquet
  RAW_MACRO_PATH/*.parquet

출력:
  PROCESSED_BASE_PATH/base_features.parquet  (MultiIndex: date + ticker)

Python 3.10+ 호환, Google Colab 동작 지원.
"""

from __future__ import annotations

import warnings

import numpy as np
import pandas as pd

from config import (
    RAW_MACRO_PATH,
    RAW_OHLCV_PATH,
    RAW_SUPPLY_PATH,
    RAW_UNIVERSE_PATH,
    PROCESSED_BASE_PATH,
    PARQUET_COMPRESSION,
)
from utils.sector_constants import GICSCluster, KRX_TO_CLUSTER
from utils.logger import setup_logger
from utils.drive_utils import ensure_dir, save_parquet, load_parquet

warnings.filterwarnings("ignore", category=FutureWarning)

logger = setup_logger(__name__)


def _ksic_to_cluster(induty_code: str) -> str:
    """DART induty_code(KSIC 업종코드) 앞 2자리로 ML 클러스터를 직접 추정합니다."""
    if not induty_code:
        return GICSCluster.CLUSTER3.value
    prefix = induty_code[:2]
    mapping: dict[str, str] = {
        # cluster1: 기술·성장 (전자부품·반도체·IT서비스·통신·미디어)
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
    return mapping.get(prefix, GICSCluster.CLUSTER3.value)


# ---------------------------------------------------------------------------
# 피처 목록 상수
# ---------------------------------------------------------------------------
TECH_FEATURES: list[str] = [
    "rsi_14",
    "macd",
    "macd_signal",
    "macd_hist",
    "bb_upper",
    "bb_middle",
    "bb_lower",
    "ma_5",
    "ma_20",
    "ma_60",
    "volume_ratio_5d",
    "volume_ratio_20d",
    "momentum_5d",
    "momentum_20d",
]

SUPPLY_FEATURES: list[str] = [
    "foreign_net_buy_1d",
    "foreign_net_buy_5d",
    "foreign_net_buy_20d",
    "institution_net_buy_1d",
    "institution_net_buy_5d",
]

MACRO_FEATURES: list[str] = [
    "kospi200_return_1d",
    "vkospi",
    "usd_krw_change",
    "sp500_return_1d",
    "nasdaq_return_1d",
    "dxy_change",
    "vix",
    "vix_change",
    "us_bond_10y",
    "us_bond_10y_change",
    "sox_return_1d",
]

META_FEATURES: list[str] = [
    "stock_id",
    "cluster_id",
    "market_cap_rank",
]


# ---------------------------------------------------------------------------
# 섹터 조회 헬퍼
# ---------------------------------------------------------------------------

def _fetch_sector_from_dart(tickers: list[str]) -> dict[str, str]:
    """DART /company.json → ind_name → 클러스터 직접 변환."""
    import io
    import requests
    import time
    import zipfile
    import xml.etree.ElementTree as ET
    from config import DART_API_KEY

    DART_BASE_URL = "https://opendart.fss.or.kr/api"

    if not DART_API_KEY:
        logger.warning("[SECTOR] DART_API_KEY 미설정")
        return {}

    # corp_code 매핑 빌드
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
        ticker_set = set(tickers)
        corp_code_map: dict[str, str] = {}
        for corp in root.findall("list"):
            stock_code = (corp.findtext("stock_code") or "").strip()
            if stock_code in ticker_set:
                corp_code = (corp.findtext("corp_code") or "").strip()
                if corp_code:
                    corp_code_map[stock_code] = corp_code
        logger.info("[SECTOR] corp_code 매핑: %d/%d", len(corp_code_map), len(tickers))
    except Exception as exc:
        logger.warning("[SECTOR] DART corpCode.xml 조회 실패: %s", exc)
        return {}

    # 종목별 /company.json 호출
    cluster_result: dict[str, str] = {}
    for ticker, corp_code in corp_code_map.items():
        try:
            r = requests.get(
                f"{DART_BASE_URL}/company.json",
                params={"crtfc_key": DART_API_KEY, "corp_code": corp_code},
                timeout=10,
            )
            data = r.json()
            if data.get("status") == "000":
                induty_code = data.get("induty_code", "") or ""
                cluster_result[ticker] = _ksic_to_cluster(induty_code)
            time.sleep(0.1)
        except Exception:
            continue

    mapped = sum(1 for v in cluster_result.values() if v != GICSCluster.CLUSTER3.value)
    logger.info(
        "[SECTOR] DART 클러스터 조회 완료: %d/%d 매핑 (cluster3 제외)",
        mapped,
        len(tickers),
    )
    return cluster_result


def _get_cluster_map(tickers: list[str]) -> dict[str, str]:
    """
    클러스터 조회 우선순위:
    1. RAW_UNIVERSE_PATH/sector_mapping.json (gics_cluster 필드, 최우선)
    2. pykrx → KRX_TO_CLUSTER 직접 변환
    3. DART /company.json → KSIC → 클러스터 직접 변환
    미조회 종목은 cluster3 폴백.
    """
    import json

    cluster_map: dict[str, str] = {}

    # 1. raw/universe/sector_mapping.json (gics_cluster 필드)
    try:
        universe_path = RAW_UNIVERSE_PATH / "sector_mapping.json"
        if universe_path.exists():
            data = json.loads(universe_path.read_text(encoding="utf-8"))
            ticker_data = data.get("tickers", {})
            for t in tickers:
                if t in ticker_data:
                    cluster_map[t] = ticker_data[t]["gics_cluster"]
            logger.info("[CLUSTER] universe/sector_mapping.json 로드: %d/%d", len(cluster_map), len(tickers))
            if len(cluster_map) == len(tickers):
                return cluster_map
    except Exception as exc:
        logger.debug("[CLUSTER] universe sector_mapping 로드 실패: %s", exc)

    # 2. pykrx (누락 종목 보완)
    missing = [t for t in tickers if t not in cluster_map]
    if missing:
        try:
            import datetime
            from pykrx import stock as krx_stock  # type: ignore

            base_date = datetime.date.today().strftime("%Y%m%d")
            df = krx_stock.get_market_sector_classifications(date=base_date, market="KOSPI")
            if df is not None and not df.empty and "업종명" in df.columns:
                for ticker in missing:
                    if ticker in df.index:
                        krx_sector = str(df.loc[ticker, "업종명"])
                        cluster_map[ticker] = KRX_TO_CLUSTER.get(krx_sector, GICSCluster.CLUSTER3.value)
                logger.info("[CLUSTER] pykrx 클러스터 조회: %d/%d", len(cluster_map), len(tickers))
        except Exception as exc:
            logger.debug("[CLUSTER] pykrx 섹터 조회 실패: %s", exc)

    # 3. DART 폴백 (여전히 누락된 종목)
    still_missing = [t for t in tickers if t not in cluster_map]
    if still_missing:
        dart_map = _fetch_sector_from_dart(still_missing)
        cluster_map.update(dart_map)

    # 미조회 종목 cluster3 폴백
    for t in tickers:
        if t not in cluster_map:
            cluster_map[t] = GICSCluster.CLUSTER3.value

    return cluster_map


# ---------------------------------------------------------------------------
# 데이터 로드
# ---------------------------------------------------------------------------

def load_all_ohlcv(tickers: list[str]) -> pd.DataFrame:
    """
    전 종목 OHLCV parquet 파일을 로드한 뒤 하나의 DataFrame으로 합칩니다.
    로드에 실패한 종목은 건너뜁니다.

    Args:
        tickers: 종목 코드 목록

    Returns:
        'ticker' 컬럼이 추가된 concat DataFrame (날짜 인덱스)
    """
    frames: list[pd.DataFrame] = []
    for ticker in tickers:
        path = RAW_OHLCV_PATH / f"{ticker}.parquet"
        df = load_parquet(path)
        if df is None or df.empty:
            logger.warning("[OHLCV] %s 파일 없음 또는 빈 데이터 — 건너뜀", ticker)
            continue
        df = df.copy()
        df["ticker"] = ticker
        frames.append(df)

    if not frames:
        raise ValueError("로드 가능한 OHLCV 파일이 없습니다.")

    combined = pd.concat(frames, axis=0)
    combined.index = pd.to_datetime(combined.index)
    combined.sort_index(inplace=True)
    logger.info("[OHLCV] 총 %d개 종목, %d행 로드 완료", len(frames), len(combined))
    return combined


def load_all_supply(tickers: list[str]) -> pd.DataFrame:
    """
    전 종목 수급 parquet 파일을 로드한 뒤 하나의 DataFrame으로 합칩니다.

    Args:
        tickers: 종목 코드 목록

    Returns:
        'ticker' 컬럼이 추가된 concat DataFrame
    """
    frames: list[pd.DataFrame] = []
    for ticker in tickers:
        path = RAW_SUPPLY_PATH / f"{ticker}.parquet"
        df = load_parquet(path)
        if df is None or df.empty:
            logger.debug("[SUPPLY] %s 파일 없음 — 건너뜀", ticker)
            continue
        df = df.copy()
        df["ticker"] = ticker
        frames.append(df)

    if not frames:
        logger.warning("[SUPPLY] 로드 가능한 수급 파일이 없습니다.")
        return pd.DataFrame()

    combined = pd.concat(frames, axis=0)
    combined.index = pd.to_datetime(combined.index)
    combined.sort_index(inplace=True)
    logger.info("[SUPPLY] 총 %d개 종목 수급 데이터 로드 완료", len(frames))
    return combined


# ---------------------------------------------------------------------------
# 기술 지표 계산
# ---------------------------------------------------------------------------

def _compute_tech_for_group(grp: pd.DataFrame) -> pd.DataFrame:
    """
    단일 종목 그룹에 대해 ta 라이브러리를 사용해 기술지표를 계산합니다.
    (pandas-ta 대신 ta 사용 — Python 3.14 호환, numba 불필요)

    Args:
        grp: 단일 종목의 OHLCV DataFrame (close, high, low, volume 컬럼 필요)

    Returns:
        기술지표 컬럼이 추가된 DataFrame
    """
    try:
        import ta as ta_lib  # type: ignore
    except ImportError as exc:
        raise ImportError("ta 패키지가 필요합니다: pip install ta") from exc

    grp = grp.copy().sort_index()

    close = grp["close"]
    high = grp["high"]
    low = grp["low"]
    volume = grp["volume"]

    # RSI(14)
    grp["rsi_14"] = ta_lib.momentum.RSIIndicator(close=close, window=14).rsi()

    # MACD
    macd_ind = ta_lib.trend.MACD(close=close, window_slow=26, window_fast=12, window_sign=9)
    grp["macd"]        = macd_ind.macd()
    grp["macd_signal"] = macd_ind.macd_signal()
    grp["macd_hist"]   = macd_ind.macd_diff()

    # Bollinger Bands
    bb_ind = ta_lib.volatility.BollingerBands(close=close, window=20, window_dev=2)
    grp["bb_upper"]  = bb_ind.bollinger_hband()
    grp["bb_middle"] = bb_ind.bollinger_mavg()
    grp["bb_lower"]  = bb_ind.bollinger_lband()

    # 이동평균
    grp["ma_5"]  = ta_lib.trend.SMAIndicator(close=close, window=5).sma_indicator()
    grp["ma_20"] = ta_lib.trend.SMAIndicator(close=close, window=20).sma_indicator()
    grp["ma_60"] = ta_lib.trend.SMAIndicator(close=close, window=60).sma_indicator()

    # 거래량 비율 (현재 거래량 / 이동평균 거래량)
    vol_ma5  = volume.rolling(window=5,  min_periods=1).mean()
    vol_ma20 = volume.rolling(window=20, min_periods=1).mean()
    grp["volume_ratio_5d"]  = volume / vol_ma5.replace(0, np.nan)
    grp["volume_ratio_20d"] = volume / vol_ma20.replace(0, np.nan)

    # 모멘텀 (N일 수익률)
    grp["momentum_5d"]  = close.pct_change(periods=5)
    grp["momentum_20d"] = close.pct_change(periods=20)

    return grp


def compute_tech_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    전체 종목 DataFrame에 대해 종목별(groupby ticker) 기술지표를 계산합니다.

    Args:
        df: 'ticker' 컬럼이 포함된 전체 OHLCV DataFrame

    Returns:
        기술지표 컬럼이 추가된 DataFrame
    """
    logger.info("[TECH] 기술지표 계산 시작 (종목 수: %d)", df["ticker"].nunique())
    ticker_backup = df["ticker"].copy()
    result = (
        df.groupby("ticker", group_keys=False)
        .apply(_compute_tech_for_group)
    )
    # pandas 2.2+: groupby().apply() 후 그룹키 컬럼이 사라질 수 있음
    # .values 사용으로 비유일 DatetimeIndex 정렬 문제 방지
    if "ticker" not in result.columns:
        result["ticker"] = ticker_backup.values
    logger.info("[TECH] 기술지표 계산 완료")
    return result


# ---------------------------------------------------------------------------
# 수급 피처 계산
# ---------------------------------------------------------------------------

def compute_supply_features(
    df: pd.DataFrame,
    supply_df: pd.DataFrame,
) -> pd.DataFrame:
    """
    수급 데이터에서 당일/롤링 합산 피처를 계산하고 OHLCV DataFrame에 병합합니다.

    공급 데이터에 'foreign_net_buy', 'institution_net_buy' 컬럼이 있어야 합니다.
    없는 경우 해당 피처는 NaN으로 채웁니다.

    Args:
        df: 기술지표가 계산된 전체 DataFrame
        supply_df: 'ticker' 컬럼이 포함된 전체 수급 DataFrame

    Returns:
        수급 피처 컬럼이 추가된 DataFrame
    """
    if supply_df.empty:
        logger.warning("[SUPPLY] 수급 데이터 없음 — 수급 피처를 NaN으로 채웁니다.")
        for col in SUPPLY_FEATURES:
            df[col] = np.nan
        return df

    # pandas 2.2+: groupby().apply() 내부에서 그룹키 컬럼이 제외되므로
    # 명시적 for loop으로 ticker 값을 직접 활용합니다.
    logger.info("[SUPPLY] 수급 피처 계산 시작")
    frames: list[pd.DataFrame] = []
    for ticker_val, grp in df.groupby("ticker"):
        grp = grp.copy()
        sub = supply_df[supply_df["ticker"] == ticker_val].copy().sort_index()

        if sub.empty:
            for col in SUPPLY_FEATURES:
                grp[col] = np.nan
        else:
            # 외국인 순매수
            if "foreign_net_buy" in sub.columns:
                foreign = sub["foreign_net_buy"].reindex(grp.index)
                grp["foreign_net_buy_1d"]  = foreign
                grp["foreign_net_buy_5d"]  = foreign.rolling(window=5,  min_periods=1).sum()
                grp["foreign_net_buy_20d"] = foreign.rolling(window=20, min_periods=1).sum()
            else:
                grp["foreign_net_buy_1d"]  = np.nan
                grp["foreign_net_buy_5d"]  = np.nan
                grp["foreign_net_buy_20d"] = np.nan

            # 기관 순매수
            if "institution_net_buy" in sub.columns:
                institution = sub["institution_net_buy"].reindex(grp.index)
                grp["institution_net_buy_1d"] = institution
                grp["institution_net_buy_5d"] = institution.rolling(window=5, min_periods=1).sum()
            else:
                grp["institution_net_buy_1d"] = np.nan
                grp["institution_net_buy_5d"] = np.nan

        frames.append(grp)

    result = pd.concat(frames).sort_index()
    logger.info("[SUPPLY] 수급 피처 계산 완료")
    return result


# ---------------------------------------------------------------------------
# 매크로 피처 로드
# ---------------------------------------------------------------------------

def load_macro_features() -> pd.DataFrame:
    """
    RAW_MACRO_PATH 디렉토리의 매크로 지표 parquet 파일을 로드하고
    수익률/변화율 파생 피처를 계산합니다.

    예상 파일 목록 (없으면 해당 컬럼 NaN):
      kospi200.parquet, vkospi.parquet, usd_krw.parquet,
      sp500.parquet, nasdaq.parquet, dxy.parquet,
      vix.parquet, us_bond_10y.parquet, sox.parquet

    Returns:
        날짜 인덱스를 가진 매크로 피처 DataFrame
    """
    macro_frames: dict[str, pd.Series] = {}

    def _load_close(filename: str) -> pd.Series | None:
        path = RAW_MACRO_PATH / filename
        df = load_parquet(path)
        if df is None or df.empty:
            logger.debug("[MACRO] %s 없음", filename)
            return None
        df.index = pd.to_datetime(df.index)
        close_col = "close" if "close" in df.columns else df.columns[0]
        return df[close_col].sort_index()

    # 코스피200
    kospi200 = _load_close("kospi200.parquet")
    if kospi200 is not None:
        macro_frames["kospi200_return_1d"] = kospi200.pct_change(1)

    # VKOSPI
    vkospi = _load_close("vkospi.parquet")
    if vkospi is not None:
        macro_frames["vkospi"] = vkospi

    # USD/KRW
    usd_krw = _load_close("usd_krw.parquet")
    if usd_krw is not None:
        macro_frames["usd_krw_change"] = usd_krw.pct_change(1)

    # S&P500
    sp500 = _load_close("sp500.parquet")
    if sp500 is not None:
        macro_frames["sp500_return_1d"] = sp500.pct_change(1)

    # 나스닥
    nasdaq = _load_close("nasdaq.parquet")
    if nasdaq is not None:
        macro_frames["nasdaq_return_1d"] = nasdaq.pct_change(1)

    # DXY
    dxy = _load_close("dxy.parquet")
    if dxy is not None:
        macro_frames["dxy_change"] = dxy.pct_change(1)

    # VIX
    vix = _load_close("vix.parquet")
    if vix is not None:
        macro_frames["vix"]        = vix
        macro_frames["vix_change"] = vix.pct_change(1)

    # 미국 10년물 금리
    bond_10y = _load_close("us_bond_10y.parquet")
    if bond_10y is not None:
        macro_frames["us_bond_10y"]        = bond_10y
        macro_frames["us_bond_10y_change"] = bond_10y.pct_change(1)

    # SOX
    sox = _load_close("sox.parquet")
    if sox is not None:
        macro_frames["sox_return_1d"] = sox.pct_change(1)

    if not macro_frames:
        logger.warning("[MACRO] 로드된 매크로 데이터가 없습니다.")
        return pd.DataFrame(columns=MACRO_FEATURES)

    macro_df = pd.DataFrame(macro_frames)
    macro_df.index = pd.to_datetime(macro_df.index)
    macro_df.sort_index(inplace=True)

    # 누락 컬럼 보완
    for col in MACRO_FEATURES:
        if col not in macro_df.columns:
            macro_df[col] = np.nan

    logger.info("[MACRO] 매크로 피처 로드 완료 (%d행)", len(macro_df))
    return macro_df[MACRO_FEATURES]


# ---------------------------------------------------------------------------
# 메타 피처
# ---------------------------------------------------------------------------

def _build_cap_rank_map(tickers: list[str]) -> dict[str, int]:
    """
    FinanceDataReader StockListing의 Marcap으로 KOSPI200 내 시가총액 순위 맵을 생성합니다.
    실패 시 알파벳 순서(기존 프록시)로 폴백합니다.

    Args:
        tickers: 종목 코드 목록

    Returns:
        {ticker: rank} 딕셔너리 (1-based, 시가총액 내림차순)
    """
    try:
        import FinanceDataReader as fdr  # type: ignore

        listing = fdr.StockListing("KOSPI")
        if "Marcap" in listing.columns and "Code" in listing.columns:
            kospi200_df = listing[listing["Code"].isin(set(tickers))].copy()
            kospi200_df = kospi200_df.sort_values("Marcap", ascending=False).reset_index(drop=True)
            cap_rank_map: dict[str, int] = {
                row["Code"]: idx + 1
                for idx, row in kospi200_df.iterrows()
            }
            logger.info("[META] fdr Marcap 기반 시가총액 순위 계산 완료 (%d종목)", len(cap_rank_map))
            return cap_rank_map
        else:
            logger.debug("[META] fdr StockListing에 Marcap/Code 컬럼 없음 — 프록시 사용")
    except Exception as exc:
        logger.warning("[META] fdr 시가총액 순위 계산 실패: %s", exc)

    # 폴백: tickers 목록 순서 (알파벳 프록시)
    return {t: i + 1 for i, t in enumerate(tickers)}


def _add_meta_features(
    df: pd.DataFrame,
    tickers: list[str],
    cluster_map: dict[str, str],
) -> pd.DataFrame:
    """
    종목 코드(stock_id), 클러스터(cluster_id), 시가총액 순위(market_cap_rank)를
    DataFrame에 추가합니다.

    market_cap_rank는 FinanceDataReader Marcap 기반 정적 스냅샷 순위입니다.
    (MVP 단계: 전체 기간에 동일 순위 적용)

    Args:
        df: 전체 피처 DataFrame
        tickers: 종목 코드 목록
        cluster_map: {ticker: cluster_name} 딕셔너리

    Returns:
        메타 피처 컬럼이 추가된 DataFrame
    """
    df = df.copy()
    df["stock_id"]   = df["ticker"].astype("category")
    df["cluster_id"] = df["ticker"].map(cluster_map).fillna(GICSCluster.CLUSTER3.value).astype("category")

    cap_rank_map = _build_cap_rank_map(tickers)
    df["market_cap_rank"] = df["ticker"].map(cap_rank_map).fillna(0).astype(int)

    return df


# ---------------------------------------------------------------------------
# 데이터셋 구성
# ---------------------------------------------------------------------------

def build_base_features(tickers: list[str]) -> pd.DataFrame:
    """
    범용 베이스 피처 데이터셋을 구성합니다.
    타겟 레이블은 포함하지 않습니다.

    파이프라인:
      1. OHLCV 로드 및 합산
      2. 기술지표 계산
      3. 수급 피처 계산
      4. 매크로 피처 병합
      5. 메타 피처 추가
      6. 결측치 처리 (forward fill → drop)
      7. (date, ticker) MultiIndex 설정

    Args:
        tickers: 종목 코드 목록

    Returns:
        최종 피처 DataFrame (MultiIndex: date + ticker)
    """
    logger.info("=== 베이스 피처 데이터셋 구성 시작 (%d개 종목) ===", len(tickers))

    # 1. OHLCV 로드
    df = load_all_ohlcv(tickers)

    # 2. 기술지표
    df = compute_tech_features(df)

    # 3. 수급 피처
    supply_df = load_all_supply(tickers)
    df = compute_supply_features(df, supply_df)

    # 4. 매크로 피처 병합 (날짜 기준 left join)
    macro_df = load_macro_features()
    if not macro_df.empty:
        df = df.join(macro_df, how="left")
    else:
        for col in MACRO_FEATURES:
            df[col] = np.nan

    # 5. 메타 피처
    cluster_map = _get_cluster_map(tickers)
    df = _add_meta_features(df, tickers, cluster_map)

    # 6. 결측치 처리: 종목별 forward fill 후 나머지 drop
    feature_cols = TECH_FEATURES + SUPPLY_FEATURES + MACRO_FEATURES
    df[feature_cols] = (
        df.groupby("ticker", group_keys=False)[feature_cols]
        .ffill()
    )
    before = len(df)
    df.dropna(subset=feature_cols, how="all", inplace=True)
    after = len(df)
    logger.info("[CLEAN] 결측치 처리: %d행 → %d행 (제거: %d행)", before, after, before - after)

    # 7. (date, ticker) MultiIndex 설정
    df.index.name = "date"
    df = df.set_index("ticker", append=True)

    logger.info("=== 데이터셋 구성 완료: %d행, %d컬럼 ===", len(df), len(df.columns))
    return df


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def main() -> None:
    """
    전체 베이스 피처 파이프라인을 실행합니다.

    OHLCV 파일 목록에서 종목 코드를 자동으로 읽어옵니다.
    """
    logger.info("베이스 피처 생성 파이프라인 시작")

    # 종목 목록 자동 수집
    if not RAW_OHLCV_PATH.exists():
        logger.error("RAW_OHLCV_PATH 가 존재하지 않습니다: %s", RAW_OHLCV_PATH)
        return

    tickers: list[str] = [
        p.stem for p in sorted(RAW_OHLCV_PATH.glob("*.parquet"))
    ]
    if not tickers:
        logger.error("OHLCV parquet 파일을 찾을 수 없습니다: %s", RAW_OHLCV_PATH)
        return

    logger.info("종목 수: %d", len(tickers))

    # 데이터셋 구성
    dataset = build_base_features(tickers)

    # 저장
    ensure_dir(PROCESSED_BASE_PATH)
    out_path = PROCESSED_BASE_PATH / "base_features.parquet"
    save_parquet(dataset, out_path, compression=PARQUET_COMPRESSION)
    logger.info("저장 완료: %s (%d행)", out_path, len(dataset))


if __name__ == "__main__":
    main()
