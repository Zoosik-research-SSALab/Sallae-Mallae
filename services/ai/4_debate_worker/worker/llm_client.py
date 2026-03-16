from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any
from urllib import error, request


@dataclass
class LlmClientError(Exception):
    message: str

    def __str__(self) -> str:
        return self.message


class LocalLlmClient:
    def __init__(
        self,
        *,
        provider: str,
        base_url: str,
        model: str,
        timeout_seconds: int,
        temperature: float,
    ):
        self.provider = provider.strip().lower()
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout_seconds = timeout_seconds
        self.temperature = temperature

    def generate_json(self, *, system_prompt: str, user_prompt: str) -> dict[str, Any]:
        content = self.generate_text(system_prompt=system_prompt, user_prompt=user_prompt)
        return self._extract_json(content)

    def generate_text(self, *, system_prompt: str, user_prompt: str) -> str:
        if self.provider == "ollama":
            return self._call_ollama(system_prompt=system_prompt, user_prompt=user_prompt)
        if self.provider == "openai_compatible":
            return self._call_openai_compatible(system_prompt=system_prompt, user_prompt=user_prompt)
        raise LlmClientError(f"지원하지 않는 LLM provider 입니다: {self.provider}")

    def _call_ollama(self, *, system_prompt: str, user_prompt: str) -> str:
        payload = {
            "model": self.model,
            "stream": False,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            "options": {"temperature": self.temperature},
        }
        response = self._post_json("/api/chat", payload)
        message = response.get("message", {})
        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            raise LlmClientError("Ollama 응답에서 content를 찾을 수 없습니다.")
        return content

    def _call_openai_compatible(self, *, system_prompt: str, user_prompt: str) -> str:
        payload = {
            "model": self.model,
            "temperature": self.temperature,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
        response = self._post_json("/v1/chat/completions", payload)
        choices = response.get("choices", [])
        if not choices:
            raise LlmClientError("OpenAI 호환 응답에 choices가 없습니다.")
        message = choices[0].get("message", {})
        content = message.get("content")
        if not isinstance(content, str) or not content.strip():
            raise LlmClientError("OpenAI 호환 응답에서 content를 찾을 수 없습니다.")
        return content

    def _post_json(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        data = json.dumps(payload).encode("utf-8")
        req = request.Request(
            url=url,
            method="POST",
            data=data,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
        )
        try:
            with request.urlopen(req, timeout=self.timeout_seconds) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw)
        except error.HTTPError as exc:
            raise LlmClientError(f"LLM 호출 HTTP 오류: {exc.code}") from exc
        except error.URLError as exc:
            raise LlmClientError(f"LLM 서버 연결 실패: {exc.reason}") from exc

    def _extract_json(self, content: str) -> dict[str, Any]:
        cleaned = content.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            cleaned = cleaned.rsplit("```", 1)[0]

        decoder = json.JSONDecoder()
        for index, char in enumerate(cleaned):
            if char != "{":
                continue
            try:
                payload, _ = decoder.raw_decode(cleaned[index:])
            except json.JSONDecodeError:
                continue
            if isinstance(payload, dict):
                return payload
        raise LlmClientError("LLM 응답에서 JSON 객체를 안정적으로 추출하지 못했습니다.")
