"""
utils/kis_client.py
한국투자증권 KIS Open API REST 클라이언트.

OAuth2 Bearer 토큰 관리와 투자자별 매매동향(일별) 조회를 담당합니다.
토큰은 메모리 내에서 캐시되며, 만료 1분 전에 자동 갱신됩니다.

사용 전제 조건:
  - config.py에 KIS_API_KEY, KIS_API_SECRET이 설정되어 있어야 합니다.
  - .env 파일에 KIS_API_KEY, KIS_SECRET_KEY가 정의되어 있어야 합니다.

TR_ID 설명:
  FHKST01010900 — 종목별 투자자 기간별 매매동향 (실전/모의 공용)
"""

from __future__ import annotations

import time
from datetime import datetime, timedelta

import requests

# 실전투자 기본 URL (시세 조회는 실전 서버 사용)
_KIS_BASE_URL: str = "https://openapi.koreainvestment.com:9443"
_TOKEN_PATH: str = "/oauth2/tokenP"
_INVESTOR_PATH: str = "/uapi/domestic-stock/v1/quotations/inquire-investor"
_TR_ID_INVESTOR: str = "FHKST01010900"


class KISClient:
    """KIS Open API 경량 클라이언트.

    인스턴스를 모듈 수준에서 하나만 생성해 재사용합니다 (모듈 싱글턴 패턴).
    토큰은 메모리에만 보관되므로 프로세스가 재시작되면 재발급됩니다.
    """

    def __init__(self, api_key: str, api_secret: str) -> None:
        if not api_key or not api_secret:
            raise ValueError(
                "KIS_API_KEY / KIS_SECRET_KEY가 설정되지 않았습니다. "
                ".env 파일을 확인하세요."
            )
        self._api_key = api_key
        self._api_secret = api_secret
        self._access_token: str | None = None
        self._token_expires_at: datetime | None = None
        self._session = requests.Session()

    # ------------------------------------------------------------------
    # 토큰 관리
    # ------------------------------------------------------------------

    def _refresh_token(self) -> None:
        """KIS OAuth2 액세스 토큰을 발급하여 캐시합니다."""
        url = f"{_KIS_BASE_URL}{_TOKEN_PATH}"
        payload = {
            "grant_type": "client_credentials",
            "appkey": self._api_key,
            "appsecret": self._api_secret,
        }
        resp = self._session.post(url, json=payload, timeout=15)
        resp.raise_for_status()
        data: dict = resp.json()

        token = data.get("access_token")
        if not token:
            raise ValueError(
                f"KIS 토큰 발급 실패: {data.get('msg1', str(data))}"
            )

        expires_in = int(data.get("expires_in", 86400))
        # 만료 60초 전에 갱신 트리거
        self._access_token = token
        self._token_expires_at = datetime.now() + timedelta(seconds=expires_in - 60)

    def _get_token(self) -> str:
        """유효한 액세스 토큰을 반환합니다. 만료된 경우 자동 갱신합니다."""
        if (
            self._access_token
            and self._token_expires_at
            and datetime.now() < self._token_expires_at
        ):
            return self._access_token
        self._refresh_token()
        return self._access_token  # type: ignore[return-value]

    # ------------------------------------------------------------------
    # 투자자별 매매동향 조회
    # ------------------------------------------------------------------

    def get_investor_trading(
        self,
        ticker: str,
        start_date: str,
        end_date: str,
    ) -> list[dict]:
        """종목별 투자자 기간별 매매동향을 조회합니다 (FHKST01010900).

        Args:
            ticker:     6자리 종목코드 (예: "005930")
            start_date: 조회 시작일 'YYYYMMDD'
            end_date:   조회 종료일 'YYYYMMDD'

        Returns:
            일별 매매동향 딕셔너리 리스트. 각 항목의 주요 필드:
              - stck_bsop_date   : 영업일자 (YYYYMMDD)
              - frgn_ntby_tr_pbmn: 외국인 순매수 거래대금 (원)
              - orgn_ntby_tr_pbmn: 기관계 순매수 거래대금 (원)
              - indv_ntby_tr_pbmn: 개인 순매수 거래대금 (원)
              - frgn_ntby_qty    : 외국인 순매수 수량 (주)
              - orgn_ntby_qty    : 기관계 순매수 수량 (주)
              - indv_ntby_qty    : 개인 순매수 수량 (주)
            데이터 없을 경우 빈 리스트 반환.

        Raises:
            ValueError: API rt_cd 가 '0' 이 아닌 경우
            requests.HTTPError: HTTP 오류 발생 시
        """
        token = self._get_token()
        headers = {
            "content-type": "application/json; charset=utf-8",
            "authorization": f"Bearer {token}",
            "appkey": self._api_key,
            "appsecret": self._api_secret,
            "tr_id": _TR_ID_INVESTOR,
            "custtype": "P",  # 개인 고객
        }
        params = {
            "FID_COND_MRKT_DIV_CODE": "J",
            "FID_INPUT_ISCD": ticker,
            "FID_INPUT_DATE_1": start_date,
            "FID_INPUT_DATE_2": end_date,
        }

        url = f"{_KIS_BASE_URL}{_INVESTOR_PATH}"
        resp = self._session.get(url, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        data: dict = resp.json()

        if data.get("rt_cd") != "0":
            raise ValueError(
                f"KIS API 오류 [{ticker} {start_date}~{end_date}]: "
                f"rt_cd={data.get('rt_cd')} msg={data.get('msg1', '')}"
            )

        return data.get("output", []) or []
