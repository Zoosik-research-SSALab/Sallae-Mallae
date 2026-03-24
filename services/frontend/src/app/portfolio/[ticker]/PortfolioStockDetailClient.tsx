"use client";

import StockDetailHeader from "./components/StockDetailHeader";
import StockInfoSection from "./components/StockInfoSection";
import InvestmentCalculator from "./components/InvestmentCalculator";
import PerformanceMetrics from "./components/PerformanceMetrics";
import TradeHistory from "./components/TradeHistory";
import ReturnChart from "./components/ReturnChart";
import BacktestResults from "./components/BacktestResults";
import CommitteeDiscussion from "./components/CommitteeDiscussion";
import { useStockReportQuery } from "./hooks/useStockReportQuery";
import { useStockPerformanceQuery } from "./hooks/useStockPerformanceQuery";
import { useStockTradesQuery } from "./hooks/useStockTradesQuery";
import type { TradeEntry, CommitteeMember, BacktestBestTrade, BacktestStats } from "./types/portfolioStockDetail";
import type { TradeItem } from "./types/api";


// Format a date string like "2026-02-13" → "26.02.13"
function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
}

function mapApiTradeToEntry(item: TradeItem, index: number): TradeEntry {
  const isHolding = !item.sellDate;
  const status: TradeEntry["status"] = isHolding ? "holding" : "sold";

  const buyFormatted = formatDateShort(item.buyDate);
  const dateRange = isHolding
    ? `${buyFormatted} ~ 현재`
    : `${buyFormatted} ~ ${formatDateShort(item.sellDate!)}`;

  const durationLabel = isHolding
    ? `${item.holdingDays}일 째`
    : `${item.holdingDays}일`;

  return {
    id: `trade-${index}`,
    status,
    dateRange,
    buyPrice: item.buyPrice,
    sellPrice: item.sellPrice ?? null,
    currentPrice: item.currentPrice ?? null,
    returnRate: item.returnRate,
    durationLabel,
  };
}

function calcBacktest(trades: TradeItem[]): {
  bestTrade: BacktestBestTrade;
  stats: BacktestStats;
} {
  // TODO: BE should provide backtest stats directly; this is a client-side approximation
  const soldTrades = trades.filter((t) => t.sellDate && t.sellPrice != null);

  let best = soldTrades[0] ?? trades[0];
  for (const t of soldTrades) {
    if (t.returnRate > (best?.returnRate ?? -Infinity)) best = t;
  }

  const bestTrade: BacktestBestTrade = best
    ? {
        returnRate: best.returnRate,
        period: "",
        buyPrice: best.buyPrice,
        sellPrice: best.sellPrice ?? best.currentPrice ?? 0,
      }
    : { returnRate: 0, period: "", buyPrice: 0, sellPrice: 0 };

  const totalReturn = soldTrades.reduce((sum, t) => sum + t.returnRate, 0);

  const stats: BacktestStats = {
    oneYearReturn: Number(totalReturn.toFixed(2)),
    oneYearTradeCount: soldTrades.length,
    allTimeTradeCount: trades.length,
    allTimeSince: "",
  };

  return { bestTrade, stats };
}

type Props = {
  ticker: string;
};

