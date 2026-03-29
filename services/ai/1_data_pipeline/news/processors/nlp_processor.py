"""
NLP 처리 모듈 — 키워드 추출 & 관련 종목 매칭

독립 모듈로 설계되어 다음 컨텍스트에서 재사용 가능:
  1. 크롤러 인라인 처리 (crawl_historical_news.py, crawl_backfill.py)
  2. 과거 데이터 배치 후처리 (batch_enrich.py)
  3. FastAPI 엔드포인트 (app.state.extractor 로 DI 주입)

백엔드 교체:
  - 현재: "claude" (Anthropic API, 개념적 키워드 품질 최고)
  - 로컬: "vllm" (vLLM 서버, OpenAI 호환 API)

Usage:
    extractor = KeywordExtractor(backend="claude", api_key="sk-ant-...")
    article = await extractor.enrich_article(article, stock_dict, primary_code="005930")

FastAPI:
    # startup
    app.state.extractor = KeywordExtractor(backend="claude", api_key=settings.ANTHROPIC_API_KEY)
    # dependency
    def get_extractor(request: Request) -> KeywordExtractor:
        return request.app.state.extractor
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import json
import logging
import re
from typing import Protocol, runtime_checkable

logger = logging.getLogger(__name__)

# ──────────────────────────────────────
# 백엔드 프로토콜 (교체 가능 인터페이스)
# ──────────────────────────────────────

@runtime_checkable
class KeywordBackend(Protocol):
    async def extract(self, title: str, body: str) -> list[str]:
        """기사 제목 + 본문에서 핵심 키워드 최대 3개 반환"""
        ...


# ──────────────────────────────────────
# Claude API 백엔드
# ──────────────────────────────────────

class ClaudeBackend:
    """
    Anthropic Claude를 사용한 생성형 키워드 추출.
    개념적 키워드("AI 메모리 경쟁", "반도체 공급망") 품질이 가장 좋음.
    Haiku 모델 기준 약 $0.001/건.
    """

    _SYSTEM = (
        "당신은 한국 주식 시장 뉴스 분석 전문가입니다. "
        "주어진 기사에서 핵심 주제 키워드를 추출합니다."
    )

    _PROMPT = """\
다음 뉴스 기사를 분석하여 핵심 주제 키워드를 최대 3개 추출해주세요.

규칙:
- 키워드는 산업 트렌드, 이슈, 현상을 나타내는 명사구여야 합니다
  (좋은 예: "AI 반도체 수요", "금리 인상 우려", "실적 개선 기대", "공급망 재편")
  (나쁜 예: 기업명, 종목명, 사람 이름)
- 여러 기사에 공통 적용 가능한 보편적 키워드를 우선하세요
- 2~8글자의 간결한 한국어 키프레이즈로 작성하세요
- JSON 배열 형식으로만 응답하고, 다른 설명은 쓰지 마세요

제목: {title}
본문: {body}

JSON 응답:"""

    def __init__(self, api_key: str, model: str = "claude-haiku-4-5-20251001"):
        import anthropic
        self._client = anthropic.AsyncAnthropic(api_key=api_key)
        self._model = model

    async def extract(self, title: str, body: str) -> list[str]:
        prompt = self._PROMPT.format(title=title, body=body[:1500])
        try:
            msg = await self._client.messages.create(
                model=self._model,
                max_tokens=120,
                system=self._SYSTEM,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = msg.content[0].text.strip()
            # JSON 배열 추출 (모델이 앞뒤에 텍스트를 붙이는 경우 대비)
            match = re.search(r'\[.*?\]', raw, re.DOTALL)
            if match:
                keywords = json.loads(match.group())
                return [str(k).strip() for k in keywords[:3] if k and str(k).strip()]
        except Exception as e:
            logger.warning(f"Claude 키워드 추출 실패: {e}")
        return []


# ──────────────────────────────────────
# Gemini 백엔드
# ──────────────────────────────────────

class GeminiBackend:
    """
    GMS 프록시(SSAFY Gemini 게이트웨이)를 통한 Gemini REST API 키워드 추출.

    엔드포인트: POST {gms_url}/models/{model}:generateContent?key={api_key}
    """

    _SYSTEM = (
        "당신은 한국 주식 시장 뉴스 분석 전문가입니다. "
        "주어진 기사에서 핵심 주제 키워드를 추출합니다."
    )

    _PROMPT = """\
다음 뉴스 기사를 분석하여 핵심 주제 키워드를 최대 3개 추출해주세요.

규칙:
- 키워드는 산업 트렌드, 이슈, 현상을 나타내는 명사구여야 합니다
  (좋은 예: "AI 반도체 수요", "금리 인상 우려", "실적 개선 기대", "공급망 재편")
  (나쁜 예: 기업명, 종목명, 사람 이름)
- 여러 기사에 공통 적용 가능한 보편적 키워드를 우선하세요
- 2~8글자의 간결한 한국어 키프레이즈로 작성하세요
- JSON 배열 형식으로만 응답하고, 다른 설명은 쓰지 마세요

제목: {title}
본문: {body}

