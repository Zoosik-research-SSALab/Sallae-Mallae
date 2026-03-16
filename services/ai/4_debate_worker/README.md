# Debate Worker

로컬 데스크탑에서 실행하는 토론 배치 워커입니다.

역할:
- EC2 FastAPI에서 토론 대상과 입력 패킷을 조회
- 로컬 LLM으로 3개 페르소나 토론 수행
- 최종 결과를 EC2 `ai_debate_reports`로 저장
- 체크포인트를 로컬 SQLite에 저장해 재시도와 복구 지원

기본 실행:

```bash
python main.py
```

기본값은 `continuous` 모드이며, 오늘 날짜 기준으로 대상 조회와 처리 루프를 반복합니다.

한 번만 실행:

```bash
python main.py --once --report-date 2026-03-16 --source trading_history --portfolio-id 1
```

자세한 내용은 [docs/personal_desktop_setup.md](/home/ssafy/dev-ai/services/ai/4_debate_worker/docs/personal_desktop_setup.md) 와 [docs/worker_operations.md](/home/ssafy/dev-ai/services/ai/4_debate_worker/docs/worker_operations.md) 를 참고합니다.

