from __future__ import annotations

import threading
from dataclasses import dataclass

from core.config import settings
from worker.api_client import DebateApiClient
from worker.backfill_runner import DebateBackfillRunner
from worker.checkpoint_store import CheckpointStore
from worker.debate_engine import DebateEngine
from worker.llm_client import LocalLlmClient
from worker.resource_monitor import ResourceMonitor
from worker.runner import DebateWorkerRunner


@dataclass
class WorkerRuntime:
    llm_client: LocalLlmClient
    api_client: DebateApiClient
    checkpoint_store: CheckpointStore
    debate_engine: DebateEngine
    day_runner: DebateWorkerRunner
    resource_monitor: ResourceMonitor
    backfill_runner: DebateBackfillRunner
    stop_event: threading.Event


def build_runtime(*, stop_event: threading.Event | None = None) -> WorkerRuntime:
    resolved_stop_event = stop_event or threading.Event()

    llm_client = LocalLlmClient(
        provider=settings.LLM_PROVIDER,
        base_url=settings.LLM_BASE_URL,
        model=settings.LLM_MODEL,
        timeout_seconds=settings.LLM_REQUEST_TIMEOUT_SECONDS,
        temperature=settings.LLM_TEMPERATURE,
    )
    api_client = DebateApiClient(
        base_url=settings.AI_SERVER_BASE_URL,
        api_key=settings.INTERNAL_API_KEY,
        timeout_seconds=settings.AI_SERVER_TIMEOUT_SECONDS,
    )
    checkpoint_store = CheckpointStore(settings.checkpoint_db_path)
    debate_engine = DebateEngine(llm_client=llm_client, max_rounds=settings.MAX_DEBATE_ROUNDS)
    resource_monitor = ResourceMonitor(
        min_ram_available_mb=settings.RESOURCE_MIN_RAM_AVAILABLE_MB,
        min_ram_available_ratio=settings.RESOURCE_MIN_RAM_AVAILABLE_RATIO,
        min_gpu_free_mb=settings.RESOURCE_MIN_GPU_FREE_MB,
        poll_interval_seconds=settings.RESOURCE_POLL_INTERVAL_SECONDS,
    )
    day_runner = DebateWorkerRunner(
        api_client=api_client,
        debate_engine=debate_engine,
        checkpoint_store=checkpoint_store,
        resource_monitor=resource_monitor,
        stop_event=resolved_stop_event,
    )
    backfill_runner = DebateBackfillRunner(
        day_runner=day_runner,
        checkpoint_store=checkpoint_store,
        resource_monitor=resource_monitor,
        stop_event=resolved_stop_event,
    )
    return WorkerRuntime(
        llm_client=llm_client,
        api_client=api_client,
        checkpoint_store=checkpoint_store,
        debate_engine=debate_engine,
        day_runner=day_runner,
        resource_monitor=resource_monitor,
        backfill_runner=backfill_runner,
        stop_event=resolved_stop_event,
    )
