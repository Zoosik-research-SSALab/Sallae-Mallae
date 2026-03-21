from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlalchemy.orm import Session


KST = ZoneInfo("Asia/Seoul")
DEFAULT_INITIAL_CAPITAL = 100_000_000


@dataclass(frozen=True)
class DebateDecision:
    debate_report_id: int
    stock_id: int
    report_date: date
    chairman_signal: str
    debate_confidence: float | None
    debate_version: str | None


@dataclass(frozen=True)
class DailyPrice:
    close_price: int


@dataclass
class Position:
    stock_id: int
    buy_datetime: datetime
    avg_buy_price: int
    quantity: int
    investment_amount: int
    current_price: int

    def market_value(self, mark_price: int | None = None) -> int:
        return self.quantity * (mark_price if mark_price is not None else self.current_price)

    def evaluation_profit(self, mark_price: int | None = None) -> int:
        return self.market_value(mark_price) - self.investment_amount

    def return_rate(self, mark_price: int | None = None) -> float:
        if self.investment_amount <= 0:
            return 0.0
        return (self.evaluation_profit(mark_price) / self.investment_amount) * 100.0


@dataclass(frozen=True)
class ReplaySummary:
    portfolio_id: int
    processed_dates: int
    inserted_trades: int
    final_holdings: int
    cumulative_return: float
    total_trades: int
    winning_trades: int


@dataclass(frozen=True)
class PortfolioState:
    initial_capital: int
    cash_balance: int
    realized_profit: int
    total_asset_value: int
    peak_asset_value: int
    total_trades: int
    winning_trades: int
    latest_record_date: date | None


@dataclass(frozen=True)
class PortfolioSnapshot:
    invested_amount: int
    market_value: int
    unrealized_profit: int
    total_asset_value: int
    holding_count: int
    cumulative_return: float
    daily_return: float
    mdd: float


