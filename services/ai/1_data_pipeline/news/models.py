"""
뉴스 데이터 파이프라인 — ORM 모델 (ERD 기반)

테이블:
  - stocks             : 종목 메타 (읽기 전용 참조)
  - stock_news         : 뉴스 원본
  - stock_news_map     : 종목-뉴스 N:M 매핑 + 감성 점수
  - keywords           : 키워드 마스터
  - news_keyword_map   : 뉴스-키워드 N:M 매핑
  - keyword_embeddings : 키워드 임베딩 벡터 (384차원)
  - keyword_clusters   : 키워드 클러스터 마스터
"""
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, relationship

try:
    from pgvector.sqlalchemy import Vector
except ImportError:
    Vector = None


class Base(DeclarativeBase):
    pass


# ---------------------------------------------------------------------------
# 종목 (읽기 전용 참조 — stock 파이프라인에서 관리)
# ---------------------------------------------------------------------------
class Stock(Base):
    __tablename__ = "stocks"

    id = Column(BigInteger, primary_key=True)
    ticker = Column(String(6), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    gics_sector = Column(String(50))
    category = Column(String(50))
    outstanding_shares = Column(BigInteger)
    market_type = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)

    # 관계
    news_maps = relationship("StockNewsMap", back_populates="stock")


# ---------------------------------------------------------------------------
# 뉴스 원본
# ---------------------------------------------------------------------------
class StockNews(Base):
    __tablename__ = "stock_news"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    snippet = Column(Text)                        # FinBERT용 스니펫 (250자)
    url = Column(String(512))                     # 원문 링크
    publisher = Column(String(20))                # 언론사
    drive_file_id = Column(String(100))           # 구글 드라이브 File ID
    published_at = Column(DateTime(timezone=True)) # 기사 발행 일시
    created_at = Column(DateTime(timezone=True), default=datetime.now)

    # 관계
    stock_maps = relationship("StockNewsMap", back_populates="news")
    keyword_maps = relationship("NewsKeywordMap", back_populates="news")


# ---------------------------------------------------------------------------
# 종목-뉴스 매핑 (N:M + 감성 점수)
# ---------------------------------------------------------------------------
class StockNewsMap(Base):
    __tablename__ = "stock_news_map"

    stock_id = Column(BigInteger, ForeignKey("stocks.id"), primary_key=True)
    news_id = Column(BigInteger, ForeignKey("stock_news.id"), primary_key=True)
    sentiment_score = Column(Numeric)              # -1.0 ~ 1.0
    sentiment_label = Column(String(20))           # POSITIVE, NEGATIVE, NEUTRAL

    # 관계
    stock = relationship("Stock", back_populates="news_maps")
    news = relationship("StockNews", back_populates="stock_maps")


# ---------------------------------------------------------------------------
# 키워드 마스터
# ---------------------------------------------------------------------------
class Keyword(Base):
    __tablename__ = "keywords"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(20), unique=True, nullable=False)
    cluster_id = Column(BigInteger, ForeignKey("keyword_clusters.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), default=datetime.now)

    # 관계
    news_maps = relationship("NewsKeywordMap", back_populates="keyword")
    embedding_rel = relationship("KeywordEmbedding", back_populates="keyword", uselist=False)
    cluster = relationship("KeywordCluster", back_populates="keywords")


# ---------------------------------------------------------------------------
# 뉴스-키워드 매핑 (N:M)
# ---------------------------------------------------------------------------
class NewsKeywordMap(Base):
    __tablename__ = "news_keyword_map"

    news_id = Column(BigInteger, ForeignKey("stock_news.id"), primary_key=True)
    keyword_id = Column(BigInteger, ForeignKey("keywords.id"), primary_key=True)

    # 관계
    news = relationship("StockNews", back_populates="keyword_maps")
    keyword = relationship("Keyword", back_populates="news_maps")


# ---------------------------------------------------------------------------
# 키워드 임베딩 (384차원 벡터)
# ---------------------------------------------------------------------------
class KeywordEmbedding(Base):
    __tablename__ = "keyword_embeddings"

    keyword_id = Column(BigInteger, ForeignKey("keywords.id"), primary_key=True)
    embedding = Column(Vector(384), nullable=False) if Vector else Column(Text, nullable=False)

    # 관계
    keyword = relationship("Keyword", back_populates="embedding_rel")


# ---------------------------------------------------------------------------
# 키워드 클러스터 마스터
# ---------------------------------------------------------------------------
class KeywordCluster(Base):
    __tablename__ = "keyword_clusters"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(15), nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.now)

    # 관계
    keywords = relationship("Keyword", back_populates="cluster")
