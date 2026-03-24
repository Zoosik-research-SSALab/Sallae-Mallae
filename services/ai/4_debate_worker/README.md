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

일일 자동화 실행:

```bash
python daily_main.py
```

일일 자동화는 `pipeline_signals`를 읽어 아래 순서로 처리합니다.
- `NEWS_PIPELINE_DONE` 확인
- 포트폴리오 마지막 반영일 다음날부터 목표 날짜까지 토론 워커 순차 실행
- 토론 완료 후 `DEBATE_PIPELINE_DONE` 기록
- 포트폴리오 일일 반영 스크립트가 누락 날짜 포함 순차 반영
- 포트폴리오 완료 후 `PORTFOLIO_PIPELINE_DONE` 기록

한 번만 점검:

```bash
python daily_main.py --once --report-date 2026-03-24
```

자세한 내용은 `docs/personal_desktop_setup.md` 와 `docs/worker_operations.md` 를 참고합니다.

GPU 서버 기간 백필:

```bash
python3 backfill_main.py run --start-date 2025-01-01 --end-date 2026-03-18 --source ml_reports
```

주피터 노트북:
- `notebooks/gpu_debate_backfill.ipynb`

운영 가이드:
- `docs/gpu_backfill_setup.md`
