import logging
import sys

from core.config import settings


def setup_logger() -> logging.Logger:
    """애플리케이션 공통 로거를 설정한다."""
    level = logging.DEBUG if settings.DEBUG else logging.INFO

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    logger = logging.getLogger("ai_server")
    logger.setLevel(level)
    if not logger.handlers:
        logger.addHandler(handler)

    return logger


# 모듈에서 from core.logger import logger 로 사용
logger = setup_logger()
