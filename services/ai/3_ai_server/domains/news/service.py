from __future__ import annotations

from datetime import date, timedelta

from sqlalchemy.orm import Session

from domains.news import crud
from domains.news.schemas import (
    DebateNewsDataResponse,
    KeywordNewsItem,
    NewsInferRequest,
    NewsInferResponse,
    SentimentIndexItem,
    TopKeywordItem,
)


def infer_news(payload: NewsInferRequest) -> NewsInferResponse:
    """뉴스 감성 분석 추론 (placeholder)."""
    _ = payload
    return NewsInferResponse(sentiment="NEUTRAL", score=0.5, model_version="news-v0")


def get_debate_news_data(
    db: Session,
    *,
    report_date: date,
    top_k: int = 3,
    news_per_keyword: int = 2,
) -> DebateNewsDataResponse:
    """
    뉴스 에이전트에게 전달할 디베이트 데이터를 조합한다.

    1) 당일+전날 키워드 중 언급 횟수 상위 top_k개 추출
    2) 각 키워드별 뉴스 원문+URL을 news_per_keyword건씩 조회
    3) 같은 날짜 범위의 종목별 감성 지수 집계
    """
    start_date = report_date - timedelta(days=1)
    end_date = report_date

    # 1. 상위 키워드 조회
    top_keywords_raw = crud.get_top_keywords_by_date_range(
        db, start_date=start_date, end_date=end_date, top_k=top_k
    )

    # 2. 각 키워드별 뉴스 조회
    top_keywords = []
    for kw in top_keywords_raw:
        news_rows = crud.get_news_by_keyword(
            db,
            keyword_id=kw["keyword_id"],
            start_date=start_date,
            end_date=end_date,
            limit=news_per_keyword,
        )
        top_keywords.append(TopKeywordItem(
            keyword=kw["name"],
            mention_count=kw["count"],
            news=[
                KeywordNewsItem(
                    news_id=n["news_id"],
                    title=n["title"],
                    snippet=n["snippet"],
                    url=n["url"],
                    published_at=n["published_at"],
                )
                for n in news_rows
            ],
        ))

    # 3. 감성 지수 조회
    sentiment_raw = crud.get_sentiment_indices_by_date_range(
        db, start_date=start_date, end_date=end_date
    )
    sentiment_indices = [
        SentimentIndexItem(
            stock_id=s["stock_id"],
            ticker=s["ticker"],
            stock_name=s["stock_name"],
            avg_sentiment_score=s["avg_score"],
            positive_count=s["positive"],
            negative_count=s["negative"],
            neutral_count=s["neutral"],
            total_news_count=s["total"],
        )
        for s in sentiment_raw
    ]

    return DebateNewsDataResponse(
        report_date=report_date.isoformat(),
        top_keywords=top_keywords,
        sentiment_indices=sentiment_indices,
    )
