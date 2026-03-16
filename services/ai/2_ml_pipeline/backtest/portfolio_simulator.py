"""
backtest/portfolio_simulator.py
LSTM 기반 포트폴리오 백테스트 시뮬레이터.

매수: LSTM 상승 확률 기반 (Top-N / 임계값)
매도: 복합 전략 (손절 → 모델신호 → 익절 → 타임아웃)
수수료: 토스증권 기준 (매수 0.015%, 매도 0.215%)

사용법:
    python backtest/portfolio_simulator.py
"""

from __future__ import annotations

import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import PROCESSED_LSTM_PATH, RAW_OHLCV_PATH, RAW_MACRO_PATH
from models.lstm_trainer import SectorLSTMTrainer, CLUSTER_HPARAMS, _DEFAULT_HPARAMS
from utils.logger import setup_logger

logger = setup_logger(__name__)


# ---------------------------------------------------------------------------
# 전략 설정
# ---------------------------------------------------------------------------

@dataclass
class StrategyConfig:
    """백테스트 전략 설정."""
    initial_capital: float = 100_000_000       # 1억원
    buy_commission: float = 0.00015            # 매수 수수료 0.015%
    sell_commission: float = 0.00215           # 매도 수수료 0.215% (수수료+세금)

    # 매수 전략
    selection_mode: str = "top_n"              # "top_n" 또는 "threshold"
    top_n: int = 10                            # Top-N 종목 수
    buy_threshold: float = 0.55               # 임계값 모드 시 매수 기준
    max_positions: int = 20                    # 최대 동시 보유 종목 수

    # 매도 전략 (복합: 우선순위 ① > ② > ③ > ④)
    stop_loss: float = -0.03                   # ① 손절 -3%
    model_exit_threshold: float = 0.45         # ② 모델 확률 < 0.45 시 매도
    take_profit: float = 0.07                  # ③ 익절 +7%
    max_hold_days: int = 5                     # ④ 타임아웃 5일

    # 학습 설정
    train_end_date: str = "2024-12-31"
    backtest_start: str = "2025-01-01"
    backtest_end: str = "2026-01-31"


# ---------------------------------------------------------------------------
# 포지션
# ---------------------------------------------------------------------------

@dataclass
class Position:
    """보유 포지션."""
    ticker: str
    buy_date: str
    buy_price: float
    shares: int
    buy_prob: float
    invested: float            # 매수 금액 (수수료 포함)
    hold_days: int = 0


# ---------------------------------------------------------------------------
# 시뮬레이터
# ---------------------------------------------------------------------------

