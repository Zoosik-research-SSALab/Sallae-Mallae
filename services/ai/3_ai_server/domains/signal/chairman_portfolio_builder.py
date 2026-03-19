from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import date, datetime, time
from zoneinfo import ZoneInfo

from sqlalchemy import text
from sqlalchemy.orm import Session


KST = ZoneInfo("Asia/Seoul")


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
    fluctuation_rate: float | None


@dataclass
class Position:
    stock_id: int
    buy_date: date
    buy_price: int
    debate_report_id: int

    def return_rate(self, current_price: int) -> float:
        if self.buy_price == 0:
            return 0.0
        return ((current_price / self.buy_price) - 1.0) * 100.0


@dataclass(frozen=True)
class ReplaySummary:
    portfolio_id: int
    processed_dates: int
    inserted_trades: int
    final_holdings: int
    cumulative_return: float
    total_trades: int
    winning_trades: int


class ChairmanPortfolioBuilder:
    def __init__(
        self,
        db: Session,
        *,
        portfolio_name: str = "의장 포트폴리오",
        model_version: str = "chairman-v1",
    ) -> None:
        self.db = db
        self.portfolio_name = portfolio_name
        self.model_version = model_version

    def rebuild(self, *, start_date: date, end_date: date, debate_version: str | None = None) -> ReplaySummary:
        portfolio_id = self._ensure_portfolio_row()
        self._reset_portfolio_state(portfolio_id)

        decisions = self._load_decisions(start_date=start_date, end_date=end_date, debate_version=debate_version)
        decision_dates = sorted(decisions.keys())

        latest_debate_version = debate_version
        if latest_debate_version is None:
            for rows in decisions.values():
                for row in rows:
                    if row.debate_version:
                        latest_debate_version = row.debate_version

        if not decision_dates:
            self._update_portfolio_row(
                portfolio_id=portfolio_id,
                cumulative_return=0.0,
                total_trades=0,
                winning_trades=0,
                updated_at=datetime.now(KST),
                debate_version=latest_debate_version,
            )
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

        prices = self._load_prices(start_date=min(decision_dates), end_date=max(decision_dates))
        positions: dict[int, Position] = {}
        cumulative_factor = 1.0
        peak_factor = 1.0
        inserted_trades = 0
        total_trades = 0
        winning_trades = 0

        for current_date in decision_dates:
            daily_return = self._calculate_daily_return(positions, prices, current_date)
            cumulative_factor *= (1 + daily_return / 100.0)
            peak_factor = max(peak_factor, cumulative_factor)
            mdd = ((cumulative_factor / peak_factor) - 1.0) * 100.0

            self._insert_daily_performance(
                portfolio_id=portfolio_id,
                record_date=current_date,
                daily_return=daily_return,
                cumulative_return=(cumulative_factor - 1.0) * 100.0,
                mdd=mdd,
            )

            day_decisions = sorted(
                decisions[current_date],
                key=lambda item: ((item.debate_confidence or 0.0), item.stock_id),
                reverse=True,
            )
            for decision in day_decisions:
                day_price = prices.get((decision.stock_id, current_date))
                if day_price is None:
                    continue

                if decision.chairman_signal == "SELL":
                    existing = positions.get(decision.stock_id)
                    if existing is None:
                        continue
                    return_rate = existing.return_rate(day_price.close_price)
                    inserted_trades += 1
                    total_trades += 1
                    if return_rate > 0:
                        winning_trades += 1
                    self._insert_trade(
                        portfolio_id=portfolio_id,
                        stock_id=decision.stock_id,
                        debate_report_id=decision.debate_report_id,
                        trade_type="SELL",
                        trade_weight=(100.0 / max(len(positions), 1)),
                        trade_price=day_price.close_price,
                        return_rate=return_rate,
                        trade_date=current_date,
                    )
                    positions.pop(decision.stock_id, None)
                    continue

                if decision.chairman_signal == "BUY" and decision.stock_id not in positions:
                    positions[decision.stock_id] = Position(
                        stock_id=decision.stock_id,
                        buy_date=current_date,
                        buy_price=day_price.close_price,
                        debate_report_id=decision.debate_report_id,
                    )
                    inserted_trades += 1
                    self._insert_trade(
                        portfolio_id=portfolio_id,
                        stock_id=decision.stock_id,
                        debate_report_id=decision.debate_report_id,
                        trade_type="BUY",
                        trade_weight=(100.0 / max(len(positions), 1)),
                        trade_price=day_price.close_price,
                        return_rate=None,
                        trade_date=current_date,
                    )

        final_date = decision_dates[-1]
        for stock_id, position in positions.items():
            day_price = prices.get((stock_id, final_date))
            if day_price is None:
                continue
            self._insert_holding(
                portfolio_id=portfolio_id,
                stock_id=stock_id,
                portfolio_weight=(100.0 / max(len(positions), 1)),
                return_rate=position.return_rate(day_price.close_price),
                updated_at=datetime.combine(final_date, time(hour=15, minute=30), tzinfo=KST),
            )

        self._update_portfolio_row(
            portfolio_id=portfolio_id,
            cumulative_return=(cumulative_factor - 1.0) * 100.0,
            total_trades=total_trades,
            winning_trades=winning_trades,
            updated_at=datetime.combine(final_date, time(hour=15, minute=30), tzinfo=KST),
            debate_version=latest_debate_version,
        )
        self.db.commit()

        return ReplaySummary(
            portfolio_id=portfolio_id,
            processed_dates=len(decision_dates),
            inserted_trades=inserted_trades,
            final_holdings=len(positions),
            cumulative_return=(cumulative_factor - 1.0) * 100.0,
            total_trades=total_trades,
            winning_trades=winning_trades,
        )

    def append_daily(self, *, report_date: date, debate_version: str | None = None) -> ReplaySummary:
        portfolio_id = self._ensure_portfolio_row()
        last_record_date = self._load_last_record_date(portfolio_id)
        if last_record_date is not None and report_date <= last_record_date:
            raise ValueError(
                f"daily update는 마지막 반영일({last_record_date}) 이후 날짜만 지원합니다. "
                "같은 날짜 재처리나 과거 보정은 backfill 스크립트를 사용하세요."
            )

        decisions = self._load_decisions(
            start_date=report_date,
            end_date=report_date,
            debate_version=debate_version,
        )
        day_decisions = decisions.get(report_date, [])
        if not day_decisions:
            raise ValueError(f"{report_date}에 replay 가능한 의장 토론 결과가 없습니다.")

        positions = self._load_current_positions(portfolio_id)
        cumulative_factor, peak_factor, total_trades, winning_trades = self._load_portfolio_counters(portfolio_id)
        prices = self._load_prices(start_date=report_date, end_date=report_date)

        daily_return = self._calculate_daily_return(positions, prices, report_date)
        cumulative_factor *= (1 + daily_return / 100.0)
        peak_factor = max(peak_factor, cumulative_factor)
        mdd = ((cumulative_factor / peak_factor) - 1.0) * 100.0

        self.db.execute(
            text(
                """
                DELETE FROM ai_daily_performance
                WHERE portfolio_id = :portfolio_id AND record_date = :record_date
                """
            ),
            {"portfolio_id": portfolio_id, "record_date": report_date},
        )
        self._insert_daily_performance(
            portfolio_id=portfolio_id,
            record_date=report_date,
            daily_return=daily_return,
            cumulative_return=(cumulative_factor - 1.0) * 100.0,
            mdd=mdd,
        )

        trade_time = datetime.combine(report_date, time(hour=15, minute=30), tzinfo=KST)
        self.db.execute(
            text(
                """
                DELETE FROM ai_trading_history
                WHERE portfolio_id = :portfolio_id AND DATE(trade_time) = :report_date
                """
            ),
            {"portfolio_id": portfolio_id, "report_date": report_date},
        )

        inserted_trades = 0
        for decision in sorted(
            day_decisions,
            key=lambda item: ((item.debate_confidence or 0.0), item.stock_id),
            reverse=True,
        ):
            day_price = prices.get((decision.stock_id, report_date))
            if day_price is None:
                continue

            if decision.chairman_signal == "SELL":
                existing = positions.get(decision.stock_id)
                if existing is None:
                    continue
                return_rate = existing.return_rate(day_price.close_price)
                inserted_trades += 1
                total_trades += 1
                if return_rate > 0:
                    winning_trades += 1
                self._insert_trade(
                    portfolio_id=portfolio_id,
                    stock_id=decision.stock_id,
                    debate_report_id=decision.debate_report_id,
                    trade_type="SELL",
                    trade_weight=(100.0 / max(len(positions), 1)),
                    trade_price=day_price.close_price,
                    return_rate=return_rate,
                    trade_date=report_date,
                )
                positions.pop(decision.stock_id, None)
                continue

            if decision.chairman_signal == "BUY" and decision.stock_id not in positions:
                positions[decision.stock_id] = Position(
                    stock_id=decision.stock_id,
                    buy_date=report_date,
                    buy_price=day_price.close_price,
                    debate_report_id=decision.debate_report_id,
                )
                inserted_trades += 1
                self._insert_trade(
                    portfolio_id=portfolio_id,
                    stock_id=decision.stock_id,
                    debate_report_id=decision.debate_report_id,
                    trade_type="BUY",
                    trade_weight=(100.0 / max(len(positions), 1)),
                    trade_price=day_price.close_price,
                    return_rate=None,
                    trade_date=report_date,
                )

        self.db.execute(
            text("DELETE FROM ai_portfolio_holdings WHERE portfolio_id = :portfolio_id"),
            {"portfolio_id": portfolio_id},
        )
        updated_at = datetime.combine(report_date, time(hour=15, minute=30), tzinfo=KST)
        for stock_id, position in positions.items():
            day_price = prices.get((stock_id, report_date))
            if day_price is None:
                continue
            self._insert_holding(
                portfolio_id=portfolio_id,
                stock_id=stock_id,
                portfolio_weight=(100.0 / max(len(positions), 1)),
                return_rate=position.return_rate(day_price.close_price),
                updated_at=updated_at,
            )

        latest_debate_version = debate_version or next(
            (item.debate_version for item in day_decisions if item.debate_version),
            None,
        )
        self._update_portfolio_row(
            portfolio_id=portfolio_id,
            cumulative_return=(cumulative_factor - 1.0) * 100.0,
            total_trades=total_trades,
            winning_trades=winning_trades,
            updated_at=updated_at,
            debate_version=latest_debate_version,
        )
        self.db.commit()

        return ReplaySummary(
            portfolio_id=portfolio_id,
            processed_dates=1,
            inserted_trades=inserted_trades,
            final_holdings=len(positions),
            cumulative_return=(cumulative_factor - 1.0) * 100.0,
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
    ) -> list[date]:
        params: dict[str, object] = {"start_date": start_date, "end_date": end_date}
        version_filter = ""
        if debate_version:
            params["debate_version"] = debate_version
            version_filter = "AND debate_version = :debate_version"

        rows = self.db.execute(
            text(
                f"""
                SELECT DISTINCT report_date
                FROM ai_debate_reports
                WHERE report_date BETWEEN :start_date AND :end_date
                  AND chairman_signal IS NOT NULL
                  {version_filter}
                ORDER BY report_date ASC
                """
            ),
            params,
        ).scalars().all()
        return list(rows)

    def get_last_record_date(self, portfolio_id: int) -> date | None:
        return self._load_last_record_date(portfolio_id)

    def _ensure_portfolio_row(self) -> int:
        existing_id = self.db.execute(
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
        if existing_id is not None:
            return int(existing_id)

        inserted_id = self.db.execute(
            text(
                """
                INSERT INTO ai_portfolio (name, model_version, debate_version, cumulative_return, total_trades, winning_trades, updated_at)
                VALUES (:name, :model_version, NULL, 0, 0, 0, NOW())
                RETURNING id
                """
            ),
            {"name": self.portfolio_name, "model_version": self.model_version},
        ).scalar_one()
        return int(inserted_id)

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
        )

    def _load_decisions(
        self,
        *,
        start_date: date,
        end_date: date,
        debate_version: str | None,
    ) -> dict[date, list[DebateDecision]]:
        params: dict[str, object] = {"start_date": start_date, "end_date": end_date}
        version_filter = ""
        if debate_version:
            params["debate_version"] = debate_version
            version_filter = "AND r.debate_version = :debate_version"

        rows = self.db.execute(
            text(
                f"""
                WITH ranked_reports AS (
                    SELECT DISTINCT ON (r.stock_id, r.report_date)
                           r.id,
                           r.stock_id,
                           r.report_date,
                           r.chairman_signal,
                           r.debate_confidence,
                           r.debate_version
                    FROM ai_debate_reports r
                    WHERE r.report_date BETWEEN :start_date AND :end_date
                      AND r.chairman_signal IS NOT NULL
                      {version_filter}
                    ORDER BY r.stock_id, r.report_date, r.created_at DESC, r.id DESC
                )
                SELECT id, stock_id, report_date, chairman_signal, debate_confidence, debate_version
                FROM ranked_reports
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
                SELECT stock_id, trade_date, close_price, fluctuation_rate
                FROM stock_prices_daily
                WHERE trade_date BETWEEN :start_date AND :end_date
                """
            ),
            {"start_date": start_date, "end_date": end_date},
        ).mappings().all()

        return {
            (int(row["stock_id"]), row["trade_date"]): DailyPrice(
                close_price=int(row["close_price"]),
                fluctuation_rate=float(row["fluctuation_rate"]) if row["fluctuation_rate"] is not None else None,
            )
            for row in rows
        }

    def _calculate_daily_return(
        self,
        positions: dict[int, Position],
        prices: dict[tuple[int, date], DailyPrice],
        current_date: date,
    ) -> float:
        if not positions:
            return 0.0

        day_returns = []
        for stock_id in positions:
            day_price = prices.get((stock_id, current_date))
            if day_price is None or day_price.fluctuation_rate is None:
                continue
            day_returns.append(day_price.fluctuation_rate)

        if not day_returns:
            return 0.0
        return sum(day_returns) / len(day_returns)

    def _load_current_positions(self, portfolio_id: int) -> dict[int, Position]:
        rows = self.db.execute(
            text(
                """
                SELECT h.stock_id,
                       buy_entry.trade_time,
                       buy_entry.trade_price_rate,
                       buy_entry.debate_report_id
                FROM ai_portfolio_holdings h
                LEFT JOIN LATERAL (
                    SELECT trade_time, trade_price_rate, debate_report_id
                    FROM ai_trading_history
                    WHERE portfolio_id = :portfolio_id
                      AND stock_id = h.stock_id
                      AND trade_type = 'BUY'
                    ORDER BY trade_time DESC, id DESC
                    LIMIT 1
                ) buy_entry ON true
                WHERE h.portfolio_id = :portfolio_id
                """
            ),
            {"portfolio_id": portfolio_id},
        ).mappings().all()

        positions: dict[int, Position] = {}
        for row in rows:
            if row["trade_time"] is None or row["trade_price_rate"] is None:
                continue
            positions[int(row["stock_id"])] = Position(
                stock_id=int(row["stock_id"]),
                buy_date=row["trade_time"].date(),
                buy_price=int(row["trade_price_rate"]),
                debate_report_id=int(row["debate_report_id"]) if row["debate_report_id"] is not None else 0,
            )
        return positions

    def _load_portfolio_counters(self, portfolio_id: int) -> tuple[float, float, int, int]:
        portfolio_row = self.db.execute(
            text(
                """
                SELECT cumulative_return, total_trades, winning_trades
                FROM ai_portfolio
                WHERE id = :portfolio_id
                """
            ),
            {"portfolio_id": portfolio_id},
        ).mappings().one()
        max_cumulative = self.db.execute(
            text(
                """
                SELECT MAX(cumulative_return)
                FROM ai_daily_performance
                WHERE portfolio_id = :portfolio_id
                """
            ),
            {"portfolio_id": portfolio_id},
        ).scalar_one()

        cumulative_return = float(portfolio_row["cumulative_return"] or 0.0)
        max_cumulative_return = float(max_cumulative or 0.0)
        cumulative_factor = 1.0 + (cumulative_return / 100.0)
        peak_factor = max(1.0, 1.0 + (max_cumulative_return / 100.0))
        total_trades = int(portfolio_row["total_trades"] or 0)
        winning_trades = int(portfolio_row["winning_trades"] or 0)
        return cumulative_factor, peak_factor, total_trades, winning_trades

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
    ) -> None:
        self.db.execute(
            text(
                """
                INSERT INTO ai_daily_performance (portfolio_id, model_version, record_date, daily_return, cumulative_return, mdd)
                VALUES (:portfolio_id, :model_version, :record_date, :daily_return, :cumulative_return, :mdd)
                """
            ),
            {
                "portfolio_id": portfolio_id,
                "model_version": self.model_version,
                "record_date": record_date,
                "daily_return": daily_return,
                "cumulative_return": cumulative_return,
                "mdd": mdd,
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
        return_rate: float | None,
        trade_date: date,
    ) -> None:
        trade_time = datetime.combine(trade_date, time(hour=15, minute=30), tzinfo=KST)
        self.db.execute(
            text(
                """
                INSERT INTO ai_trading_history
                    (portfolio_id, stock_id, ml_report_id, debate_report_id, model_version, trade_type,
                     trade_weight, trade_price_rate, return_rate, trade_time, created_at)
                VALUES
                    (:portfolio_id, :stock_id, NULL, :debate_report_id, :model_version, :trade_type,
                     :trade_weight, :trade_price_rate, :return_rate, :trade_time, :created_at)
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
    ) -> None:
        self.db.execute(
            text(
                """
                INSERT INTO ai_portfolio_holdings (portfolio_id, stock_id, model_version, portfolio_weight, return_rate, updated_at)
                VALUES (:portfolio_id, :stock_id, :model_version, :portfolio_weight, :return_rate, :updated_at)
                """
            ),
            {
                "portfolio_id": portfolio_id,
                "stock_id": stock_id,
                "model_version": self.model_version,
                "portfolio_weight": portfolio_weight,
                "return_rate": return_rate,
                "updated_at": updated_at,
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
                    updated_at = :updated_at
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
            },
        )
