# 4_debate_worker 구조

## 디렉터리

```text
4_debate_worker/
├── core/
│   ├── config.py
│   └── logger.py
├── docs/
│   ├── architecture.md
│   ├── personal_desktop_setup.md
│   └── worker_operations.md
├── tests/
│   ├── test_checkpoint_store.py
│   └── test_runner.py
├── worker/
│   ├── api_client.py
│   ├── checkpoint_store.py
│   ├── debate_engine.py
│   ├── llm_client.py
│   ├── prompts.py
│   ├── runner.py
│   └── schemas.py
├── .env.example
├── main.py
└── requirements.txt
```

## 주요 책임

- `api_client.py`
  - EC2 AI 서버와 통신
- `llm_client.py`
  - 로컬 Ollama 또는 OpenAI 호환 엔드포인트 호출
- `debate_engine.py`
  - 3개 페르소나 토론과 의장 결론 생성
- `checkpoint_store.py`
  - 작업 상태와 결과 payload를 SQLite에 영속화
- `runner.py`
  - 대상 동기화, 처리, 재시도, 복구 전체 제어

## 비효율 최소화 포인트

- 토론 결과는 결과 POST 전에 체크포인트에 먼저 저장
- 재실행 시 결과 payload가 있으면 LLM 재호출 없이 바로 POST
- 토론은 합의되면 조기 종료
- 입력 패킷은 서버가 필요한 정보만 요약해서 전달