class PortfolioSimulator:
    """LSTM 기반 포트폴리오 백테스트 시뮬레이터."""

    def __init__(self, config: StrategyConfig | None = None):
        self.config = config or StrategyConfig()
        self.cash: float = self.config.initial_capital
        self.positions: list[Position] = []
        self.trade_log: list[dict] = []
        self.daily_snapshots: list[dict] = []
        self.predictions: dict[str, dict[str, float]] = {}  # {date: {ticker: prob}}
        self.close_prices: dict[str, pd.Series] = {}        # {ticker: Series(date→close)}

    # ------------------------------------------------------------------
    # 데이터 로드 및 모델 학습
    # ------------------------------------------------------------------

    def _load_sequences(self) -> dict[str, dict]:
        """all/ NPZ에서 시퀀스 데이터 로드."""
        all_dir = PROCESSED_LSTM_PATH / "all"
        data = {}
        for npz_path in sorted(all_dir.glob("sector_*.npz")):
            sector_id = npz_path.stem.replace("sector_", "")
            npz = np.load(str(npz_path), allow_pickle=True)
            data[sector_id] = {
                "X": npz["X"].astype(np.float32),
                "y": npz["y"].astype(np.float32),
                "tickers": npz["tickers"],
                "dates": npz["dates"],
            }
            logger.info("[BT] %s: %d samples loaded", sector_id, len(npz["X"]))
        return data

    def _train_and_predict(self, seq_data: dict[str, dict]) -> None:
        """모델 학습 후 백테스트 기간 예측을 predictions에 저장."""
        import torch

        train_end_ts = pd.Timestamp(self.config.train_end_date)
        bt_start_ts = pd.Timestamp(self.config.backtest_start)
        bt_end_ts = pd.Timestamp(self.config.backtest_end)

        for sector_id, d in seq_data.items():
            dates_ts = pd.to_datetime(d["dates"])

            train_mask = dates_ts <= train_end_ts
            test_mask = (dates_ts >= bt_start_ts) & (dates_ts <= bt_end_ts)

            X_train = d["X"][train_mask]
            y_train = d["y"][train_mask]
            X_test = d["X"][test_mask]
            test_tickers = d["tickers"][test_mask]
            test_dates = d["dates"][test_mask]

            if len(X_train) < 100 or len(X_test) == 0:
                logger.warning("[BT] %s: 데이터 부족 (train=%d, test=%d)", sector_id, len(X_train), len(X_test))
                continue

            X_train = np.nan_to_num(X_train, nan=0.0)
            X_test = np.nan_to_num(X_test, nan=0.0)

            # 클러스터별 하이퍼파라미터로 학습
            hp = CLUSTER_HPARAMS.get(sector_id, _DEFAULT_HPARAMS)
            trainer = SectorLSTMTrainer(
                sector_id=sector_id,
                hidden_size=hp["hidden_size"],
                num_layers=hp["num_layers"],
                dropout=hp["dropout"],
                use_attention=hp["use_attention"],
            )
            trainer.train(
                X_train, y_train,
                epochs=hp["epochs"],
                batch_size=hp["batch_size"],
                patience=hp["patience"],
                lr=hp["lr"],
            )

            # 예측
            probs, _ = trainer.predict(X_test)

            # predictions dict에 저장
            for i in range(len(X_test)):
                date_str = str(test_dates[i])
                ticker = str(test_tickers[i])
                if date_str not in self.predictions:
                    self.predictions[date_str] = {}
                self.predictions[date_str][ticker] = float(probs[i])

            logger.info("[BT] %s: %d predictions generated", sector_id, len(X_test))

            # GPU 메모리 해제
            del trainer
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

        logger.info("[BT] 총 예측일 수: %d, 총 예측 수: %d",
                    len(self.predictions),
                    sum(len(v) for v in self.predictions.values()))

    def _load_close_prices(self) -> None:
        """종목별 종가 데이터 로드."""
        tickers_needed = set()
        for date_preds in self.predictions.values():
            tickers_needed.update(date_preds.keys())

        for ticker in tickers_needed:
            path = RAW_OHLCV_PATH / f"{ticker}.parquet"
            if not path.exists():
                continue
            try:
                df = pd.read_parquet(path)
                df.index = pd.to_datetime(df.index)
                self.close_prices[ticker] = df["close"].sort_index()
            except Exception:
                pass

        logger.info("[BT] 종가 데이터 로드: %d 종목", len(self.close_prices))

    def _load_benchmark(self) -> pd.Series:
        """KOSPI200 지수 종가 로드."""
        path = RAW_MACRO_PATH / "kospi200.parquet"
        if not path.exists():
            logger.warning("[BT] KOSPI200 벤치마크 파일 없음")
            return pd.Series(dtype=float)
        df = pd.read_parquet(path)
        df.index = pd.to_datetime(df.index)
        close_col = "close" if "close" in df.columns else df.columns[0]
        return df[close_col].sort_index()

    # ------------------------------------------------------------------
    # 가격 조회
    # ------------------------------------------------------------------

    def _get_close(self, ticker: str, date: str) -> float | None:
        """특정 날짜의 종가 조회."""
        if ticker not in self.close_prices:
            return None
        series = self.close_prices[ticker]
        ts = pd.Timestamp(date)
        if ts in series.index:
            return float(series.loc[ts])
        # 해당 날짜가 없으면 직전 거래일
        mask = series.index <= ts
        if mask.any():
            return float(series.loc[mask].iloc[-1])
        return None

    # ------------------------------------------------------------------
    # 매수 로직
    # ------------------------------------------------------------------

    def _select_buys(self, date: str) -> list[tuple[str, float]]:
        """매수 종목 선정. (ticker, prob) 리스트 반환."""
        if date not in self.predictions:
            return []

        preds = self.predictions[date]
        # 이미 보유 중인 종목 제외
        held_tickers = {p.ticker for p in self.positions}
        candidates = [(t, p) for t, p in preds.items() if t not in held_tickers and p > 0.5]

        if not candidates:
            return []

        # 확률 높은 순 정렬
        candidates.sort(key=lambda x: -x[1])

        if self.config.selection_mode == "top_n":
            return candidates[:self.config.top_n]
        elif self.config.selection_mode == "threshold":
            return [(t, p) for t, p in candidates if p >= self.config.buy_threshold][:self.config.max_positions]
        return candidates[:self.config.top_n]

    def _execute_buy(self, ticker: str, date: str, prob: float) -> bool:
        """매수 실행."""
        if len(self.positions) >= self.config.max_positions:
            return False

        price = self._get_close(ticker, date)
        if price is None or price <= 0:
            return False

        # 균등 배분: 남은 슬롯 수로 나눔
        available_slots = self.config.max_positions - len(self.positions)
        allocation = self.cash / max(available_slots, 1)
        allocation = min(allocation, self.cash)

        if allocation < price:  # 1주도 못 살 정도면 스킵
            return False

        shares = int(allocation / (price * (1 + self.config.buy_commission)))
        if shares <= 0:
            return False

        cost = shares * price
        commission = cost * self.config.buy_commission
        total_cost = cost + commission

        if total_cost > self.cash:
            shares = int(self.cash / (price * (1 + self.config.buy_commission)))
            if shares <= 0:
                return False
            cost = shares * price
            commission = cost * self.config.buy_commission
            total_cost = cost + commission

        self.cash -= total_cost
        self.positions.append(Position(
            ticker=ticker,
            buy_date=date,
            buy_price=price,
            shares=shares,
            buy_prob=prob,
            invested=total_cost,
        ))

        self.trade_log.append({
            "date": date,
            "ticker": ticker,
            "action": "BUY",
            "price": price,
            "shares": shares,
            "amount": total_cost,
            "commission": commission,
            "prob": prob,
            "reason": f"signal ({prob:.3f})",
        })
        return True

    # ------------------------------------------------------------------
    # 매도 로직 (복합 전략)
    # ------------------------------------------------------------------

    def _check_sells(self, date: str) -> list[tuple[Position, str]]:
        """매도 대상 확인. (position, reason) 리스트 반환."""
        sells = []
        date_preds = self.predictions.get(date, {})

        for pos in self.positions:
            price = self._get_close(pos.ticker, date)
            if price is None:
                continue

            ret = (price - pos.buy_price) / pos.buy_price

            # ① 손절
            if ret <= self.config.stop_loss:
                sells.append((pos, f"stop_loss ({ret*100:.1f}%)"))
                continue

            # ② 모델 신호 소멸
            current_prob = date_preds.get(pos.ticker)
            if current_prob is not None and current_prob < self.config.model_exit_threshold:
                sells.append((pos, f"model_exit (prob={current_prob:.3f})"))
                continue

            # ③ 익절
            if ret >= self.config.take_profit:
                sells.append((pos, f"take_profit ({ret*100:.1f}%)"))
                continue

            # ④ 타임아웃
            if pos.hold_days >= self.config.max_hold_days:
                sells.append((pos, f"timeout ({pos.hold_days}d, ret={ret*100:.1f}%)"))
                continue

        return sells

    def _execute_sell(self, pos: Position, date: str, reason: str) -> None:
        """매도 실행."""
        price = self._get_close(pos.ticker, date)
        if price is None:
            return

        revenue = pos.shares * price
        commission = revenue * self.config.sell_commission
        net_revenue = revenue - commission
        pnl = net_revenue - pos.invested
        ret = pnl / pos.invested

        self.cash += net_revenue
        self.positions.remove(pos)

        self.trade_log.append({
            "date": date,
            "ticker": pos.ticker,
            "action": "SELL",
            "price": price,
            "shares": pos.shares,
            "amount": net_revenue,
            "commission": commission,
            "pnl": pnl,
            "return": ret,
            "hold_days": pos.hold_days,
            "reason": reason,
            "buy_date": pos.buy_date,
            "buy_price": pos.buy_price,
        })

    # ------------------------------------------------------------------
    # 일별 스냅샷
    # ------------------------------------------------------------------

    def _take_snapshot(self, date: str) -> None:
        """일별 포트폴리오 스냅샷 기록."""
        portfolio_value = self.cash
        positions_value = 0.0

        for pos in self.positions:
            price = self._get_close(pos.ticker, date)
            if price is not None:
                positions_value += pos.shares * price

        portfolio_value += positions_value

        self.daily_snapshots.append({
            "date": date,
            "portfolio_value": portfolio_value,
            "cash": self.cash,
            "positions_value": positions_value,
            "n_positions": len(self.positions),
            "return": (portfolio_value / self.config.initial_capital) - 1,
        })

    # ------------------------------------------------------------------
    # 메인 시뮬레이션 루프
    # ------------------------------------------------------------------

    def run(self) -> dict:
        """백테스트 실행."""
        logger.info("=" * 60)
        logger.info("[BT] 백테스트 시작")
        logger.info("[BT] 전략: %s, 자본금: %s", self.config.selection_mode, f"{self.config.initial_capital:,.0f}")
        logger.info("[BT] 기간: %s ~ %s", self.config.backtest_start, self.config.backtest_end)
        logger.info("=" * 60)

        # 1. 데이터 로드 및 모델 학습
        logger.info("[BT] 1/4 시퀀스 데이터 로드...")
        seq_data = self._load_sequences()

        logger.info("[BT] 2/4 모델 학습 및 예측 (train_end=%s)...", self.config.train_end_date)
        self._train_and_predict(seq_data)

        logger.info("[BT] 3/4 종가 데이터 로드...")
        self._load_close_prices()
        benchmark = self._load_benchmark()

        # 거래일 목록 (예측이 있는 날짜)
        trading_dates = sorted(self.predictions.keys())
        logger.info("[BT] 4/4 시뮬레이션 시작 (%d 거래일)", len(trading_dates))

        # 2. 일별 시뮬레이션
        for i, date in enumerate(trading_dates):
            # 보유일 증가
            for pos in self.positions:
                pos.hold_days += 1

            # 매도 체크 (매수보다 먼저)
            sells = self._check_sells(date)
            for pos, reason in sells:
                self._execute_sell(pos, date, reason)

            # 매수 실행
            buys = self._select_buys(date)
            for ticker, prob in buys:
                self._execute_buy(ticker, date, prob)

            # 스냅샷
            self._take_snapshot(date)

            if (i + 1) % 50 == 0:
                snap = self.daily_snapshots[-1]
                logger.info(
                    "[BT] Day %d/%d | %s | 자산: %s | 수익률: %+.2f%% | 보유: %d종목",
                    i + 1, len(trading_dates), date,
                    f"{snap['portfolio_value']:,.0f}",
                    snap['return'] * 100,
                    snap['n_positions'],
                )

        # 3. 마지막 날 전 포지션 강제 청산
        if self.positions:
            last_date = trading_dates[-1]
            logger.info("[BT] 잔여 %d 포지션 강제 청산", len(self.positions))
            for pos in list(self.positions):
                self._execute_sell(pos, last_date, "backtest_end")

        # 4. 결과 계산
        results = self._calculate_results(benchmark)
        self._display_results(results)
        self._save_results(results)

        return results

    # ------------------------------------------------------------------
    # 결과 계산
    # ------------------------------------------------------------------

    def _calculate_results(self, benchmark: pd.Series) -> dict:
        """백테스트 결과 메트릭 계산."""
        if not self.daily_snapshots:
            return {}

        df = pd.DataFrame(self.daily_snapshots)
        df["date"] = pd.to_datetime(df["date"])
        df = df.set_index("date").sort_index()

        daily_returns = df["portfolio_value"].pct_change().dropna()
        total_return = (df["portfolio_value"].iloc[-1] / self.config.initial_capital) - 1
        n_days = len(df)
        annual_return = (1 + total_return) ** (252 / max(n_days, 1)) - 1

        # Sharpe
        if daily_returns.std() > 1e-9:
            sharpe = float(daily_returns.mean() / daily_returns.std() * np.sqrt(252))
        else:
            sharpe = 0.0

        # MDD
        cummax = df["portfolio_value"].cummax()
        drawdown = (df["portfolio_value"] - cummax) / cummax
        max_drawdown = float(drawdown.min())

        # 거래 통계
        trades_df = pd.DataFrame(self.trade_log)
        sell_trades = trades_df[trades_df["action"] == "SELL"] if not trades_df.empty else pd.DataFrame()

        if not sell_trades.empty:
            win_trades = sell_trades[sell_trades["pnl"] > 0]
            win_rate = len(win_trades) / len(sell_trades)
            avg_return = sell_trades["return"].mean()
            avg_win = win_trades["return"].mean() if len(win_trades) > 0 else 0
            avg_loss = sell_trades[sell_trades["pnl"] <= 0]["return"].mean() if len(sell_trades[sell_trades["pnl"] <= 0]) > 0 else 0
            total_commission = trades_df["commission"].sum()

            # 매도 사유 통계
            reason_counts = {}
            for r in sell_trades["reason"]:
                key = r.split(" ")[0]
                reason_counts[key] = reason_counts.get(key, 0) + 1
        else:
            win_rate = avg_return = avg_win = avg_loss = total_commission = 0
            reason_counts = {}

        # 벤치마크 대비
        benchmark_return = None
        if not benchmark.empty:
            bt_start = pd.Timestamp(self.config.backtest_start)
            bt_end = df.index[-1]
            bm_slice = benchmark[(benchmark.index >= bt_start) & (benchmark.index <= bt_end)]
            if len(bm_slice) >= 2:
                benchmark_return = float((bm_slice.iloc[-1] / bm_slice.iloc[0]) - 1)

        return {
            "config": {
                "selection_mode": self.config.selection_mode,
                "top_n": self.config.top_n,
                "buy_threshold": self.config.buy_threshold,
                "stop_loss": self.config.stop_loss,
                "take_profit": self.config.take_profit,
                "model_exit_threshold": self.config.model_exit_threshold,
                "max_hold_days": self.config.max_hold_days,
                "initial_capital": self.config.initial_capital,
            },
            "period": {
                "start": self.config.backtest_start,
                "end": str(df.index[-1].date()),
                "trading_days": n_days,
            },
            "performance": {
                "total_return": total_return,
                "annual_return": annual_return,
                "sharpe_ratio": sharpe,
                "max_drawdown": max_drawdown,
                "final_value": float(df["portfolio_value"].iloc[-1]),
            },
            "benchmark": {
                "kospi200_return": benchmark_return,
                "excess_return": (total_return - benchmark_return) if benchmark_return is not None else None,
            },
            "trades": {
                "total_trades": len(sell_trades),
                "win_rate": win_rate,
                "avg_return_per_trade": avg_return,
                "avg_win": avg_win,
                "avg_loss": avg_loss,
                "total_commission": total_commission,
                "sell_reasons": reason_counts,
            },
            "daily_snapshots": self.daily_snapshots,
            "trade_log": self.trade_log,
        }

    # ------------------------------------------------------------------
    # 결과 출력
    # ------------------------------------------------------------------

    def _display_results(self, results: dict) -> None:
        """백테스트 결과 출력."""
        perf = results["performance"]
        trades = results["trades"]
        bm = results["benchmark"]
        cfg = results["config"]

        print("\n" + "=" * 70)
        print("  LSTM 포트폴리오 백테스트 결과")
        print("=" * 70)
        print(f"  기간          : {results['period']['start']} ~ {results['period']['end']} ({results['period']['trading_days']}일)")
        print(f"  전략          : {cfg['selection_mode']} (top_n={cfg['top_n']}, threshold={cfg['buy_threshold']})")
        print(f"  매도 조건     : 손절 {cfg['stop_loss']*100:.0f}% / 모델 < {cfg['model_exit_threshold']} / 익절 +{cfg['take_profit']*100:.0f}% / {cfg['max_hold_days']}일")
        print(f"  초기 자본     : {cfg['initial_capital']:>15,.0f}원")
        print(f"  최종 자산     : {perf['final_value']:>15,.0f}원")
        print()
        print(f"  [수익률]")
        print(f"  총 수익률     : {perf['total_return']*100:>+8.2f}%")
        print(f"  연환산 수익률 : {perf['annual_return']*100:>+8.2f}%")
        print(f"  Sharpe Ratio  : {perf['sharpe_ratio']:>8.3f}")
        print(f"  Max Drawdown  : {perf['max_drawdown']*100:>8.2f}%")
        print()
        if bm["kospi200_return"] is not None:
            print(f"  [벤치마크 대비]")
            print(f"  KOSPI200      : {bm['kospi200_return']*100:>+8.2f}%")
            print(f"  초과수익      : {bm['excess_return']*100:>+8.2f}%")
            print()
        print(f"  [거래 통계]")
        print(f"  총 거래       : {trades['total_trades']:>8d}건")
        print(f"  승률          : {trades['win_rate']*100:>8.1f}%")
        print(f"  평균 수익률   : {trades['avg_return_per_trade']*100:>+8.2f}%")
        print(f"  평균 이익     : {trades['avg_win']*100:>+8.2f}%")
        print(f"  평균 손실     : {trades['avg_loss']*100:>+8.2f}%")
        print(f"  총 수수료     : {trades['total_commission']:>12,.0f}원")
        print()
        if trades["sell_reasons"]:
            print(f"  [매도 사유]")
            for reason, count in sorted(trades["sell_reasons"].items(), key=lambda x: -x[1]):
                pct = count / max(trades["total_trades"], 1) * 100
                print(f"  {reason:<16}: {count:>5}건 ({pct:.1f}%)")
        print("=" * 70)

    # ------------------------------------------------------------------
    # 결과 저장
    # ------------------------------------------------------------------

    def _save_results(self, results: dict) -> None:
        """결과를 Parquet + JSON으로 저장."""
        import json

        out_dir = PROCESSED_LSTM_PATH.parent.parent / "backtest"
        out_dir.mkdir(parents=True, exist_ok=True)

        mode = self.config.selection_mode
        date_str = datetime.now().strftime("%Y%m%d")

        # 일별 스냅샷
        snap_df = pd.DataFrame(results["daily_snapshots"])
        snap_path = out_dir / f"equity_curve_{mode}_{date_str}.parquet"
        snap_df.to_parquet(str(snap_path), index=False)
        logger.info("[BT] 에쿼티 커브 저장: %s", snap_path)

        # 거래 로그
        if results["trade_log"]:
            trade_df = pd.DataFrame(results["trade_log"])
            trade_path = out_dir / f"trade_log_{mode}_{date_str}.parquet"
            trade_df.to_parquet(str(trade_path), index=False)
            logger.info("[BT] 거래 로그 저장: %s", trade_path)

        # 요약 JSON
        summary = {k: v for k, v in results.items() if k not in ("daily_snapshots", "trade_log")}
        summary_path = out_dir / f"backtest_summary_{mode}_{date_str}.json"
        with open(str(summary_path), "w", encoding="utf-8") as f:
            json.dump(summary, f, ensure_ascii=False, indent=2, default=str)
        logger.info("[BT] 요약 저장: %s", summary_path)


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def main() -> None:
    """Top-N과 Threshold 두 가지 전략으로 백테스트 실행."""

    # 전략 1: Top-10
    print("\n" + "#" * 70)
    print("  전략 1: Top-10 종목 매수")
    print("#" * 70)
    config_topn = StrategyConfig(selection_mode="top_n", top_n=10)
    sim_topn = PortfolioSimulator(config_topn)
    results_topn = sim_topn.run()

    # 전략 2: 확률 임계값 0.55 이상
    print("\n" + "#" * 70)
    print("  전략 2: 확률 >= 0.55 종목 매수")
    print("#" * 70)
    config_thresh = StrategyConfig(selection_mode="threshold", buy_threshold=0.55)
    sim_thresh = PortfolioSimulator(config_thresh)
    results_thresh = sim_thresh.run()

    # 비교 요약
    print("\n" + "=" * 70)
    print("  전략 비교 요약")
    print("=" * 70)
    for label, r in [("Top-10", results_topn), ("Threshold≥0.55", results_thresh)]:
        p = r["performance"]
        t = r["trades"]
        print(f"  {label:<16}: 수익률 {p['total_return']*100:>+6.2f}% | "
              f"Sharpe {p['sharpe_ratio']:.3f} | "
              f"MDD {p['max_drawdown']*100:.1f}% | "
              f"승률 {t['win_rate']*100:.1f}% | "
              f"거래 {t['total_trades']}건")
    print("=" * 70)


if __name__ == "__main__":
    main()
