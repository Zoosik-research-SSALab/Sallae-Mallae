from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from core.config import Base

# StockNews, StockNewsMap은 debate 도메인에서 이미 정의되어 있으므로 재사용
from domains.debate.models import StockNews, StockNewsMap  # noqa: F401


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
