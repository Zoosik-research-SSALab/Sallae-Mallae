from __future__ import annotations

import shutil
import subprocess
import threading
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

from core.logger import logger

try:
    import psutil
except ImportError:  # pragma: no cover - optional dependency fallback
    psutil = None


@dataclass
class ResourceSnapshot:
    checked_at: datetime
    ram_total_mb: int | None = None
    ram_available_mb: int | None = None
    ram_available_ratio: float | None = None
    gpu_index: int | None = None
    gpu_name: str | None = None
    gpu_total_mb: int | None = None
    gpu_used_mb: int | None = None
    gpu_free_mb: int | None = None
    gpu_utilization: int | None = None


class ResourceMonitor:
    def __init__(
        self,
        *,
        min_ram_available_mb: int,
        min_ram_available_ratio: float,
        min_gpu_free_mb: int,
        poll_interval_seconds: int,
    ):
        self.min_ram_available_mb = min_ram_available_mb
        self.min_ram_available_ratio = min_ram_available_ratio
        self.min_gpu_free_mb = min_gpu_free_mb
        self.poll_interval_seconds = poll_interval_seconds

    def capture(self) -> ResourceSnapshot:
        checked_at = datetime.now(UTC)
        ram_total_mb, ram_available_mb, ram_available_ratio = self._read_memory()
        gpu = self._read_gpu()
        return ResourceSnapshot(
            checked_at=checked_at,
            ram_total_mb=ram_total_mb,
            ram_available_mb=ram_available_mb,
            ram_available_ratio=ram_available_ratio,
            gpu_index=gpu.get("gpu_index"),
            gpu_name=gpu.get("gpu_name"),
            gpu_total_mb=gpu.get("gpu_total_mb"),
            gpu_used_mb=gpu.get("gpu_used_mb"),
            gpu_free_mb=gpu.get("gpu_free_mb"),
            gpu_utilization=gpu.get("gpu_utilization"),
        )

    def wait_until_ready(self, *, stop_event: threading.Event | None = None, context: str = "") -> ResourceSnapshot:
        stop_event = stop_event or threading.Event()
        while not stop_event.is_set():
            snapshot = self.capture()
            reasons = self._reasons_to_wait(snapshot)
            if not reasons:
                logger.info(
                    "리소스 확인 통과 | context=%s | ram=%sMB | gpu_free=%sMB | gpu=%s",
                    context or "-",
                    snapshot.ram_available_mb,
                    snapshot.gpu_free_mb,
                    snapshot.gpu_name or "N/A",
                )
                return snapshot

            logger.warning(
                "리소스 부족으로 대기 | context=%s | reasons=%s | ram=%sMB(%.2f) | gpu_free=%sMB",
                context or "-",
                "; ".join(reasons),
                snapshot.ram_available_mb,
                snapshot.ram_available_ratio or 0.0,
                snapshot.gpu_free_mb,
            )
            stop_event.wait(self.poll_interval_seconds)

        return self.capture()

    def recommend_vllm_gpu_memory_utilization(self) -> float:
        snapshot = self.capture()
        if not snapshot.gpu_total_mb:
            return 0.5
        free_ratio = (snapshot.gpu_free_mb or 0) / snapshot.gpu_total_mb
        if free_ratio >= 0.75:
            return 0.7
        if free_ratio >= 0.55:
            return 0.6
        return 0.45

    def _reasons_to_wait(self, snapshot: ResourceSnapshot) -> list[str]:
        reasons: list[str] = []
        if snapshot.ram_available_mb is not None and snapshot.ram_available_mb < self.min_ram_available_mb:
            reasons.append(f"RAM 여유 {snapshot.ram_available_mb}MB < {self.min_ram_available_mb}MB")
        if snapshot.ram_available_ratio is not None and snapshot.ram_available_ratio < self.min_ram_available_ratio:
            reasons.append(
                f"RAM 여유 비율 {snapshot.ram_available_ratio:.2f} < {self.min_ram_available_ratio:.2f}"
            )
        if (
            snapshot.gpu_free_mb is not None
            and self.min_gpu_free_mb > 0
            and snapshot.gpu_free_mb < self.min_gpu_free_mb
        ):
            reasons.append(f"GPU 여유 {snapshot.gpu_free_mb}MB < {self.min_gpu_free_mb}MB")
        return reasons

    def _read_memory(self) -> tuple[int | None, int | None, float | None]:
        if psutil is not None:
            memory = psutil.virtual_memory()
            total_mb = int(memory.total / 1024 / 1024)
            available_mb = int(memory.available / 1024 / 1024)
            available_ratio = memory.available / memory.total if memory.total else None
            return total_mb, available_mb, available_ratio

        meminfo = Path("/proc/meminfo")
        if meminfo.is_file():
            values: dict[str, int] = {}
            for line in meminfo.read_text(encoding="utf-8").splitlines():
                if ":" not in line:
                    continue
                key, raw = line.split(":", 1)
                try:
                    values[key.strip()] = int(raw.strip().split()[0])
                except (ValueError, IndexError):
                    continue
            total_kb = values.get("MemTotal")
            available_kb = values.get("MemAvailable")
            if total_kb and available_kb:
                total_mb = int(total_kb / 1024)
                available_mb = int(available_kb / 1024)
                return total_mb, available_mb, available_kb / total_kb
        return None, None, None

    def _read_gpu(self) -> dict[str, int | str | None]:
        if shutil.which("nvidia-smi") is None:
            return {}
        command = [
            "nvidia-smi",
            "--query-gpu=index,name,memory.total,memory.used,memory.free,utilization.gpu",
            "--format=csv,noheader,nounits",
        ]
        try:
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                encoding="utf-8",
                check=True,
            )
        except Exception:
            return {}

        best_row: dict[str, int | str | None] | None = None
        for line in result.stdout.splitlines():
            parts = [part.strip() for part in line.split(",")]
            if len(parts) != 6:
                continue
            row = {
                "gpu_index": int(parts[0]),
                "gpu_name": parts[1],
                "gpu_total_mb": int(parts[2]),
                "gpu_used_mb": int(parts[3]),
                "gpu_free_mb": int(parts[4]),
                "gpu_utilization": int(parts[5]),
            }
            if best_row is None or int(row["gpu_free_mb"]) > int(best_row["gpu_free_mb"]):
                best_row = row
        return best_row or {}