class ChairmanPortfolioBuilder:
    def __init__(
        self,
        db: Session,
        *,
        portfolio_name: str = "의장 포트폴리오",
        model_version: str = "chairman-v1",
        initial_capital: int = DEFAULT_INITIAL_CAPITAL,
    ) -> None:
        self.db = db
        self.portfolio_name = portfolio_name
        self.model_version = model_version
        self.initial_capital = int(initial_capital)

    def rebuild(
        self,
        *,
        start_date: date,
        end_date: date,
        debate_version: str | None = None,
        stock_ids: tuple[int, ...] | None = None,
    ) -> ReplaySummary:
        portfolio_id = self._ensure_portfolio_row()
        self._reset_portfolio_state(portfolio_id)

        replay_dates = self.list_replay_dates(
            start_date=start_date,
            end_date=end_date,
            debate_version=debate_version,
            stock_ids=stock_ids,
        )
        if not replay_dates:
            self.db.commit()
            return ReplaySummary(
                portfolio_id=portfolio_id,
                processed_dates=0,
                inserted_trades=0,
                final_holdings=0,
                cumulative_return=0.0,
                total_trades=0,
                winning_trades=0,
            )

        summary: ReplaySummary | None = None
        inserted_trades_total = 0
        for replay_date in replay_dates:
            summary = self.append_daily(
                report_date=replay_date,
                debate_version=debate_version,
                stock_ids=stock_ids,
            )
            inserted_trades_total += summary.inserted_trades

        assert summary is not None
        return ReplaySummary(
            portfolio_id=summary.portfolio_id,
            processed_dates=len(replay_dates),
            inserted_trades=inserted_trades_total,
            final_holdings=summary.final_holdings,
            cumulative_return=summary.cumulative_return,
            total_trades=summary.total_trades,
            winning_trades=summary.winning_trades,
        )

    def append_daily(
        self,
        *,
        report_date: date,
        debate_version: str | None = None,
        stock_ids: tuple[int, ...] | None = None,
    ) -> ReplaySummary:
        portfolio_id = self._ensure_portfolio_row()
        state = self._load_portfolio_state(portfolio_id)
        if state.latest_record_date is not None and report_date <= state.latest_record_date:
            raise ValueError(
                f"daily update는 마지막 반영일({state.latest_record_date}) 이후 날짜만 지원합니다. "
                "같은 날짜 재처리나 과거 보정은 backfill 스크립트를 사용하세요."
            )

        decisions = self._load_decisions(
            start_date=report_date,
            end_date=report_date,
            debate_version=debate_version,
            stock_ids=stock_ids,
        )
        day_decisions = decisions.get(report_date, [])
        if not day_decisions:
            raise ValueError(f"{report_date}에 replay 가능한 의장 토론 결과가 없습니다.")

        positions = self._load_current_positions(portfolio_id)
        prices = self._load_prices(start_date=report_date, end_date=report_date)
        previous_total_asset = state.total_asset_value if state.latest_record_date is not None else state.initial_capital

        self.db.execute(
            text(
                """
                DELETE FROM ai_daily_performance
                WHERE portfolio_id = :portfolio_id AND record_date = :record_date
                """
            ),
            {"portfolio_id": portfolio_id, "record_date": report_date},
        )
        self.db.execute(
            text(
                """
                DELETE FROM ai_trading_history
                WHERE portfolio_id = :portfolio_id AND DATE(trade_time) = :report_date
                """
            ),
            {"portfolio_id": portfolio_id, "report_date": report_date},
        )

        cash_balance = state.cash_balance
        realized_profit = state.realized_profit
        total_trades = state.total_trades
        winning_trades = state.winning_trades
        inserted_trades = 0

        ordered_decisions = sorted(
            day_decisions,
            key=lambda item: ((item.debate_confidence or 0.0), item.stock_id),
            reverse=True,
        )

        for decision in ordered_decisions:
            if decision.chairman_signal != "SELL":
                continue

            position = positions.get(decision.stock_id)
            day_price = prices.get((decision.stock_id, report_date))
            if position is None or day_price is None:
                continue

            trade_amount = position.quantity * day_price.close_price
            realized_pnl = trade_amount - position.investment_amount
            return_rate = (realized_pnl / position.investment_amount) * 100.0 if position.investment_amount > 0 else 0.0

            cash_balance += trade_amount
            realized_profit += realized_pnl
            total_trades += 1
            inserted_trades += 1
            if realized_pnl > 0:
                winning_trades += 1

            self._insert_trade(
                portfolio_id=portfolio_id,
                stock_id=decision.stock_id,
                debate_report_id=decision.debate_report_id,
                trade_type="SELL",
                trade_weight=self._percent(trade_amount, previous_total_asset),
                trade_price=day_price.close_price,
                trade_quantity=position.quantity,
                trade_amount=trade_amount,
                realized_profit=realized_pnl,
                holding_quantity_after=0,
                cash_balance_after=cash_balance,
                avg_buy_price_after=None,
                return_rate=return_rate,
                trade_date=report_date,
            )
            positions.pop(decision.stock_id, None)

        buy_candidates = [
            decision
            for decision in ordered_decisions
            if decision.chairman_signal == "BUY"
            and decision.stock_id not in positions
            and prices.get((decision.stock_id, report_date)) is not None
        ]

        remaining_slots = len(buy_candidates)
        for decision in buy_candidates:
            day_price = prices[(decision.stock_id, report_date)]
            remaining_slots = max(remaining_slots, 1)
            allocation = cash_balance // remaining_slots
            remaining_slots -= 1
            if allocation <= 0 or day_price.close_price <= 0:
                continue

            quantity = allocation // day_price.close_price
            if quantity <= 0:
                continue

            trade_amount = quantity * day_price.close_price
            cash_balance -= trade_amount
            inserted_trades += 1

            position = Position(
                stock_id=decision.stock_id,
                buy_datetime=self._trade_timestamp(report_date),
                avg_buy_price=day_price.close_price,
                quantity=int(quantity),
                investment_amount=int(trade_amount),
                current_price=day_price.close_price,
            )
            positions[decision.stock_id] = position

            self._insert_trade(
                portfolio_id=portfolio_id,
                stock_id=decision.stock_id,
                debate_report_id=decision.debate_report_id,
                trade_type="BUY",
                trade_weight=self._percent(trade_amount, previous_total_asset),
                trade_price=day_price.close_price,
                trade_quantity=quantity,
                trade_amount=trade_amount,
                realized_profit=0,
                holding_quantity_after=quantity,
                cash_balance_after=cash_balance,
                avg_buy_price_after=day_price.close_price,
                return_rate=None,
                trade_date=report_date,
            )

        snapshot = self._build_snapshot(
            positions=positions,
            prices=prices,
            report_date=report_date,
            cash_balance=cash_balance,
            initial_capital=state.initial_capital,
            previous_total_asset=previous_total_asset,
            previous_peak_asset=state.peak_asset_value,
        )

        self._insert_daily_performance(
            portfolio_id=portfolio_id,
            record_date=report_date,
            daily_return=snapshot.daily_return,
            cumulative_return=snapshot.cumulative_return,
            mdd=snapshot.mdd,
            cash_balance=cash_balance,
            invested_amount=snapshot.invested_amount,
            market_value=snapshot.market_value,
            realized_profit=realized_profit,
            unrealized_profit=snapshot.unrealized_profit,
            total_asset_value=snapshot.total_asset_value,
            holding_count=snapshot.holding_count,
        )

        self.db.execute(
            text("DELETE FROM ai_portfolio_holdings WHERE portfolio_id = :portfolio_id"),
            {"portfolio_id": portfolio_id},
        )
        updated_at = self._trade_timestamp(report_date)
        for position in positions.values():
            mark_price = self._resolve_mark_price(position, prices, report_date)
            position.current_price = mark_price
            market_value = position.market_value(mark_price)
            self._insert_holding(
                portfolio_id=portfolio_id,
                stock_id=position.stock_id,
                portfolio_weight=self._percent(market_value, snapshot.total_asset_value),
                return_rate=position.return_rate(mark_price),
                updated_at=updated_at,
                buy_date=position.buy_datetime,
                avg_buy_price=position.avg_buy_price,
                current_price=mark_price,
                holding_quantity=position.quantity,
                investment_amount=position.investment_amount,
                market_value=market_value,
                evaluation_profit=position.evaluation_profit(mark_price),
            )

        latest_debate_version = debate_version or next(
            (item.debate_version for item in day_decisions if item.debate_version),
            None,
        )
        self._update_portfolio_row(
            portfolio_id=portfolio_id,
            cumulative_return=snapshot.cumulative_return,
            total_trades=total_trades,
            winning_trades=winning_trades,
            updated_at=updated_at,
            debate_version=latest_debate_version,
            initial_capital=state.initial_capital,
            cash_balance=cash_balance,
            realized_profit=realized_profit,
            unrealized_profit=snapshot.unrealized_profit,
            total_asset_value=snapshot.total_asset_value,
            latest_record_date=report_date,
        )
        self.db.commit()

        return ReplaySummary(
            portfolio_id=portfolio_id,
            processed_dates=1,
            inserted_trades=inserted_trades,
            final_holdings=len(positions),
            cumulative_return=snapshot.cumulative_return,
            total_trades=total_trades,
            winning_trades=winning_trades,
        )

    def ensure_portfolio_row(self) -> int:
        return self._ensure_portfolio_row()

    def reset_portfolio_state(self, portfolio_id: int) -> None:
        self._reset_portfolio_state(portfolio_id)

    def list_replay_dates(
        self,
        *,
        start_date: date,
        end_date: date,
        debate_version: str | None = None,
        stock_ids: tuple[int, ...] | None = None,
    ) -> list[date]:
        params: dict[str, object] = {"start_date": start_date, "end_date": end_date}
        version_filter = ""
        if debate_version:
            params["debate_version"] = debate_version
            version_filter = "AND debate_version = :debate_version"
        stock_filter = self._build_stock_filter(column="stock_id", stock_ids=stock_ids, params=params)

        rows = self.db.execute(
            text(
                f"""
                SELECT DISTINCT report_date
                FROM ai_debate_reports
                WHERE report_date BETWEEN :start_date AND :end_date
                  AND chairman_signal IS NOT NULL
                  {version_filter}
                  {stock_filter}
                ORDER BY report_date ASC
                """
            ),
            params,
        ).scalars().all()
        return list(rows)

    def get_last_record_date(self, portfolio_id: int) -> date | None:
        return self._load_last_record_date(portfolio_id)

    def _trade_timestamp(self, trade_date: date) -> datetime:
        return datetime.combine(trade_date, time(hour=15, minute=30), tzinfo=KST)

    def _percent(self, numerator: int | float, denominator: int | float) -> float:
        if denominator in (0, 0.0):
            return 0.0
        return float(numerator) / float(denominator) * 100.0

    def _build_stock_filter(
        self,
        *,
        column: str,
        stock_ids: tuple[int, ...] | None,
        params: dict[str, object],
    ) -> str:
        if not stock_ids:
            return ""

        placeholders: list[str] = []
        for index, stock_id in enumerate(stock_ids):
            key = f"stock_id_{index}"
            params[key] = stock_id
            placeholders.append(f":{key}")
        return f"AND {column} IN ({', '.join(placeholders)})"

    def _resolve_mark_price(
        self,
        position: Position,
        prices: dict[tuple[int, date], DailyPrice],
        report_date: date,
    ) -> int:
        day_price = prices.get((position.stock_id, report_date))
        if day_price is not None:
            return day_price.close_price
        if position.current_price > 0:
            return position.current_price
        return position.avg_buy_price

    def _build_snapshot(
        self,
        *,
        positions: dict[int, Position],
        prices: dict[tuple[int, date], DailyPrice],
        report_date: date,
        cash_balance: int,
        initial_capital: int,
        previous_total_asset: int,
        previous_peak_asset: int,
    ) -> PortfolioSnapshot:
        invested_amount = 0
        market_value = 0
        for position in positions.values():
            mark_price = self._resolve_mark_price(position, prices, report_date)
            position.current_price = mark_price
            invested_amount += position.investment_amount
            market_value += position.market_value(mark_price)

        unrealized_profit = market_value - invested_amount
        total_asset_value = cash_balance + market_value
        cumulative_return = self._percent(total_asset_value - initial_capital, initial_capital)
        daily_return = self._percent(total_asset_value - previous_total_asset, previous_total_asset)
        peak_asset_value = max(previous_peak_asset, total_asset_value)
        mdd = self._percent(total_asset_value - peak_asset_value, peak_asset_value)

        return PortfolioSnapshot(
            invested_amount=invested_amount,
            market_value=market_value,
            unrealized_profit=unrealized_profit,
            total_asset_value=total_asset_value,
            holding_count=len(positions),
            cumulative_return=cumulative_return,
            daily_return=daily_return,
            mdd=mdd,
        )

    def _ensure_portfolio_row(self) -> int:
        existing = self.db.execute(
            text(
                """
                SELECT id
                FROM ai_portfolio
                WHERE name = :name
                ORDER BY updated_at DESC, id DESC
                LIMIT 1
                """
            ),
            {"name": self.portfolio_name},
        ).scalar_one_or_none()
        if existing is not None:
            return int(existing)

        inserted = self.db.execute(
            text(
                """
                INSERT INTO ai_portfolio (
                    name, model_version, debate_version, cumulative_return, total_trades, winning_trades, updated_at,
                    initial_capital, cash_balance, realized_profit, unrealized_profit, total_asset_value, latest_record_date
                )
                VALUES (
                    :name, :model_version, NULL, 0, 0, 0, CURRENT_TIMESTAMP,
                    :initial_capital, :cash_balance, 0, 0, :total_asset_value, NULL
                )
                RETURNING id
                """
            ),
            {
                "name": self.portfolio_name,
                "model_version": self.model_version,
                "initial_capital": self.initial_capital,
                "cash_balance": self.initial_capital,
                "total_asset_value": self.initial_capital,
            },
        ).scalar_one()
        return int(inserted)

    def _reset_portfolio_state(self, portfolio_id: int) -> None:
        self.db.execute(text("DELETE FROM ai_portfolio_holdings WHERE portfolio_id = :portfolio_id"), {"portfolio_id": portfolio_id})
        self.db.execute(text("DELETE FROM ai_daily_performance WHERE portfolio_id = :portfolio_id"), {"portfolio_id": portfolio_id})
        self.db.execute(text("DELETE FROM ai_trading_history WHERE portfolio_id = :portfolio_id"), {"portfolio_id": portfolio_id})
        self._update_portfolio_row(
            portfolio_id=portfolio_id,
            cumulative_return=0.0,
            total_trades=0,
            winning_trades=0,
            updated_at=datetime.now(KST),
            debate_version=None,
            initial_capital=self.initial_capital,
            cash_balance=self.initial_capital,
            realized_profit=0,
            unrealized_profit=0,
            total_asset_value=self.initial_capital,
            latest_record_date=None,
        )

    def _load_decisions(
        self,
        *,
        start_date: date,
        end_date: date,
        debate_version: str | None,
        stock_ids: tuple[int, ...] | None = None,
    ) -> dict[date, list[DebateDecision]]:
        params: dict[str, object] = {"start_date": start_date, "end_date": end_date}
        version_filter = ""
        if debate_version:
            params["debate_version"] = debate_version
            version_filter = "AND r.debate_version = :debate_version"
        stock_filter = self._build_stock_filter(column="r.stock_id", stock_ids=stock_ids, params=params)

        rows = self.db.execute(
            text(
                f"""
                WITH ranked_reports AS (
                    SELECT r.id,
                           r.stock_id,
                           r.report_date,
                           r.chairman_signal,
                           r.debate_confidence,
                           r.debate_version,
                           ROW_NUMBER() OVER (
                               PARTITION BY r.stock_id, r.report_date
                               ORDER BY r.created_at DESC, r.id DESC
                           ) AS row_number
                    FROM ai_debate_reports r
                    WHERE r.report_date BETWEEN :start_date AND :end_date
                      AND r.chairman_signal IS NOT NULL
                      {version_filter}
                      {stock_filter}
                )
                SELECT id, stock_id, report_date, chairman_signal, debate_confidence, debate_version
                FROM ranked_reports
                WHERE row_number = 1
                ORDER BY report_date ASC, stock_id ASC
                """
            ),
            params,
        ).mappings().all()

        decisions: dict[date, list[DebateDecision]] = defaultdict(list)
        for row in rows:
            decisions[row["report_date"]].append(
                DebateDecision(
                    debate_report_id=int(row["id"]),
                    stock_id=int(row["stock_id"]),
                    report_date=row["report_date"],
                    chairman_signal=row["chairman_signal"],
                    debate_confidence=float(row["debate_confidence"]) if row["debate_confidence"] is not None else None,
                    debate_version=row["debate_version"],
                )
            )
        return decisions

    def _load_prices(self, *, start_date: date, end_date: date) -> dict[tuple[int, date], DailyPrice]:
        rows = self.db.execute(
            text(
                """
                SELECT stock_id, trade_date, close_price
                FROM stock_prices_daily
                WHERE trade_date BETWEEN :start_date AND :end_date
                """
            ),
            {"start_date": start_date, "end_date": end_date},
        ).mappings().all()

        return {
            (int(row["stock_id"]), row["trade_date"]): DailyPrice(close_price=int(row["close_price"]))
            for row in rows
        }

    def _load_current_positions(self, portfolio_id: int) -> dict[int, Position]:
        rows = self.db.execute(
            text(
                """
                SELECT stock_id,
                       buy_date,
                       avg_buy_price,
                       current_price,
                       holding_quantity,
                       investment_amount
                FROM ai_portfolio_holdings
                WHERE portfolio_id = :portfolio_id
                """
            ),
            {"portfolio_id": portfolio_id},
        ).mappings().all()

        positions: dict[int, Position] = {}
        for row in rows:
            if row["avg_buy_price"] is None or row["holding_quantity"] is None or row["investment_amount"] is None:
                continue
            buy_date = row["buy_date"] or self._trade_timestamp(date.today())
            if buy_date.tzinfo is None:
                buy_date = buy_date.replace(tzinfo=KST)
            positions[int(row["stock_id"])] = Position(
                stock_id=int(row["stock_id"]),
                buy_datetime=buy_date,
                avg_buy_price=int(row["avg_buy_price"]),
                quantity=int(row["holding_quantity"]),
                investment_amount=int(row["investment_amount"]),
                current_price=int(row["current_price"] or row["avg_buy_price"]),
            )
        return positions

    def _load_portfolio_state(self, portfolio_id: int) -> PortfolioState:
        row = self.db.execute(
            text(
                """
                SELECT initial_capital,
                       cash_balance,
                       realized_profit,
                       total_asset_value,
                       total_trades,
                       winning_trades,
                       latest_record_date
                FROM ai_portfolio
                WHERE id = :portfolio_id
                """
            ),
            {"portfolio_id": portfolio_id},
        ).mappings().one()
        peak_asset_value = self.db.execute(
            text(
                """
                SELECT MAX(total_asset_value)
                FROM ai_daily_performance
                WHERE portfolio_id = :portfolio_id
                """
            ),
            {"portfolio_id": portfolio_id},
        ).scalar_one()

        initial_capital = int(row["initial_capital"] or self.initial_capital)
        total_asset_value = int(row["total_asset_value"] or initial_capital)
        return PortfolioState(
            initial_capital=initial_capital,
            cash_balance=int(row["cash_balance"] or initial_capital),
            realized_profit=int(row["realized_profit"] or 0),
            total_asset_value=total_asset_value,
            peak_asset_value=int(peak_asset_value or total_asset_value or initial_capital),
            total_trades=int(row["total_trades"] or 0),
            winning_trades=int(row["winning_trades"] or 0),
            latest_record_date=row["latest_record_date"],
        )

    def _load_last_record_date(self, portfolio_id: int) -> date | None:
        return self.db.execute(
            text(
                """
                SELECT MAX(record_date)
                FROM ai_daily_performance
                WHERE portfolio_id = :portfolio_id
                """
            ),
            {"portfolio_id": portfolio_id},
        ).scalar_one()

    def _insert_daily_performance(
        self,
        *,
        portfolio_id: int,
        record_date: date,
        daily_return: float,
        cumulative_return: float,
        mdd: float,
        cash_balance: int,
        invested_amount: int,
        market_value: int,
        realized_profit: int,
        unrealized_profit: int,
        total_asset_value: int,
        holding_count: int,
    ) -> None:
        self.db.execute(
            text(
                """
                INSERT INTO ai_daily_performance (
                    portfolio_id, model_version, record_date, daily_return, cumulative_return, mdd,
                    cash_balance, invested_amount, market_value, realized_profit, unrealized_profit,
                    total_asset_value, holding_count
                )
                VALUES (
                    :portfolio_id, :model_version, :record_date, :daily_return, :cumulative_return, :mdd,
                    :cash_balance, :invested_amount, :market_value, :realized_profit, :unrealized_profit,
                    :total_asset_value, :holding_count
                )
                """
            ),
            {
                "portfolio_id": portfolio_id,
                "model_version": self.model_version,
                "record_date": record_date,
                "daily_return": daily_return,
                "cumulative_return": cumulative_return,
                "mdd": mdd,
                "cash_balance": cash_balance,
                "invested_amount": invested_amount,
                "market_value": market_value,
                "realized_profit": realized_profit,
                "unrealized_profit": unrealized_profit,
                "total_asset_value": total_asset_value,
                "holding_count": holding_count,
            },
        )

    def _insert_trade(
        self,
        *,
        portfolio_id: int,
        stock_id: int,
        debate_report_id: int,
        trade_type: str,
        trade_weight: float,
        trade_price: int,
        trade_quantity: int,
        trade_amount: int,
        realized_profit: int,
        holding_quantity_after: int | None,
        cash_balance_after: int,
        avg_buy_price_after: int | None,
        return_rate: float | None,
        trade_date: date,
    ) -> None:
        trade_time = self._trade_timestamp(trade_date)
        self.db.execute(
            text(
                """
                INSERT INTO ai_trading_history (
                    portfolio_id, stock_id, ml_report_id, debate_report_id, model_version, trade_type,
                    trade_weight, trade_price_rate, return_rate, trade_time, created_at,
                    trade_price, trade_quantity, trade_amount, realized_profit,
                    holding_quantity_after, cash_balance_after, avg_buy_price_after
                )
                VALUES (
                    :portfolio_id, :stock_id, NULL, :debate_report_id, :model_version, :trade_type,
                    :trade_weight, :trade_price_rate, :return_rate, :trade_time, :created_at,
                    :trade_price, :trade_quantity, :trade_amount, :realized_profit,
                    :holding_quantity_after, :cash_balance_after, :avg_buy_price_after
                )
                """
            ),
            {
                "portfolio_id": portfolio_id,
                "stock_id": stock_id,
                "debate_report_id": debate_report_id,
                "model_version": self.model_version,
                "trade_type": trade_type,
                "trade_weight": trade_weight,
                "trade_price_rate": trade_price,
                "return_rate": return_rate,
                "trade_time": trade_time,
                "created_at": trade_time,
                "trade_price": trade_price,
                "trade_quantity": trade_quantity,
                "trade_amount": trade_amount,
                "realized_profit": realized_profit,
                "holding_quantity_after": holding_quantity_after,
                "cash_balance_after": cash_balance_after,
                "avg_buy_price_after": avg_buy_price_after,
            },
        )

    def _insert_holding(
        self,
        *,
        portfolio_id: int,
        stock_id: int,
        portfolio_weight: float,
        return_rate: float,
        updated_at: datetime,
        buy_date: datetime,
        avg_buy_price: int,
        current_price: int,
        holding_quantity: int,
        investment_amount: int,
        market_value: int,
        evaluation_profit: int,
    ) -> None:
        self.db.execute(
            text(
                """
                INSERT INTO ai_portfolio_holdings (
                    portfolio_id, stock_id, model_version, portfolio_weight, return_rate, updated_at,
                    buy_date, avg_buy_price, current_price, holding_quantity, investment_amount,
                    market_value, evaluation_profit
                )
                VALUES (
                    :portfolio_id, :stock_id, :model_version, :portfolio_weight, :return_rate, :updated_at,
                    :buy_date, :avg_buy_price, :current_price, :holding_quantity, :investment_amount,
                    :market_value, :evaluation_profit
                )
                """
            ),
            {
                "portfolio_id": portfolio_id,
                "stock_id": stock_id,
                "model_version": self.model_version,
                "portfolio_weight": portfolio_weight,
                "return_rate": return_rate,
                "updated_at": updated_at,
                "buy_date": buy_date,
                "avg_buy_price": avg_buy_price,
                "current_price": current_price,
                "holding_quantity": holding_quantity,
                "investment_amount": investment_amount,
                "market_value": market_value,
                "evaluation_profit": evaluation_profit,
            },
        )

    def _update_portfolio_row(
        self,
        *,
        portfolio_id: int,
        cumulative_return: float,
        total_trades: int,
        winning_trades: int,
        updated_at: datetime,
        debate_version: str | None,
        initial_capital: int,
        cash_balance: int,
        realized_profit: int,
        unrealized_profit: int,
        total_asset_value: int,
        latest_record_date: date | None,
    ) -> None:
        self.db.execute(
            text(
                """
                UPDATE ai_portfolio
                SET model_version = :model_version,
                    debate_version = :debate_version,
                    cumulative_return = :cumulative_return,
                    total_trades = :total_trades,
                    winning_trades = :winning_trades,
                    updated_at = :updated_at,
                    initial_capital = :initial_capital,
                    cash_balance = :cash_balance,
                    realized_profit = :realized_profit,
                    unrealized_profit = :unrealized_profit,
                    total_asset_value = :total_asset_value,
                    latest_record_date = :latest_record_date
                WHERE id = :portfolio_id
                """
            ),
            {
                "portfolio_id": portfolio_id,
                "model_version": self.model_version,
                "debate_version": debate_version,
                "cumulative_return": cumulative_return,
                "total_trades": total_trades,
                "winning_trades": winning_trades,
                "updated_at": updated_at,
                "initial_capital": initial_capital,
                "cash_balance": cash_balance,
                "realized_profit": realized_profit,
                "unrealized_profit": unrealized_profit,
                "total_asset_value": total_asset_value,
                "latest_record_date": latest_record_date,
            },
        )
