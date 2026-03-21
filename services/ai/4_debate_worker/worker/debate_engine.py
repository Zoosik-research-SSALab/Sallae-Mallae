from __future__ import annotations

from statistics import mean
from typing import Any

from worker.llm_client import LocalLlmClient
from worker.prompts import (
    build_chairman_system_prompt,
    build_chairman_user_prompt,
    build_persona_system_prompt,
    build_persona_user_prompt,
)
from worker.schemas import ChairmanDecision, DebateInputsResponse, DebateResultRequest, PersonaOpinion


class DebateEngine:
    PERSONAS = ("fundamental", "chart", "news")

    def __init__(self, *, llm_client: LocalLlmClient, max_rounds: int):
        self.llm_client = llm_client
        self.max_rounds = max_rounds

    def run(self, inputs: DebateInputsResponse) -> DebateResultRequest:
        previous_round: list[PersonaOpinion] = []
        round_logs: list[dict] = []

        for round_number in range(1, self.max_rounds + 1):
            opinions = self._run_round(inputs, previous_round)
            round_logs.append(
                {
                    "round": round_number,
                    "opinions": [item.model_dump(mode="json") for item in opinions],
                }
            )
            previous_round = opinions
            if self._has_consensus(opinions):
                break

        chairman_raw = self.llm_client.generate_json(
            system_prompt=build_chairman_system_prompt(),
            user_prompt=build_chairman_user_prompt(inputs, previous_round, round_logs),
        )
        chairman = ChairmanDecision.model_validate(self._normalize_chairman_payload(chairman_raw))

        final_stances = {
            opinion.persona: {
                "signal": opinion.signal,
                "confidence": opinion.confidence,
                "thesis": opinion.thesis,
                "evidence": opinion.evidence,
                "risks": opinion.risks,
                "action_points": opinion.action_points,
            }
            for opinion in previous_round
        }

        debate_summary = {
            "title": chairman.summary_title,
            "body": chairman.summary_body,
            "risk_notes": chairman.risk_notes,
            "execution_notes": chairman.execution_notes,
            "consensus_reached": self._has_consensus(previous_round),
            "average_confidence": round(mean(item.confidence for item in previous_round), 4) if previous_round else None,
        }

        return DebateResultRequest(
            stock_id=inputs.stock_id,
            ticker=inputs.ticker,
            report_date=inputs.report_date,
            debate_version=inputs.debate_version,
            chairman_signal=chairman.chairman_signal,
            debate_confidence=chairman.debate_confidence,
            debate_summary=debate_summary,
            final_stances=final_stances,
            debate_full_log={"rounds": round_logs},
            chairman_report=chairman.summary_body,
        )

    def _run_round(self, inputs: DebateInputsResponse, previous_round: list[PersonaOpinion]) -> list[PersonaOpinion]:
        opinions: list[PersonaOpinion] = []
        for persona in self.PERSONAS:
            raw = self.llm_client.generate_json(
                system_prompt=build_persona_system_prompt(persona),
                user_prompt=build_persona_user_prompt(inputs, persona, previous_round),
            )
            normalized = self._normalize_persona_payload(raw)
            opinion = PersonaOpinion.model_validate({"persona": persona, **normalized})
            opinions.append(opinion)
        return opinions

    def _normalize_persona_payload(self, raw: dict[str, Any]) -> dict[str, Any]:
        return {
            "signal": self._normalize_signal(raw.get("signal")),
            "confidence": self._normalize_confidence(raw.get("confidence")),
            "thesis": self._stringify(raw.get("thesis"), default="판단 근거를 요약하지 못했습니다."),
            "evidence": self._normalize_string_list(raw.get("evidence"), max_items=3),
            "risks": self._normalize_string_list(raw.get("risks"), max_items=3),
            "action_points": self._normalize_string_list(raw.get("action_points"), max_items=2),
        }

    def _normalize_chairman_payload(self, raw: dict[str, Any]) -> dict[str, Any]:
        return {
            "chairman_signal": self._normalize_signal(raw.get("chairman_signal")),
            "debate_confidence": self._normalize_confidence(raw.get("debate_confidence")),
            "summary_title": self._stringify(raw.get("summary_title"), default="토론 요약"),
            "summary_body": self._stringify(raw.get("summary_body"), default="최종 결론을 충분히 생성하지 못했습니다."),
            "risk_notes": self._normalize_string_list(raw.get("risk_notes"), max_items=3),
            "execution_notes": self._normalize_string_list(raw.get("execution_notes"), max_items=2),
        }

    def _normalize_signal(self, value: Any) -> str:
        text = self._stringify(value, default="HOLD").upper()
        if text not in {"BUY", "HOLD", "SELL"}:
            return "HOLD"
        return text

    def _normalize_confidence(self, value: Any) -> float:
        try:
            number = float(value)
        except (TypeError, ValueError):
            return 0.5
        if number < 0.0:
            return 0.0
        if number > 1.0:
            return 1.0
        return number

    def _normalize_string_list(self, value: Any, *, max_items: int) -> list[str]:
        flattened = self._flatten_to_strings(value)
        cleaned: list[str] = []
        for item in flattened:
            text = self._clean_text(item)
            if text:
                cleaned.append(text)
            if len(cleaned) >= max_items:
                break
        return cleaned

    def _flatten_to_strings(self, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, str):
            return [value]
        if isinstance(value, dict):
            return [self._stringify(value)]
        if isinstance(value, list):
            items: list[str] = []
            for item in value:
                items.extend(self._flatten_to_strings(item))
            return items
        return [str(value)]

    def _stringify(self, value: Any, default: str = "") -> str:
        if value is None:
            return default
        if isinstance(value, str):
            text = value.strip()
            return text or default
        if isinstance(value, list):
            text = " ".join(part for part in self._flatten_to_strings(value) if part).strip()
            return text or default
        if isinstance(value, dict):
            parts = []
            for key, item in value.items():
                rendered = self._stringify(item)
                if rendered:
                    parts.append(f"{key}: {rendered}")
            text = " | ".join(parts).strip()
            return text or default
        text = str(value).strip()
        return text or default

    def _clean_text(self, value: str) -> str:
        text = value.strip()
        if not text:
            return ""
        # 간단한 길이 제한만 적용
        if len(text) > 160:
            text = text[:157].rstrip() + "..."
        return text

    def _has_consensus(self, opinions: list[PersonaOpinion]) -> bool:
        if len(opinions) < len(self.PERSONAS):
            return False
        signals = {item.signal for item in opinions}
        return len(signals) == 1
