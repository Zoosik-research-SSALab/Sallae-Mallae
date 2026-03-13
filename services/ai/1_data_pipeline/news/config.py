"""
뉴스 데이터 파이프라인 — 공통 설정
"""
import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# ---------------------------------------------------------------------------
# DB 연결
# ---------------------------------------------------------------------------
# 배포 환경: 개별 환경변수(DB_HOST 등)로 URL 조합
# 로컬 환경: AI_DB_URL 직접 지정 또는 개별 변수 사용
_DB_HOST = os.environ.get("DB_HOST", "localhost")
_DB_PORT = os.environ.get("DB_PORT", "5432")
_DB_NAME = os.environ.get("DB_NAME", "app_dev")
_DB_USER = os.environ.get("DB_USER", "app_dev_user")
_DB_PASSWORD = os.environ.get("DB_PASSWORD", "change_me_dev")

AI_DB_URL: str = os.environ.get(
    "AI_DB_URL",
    f"postgresql+psycopg2://{_DB_USER}:{_DB_PASSWORD}@{_DB_HOST}:{_DB_PORT}/{_DB_NAME}",
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
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Referer": "https://finance.naver.com/",
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
GDRIVE_FOLDER_ID: str = os.environ.get(
    "GDRIVE_NEWS_FOLDER_ID",
    "1XLqr6uAYkCsjYUXQfJHInmOtVILgy4mb",
)

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
