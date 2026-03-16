from __future__ import annotations

from statistics import mean

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
        chairman = ChairmanDecision.model_validate(chairman_raw)

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
            opinion = PersonaOpinion.model_validate({"persona": persona, **raw})
            opinions.append(opinion)
        return opinions

    def _has_consensus(self, opinions: list[PersonaOpinion]) -> bool:
        if len(opinions) < len(self.PERSONAS):
            return False
        signals = {item.signal for item in opinions}
        return len(signals) == 1

