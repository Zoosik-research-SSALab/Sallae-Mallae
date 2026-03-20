from __future__ import annotations

import unittest
from datetime import date, datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from domains.debate.models import AiMlReport, AiTradingHistory, DebateStock
from domains.debate.service import get_debate_targets


class DebateTargetsServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:")
        DebateStock.__table__.create(self.engine)
        AiMlReport.__table__.create(self.engine)
        AiTradingHistory.__table__.create(self.engine)
        self.session_factory = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)

    def tearDown(self) -> None:
        self.engine.dispose()

    def test_targets_are_filtered_by_trading_history_and_portfolio(self) -> None:
        session = self.session_factory()
        try:
            session.add_all(
                [
                    DebateStock(id=1, ticker="005930", name="삼성전자", market_type="KOSPI", is_active=True),
                    DebateStock(id=2, ticker="000660", name="SK하이닉스", market_type="KOSPI", is_active=True),
                ]
            )
            session.add_all(
                [
                    AiTradingHistory(
                        id=1,
                        portfolio_id=10,
                        stock_id=1,
                        ml_report_id=None,
                        model_version="v1.0",
                        trade_type="BUY",
                        trade_time=datetime(2026, 3, 16, 9, 0, tzinfo=timezone.utc),
                        realized_profit=0,
                    ),
                    AiTradingHistory(
                        id=2,
                        portfolio_id=20,
                        stock_id=2,
                        ml_report_id=None,
                        model_version="v1.0",
                        trade_type="BUY",
                        trade_time=datetime(2026, 3, 16, 10, 0, tzinfo=timezone.utc),
                        realized_profit=0,
                    ),
                ]
            )
            session.commit()

            response = get_debate_targets(
                session,
                report_date=date(2026, 3, 16),
                market_type="KOSPI",
                source="trading_history",
                portfolio_id=10,
                limit=None,
            )

            self.assertEqual(response.count, 1)
            self.assertEqual(response.targets[0].ticker, "005930")
            self.assertEqual(response.source, "trading_history")
        finally:
            session.close()

    def test_targets_can_fallback_to_ml_reports_source(self) -> None:
        session = self.session_factory()
        try:
            session.add_all(
                [
                    DebateStock(id=1, ticker="005930", name="삼성전자", market_type="KOSPI", is_active=True),
                    DebateStock(id=2, ticker="123456", name="테스트", market_type="KOSPI", is_active=True),
                ]
            )
            session.add_all(
                [
                    AiMlReport(id=1, stock_id=1, report_date=date(2026, 3, 16), model_version="v1.0"),
                    AiMlReport(id=2, stock_id=2, report_date=date(2026, 3, 16), model_version="v1.0"),
                ]
            )
            session.commit()

            response = get_debate_targets(
                session,
                report_date=date(2026, 3, 16),
                market_type="KOSPI",
                source="ml_reports",
                portfolio_id=None,
                limit=1,
            )

            self.assertEqual(response.count, 1)
            self.assertEqual(response.source, "ml_reports")
        finally:
            session.close()


if __name__ == "__main__":
    unittest.main()
