from datetime import datetime

from pydantic import BaseModel, Field


class NewsInferRequest(BaseModel):
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)


class NewsInferResponse(BaseModel):
    sentiment: str
    score: float
    model_version: str


# --- 뉴스 에이전트용 디베이트 데이터 스키마 ---

class KeywordNewsItem(BaseModel):
    """키워드에 연결된 뉴스 (원문 + URL)"""
    news_id: int
    title: str
    snippet: str | None = None
    url: str | None = None
    published_at: datetime | None = None


class TopKeywordItem(BaseModel):
    """상위 키워드 + 관련 뉴스 2건"""
    keyword: str
    mention_count: int
    news: list[KeywordNewsItem]


class SentimentIndexItem(BaseModel):
    """종목별 감성 지수"""
    stock_id: int
    ticker: str
    stock_name: str
    avg_sentiment_score: float | None = None
    positive_count: int = 0
    negative_count: int = 0
    neutral_count: int = 0
    total_news_count: int = 0


class DebateNewsDataResponse(BaseModel):
    """뉴스 에이전트에게 전달할 디베이트 데이터"""
    report_date: str
    top_keywords: list[TopKeywordItem]
    sentiment_indices: list[SentimentIndexItem]
