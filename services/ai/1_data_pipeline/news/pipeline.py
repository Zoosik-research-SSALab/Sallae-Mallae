"""
뉴스 백필 파이프라인 — 오케스트레이터

GPU 서버에서 처리 완료된 CSV를 DB에 적재하고 키워드 임베딩을 생성.

흐름:
  1. backfill_loader  — CSV → stock_news + stock_news_map + keywords + news_keyword_map
  2. embed_keywords   — 미임베딩 키워드 → keyword_embeddings (e5-small, CPU)

사용법:
  # 백필 전체 실행 (최신 연도부터)
  python pipeline.py backfill --data-dir output/backfill_processed/

  # 특정 연도만
  python pipeline.py backfill --data-dir output/backfill_processed/2024/

  # 임베딩만 실행 (백필 적재 후)
  python pipeline.py embed

  # 이어서 적재 (체크포인트 기반)
  python pipeline.py backfill --data-dir output/backfill_processed/ --resume
"""

import argparse
import logging
import sys
from pathlib import Path

logger = logging.getLogger(__name__)

# 처리 순서: 최신 연도부터
YEAR_ORDER = [
    "2025-20260316",
    "2024",
    "2023",
    "2022",
    "2021",
    "2020",
    "2019",
]


def run_backfill(data_dir: str, resume: bool = False) -> None:
    """백필 CSV → DB 적재 실행."""
    from loaders.backfill_loader import process_backfill_folder, bulk_load_backfill

    data_path = Path(data_dir)

    if not data_path.exists():
        logger.error("데이터 경로 없음: %s", data_path)
        return

    # 연도별 하위 폴더가 있으면 순서대로 처리
    year_dirs = [data_path / y for y in YEAR_ORDER if (data_path / y).is_dir()]

    if year_dirs:
        logger.info("=" * 60)
        logger.info("  백필 적재 시작 — %d개 연도 폴더", len(year_dirs))
        logger.info("=" * 60)

        grand_total = {
            "news_inserted": 0, "news_skipped": 0, "maps_created": 0,
            "keywords_created": 0, "keyword_maps_created": 0,
        }

        for year_dir in year_dirs:
            logger.info("\n[%s] 처리 시작", year_dir.name)
            stats = process_backfill_folder(str(year_dir), resume=resume)
            for k in grand_total:
                grand_total[k] += stats[k]
            logger.info("[%s] 완료 — 뉴스 +%d건", year_dir.name, stats["news_inserted"])

        logger.info("\n" + "=" * 60)
        logger.info("  백필 적재 전체 완료")
        logger.info("  뉴스 삽입: %d건 | 스킵: %d건", grand_total["news_inserted"], grand_total["news_skipped"])
        logger.info("  종목매핑: %d건 | 키워드: +%d건 | 키워드매핑: %d건",
                     grand_total["maps_created"], grand_total["keywords_created"],
                     grand_total["keyword_maps_created"])
        logger.info("=" * 60)
    else:
        # 단일 폴더 (CSV 파일이 바로 들어있는 경우)
        csv_files = list(data_path.glob("*.csv"))
        if csv_files:
            logger.info("단일 폴더 적재: %s (%d개 CSV)", data_path, len(csv_files))
            stats = process_backfill_folder(str(data_path), resume=resume)
            logger.info("완료 — 뉴스 +%d건", stats["news_inserted"])
        else:
            logger.warning("CSV 파일 없음: %s", data_path)


def run_embed() -> None:
    """미임베딩 키워드에 대해 e5-small 임베딩 생성."""
    from processors.embed_keywords import run_embed_keywords

    logger.info("=" * 60)
    logger.info("  키워드 임베딩 생성 시작")
    logger.info("=" * 60)

    run_embed_keywords()

    logger.info("=" * 60)
    logger.info("  키워드 임베딩 완료")
    logger.info("=" * 60)


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)-7s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    parser = argparse.ArgumentParser(description="뉴스 백필 파이프라인")
    subparsers = parser.add_subparsers(dest="command")

    # backfill 서브커맨드
    bp = subparsers.add_parser("backfill", help="GPU 백필 CSV → DB 적재")
    bp.add_argument("--data-dir", required=True, help="처리 완료된 CSV 폴더 경로")
    bp.add_argument("--resume", action="store_true", help="체크포인트 기반 이어서 적재")

    # embed 서브커맨드
    subparsers.add_parser("embed", help="미임베딩 키워드 → keyword_embeddings 생성")

    # all 서브커맨드 (백필 + 임베딩)
    ap = subparsers.add_parser("all", help="백필 적재 + 임베딩 전체 실행")
    ap.add_argument("--data-dir", required=True, help="처리 완료된 CSV 폴더 경로")
    ap.add_argument("--resume", action="store_true", help="체크포인트 기반 이어서 적재")

    args = parser.parse_args()

    if args.command == "backfill":
        run_backfill(args.data_dir, resume=args.resume)
    elif args.command == "embed":
        run_embed()
    elif args.command == "all":
        run_backfill(args.data_dir, resume=args.resume)
        run_embed()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
