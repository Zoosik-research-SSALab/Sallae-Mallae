from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.config import Base


class Stock(Base):
    __tablename__ = "stocks"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    ticker: Mapped[str] = mapped_column(String(6), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    market_type: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False)


class StockNews(Base):
    __tablename__ = "stock_news"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    publisher: Mapped[str | None] = mapped_column(String(20), nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class StockNewsMap(Base):
    __tablename__ = "stock_news_map"
    __table_args__ = {"extend_existing": True}

    stock_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    news_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    sentiment_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    sentiment_label: Mapped[str | None] = mapped_column(String(20), nullable=True)


class Keyword(Base):
    __tablename__ = "keywords"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    cluster_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class NewsKeywordMap(Base):
    __tablename__ = "news_keyword_map"

    news_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    keyword_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)


class KeywordEmbedding(Base):
    __tablename__ = "keyword_embeddings"

    keyword_id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    # pgvector 타입은 Text로 매핑 (읽기 전용)
    embedding: Mapped[str | None] = mapped_column(Text, nullable=True)


class NewsAgentStockData(Base):
    __tablename__ = "news_agent_stock_data"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    stock_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    report_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    top_keywords: Mapped[str] = mapped_column(Text, nullable=False)   # JSONB → Text 매핑
    sentiment: Mapped[str] = mapped_column(Text, nullable=False)      # JSONB → Text 매핑
    created_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