JSON 응답:"""

    def __init__(self, api_key: str, model: str = "gemini-2.5-flash-lite",
                 base_url: str = "https://gms.ssafy.io/gmsapi/generativelanguage.googleapis.com/v1beta"):
        self._api_key = api_key
        self._model = model
        self._base_url = base_url.rstrip("/")

    async def extract(self, title: str, body: str) -> list[str]:
        import aiohttp
        prompt = self._PROMPT.format(title=title, body=body[:1500])
        url = f"{self._base_url}/models/{self._model}:generateContent"

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": self._SYSTEM}]},
            "generationConfig": {
                "maxOutputTokens": 120,
                "temperature": 0.1,
            },
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    params={"key": self._api_key},
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        logger.warning("GMS API 오류 (status=%d): %s", resp.status, error_text[:200])
                        return []
                    data = await resp.json()
                    # Gemini REST API 응답 파싱
                    raw = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    match = re.search(r'\[.*?\]', raw, re.DOTALL)
                    if match:
                        keywords = json.loads(match.group())
                        return [str(k).strip() for k in keywords[:3] if k and str(k).strip()]
        except Exception as e:
            logger.warning("GMS Gemini 키워드 추출 실패: %s", e)
        return []


# ──────────────────────────────────────
# Ollama 백엔드 (로컬 LLM)
# ──────────────────────────────────────

class VLLMBackend:
    """
    로컬 vLLM 서버를 사용한 키워드 추출 (OpenAI 호환 API).

    모델: Qwen/Qwen2.5-7B-Instruct-AWQ (4bit 양자화)
    - 백필에서 사용한 Qwen2.5-7B-Instruct 기반
    - RTX 5060 8GB VRAM에서 FP16 원본 모델 로딩 불가 (모델 ~14GB > VRAM 8GB)
    - AWQ 4bit 양자화로 ~4GB로 축소, --cpu-offload-gb 2로 일부 가중치를 CPU RAM으로 오프로드
    - 디스플레이 출력(~700MB) 점유 상태에서도 8GB VRAM에서 안정 실행

    실행 (WSL2 Ubuntu):
        vllm serve Qwen/Qwen2.5-7B-Instruct-AWQ \\
          --host 0.0.0.0 --port 8000 --max-model-len 2048 \\
          --gpu-memory-utilization 0.85 --enforce-eager \\
          --quantization awq --cpu-offload-gb 2
    """

    _SYSTEM = (
        "당신은 한국 주식 시장 뉴스 분석 전문가입니다. "
        "주어진 기사에서 핵심 주제 키워드를 추출합니다."
    )

    _PROMPT = """\
다음 뉴스 기사를 분석하여 핵심 주제 키워드를 최대 3개 추출해주세요.

규칙:
- 기업명/종목명/사람 이름은 키워드에서 반드시 제외 (해당 종목의 기업명은 이미 알고 있음)
- 키워드는 사업/기술/이벤트/산업 트렌드를 나타내는 명사구여야 합니다
  (좋은 예: "ESS 수주", "HBM 납품", "금리 인상", "실적 개선", "공급망 재편")
  (나쁜 예: "삼성전자", "효성중공업", "조현준", "엔비디아")
- 여러 기사에 공통 적용 가능한 보편적 키워드를 우선하세요
- 2~8글자의 간결한 한국어 키프레이즈로 작성하세요
- 쉼표로 구분하여 키워드만 출력하세요. 다른 설명은 쓰지 마세요

제목: {title}
본문: {body}

