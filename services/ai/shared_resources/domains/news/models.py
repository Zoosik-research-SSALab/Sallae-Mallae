from sqlalchemy import BigInteger, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from shared_resources.core.base import Base


class StockNews(Base):
    __tablename__ = "stock_news"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    snippet: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str] = mapped_column(String(512), nullable=False)
    publisher: Mapped[str] = mapped_column(String(20), nullable=False)
    published_at: Mapped[str] = mapped_column(DateTime(timezone=True), nullable=False)
