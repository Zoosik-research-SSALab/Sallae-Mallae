from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path


STATE_DIR = Path(__file__).resolve().parents[2] / "state" / "chairman_portfolio"


def checkpoint_path(*, kind: str, run_id: str) -> Path:
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    return STATE_DIR / f"{kind}_{run_id}.json"


def load_checkpoint(path: Path) -> dict | None:
    if not path.is_file():
        return None
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def save_checkpoint(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(payload, file, ensure_ascii=False, indent=2, sort_keys=True)


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def build_run_id(*parts: object) -> str:
    raw = "__".join(str(part) for part in parts if part not in (None, ""))
    normalized = re.sub(r"[^0-9A-Za-z._-]+", "-", raw).strip("-").lower()
    return normalized or "default"
