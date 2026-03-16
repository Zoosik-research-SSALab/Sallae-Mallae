from __future__ import annotations

import json

from worker.schemas import DebateInputsResponse, PersonaOpinion


JSON_RULES = """
반드시 JSON 객체만 응답하세요.
설명 문장, 마크다운, 코드블록 없이 JSON만 반환하세요.
signal 값은 BUY, HOLD, SELL 중 하나만 사용하세요.
confidence 값은 0.0 이상 1.0 이하 숫자만 사용하세요.
"""


def _pretty_json(value) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2, default=str)


def build_persona_system_prompt(persona: str) -> str:
    role_map = {
        "fundamental": "당신은 재무제표와 밸류에이션을 중시하는 펀더멘탈 애널리스트입니다.",
        "chart": "당신은 가격 흐름과 ML 예측치를 중시하는 차트/퀀트 애널리스트입니다.",
        "news": "당신은 최근 뉴스, 이벤트, 심리를 중시하는 뉴스 애널리스트입니다.",
    }
    return f"""{role_map[persona]}
입력 데이터만 근거로 판단하고 과장하지 마세요.
응답 스키마:
{{
  "signal": "BUY|HOLD|SELL",
  "confidence": 0.0,
  "thesis": "핵심 결론 1~2문장",
  "evidence": ["근거1", "근거2", "근거3"],
  "risks": ["리스크1", "리스크2"],
  "action_points": ["추가 확인 포인트1", "추가 확인 포인트2"]
}}
{JSON_RULES}
"""


def build_persona_user_prompt(inputs: DebateInputsResponse, persona: str, previous_round: list[PersonaOpinion]) -> str:
    persona_payload = getattr(inputs.personas, persona)
    prior = [item.model_dump(mode="json") for item in previous_round] if previous_round else []
    return f"""배치 기준일: {inputs.report_date}
종목: {inputs.stock_name} ({inputs.ticker})
토론 버전: {inputs.debate_version}

현재 페르소나 입력:
{_pretty_json(persona_payload.model_dump(mode="json"))}

이전 라운드 요약:
{_pretty_json(prior)}

이번 페르소나의 독립적인 의견을 작성하세요.
"""


def build_chairman_system_prompt() -> str:
    return f"""당신은 토론 의장입니다.
세 페르소나의 의견을 비교해 최종 신호와 확신도를 결정하세요.
소수 의견도 무시하지 말고 리스크를 함께 정리하세요.
응답 스키마:
{{
  "chairman_signal": "BUY|HOLD|SELL",
  "debate_confidence": 0.0,
  "summary_title": "한 줄 요약 제목",
  "summary_body": "최종 결론 3~5문장",
  "risk_notes": ["리스크1", "리스크2"],
  "execution_notes": ["실행 메모1", "실행 메모2"]
}}
{JSON_RULES}
"""


def build_chairman_user_prompt(inputs: DebateInputsResponse, opinions: list[PersonaOpinion], rounds: list[dict]) -> str:
    return f"""배치 기준일: {inputs.report_date}
종목: {inputs.stock_name} ({inputs.ticker})
토론 버전: {inputs.debate_version}

최종 페르소나 의견:
{_pretty_json([item.model_dump(mode="json") for item in opinions])}

전체 토론 라운드 로그:
{_pretty_json(rounds)}

최종 투자 신호와 토론 요약을 작성하세요.
"""