키워드:"""

    def __init__(self, model: str = "Qwen/Qwen2.5-7B-Instruct-AWQ",
                 base_url: str = "http://localhost:8000"):
        self._model = model
        self._base_url = base_url.rstrip("/")

    async def extract(self, title: str, body: str) -> list[str]:
        import aiohttp
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": self._SYSTEM},
                {"role": "user", "content": self._PROMPT.format(title=title, body=body[:1500])},
            ],
            "max_tokens": 50,
            "temperature": 0,
        }
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self._base_url}/v1/chat/completions",
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=60),
                ) as resp:
                    data = await resp.json()
                    raw = data["choices"][0]["message"]["content"].strip()
                    # JSON 배열 형식 시도
                    match = re.search(r'\[.*?\]', raw, re.DOTALL)
                    if match:
                        keywords = json.loads(match.group())
                        return [str(k).strip() for k in keywords[:3] if k and str(k).strip()]
                    # 쉼표 구분 형식 파싱
                    keywords = [k.strip().strip('"\'') for k in raw.split(",")]
                    return [k for k in keywords[:3] if k and len(k) <= 20]
        except Exception as e:
            logger.warning("vLLM 키워드 추출 실패: %s", e)
        return []


# ──────────────────────────────────────
# KeyBERT 백엔드 (로컬 임베딩 기반)
# ──────────────────────────────────────

class KeyBERTBackend:
    """
    KeyBERT + kiwipiepy(한국어 형태소 분석) + E5 임베딩 기반 키워드 추출.
    1) kiwipiepy로 명사/명사구 후보를 추출
    2) KeyBERT가 문서 임베딩과 후보 임베딩 간 코사인 유사도로 랭킹
    GPU 없이도 동작 (기사 1건당 ~0.2초), API 토큰 소모 0.
    """

    # 키워드 후보에서 제외할 불용어
    _STOPWORDS = {
        "것", "수", "등", "중", "때", "년", "월", "일", "위", "전", "후",
        "약", "위해", "대해", "통해", "따라", "관련", "이후", "현재", "최근",
    }

    def __init__(self, model_name: str = "intfloat/multilingual-e5-small"):
        from keybert import KeyBERT
        from kiwipiepy import Kiwi
        from sklearn.feature_extraction.text import CountVectorizer
        self._kw_model = KeyBERT(model=model_name)
        self._kiwi = Kiwi()
        self._model_name = model_name
        self._noun_tags = {"NNG", "NNP"}

        # kiwipiepy 명사 토크나이저를 사용하는 커스텀 vectorizer
        self._vectorizer = CountVectorizer(
            tokenizer=self._kiwi_tokenize,
            ngram_range=(1, 2),
            token_pattern=None,
        )

    def _kiwi_tokenize(self, text: str) -> list[str]:
        """kiwipiepy로 명사만 추출하는 토크나이저."""
        result = self._kiwi.tokenize(text)
        return [
            token.form for token in result
            if token.tag in self._noun_tags
            and token.form not in self._STOPWORDS
            and len(token.form) >= 2
        ]

    async def extract(self, title: str, body: str) -> list[str]:
        """기사 제목 + 본문에서 핵심 키워드 최대 3개 반환."""
        text = f"{title}. {body}" if body else title
        try:
            keywords = self._kw_model.extract_keywords(
                text,
                vectorizer=self._vectorizer,
                top_n=3,
                use_mmr=True,
                diversity=0.5,
            )
            return [kw[0] for kw in keywords if kw[0]]
        except Exception as e:
            logger.warning("KeyBERT 키워드 추출 실패: %s", e)
            return []


# ──────────────────────────────────────
# 메인 클래스
# ──────────────────────────────────────

class KeywordExtractor:
    """
    키워드 추출 + 관련 종목 매칭 메인 클래스.

    Args:
        backend: "keybert" | "gemini" | "claude" | "vllm"
        **kwargs: 백엔드 초기화 파라미터
            keybert: model_name (옵션, 기본: intfloat/multilingual-e5-small)
            gemini:  api_key (필수), model (옵션), base_url (옵션)
            claude:  api_key (필수), model (옵션)
            vllm:    model (옵션), base_url (옵션)

    Example:
        extractor = KeywordExtractor(backend="keybert")
        extractor = KeywordExtractor(backend="gemini", api_key="...", model="gemini-2.5-flash-lite")
    """

    def __init__(self, backend: str = "keybert", **kwargs):
        if backend == "keybert":
            self._backend: KeywordBackend = KeyBERTBackend(**kwargs)
        elif backend == "claude":
            self._backend = ClaudeBackend(**kwargs)
        elif backend == "gemini":
            self._backend = GeminiBackend(**kwargs)
        elif backend == "vllm":
            self._backend = VLLMBackend(**kwargs)
        else:
            raise ValueError(f"알 수 없는 백엔드: '{backend}'. 'keybert', 'gemini', 'claude', 'vllm'를 사용하세요.")
        self._backend_name = backend

    async def extract_keywords(self, title: str, body: str) -> list[str]:
        """핵심 개념 키워드 최대 3개 반환."""
        if not title and not body:
            return []
        return await self._backend.extract(title, body)

    def match_related_stocks(
        self,
        text: str,
        stock_dict: dict,  # {code: name}
        primary_code: str | None = None,
    ) -> list[str]:
        """
        기사 텍스트에서 언급된 KOSPI200 종목 코드 목록 반환.
        primary_code는 결과에서 제외 (크롤링 대상 종목이므로 별도 저장됨).
        """
        found = []
        for code, name in stock_dict.items():
            if code == primary_code:
                continue
            # 2글자 이하 종목명은 오탐 가능성 높아 제외
            if name and len(name) >= 3 and name in text:
                found.append(code)
        return found

    async def enrich_article(
        self,
        article: dict,
        stock_dict: dict,  # {code: name}
        primary_code: str | None = None,
    ) -> dict:
        """
        article dict에 keywords + related_stocks 필드를 추가하여 반환.

        Input article 필드:
            title:     기사 제목
            body:      요약 본문 (스니펫)
            full_body: 전체 본문 (있으면 키워드 추출에 사용)

        Output 추가 필드:
            keywords:       list[str]  — 핵심 주제 키워드 최대 3개
            related_stocks: list[str]  — 언급된 KOSPI200 종목 코드 목록
        """
        title = article.get("title", "")
        body = article.get("full_body") or article.get("body", "")

        article["keywords"] = await self.extract_keywords(title, body)

        search_text = title + " " + body
        article["related_stocks"] = self.match_related_stocks(
            search_text, stock_dict, primary_code=primary_code
        )

        return article
