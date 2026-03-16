# KeyBERT 키워드 추출 트러블슈팅

## 배경

뉴스 파이프라인에서 키워드 추출을 위해 GMS API (Gemini)를 사용했으나, **토큰 할당량 부족** 문제가 발생하여 대안을 검토함.

## 시도한 방법

### 1. GMS API (Gemini-2.5-flash-lite)

```
POST https://gms.ssafy.io/gmsapi/generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent
```

- 장점: 높은 키워드 품질, 문맥 이해력 우수
- 문제: **토큰 할당량 부족** - 4,000건/일 처리 시 할당량 초과

### 2. GPT-5-nano (GMS 경유)

```
POST https://gms.ssafy.io/gmsapi/api.openai.com/v1/chat/completions
```

- 장점: 한국어 이해력 우수
- 문제: **동일한 토큰 할당량 제한**

### 3. KeyBERT + multilingual-e5-small (로컬)

```python
from keybert import KeyBERT
kw_model = KeyBERT(model="intfloat/multilingual-e5-small")
```

- 장점: 무료, 오프라인, 빠름 (CPU ~0.2s/건)
- 문제: **한국어 키워드 품질 부족**
  - 한국어 형태소 분리 없이 N-gram 기반이라 의미 없는 조합 추출
  - 예: "삼성전자 목표가 상향" → `["자 목표", "표가 상"]` (잘못된 분리)

### 4. KeyBERT + kiwipiepy (형태소 분석기 추가)

```python
from kiwipiepy import Kiwi
kiwi = Kiwi()
# 명사만 추출하여 후보로 사용
nouns = [token.form for token in kiwi.tokenize(text) if token.tag.startswith('NN')]
keywords = kw_model.extract_keywords(text, candidates=nouns)
```

- 장점: 명사구 기반으로 품질 개선
- 문제: **여전히 LLM 대비 품질 부족**
  - 복합 키워드 ("목표가 상향") 추출 어려움
  - 문맥 기반 핵심 키워드 선별 능력 부족

## 결론 및 최종 결정

| 방법 | 품질 | 속도 | 비용 | 결정 |
|------|------|------|------|------|
| GMS API (Gemini/GPT) | 우수 | 느림 | 토큰 부족 | X |
| KeyBERT (로컬) | 부족 | 빠름 | 무료 | X |
| KeyBERT + kiwipiepy | 보통 | 빠름 | 무료 | X |
| **자체 GPU 서버 + LLM** | **우수** | **보통** | **서버 비용** | **O (채택)** |

**최종 결정**: 집 데스크탑을 GPU 서버화하여 LLM 모델을 직접 호스팅하고, 키워드 추출 + 감성 분석(Hard Sample) 모두 처리.

- GMS API 토큰 제한 회피
- LLM 수준의 키워드 품질 확보
- FinBERT + LLM 듀얼 모델 감성 분석도 동시 처리 가능

## 코드 구조 (유지)

기존 `nlp_processor.py`에 모든 백엔드 코드 보존:

```
nlp_processor.py
  ├── GeminiBackend    # GMS API (코드 유지, 필요 시 재사용)
  ├── KeyBERTBackend   # 로컬 KeyBERT (코드 유지, 필요 시 재사용)
  └── (추가 예정) LLM Backend  # 자체 GPU 서버용
```

> 모든 백엔드 코드는 삭제하지 않고 유지. `--backend` 플래그로 전환 가능.
