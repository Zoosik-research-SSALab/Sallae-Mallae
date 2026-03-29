from __future__ import annotations

import json
from typing import Any

from worker.schemas import DebateInputsResponse, PersonaOpinion


JSON_RULES = """
반드시 JSON 객체만 응답하세요.
설명, 마크다운, 코드블록 없이 JSON만 반환하세요.
signal은 BUY, HOLD, SELL 중 하나만 사용하세요.
confidence는 0.0 이상 1.0 이하 숫자만 사용하세요.
반드시 한국어로만 작성하세요. 영어, 중국어, 일본어를 섞지 마세요.
모든 서술형 필드는 자연스러운 한국어 존댓말로 작성하세요. 문장 종결은 "~입니다", "~합니다"를 사용하세요.
"""


def _trim(value: Any, max_len: int = 80) -> Any:
    if not isinstance(value, str):
        return value
    value = value.strip()
    if len(value) <= max_len:
        return value
    return value[: max_len - 3].rstrip() + "..."


def _to_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"), default=str)


def _compact_financial(inputs: DebateInputsResponse) -> dict[str, Any]:
    p = inputs.personas.fundamental
    latest = p.latest_financials.model_dump(mode="json") if p.latest_financials else None
    if not latest:
        return {"latest": None}
    return {
        "latest": {
            "y": latest.get("report_year"),
            "q": latest.get("report_quarter"),
            "rev": latest.get("revenue"),
            "op": latest.get("operating_profit"),
            "ni": latest.get("net_income"),
            "per": latest.get("per"),
            "pbr": latest.get("pbr"),
            "roe": latest.get("roe"),
        }
    }


def _compact_chart(inputs: DebateInputsResponse) -> dict[str, Any]:
    p = inputs.personas.chart
    e = p.ensemble_prediction.model_dump(mode="json") if p.ensemble_prediction else {}
    l = p.lgbm_prediction.model_dump(mode="json") if p.lgbm_prediction else {}
    t = p.tft_prediction.model_dump(mode="json") if p.tft_prediction else {}
    g = p.garch_prediction.model_dump(mode="json") if p.garch_prediction else {}
    return {
        "ensemble": {
            "result": e.get("ensemble_result"),
            "conf": e.get("ensemble_confidence"),
            "agree": e.get("signal_agreement"),
            "risk": e.get("risk_flag"),
        },
        "lgbm": {
            "cls": l.get("predicted_class"),
            "conf": l.get("confidence"),
            "up": l.get("prob_up"),
            "side": l.get("prob_sideways"),
            "down": l.get("prob_down"),
        },
        "tft": {
            "pred": t.get("pred"),
            "prob": t.get("prob"),
        },
        "garch": {
            "level": g.get("volatility_level"),
            "risk": g.get("risk_flag"),
            "v1": g.get("vol_1d"),
            "v5": g.get("vol_5d"),
        },
    }


def _compact_news(inputs: DebateInputsResponse) -> dict[str, Any]:
    p = inputs.personas.news
    top_keywords = []
    for item in p.top_keywords[:3]:
        top_keywords.append(
            {
                "k": item.keyword,
                "m": item.mention_count,
                "titles": [_trim(news.title, 50) for news in item.news[:1]],
            }
        )

    sentiment = {}
    if isinstance(p.sentiment, dict):
        for key in ("overall", "label", "score", "positive", "neutral", "negative"):
            if key in p.sentiment:
                sentiment[key] = p.sentiment[key]

    return {
        "keywords": top_keywords,
        "sentiment": sentiment,
    }


def _compact_persona(inputs: DebateInputsResponse, persona: str) -> dict[str, Any]:
    if persona == "fundamental":
        return _compact_financial(inputs)
    if persona == "chart":
        return _compact_chart(inputs)
    return _compact_news(inputs)


