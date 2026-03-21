from __future__ import annotations

import unittest
from datetime import date, datetime, timezone

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from domains.signal.chairman_portfolio_builder import ChairmanPortfolioBuilder


class ChairmanPortfolioBuilderTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine("sqlite:///:memory:")
        self.session_factory = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)
        with self.engine.begin() as conn:
            conn.execute(
                text(
                    """
                    CREATE TABLE ai_debate_reports (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        stock_id BIGINT NOT NULL,
                        report_date DATE NOT NULL,
                        debate_version VARCHAR(20),
                        chairman_signal VARCHAR(4),
                        debate_confidence REAL,
                        created_at TIMESTAMP
                    )
                    """
                )
            )
            conn.execute(
                text(
                    """
                    CREATE TABLE stock_prices_daily (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        stock_id BIGINT NOT NULL,
                        trade_date DATE NOT NULL,
                        close_price INTEGER NOT NULL
                    )
                    """
                )
            )
            conn.execute(
                text(
                    """
                    CREATE TABLE ai_portfolio (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        name VARCHAR(50) NOT NULL,
                        model_version VARCHAR(20) NOT NULL,
                        debate_version VARCHAR(20),
                        cumulative_return REAL,
                        total_trades INTEGER NOT NULL,
                        winning_trades INTEGER NOT NULL,
                        updated_at TIMESTAMP NOT NULL,
                        initial_capital BIGINT NOT NULL DEFAULT 0,
                        cash_balance BIGINT NOT NULL DEFAULT 0,
                        realized_profit BIGINT NOT NULL DEFAULT 0,
                        unrealized_profit BIGINT NOT NULL DEFAULT 0,
                        total_asset_value BIGINT NOT NULL DEFAULT 0,
                        latest_record_date DATE
                    )
                    """
                )
            )
            conn.execute(
                text(
                    """
                    CREATE TABLE ai_portfolio_holdings (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        portfolio_id BIGINT NOT NULL,
                        stock_id BIGINT NOT NULL,
                        model_version VARCHAR(20) NOT NULL,
                        portfolio_weight REAL,
                        return_rate REAL,
                        updated_at TIMESTAMP NOT NULL,
                        buy_date TIMESTAMP,
                        avg_buy_price INTEGER,
                        current_price INTEGER,
                        holding_quantity BIGINT,
                        investment_amount BIGINT,
                        market_value BIGINT,
                        evaluation_profit BIGINT
                    )
                    """
                )
            )
            conn.execute(
                text(
                    """
                    CREATE TABLE ai_daily_performance (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        portfolio_id BIGINT NOT NULL,
                        model_version VARCHAR(20) NOT NULL,
                        record_date DATE NOT NULL,
                        daily_return REAL,
                        cumulative_return REAL,
                        mdd REAL,
                        cash_balance BIGINT NOT NULL DEFAULT 0,
                        invested_amount BIGINT NOT NULL DEFAULT 0,
                        market_value BIGINT NOT NULL DEFAULT 0,
                        realized_profit BIGINT NOT NULL DEFAULT 0,
                        unrealized_profit BIGINT NOT NULL DEFAULT 0,
                        total_asset_value BIGINT NOT NULL DEFAULT 0,
                        holding_count INTEGER NOT NULL DEFAULT 0
                    )
                    """
                )
            )
            conn.execute(
                text(
                    """
                    CREATE TABLE ai_trading_history (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        portfolio_id BIGINT NOT NULL,
                        stock_id BIGINT NOT NULL,
                        ml_report_id BIGINT,
                        debate_report_id BIGINT,
                        model_version VARCHAR(20),
                        trade_type VARCHAR(4) NOT NULL,
                        trade_weight REAL,
                        trade_price_rate REAL,
                        return_rate REAL,
                        trade_time TIMESTAMP NOT NULL,
                        created_at TIMESTAMP,
                        trade_price INTEGER,
                        trade_quantity BIGINT,
                        trade_amount BIGINT,
                        realized_profit BIGINT NOT NULL DEFAULT 0,
                        holding_quantity_after BIGINT,
                        cash_balance_after BIGINT,
                        avg_buy_price_after INTEGER
                    )
                    """
                )
            )

    def tearDown(self) -> None:
        self.engine.dispose()

    def test_rebuild_populates_accounting_columns(self) -> None:
        session = self.session_factory()
        try:
            session.execute(
                text(
                    """
                    INSERT INTO ai_debate_reports
                        (id, stock_id, report_date, debate_version, chairman_signal, debate_confidence, created_at)
                    VALUES
                        (1, 1, :day1, 'debate-v1', 'BUY', 0.9, :created_at),
                        (2, 1, :day2, 'debate-v1', 'SELL', 0.8, :created_at)
                    """
                ),
                {
                    "day1": date(2026, 2, 11),
                    "day2": date(2026, 2, 12),
                    "created_at": datetime(2026, 2, 11, 15, 30, tzinfo=timezone.utc),
                },
            )
            session.execute(
                text(
                    """
                    INSERT INTO stock_prices_daily (stock_id, trade_date, close_price)
                    VALUES
                        (1, :day1, 100),
                        (1, :day2, 110)
                    """
                ),
                {"day1": date(2026, 2, 11), "day2": date(2026, 2, 12)},
            )
            session.commit()

            builder = ChairmanPortfolioBuilder(session, initial_capital=100_000_000)
            summary = builder.rebuild(start_date=date(2026, 2, 11), end_date=date(2026, 2, 12))

            self.assertEqual(summary.inserted_trades, 2)
            self.assertEqual(summary.total_trades, 1)
            self.assertEqual(summary.winning_trades, 1)
            self.assertEqual(summary.final_holdings, 0)
            self.assertAlmostEqual(summary.cumulative_return, 10.0, places=4)

            portfolio = session.execute(
                text(
                    """
                    SELECT initial_capital, cash_balance, realized_profit, unrealized_profit, total_asset_value, latest_record_date
                    FROM ai_portfolio
                    """
                )
            ).mappings().one()
            self.assertEqual(portfolio["initial_capital"], 100_000_000)
            self.assertEqual(portfolio["cash_balance"], 110_000_000)
            self.assertEqual(portfolio["realized_profit"], 10_000_000)
            self.assertEqual(portfolio["unrealized_profit"], 0)
            self.assertEqual(portfolio["total_asset_value"], 110_000_000)
            self.assertEqual(portfolio["latest_record_date"], date(2026, 2, 12))

            sell_trade = session.execute(
                text(
                    """
                    SELECT trade_quantity, trade_amount, realized_profit, return_rate, cash_balance_after
                    FROM ai_trading_history
                    WHERE trade_type = 'SELL'
                    """
                )
            ).mappings().one()
            self.assertEqual(sell_trade["trade_quantity"], 1_000_000)
            self.assertEqual(sell_trade["trade_amount"], 110_000_000)
            self.assertEqual(sell_trade["realized_profit"], 10_000_000)
            self.assertAlmostEqual(float(sell_trade["return_rate"]), 10.0, places=4)
            self.assertEqual(sell_trade["cash_balance_after"], 110_000_000)

            daily_rows = session.execute(
                text(
                    """
                    SELECT record_date, daily_return, cumulative_return, total_asset_value
                    FROM ai_daily_performance
                    ORDER BY record_date
                    """
                )
            ).mappings().all()
            self.assertEqual(len(daily_rows), 2)
            self.assertAlmostEqual(float(daily_rows[0]["daily_return"]), 0.0, places=4)
            self.assertAlmostEqual(float(daily_rows[1]["daily_return"]), 10.0, places=4)
            self.assertAlmostEqual(float(daily_rows[1]["cumulative_return"]), 10.0, places=4)
            self.assertEqual(daily_rows[1]["total_asset_value"], 110_000_000)
        finally:
            session.close()

    def test_append_daily_keeps_state_incrementally(self) -> None:
        session = self.session_factory()
        try:
            session.execute(
                text(
                    """
                    INSERT INTO ai_debate_reports
                        (id, stock_id, report_date, debate_version, chairman_signal, debate_confidence, created_at)
                    VALUES
                        (1, 1, :day1, 'debate-v1', 'BUY', 0.9, :created_at),
                        (2, 1, :day2, 'debate-v1', 'SELL', 0.8, :created_at)
                    """
                ),
                {
                    "day1": date(2026, 2, 11),
                    "day2": date(2026, 2, 12),
                    "created_at": datetime(2026, 2, 11, 15, 30, tzinfo=timezone.utc),
                },
            )
            session.execute(
                text(
                    """
                    INSERT INTO stock_prices_daily (stock_id, trade_date, close_price)
                    VALUES
                        (1, :day1, 100),
                        (1, :day2, 90)
                    """
                ),
                {"day1": date(2026, 2, 11), "day2": date(2026, 2, 12)},
            )
            session.commit()

            builder = ChairmanPortfolioBuilder(session, initial_capital=100_000_000)
            day1 = builder.append_daily(report_date=date(2026, 2, 11))
            self.assertEqual(day1.final_holdings, 1)
            self.assertEqual(day1.inserted_trades, 1)
            self.assertAlmostEqual(day1.cumulative_return, 0.0, places=4)

            day2 = builder.append_daily(report_date=date(2026, 2, 12))
            self.assertEqual(day2.final_holdings, 0)
            self.assertEqual(day2.inserted_trades, 1)
            self.assertEqual(day2.total_trades, 1)
            self.assertEqual(day2.winning_trades, 0)
            self.assertAlmostEqual(day2.cumulative_return, -10.0, places=4)

            portfolio = session.execute(
                text(
                    """
                    SELECT cash_balance, realized_profit, total_asset_value, latest_record_date
                    FROM ai_portfolio
                    """
                )
            ).mappings().one()
            self.assertEqual(portfolio["cash_balance"], 90_000_000)
            self.assertEqual(portfolio["realized_profit"], -10_000_000)
            self.assertEqual(portfolio["total_asset_value"], 90_000_000)
            self.assertEqual(portfolio["latest_record_date"], date(2026, 2, 12))
        finally:
            session.close()


if __name__ == "__main__":
    unittest.main()
