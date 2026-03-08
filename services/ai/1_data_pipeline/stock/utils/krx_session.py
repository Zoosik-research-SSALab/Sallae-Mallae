"""
utils/krx_session.py
pykrx KRX 세션 인증 유틸리티.

KRX가 2026-02-27부터 일부 API에 세션 인증을 강제화함에 따라,
requests.Session을 pykrx 내부에 주입하고 data.krx.co.kr 로그인을 통해
세션 쿠키를 갱신합니다.

참고: https://github.com/sharebook-kr/pykrx/issues/276

사용 예:
    from utils.krx_session import ensure_krx_session
    from config import KRX_USER_ID, KRX_PASSWORD

    success = ensure_krx_session(KRX_USER_ID, KRX_PASSWORD)
    if success:
        df = stock.get_market_trading_value_by_date(...)
"""

import requests

from utils.logger import setup_logger

logger = setup_logger(__name__)

# ---------------------------------------------------------------------------
# KRX 로그인 관련 URL 상수
# ---------------------------------------------------------------------------
_LOGIN_PAGE = "https://data.krx.co.kr/contents/MDC/COMS/client/MDCCOMS001.cmd"
_LOGIN_JSP = "https://data.krx.co.kr/contents/MDC/COMS/client/view/login.jsp?site=mdc"
_LOGIN_URL = "https://data.krx.co.kr/contents/MDC/COMS/client/MDCCOMS001D1.cmd"
_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

# ---------------------------------------------------------------------------
# 모듈 수준 단일 세션
# ---------------------------------------------------------------------------
_session: requests.Session = requests.Session()
_session.headers.update({"User-Agent": _UA})

_session_injected: bool = False  # pykrx에 주입되었는지 추적


# ---------------------------------------------------------------------------
# 내부 헬퍼
# ---------------------------------------------------------------------------

def _make_post_read(sess: requests.Session):
    """pykrx Post.read 를 sess 를 사용하도록 대체하는 함수를 반환합니다."""

    def post_read(self, **params):
        resp = sess.post(self.url, headers=self.headers, data=params)
        return resp

    return post_read


def _make_get_read(sess: requests.Session):
    """pykrx Get.read 를 sess 를 사용하도록 대체하는 함수를 반환합니다."""

    def get_read(self, **params):
        resp = sess.get(self.url, headers=self.headers, params=params)
        return resp

    return get_read


# ---------------------------------------------------------------------------
# 공개 함수
# ---------------------------------------------------------------------------

def inject_pykrx_session() -> None:
    """
    pykrx 내부의 Post.read / Get.read 를 모듈 수준 _session 을 사용하도록
    monkeypatch 합니다.

    이미 주입된 경우 아무 작업도 수행하지 않습니다.
    """
    global _session_injected

    if _session_injected:
        return

    try:
        from pykrx.website.comm import webio  # type: ignore[import-untyped]

        webio.Post.read = _make_post_read(_session)
        webio.Get.read = _make_get_read(_session)
        _session_injected = True
        logger.info("pykrx webio session 주입 완료")
    except Exception as exc:
        logger.warning("pykrx webio session 주입 실패: %s", exc)


def login_krx(user_id: str, password: str) -> bool:
    """
    data.krx.co.kr 에 로그인하여 _session 쿠키를 갱신합니다.

    GitHub issue #276 절차:
      1. GET _LOGIN_PAGE  → JSESSIONID 발급
      2. GET _LOGIN_JSP   → iframe 세션 초기화
      3. POST _LOGIN_URL  → 로그인 시도
         - _error_code == "CD011" (중복 로그인) → skipDup=Y 추가 후 재시도
         - _error_code == "CD001"              → 로그인 성공

    Args:
        user_id:  KRX 회원 아이디
        password: KRX 회원 비밀번호

    Returns:
        로그인 성공 여부 (bool). 실패 시 False 반환 (예외 미발생).
    """
    try:
        # Step 1: JSESSIONID 발급
        _session.get(_LOGIN_PAGE, timeout=15)

        # Step 2: iframe 세션 초기화
        _session.get(_LOGIN_JSP, timeout=15)

        # Step 3: 로그인 POST
        payload: dict[str, str] = {
            "mbrId": user_id,
            "pw": password,
            "site": "mdc",
        }

        resp = _session.post(_LOGIN_URL, data=payload, timeout=15)
        resp.raise_for_status()

        data = resp.json()
        error_code: str = data.get("_error_code", "")

        # 중복 로그인 → skipDup 추가 후 재시도
        if error_code == "CD011":
            logger.info("KRX 중복 로그인 감지 — skipDup=Y 로 재시도")
            payload["skipDup"] = "Y"
            resp = _session.post(_LOGIN_URL, data=payload, timeout=15)
            resp.raise_for_status()
            data = resp.json()
            error_code = data.get("_error_code", "")

        if error_code == "CD001":
            logger.info("KRX 로그인 성공 (user_id=%s)", user_id)
            return True

        logger.warning(
            "KRX 로그인 실패 — _error_code=%s, message=%s",
            error_code,
            data.get("_error_message", ""),
        )
        return False

    except Exception as exc:
        logger.warning("KRX 로그인 중 예외 발생: %s", exc)
        return False


def ensure_krx_session(
    user_id: str | None,
    password: str | None,
) -> bool:
    """
    pykrx session 주입 및 KRX 로그인을 한 번에 수행합니다.

    user_id 또는 password 가 None 이거나 빈 문자열이면 즉시 False 를 반환합니다.

    Args:
        user_id:  KRX 회원 아이디 (None 허용)
        password: KRX 회원 비밀번호 (None 허용)

    Returns:
        세션 준비 성공 여부 (bool).
    """
    if not user_id or not password:
        logger.warning(
            "KRX_USER_ID 또는 KRX_PASSWORD 가 설정되지 않았습니다. "
            "세션 인증을 건너뜁니다."
        )
        return False

    inject_pykrx_session()
    return login_krx(user_id, password)
