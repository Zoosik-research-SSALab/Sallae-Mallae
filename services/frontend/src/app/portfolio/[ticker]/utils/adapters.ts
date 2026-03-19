import type { TradeItem, ReportItem } from "../types/api";
import type {
  TradeEntry,
  CommitteeMember,
  BacktestBestTrade,
  BacktestStats,
} from "../types/portfolioStockDetail";

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * Convert an ISO date string (e.g. "2026-02-13") to short format "YY.MM.DD".
 */
export function formatDateShort(dateStr: string): string {
  const parts = dateStr.slice(0, 10).split("-");
  if (parts.length < 3) return dateStr;
  const [year, month, day] = parts;
  return `${year.slice(2)}.${month}.${day}`;
}

// ── Trade adapters ────────────────────────────────────────────────────────────

/**
 * Convert an API TradeItem to the FE TradeEntry shape.
 */
export function adaptTradeEntry(trade: TradeItem, index: number): TradeEntry {
  const status = trade.sellDate == null ? "holding" : "sold";

  const startLabel = formatDateShort(trade.buyDate);
  const endLabel =
    trade.sellDate != null ? formatDateShort(trade.sellDate) : "현재";
  const dateRange = `${startLabel} ~ ${endLabel}`;

  const durationLabel =
    status === "holding"
      ? `${trade.holdingDays}일 째`
      : `${trade.holdingDays}일`;

  return {
    id: `trade-${index + 1}`,
    status,
    dateRange,
    buyPrice: trade.buyPrice,
    sellPrice: trade.sellPrice ?? null,
    currentPrice: trade.currentPrice ?? null,
    returnRate: trade.returnRate,
    durationLabel,
  };
}

// ── Committee adapters ────────────────────────────────────────────────────────

/**
 * Flatten all debate round agents from a ReportItem into a CommitteeMember
 * array, then append the chairman as the final entry.
 */
export function adaptCommitteeMembers(report: ReportItem): CommitteeMember[] {
  const agentMembers: CommitteeMember[] = report.debate.rounds.flatMap(
    (round) =>
      round.agents.map(
        (agent, index): CommitteeMember => ({
          role: agent.name,
          opinion: agent.summary,
          alignment: index % 2 === 0 ? "left" : "right",
        })
      )
  );

  const chairman: CommitteeMember = {
    role: "의장 최종 판결",
    opinion: report.chairman.summary,
    alignment: "right",
    isDark: true,
  };

  return [...agentMembers, chairman];
}

// ── Backtest adapters ─────────────────────────────────────────────────────────

/**
 * Derive backtest summary values from the full trade history.
 */
export function adaptBacktestFromTrades(trades: TradeItem[]): {
  bestTrade: BacktestBestTrade;
  stats: BacktestStats;
} {
  // Best trade — highest returnRate
  const sorted = [...trades].sort((a, b) => b.returnRate - a.returnRate);
  const best = sorted[0];

  const bestStartLabel = formatDateShort(best.buyDate);
  const bestEndLabel =
    best.sellDate != null ? formatDateShort(best.sellDate) : "현재";

  const bestTrade: BacktestBestTrade = {
    returnRate: best.returnRate,
    period: `${bestStartLabel} ~ ${bestEndLabel}`,
    buyPrice: best.buyPrice,
    sellPrice: best.sellPrice ?? best.currentPrice ?? best.buyPrice,
  };

  // Three-year boundary
  const threeYearsAgo = new Date();
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

  const recentTrades = trades.filter(
    (t) => new Date(t.buyDate) >= threeYearsAgo
  );

  // TODO: Replace placeholder sum with a proper cumulative compound return
  // calculation once the backend provides raw equity-curve data.
  const threeYearReturn = recentTrades.reduce(
    (acc, t) => acc + t.returnRate,
    0
  );

  // Earliest year across all trades
  const allTimeSince =
    trades.length > 0
      ? String(
          Math.min(...trades.map((t) => new Date(t.buyDate).getFullYear()))
        )
      : String(new Date().getFullYear());

  const stats: BacktestStats = {
    threeYearReturn,
    threeYearTradeCount: recentTrades.length,
    allTimeTradeCount: trades.length,
    allTimeSince,
  };

  return { bestTrade, stats };
}