def _compact_previous(previous_round: list[PersonaOpinion]) -> list[dict[str, Any]]:
    return [
        {
            "p": item.persona,
            "s": item.signal,
            "c": item.confidence,
            "t": _trim(item.thesis, 60),
        }
        for item in previous_round[-3:]
    ]


def _compact_rounds(rounds: list[dict[str, Any]]) -> list[dict[str, Any]]:
    compact = []
    for round_item in rounds[-1:]:
        compact.append(
            {
                "r": round_item.get("round"),
                "ops": [
                    {
                        "p": opinion.get("persona"),
                        "s": opinion.get("signal"),
                        "c": opinion.get("confidence"),
                        "t": _trim(opinion.get("thesis"), 50),
                    }
                    for opinion in (round_item.get("opinions") or [])
                ],
            }
        )
    return compact


def build_persona_system_prompt(persona: str) -> str:
    role_map = {
        "fundamental": "당신은 살래말래 위원회의 펀더멘탈 위원이다.",
        "chart": "당신은 살래말래 위원회의 차트 위원이다.",
        "news": "당신은 살래말래 위원회의 뉴스 위원이다.",
    }
    return f"""{role_map[persona]}
목표: 오늘 종가 기준으로 내일 포지션 판단 의견 제시.
원칙:
- BUY: 상승 우위가 분명
- SELL: 하락 우위가 분명
- HOLD: 양쪽 근거가 비슷하거나 확신이 낮음
- BUY/SELL을 억지로 고르지 말고, 애매하면 HOLD 가능
- 반대로 우위가 충분하면 HOLD로 도망가지 말 것

응답 스키마:
{{
  "signal":"BUY|HOLD|SELL",
  "confidence":0.0,
  "thesis":"1~2문장",
  "evidence":["근거1","근거2"],
  "risks":["리스크1","리스크2"],
  "action_points":["확인1"]
}}

{JSON_RULES}
"""


def build_persona_user_prompt(inputs: DebateInputsResponse, persona: str, previous_round: list[PersonaOpinion]) -> str:
    payload = _compact_persona(inputs, persona)
    prior = _compact_previous(previous_round)
    return (
        f"date={inputs.report_date} stock={inputs.stock_name}({inputs.ticker})\n"
        f"input={_to_json(payload)}\n"
        f"prior={_to_json(prior)}\n"
        "해당 위원의 독립 의견을 JSON으로 작성하라."
    )


def build_chairman_system_prompt() -> str:
    return f"""당신은 살래말래 위원회의 의장이다.
세 위원 의견을 종합해 오늘 종가 기준 최종 결론을 내린다.
의장은 매일 거래할 필요가 없다.

원칙:
- BUY: 위원회 종합상 상승 우위가 충분히 분명
- SELL: 위원회 종합상 하락 우위가 충분히 분명
- HOLD: 의견이 엇갈리거나 확신이 낮아 행동 보류가 합리적
- 위원 2명 이상이 같은 방향이고 반대 근거가 약하면 그 방향을 우선
- 단, 확신이 낮으면 HOLD 허용
- 과매매도, 무조건 HOLD도 피할 것

응답 스키마:
{{
  "chairman_signal":"BUY|HOLD|SELL",
  "debate_confidence":0.0,
  "summary_title":"한 줄 제목",
  "summary_body":"2~3문장",
  "risk_notes":["리스크1","리스크2"],
  "execution_notes":["메모1"]
}}

{JSON_RULES}
"""


def build_chairman_user_prompt(inputs: DebateInputsResponse, opinions: list[PersonaOpinion], rounds: list[dict]) -> str:
    compact_opinions = _compact_previous(opinions)
    compact_rounds = _compact_rounds(rounds)
    return (
        f"date={inputs.report_date} stock={inputs.stock_name}({inputs.ticker})\n"
        f"opinions={_to_json(compact_opinions)}\n"
        f"rounds={_to_json(compact_rounds)}\n"
        "의장 최종 결론을 JSON으로 작성하라."
    )