export default function PortfolioStockDetailClient({ ticker }: Props) {
  const {
    data: reportData,
    isLoading: reportLoading,
    isError: reportError,
    refetch: refetchReport,
  } = useStockReportQuery(ticker);

  const {
    data: performanceData,
    isLoading: performanceLoading,
    isError: performanceError,
    refetch: refetchPerformance,
  } = useStockPerformanceQuery(ticker);

  const {
    data: tradesData,
    isLoading: tradesLoading,
    isError: tradesError,
    refetch: refetchTrades,
  } = useStockTradesQuery(ticker);

  const isLoading = reportLoading || performanceLoading || tradesLoading;
  const isError = reportError || performanceError || tradesError;

  function handleRetry() {
    refetchReport();
    refetchPerformance();
    refetchTrades();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="typo-body-lg text-text-secondary">불러오는 중...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="typo-body-lg text-text-secondary">
          데이터를 불러오지 못했습니다.
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className="py-2 px-6 rounded-xl typo-body-md font-semibold bg-bg-tertiary text-text-secondary hover:opacity-80 transition-opacity"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // ── Performance props ──────────────────────────────────────────────────────
  const apiHolding = performanceData?.holding;
  const performanceProps = apiHolding
    ? {
        totalPnl: apiHolding.evaluationProfit,
        returnRate: apiHolding.currentReturn,
        holdingCount: apiHolding.holdingQuantity,
        investmentPrincipal: apiHolding.investmentAmount,
        buyDate: formatDateShort(apiHolding.buyDate),
        holdingDays: apiHolding.holdingDays,
        buyPrice: apiHolding.buyPrice,
        currentPrice: apiHolding.currentPrice,
      }
    : null;

  // ── Trades props ───────────────────────────────────────────────────────────
  const rawTrades = tradesData?.trades ?? [];
  const trades: TradeEntry[] = rawTrades.map(mapApiTradeToEntry);

  // ── Backtest props ─────────────────────────────────────────────────────────
  const backtestResult = rawTrades.length > 0 ? calcBacktest(rawTrades) : null;

  // ── Committee props ────────────────────────────────────────────────────────
  const firstReport = reportData?.reports?.[0];
  let committeeProps: {
    finalDecision: string;
    confidence: number;
    briefingDate: string;
    members: CommitteeMember[];
  } | null = null;

  if (firstReport) {
    // Flatten all agents from all rounds into CommitteeMember list, alternating alignment
    const agentList: CommitteeMember[] = firstReport.debate.rounds.flatMap(
      (round, _ri) =>
        round.agents.map((agent, ai) => ({
          role: agent.name,
          opinion: agent.summary || agent.opinion,
          alignment: ((_ri + ai) % 2 === 0 ? "left" : "right") as "left" | "right",
          isDark: false,
        })),
    );

    // Append chairman as last member (의장) with isDark
    agentList.push({
      role: "의장 최종 판결",
      opinion: firstReport.chairman.summary,
      alignment: "right",
      isDark: true,
    });

    committeeProps = {
      finalDecision: firstReport.chairman.signal,
      confidence: firstReport.chairman.confidence,
      briefingDate: firstReport.date,
      members: agentList,
    };
  }

  // TODO: portfolioLabel should come from API (stock meta endpoint not yet available)
  const portfolioLabel = "의장 포트폴리오";

  // TODO: name/description/isAiPortfolio should come from a stock meta API endpoint
  const stockName = ticker;
  const stockDescription = "";
  const isAiPortfolio = true;

  return (
    <div className="pt-10 pb-16 md:p-0">
      {/* Header: full-width, outside max-w container */}
      <div className="md:border-b md:border-border-primary">
        <StockDetailHeader
          stockName={stockName}
          portfolioLabel={portfolioLabel}
        />
      </div>

      <main className="w-full md:py-12">
        {/* Two-column layout on desktop, single column on mobile */}
        <div className="max-w-6xl px-3 mx-auto flex flex-col gap-6 md:flex-row md:gap-8 md:items-start">
          {/* Left column */}
          <div className="md:w-[60%]">
            <div className="flex flex-col gap-10 w-full">
              {/* Stock info */}
              <StockInfoSection
                ticker={ticker}
                name={stockName}
                description={stockDescription}
                isAiPortfolio={isAiPortfolio}
              />

              {/* Investment calculator */}
              <InvestmentCalculator />

              {/* Performance metrics */}
              {performanceProps ? (
                <PerformanceMetrics
                  totalPnl={performanceProps.totalPnl}
                  returnRate={performanceProps.returnRate}
                  holdingCount={performanceProps.holdingCount}
                  investmentPrincipal={performanceProps.investmentPrincipal}
                  buyDate={performanceProps.buyDate}
                  holdingDays={performanceProps.holdingDays}
                  buyPrice={performanceProps.buyPrice}
                  currentPrice={performanceProps.currentPrice}
                />
              ) : (
                <p className="typo-body-md text-text-tertiary py-8 text-center">
                  성과 데이터가 없습니다.
                </p>
              )}
              {/* Trade history */}
              <TradeHistory trades={trades} />
            </div>
            <div className="flex flex-col gap-10">
              {/* Return chart */}
              <ReturnChart />

              {/* Backtest results */}
              {backtestResult ? (
                <BacktestResults
                  bestTrade={backtestResult.bestTrade}
                  stats={backtestResult.stats}
                  stockName={stockName}
                />
              ) : (
                <p className="typo-body-md text-text-tertiary py-8 text-center">
                  백테스트 데이터가 없습니다.
                </p>
              )}

              <div className="flex items-center justify-center mb-4">
                <button
                  type="button"
                  className="py-4 px-8 rounded-xl typo-body-lg font-semibold text-center bg-bg-tertiary text-text-secondary hover:opacity-80 transition-opacity"
                >
                  이 종목 일반 상세정보 보기 (호가/공시 등)
                </button>
              </div>
            </div>
          </div>

          {/* Right column: committee discussion (sticky on desktop) */}
          <div className="w-full md:w-[40%] md:sticky md:top-6">
            {committeeProps ? (
              <CommitteeDiscussion
                finalDecision={committeeProps.finalDecision}
                confidence={committeeProps.confidence}
                briefingDate={committeeProps.briefingDate}
                members={committeeProps.members}
              />
            ) : (
              <p className="typo-body-md text-text-tertiary py-8 text-center">
                위원회 데이터가 없습니다.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
