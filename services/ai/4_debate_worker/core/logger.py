from __future__ import annotations

import logging
import sys
from pathlib import Path

from core.config import settings


def setup_logger() -> logging.Logger:
    level = logging.DEBUG if settings.DEBUG else logging.INFO
    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    logger = logging.getLogger("debate_worker")
    logger.setLevel(level)
    if not logger.handlers:
        logger.addHandler(handler)

    return logger


logger = setup_logger()


def add_file_handler(log_path: Path) -> None:
    resolved = log_path.resolve()
    resolved.parent.mkdir(parents=True, exist_ok=True)

    for handler in logger.handlers:
        if isinstance(handler, logging.FileHandler) and Path(handler.baseFilename) == resolved:
            return

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler = logging.FileHandler(resolved, encoding="utf-8")
    handler.setFormatter(formatter)
    logger.addHandler(handler)
