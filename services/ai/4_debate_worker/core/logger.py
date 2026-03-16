from __future__ import annotations

import logging
import sys

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

