from sqlalchemy import BigInteger, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from core.config import Base


class StockFinancial(Base):
    __tablename__ = "stock_financials"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    stock_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    report_year: Mapped[int] = mapped_column(Integer, nullable=False)
    revenue: Mapped[float] = mapped_column(Numeric(18, 2), nullable=True)
    operating_profit: Mapped[float] = mapped_column(Numeric(18, 2), nullable=True)
