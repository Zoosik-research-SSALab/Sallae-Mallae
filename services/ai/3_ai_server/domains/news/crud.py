from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy import Integer, case, desc, func, select
from sqlalchemy.orm import Session

from domains.news.models import (
    Keyword,
    KeywordEmbedding,
    NewsKeywordMap,
    StockNews,
    StockNewsMap,
)


def get_top_keywords_by_date_range(
    db: Session,
    start_date: date,
    end_date: date,
    top_k: int = 3,
) -> list[dict]:
    """
    지정된 날짜 범위의 뉴스에서 가장 많이 언급된 키워드 상위 N개를 조회한다.
    클러스터 기반으로 유사 키워드를 그룹핑하여 카운트한다.

    반환: [{"keyword_id": int, "name": str, "cluster_id": int|None, "count": int}]
    """
    # 클러스터가 있는 키워드: cluster_id로 그룹핑
    # 클러스터가 없는 키워드: keyword_id별로 개별 카운트
    stmt = (
        select(
            func.coalesce(Keyword.cluster_id, Keyword.id).label("group_id"),
            func.count(NewsKeywordMap.news_id).label("mention_count"),
        )
        .join(NewsKeywordMap, NewsKeywordMap.keyword_id == Keyword.id)
        .join(StockNews, StockNews.id == NewsKeywordMap.news_id)
        .where(func.date(StockNews.published_at) >= start_date)
        .where(func.date(StockNews.published_at) <= end_date)
        .group_by(func.coalesce(Keyword.cluster_id, Keyword.id))
        .order_by(desc("mention_count"))
        .limit(top_k)
    )
    top_groups = db.execute(stmt).all()

    results = []
    for group_id, count in top_groups:
        # 그룹 내 대표 키워드 조회 (가장 빈도 높은 키워드)
        repr_stmt = (
            select(Keyword.id, Keyword.name)
            .join(NewsKeywordMap, NewsKeywordMap.keyword_id == Keyword.id)
            .join(StockNews, StockNews.id == NewsKeywordMap.news_id)
            .where(func.date(StockNews.published_at) >= start_date)
            .where(func.date(StockNews.published_at) <= end_date)
            .where(
                func.coalesce(Keyword.cluster_id, Keyword.id) == group_id
            )
            .group_by(Keyword.id, Keyword.name)
            .order_by(desc(func.count(NewsKeywordMap.news_id)))
            .limit(1)
        )
        repr_row = db.execute(repr_stmt).first()
        if repr_row:
            results.append({
                "keyword_id": repr_row[0],
                "name": repr_row[1],
                "count": count,
            })

    return results


def get_news_by_keyword(
    db: Session,
    keyword_id: int,
    start_date: date,
    end_date: date,
    limit: int = 2,
) -> list[dict]:
    """
    특정 키워드에 연결된 뉴스를 최신순으로 조회한다.
    클러스터가 같은 키워드들의 뉴스도 포함한다.

    반환: [{"news_id", "title", "snippet", "url", "published_at"}]
    """
    # 해당 키워드의 cluster_id 조회
    kw = db.execute(
        select(Keyword.cluster_id).where(Keyword.id == keyword_id)
    ).first()

    cluster_id = kw[0] if kw else None

    if cluster_id:
        # 같은 클러스터의 모든 키워드 ID
        kw_ids_stmt = (
            select(Keyword.id)
            .where(Keyword.cluster_id == cluster_id)
        )
        keyword_ids = [row[0] for row in db.execute(kw_ids_stmt).all()]
    else:
        keyword_ids = [keyword_id]

    stmt = (
        select(
            StockNews.id,
            StockNews.title,
            StockNews.snippet,
            StockNews.url,
            StockNews.published_at,
        )
        .join(NewsKeywordMap, NewsKeywordMap.news_id == StockNews.id)
        .where(NewsKeywordMap.keyword_id.in_(keyword_ids))
        .where(func.date(StockNews.published_at) >= start_date)
        .where(func.date(StockNews.published_at) <= end_date)
        .order_by(desc(StockNews.published_at))
        .distinct()
        .limit(limit)
    )
    rows = db.execute(stmt).all()

    return [
        {
            "news_id": r[0],
            "title": r[1],
            "snippet": r[2],
            "url": r[3],
            "published_at": r[4],
        }
        for r in rows
    ]


def get_sentiment_indices_by_date_range(
    db: Session,
    start_date: date,
    end_date: date,
) -> list[dict]:
    """
    날짜 범위의 종목별 감성 지수 집계를 조회한다.
    stock_news_map의 sentiment_score/label 기반.

    반환: [{"stock_id", "avg_score", "positive", "negative", "neutral", "total"}]
    """
    from domains.debate.models import DebateStock

    stmt = (
        select(
            StockNewsMap.stock_id,
            DebateStock.ticker,
            DebateStock.name,
            func.avg(StockNewsMap.sentiment_score).label("avg_score"),
            func.sum(
                case((StockNewsMap.sentiment_label == "POSITIVE", 1), else_=0)
            ).label("positive_count"),
            func.sum(
                case((StockNewsMap.sentiment_label == "NEGATIVE", 1), else_=0)
            ).label("negative_count"),
            func.sum(
                case((StockNewsMap.sentiment_label == "NEUTRAL", 1), else_=0)
            ).label("neutral_count"),
            func.count(StockNewsMap.news_id).label("total_count"),
        )
        .join(StockNews, StockNews.id == StockNewsMap.news_id)
        .join(DebateStock, DebateStock.id == StockNewsMap.stock_id)
        .where(func.date(StockNews.published_at) >= start_date)
        .where(func.date(StockNews.published_at) <= end_date)
        .where(StockNewsMap.sentiment_label.isnot(None))
        .group_by(StockNewsMap.stock_id, DebateStock.ticker, DebateStock.name)
        .order_by(desc("total_count"))
    )
    rows = db.execute(stmt).all()

    return [
        {
            "stock_id": r[0],
            "ticker": r[1],
            "stock_name": r[2],
            "avg_score": float(r[3]) if r[3] is not None else None,
            "positive": r[4] or 0,
            "negative": r[5] or 0,
            "neutral": r[6] or 0,
            "total": r[7] or 0,
        }
        for r in rows
    ]
