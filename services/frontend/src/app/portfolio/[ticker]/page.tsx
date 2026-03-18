import StockDetailHeader from "./components/StockDetailHeader";
import StockInfoSection from "./components/StockInfoSection";
import InvestmentCalculator from "./components/InvestmentCalculator";
import PerformanceMetrics from "./components/PerformanceMetrics";
import TradeHistory from "./components/TradeHistory";
import ReturnChart from "./components/ReturnChart";
import BacktestResults from "./components/BacktestResults";
import CommitteeDiscussion from "./components/CommitteeDiscussion";
import { mockStockDetail } from "./utils/mockData";

export default function PortfolioStockDetailPage() {
  const stock = mockStockDetail;

  return (
    <div className="pt-10 pb-16 md:p-0">
      {/* Header: full-width, outside max-w container */}
      <StockDetailHeader
        stockName={stock.name}
        portfolioLabel={stock.portfolioLabel}
      />

      <main className="w-full md:py-12">
        {/* Two-column layout on desktop, single column on mobile */}
        <div className="max-w-[1152px] px-3 mx-auto flex flex-col gap-6 md:flex-row md:gap-8 md:items-start">
          {/* Left column */}
          <div className="flex flex-col gap-10 w-full md:w-[60%]">
            {/* Stock info */}
            <StockInfoSection
              ticker={stock.ticker}
              name={stock.name}
              description={stock.description}
              isAiPortfolio={stock.isAiPortfolio}
            />

            {/* Investment calculator */}
            <InvestmentCalculator />

            {/* Performance metrics */}
            <PerformanceMetrics
              totalPnl={stock.performance.totalPnl}
              returnRate={stock.performance.returnRate}
              holdingCount={stock.performance.holdingCount}
              investmentPrincipal={stock.performance.investmentPrincipal}
              buyDate={stock.performance.buyDate}
              holdingDays={stock.performance.holdingDays}
              buyPrice={stock.performance.buyPrice}
              currentPrice={stock.performance.currentPrice}
            />
            {/* Trade history */}
            <TradeHistory trades={stock.trades} />
          </div>
          <div>
            {/* Return chart */}
            <ReturnChart />

            {/* Backtest results */}
            <BacktestResults
              bestTrade={stock.backtest.bestTrade}
              stats={stock.backtest.stats}
            />

            {/* Bottom link button — visible on desktop below left column */}
            <div className="hidden md:block">
              <button
                type="button"
                className="w-full py-4 rounded-xl text-sm font-semibold text-center bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-text-secondary)] hover:opacity-80 transition-opacity"
              >
                이 종목 일반 상세정보 보기 (호가/공시 등)
              </button>
            </div>
          </div>

          {/* Right column: committee discussion (sticky on desktop) */}
          <div className="w-full md:w-[40%] md:sticky md:top-6">
            <CommitteeDiscussion
              finalDecision={stock.committee.finalDecision}
              confidence={stock.committee.confidence}
              briefingDate={stock.committee.briefingDate}
              members={stock.committee.members}
            />
          </div>
        </div>

        {/* Bottom link button — visible on mobile only, below committee discussion */}
        <div className="mt-6 md:hidden">
          <button
            type="button"
            className="w-full py-4 rounded-xl text-sm font-semibold text-center bg-[color:var(--color-bg-tertiary)] text-[color:var(--color-text-secondary)] hover:opacity-80 transition-opacity"
          >
            이 종목 일반 상세정보 보기 (호가/공시 등)
          </button>
        </div>
      </main>
    </div>
  );
}
