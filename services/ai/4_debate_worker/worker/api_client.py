from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date
from typing import Any
from urllib import error, parse, request

from worker.schemas import DebateInputsResponse, DebateResultRequest, DebateResultResponse, DebateTargetsResponse


@dataclass
class ApiClientError(Exception):
    status_code: int
    message: str

    def __str__(self) -> str:
        return f"{self.status_code}: {self.message}"

    @property
    def retryable(self) -> bool:
        return self.status_code in {408, 429, 500, 502, 503, 504}


class DebateApiClient:
    def __init__(self, *, base_url: str, api_key: str, timeout_seconds: int = 60):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.timeout_seconds = timeout_seconds

    def get_targets(
        self,
        *,
        report_date: date,
        debate_version: str,
        source: str,
        market_type: str,
        portfolio_id: int | None,
        stock_ids: tuple[int, ...] | None,
        limit: int | None,
    ) -> DebateTargetsResponse:
        query_params: list[tuple[str, Any]] = [
            ("report_date", report_date.isoformat()),
            ("debate_version", debate_version),
            ("source", source),
            ("market_type", market_type),
        ]
        if portfolio_id is not None:
            query_params.append(("portfolio_id", portfolio_id))
        if limit is not None:
            query_params.append(("limit", limit))
        if stock_ids:
            query_params.extend(("stock_id", stock_id) for stock_id in stock_ids)
        payload = self._request_json(
            "GET",
            "/ai/debate/targets",
            query_params=query_params,
        )
        return DebateTargetsResponse.model_validate(payload)

    def get_inputs(
        self,
        *,
        stock_id: int,
        report_date: date,
        debate_version: str,
        news_limit: int,
        financial_limit: int,
    ) -> DebateInputsResponse:
        payload = self._request_json(
            "GET",
            f"/ai/debate/inputs/{stock_id}",
            query_params={
                "report_date": report_date.isoformat(),
                "debate_version": debate_version,
                "news_limit": news_limit,
                "financial_limit": financial_limit,
            },
        )
        return DebateInputsResponse.model_validate(payload)

    def post_result(self, payload: DebateResultRequest) -> DebateResultResponse:
        result = self._request_json(
            "POST",
            "/ai/debate/results",
            body=payload.model_dump(mode="json"),
        )
        return DebateResultResponse.model_validate(result)

    def _request_json(
        self,
        method: str,
        path: str,
        *,
        query_params: dict[str, Any] | list[tuple[str, Any]] | None = None,
        body: dict[str, Any] | list[Any] | None = None,
    ) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        if query_params:
            if isinstance(query_params, dict):
                params = {key: value for key, value in query_params.items() if value is not None}
                encoded = parse.urlencode(params)
            else:
                params = [(key, value) for key, value in query_params if value is not None]
                encoded = parse.urlencode(params, doseq=True)
            if encoded:
                url = f"{url}?{encoded}"

        headers = {
            "X-API-Key": self.api_key,
            "Accept": "application/json",
        }
        data = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            data = json.dumps(body).encode("utf-8")

        req = request.Request(url=url, method=method, headers=headers, data=data)
        try:
            with request.urlopen(req, timeout=self.timeout_seconds) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except error.HTTPError as exc:
            raise ApiClientError(status_code=exc.code, message=self._parse_http_error(exc)) from exc
        except error.URLError as exc:
            raise ApiClientError(status_code=503, message=f"AI 서버 연결에 실패했습니다: {exc.reason}") from exc

    def _parse_http_error(self, exc: error.HTTPError) -> str:
        try:
            payload = json.loads(exc.read().decode("utf-8"))
            if isinstance(payload, dict) and payload.get("message"):
                return str(payload["message"])
        except Exception:
            pass
        return exc.reason or "API 요청에 실패했습니다."
