"""
뉴스 데이터 파이프라인 — 공통 설정
"""
import os
from pathlib import Path
from urllib.parse import quote_plus

from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# DB 연결
# ---------------------------------------------------------------------------
# 배포 환경: 개별 환경변수(DB_HOST 등)로 URL 조합 (비밀번호 특수문자 자동 인코딩)
# 로컬 환경: AI_DB_URL 직접 지정 또는 개별 변수 사용
_DB_HOST = os.environ.get("DB_HOST", "localhost")
_DB_PORT = os.environ.get("DB_PORT", "5432")
_DB_NAME = os.environ.get("DB_NAME", "app_dev")
_DB_USER = os.environ.get("DB_USER", "app_dev_user")
_DB_PASSWORD = os.environ.get("DB_PASSWORD", "change_me_dev")

# AI_DB_URL 환경변수가 있으면 비밀번호 특수문자(@등)를 인코딩하여 사용
# 없으면 개별 변수(DB_HOST 등)로 조합
_raw_url = os.environ.get("AI_DB_URL", "")
if _raw_url:
    # postgresql+psycopg2://user:pass@host:port/db 형식에서 비밀번호 추출 후 인코딩
    _scheme_end = _raw_url.index("://") + 3
    _at_host = _raw_url.rindex("@")  # 마지막 @가 호스트 구분자
    _user_pass = _raw_url[_scheme_end:_at_host]
    _colon = _user_pass.index(":")
    _user = _user_pass[:_colon]
    _pass = _user_pass[_colon + 1:]
    AI_DB_URL: str = (
        f"{_raw_url[:_scheme_end]}{quote_plus(_user)}:{quote_plus(_pass)}"
        f"{_raw_url[_at_host:]}"
    )
else:
    AI_DB_URL: str = (
        f"postgresql+psycopg2://{quote_plus(_DB_USER)}:{quote_plus(_DB_PASSWORD)}"
        f"@{_DB_HOST}:{_DB_PORT}/{_DB_NAME}"
    )

# ---------------------------------------------------------------------------
# 크롤링 설정
# ---------------------------------------------------------------------------
# 네이버 금융 종목 뉴스 탭 (백필 크롤러에서 사용)
NAVER_FINANCE_NEWS_URL = (
    "https://finance.naver.com/item/news_news.naver"
    "?code={code}&page={page}&sm=title_entity_id.basic&clusterId="
)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/137.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

REQUEST_DELAY = 0.5
MAX_PAGES = 3

# ---------------------------------------------------------------------------
# 임베딩 모델
# ---------------------------------------------------------------------------
EMBEDDING_MODEL_NAME = "intfloat/multilingual-e5-small"

# ---------------------------------------------------------------------------
# NLP 백엔드 (키워드 추출)
# ---------------------------------------------------------------------------
# GMS 프록시 (SSAFY Gemini 게이트웨이)
GMS_API_URL: str = os.environ.get(
    "GMS_API_URL",
    "https://gms.ssafy.io/gmsapi/generativelanguage.googleapis.com/v1beta",
)
GMS_API_KEY: str | None = os.environ.get("GMS_API_KEY")
GMS_MODEL: str = os.environ.get("GMS_MODEL", "gemini-2.5-flash-lite")

# 레거시 (직접 호출용, GMS 미사용 시)
GEMINI_API_KEY: str | None = os.environ.get("GEMINI_API_KEY")
ANTHROPIC_API_KEY: str | None = os.environ.get("ANTHROPIC_API_KEY")

# ---------------------------------------------------------------------------
# Google Drive 설정 (CSV 다운로드용)
# ---------------------------------------------------------------------------
GDRIVE_FOLDER_ID: str = os.environ.get("GDRIVE_NEWS_FOLDER_ID", "")

# ---------------------------------------------------------------------------
# 로컬 저장 경로
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
OUTPUT_DIR = BASE_DIR / "output"

DATA_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# 오탐 방지: 짧은 이름 + 일반명사 종목 (제목 매칭만)
# ---------------------------------------------------------------------------
TITLE_ONLY_NAMES = {
    "대상", "두산", "동서", "한화", "영풍", "한샘",
    "대웅", "풍산", "후성", "오리온", "농심", "기아",
}
