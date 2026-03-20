"use client";

import { useParams } from "next/navigation";
import ChairmanAnalysisSection from "../components/ChairmanAnalysisSection";
import InvestmentPerformanceSection from "../components/InvestmentPerformanceSection";
import ReportDebateSection from "../components/ReportDebateSection";
import ReportEventsSection from "../components/ReportEventsSection";
import ReportHeroSection from "../components/ReportHeroSection";
import ReportTopBarSection from "../components/ReportTopBarSection";
import { useDebateReports } from "../hooks/useDebateReports";
import { getMockCompanyName, getMockLatestDebateReport } from "../utils/mockDebateReportData";
import { getMockChairmanAnalysisReports, getMockInvestmentPerformance, getMockReportPagePresentation, getMockTradeHistory } from "../utils/mockReportPageData";

export default function ReportsDetailPage() {
  const params = useParams<{ stockId: string }>();
  const stockId = decodeURIComponent(params.stockId ?? "").trim();
  const companyName = getMockCompanyName(stockId);
  const { reports: debateReports, isLoading: isDebateLoading, error: debateError } = useDebateReports(stockId, 0, 6);
  const debateReport = debateReports[0] ?? getMockLatestDebateReport(stockId);
  const presentation = getMockReportPagePresentation(stockId);
  const chairmanHistory = getMockChairmanAnalysisReports(stockId, { offset: 0, limit: 6 });
  const investmentPerformance = getMockInvestmentPerformance(stockId);
  const tradeHistory = getMockTradeHistory(stockId, { offset: 0, limit: 10 });
  const latestChairmanReport = chairmanHistory.reports[0];
  const signalLabel = formatSignalLabel(debateReport.chairman.signal);
  const confidence = `${latestChairmanReport?.chairman.confidence ?? debateReport.chairman.confidence}%`;
  const createdAt = formatDateTime(debateReport.createdAt);
  const priceText = `${presentation.price.toLocaleString("ko-KR")}원`;
  const changeText = `${presentation.changeRate > 0 ? "+" : ""}${presentation.changeRate.toFixed(1)}%`;
  const totalTrades = tradeHistory.trades.length;
  const closedTrades = tradeHistory.trades.filter((trade) => trade.status === "CLOSED");
  const positiveTrades = closedTrades.filter((trade) => trade.return_rate > 0);
  const hitRate = `${investmentPerformance.win_rate.toFixed(1)}%`;
  const hitCount = `${positiveTrades.length}/${totalTrades}회 수익실현`;
  const averageReturn = `${investmentPerformance.recent_return > 0 ? "+" : ""}${investmentPerformance.recent_return.toFixed(1)}%`;
  const cumulativeReturn = `${investmentPerformance.cumulative_return > 0 ? "+" : ""}${investmentPerformance.cumulative_return.toFixed(1)}%`;
  const verdict = formatSignalLabel(latestChairmanReport?.chairman.signal ?? debateReport.chairman.signal);
  const verdictQuote = `"${latestChairmanReport?.chairman.summary ?? debateReport.chairman.summary}"`;

  return (
    <main className="flex flex-col items-center bg-[color:var(--color-bg-primary)]">
      <ReportTopBarSection stockId={stockId} companyName={companyName} />

      <div className="flex w-full flex-col items-center gap-16">
        <section className="flex w-full max-w-[1152px] flex-col gap-16 px-4 py-10">
          <ReportHeroSection
            market={presentation.market}
            stockId={stockId}
            benchmarkTime={presentation.benchmarkTime}
            companyName={companyName}
            priceText={priceText}
            changeText={changeText}
          />

          <InvestmentPerformanceSection
            stockId={stockId}
            hitRate={hitRate}
            hitCount={hitCount}
            averageReturn={averageReturn}
            cumulativeReturn={cumulativeReturn}
          />

          <ReportDebateSection stockId={stockId} companyName={companyName} report={debateReport} />
        </section>

        <ChairmanAnalysisSection verdict={verdict} confidence={confidence} verdictQuote={verdictQuote} />

        <ReportEventsSection stockId={stockId} events={presentation.events} />
      </div>

      {isDebateLoading || debateError ? (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2">
          {isDebateLoading ? (
            <div className="rounded-md bg-[color:var(--color-bg-secondary)] px-3 py-2 text-sm text-[color:var(--color-text-secondary)]">
              토론 데이터 로딩 중...
            </div>
          ) : null}
          {debateError ? (
            <div className="rounded-md bg-[color:var(--color-bg-danger-subtle)] px-3 py-2 text-sm text-[color:var(--color-text-danger-bold)]">
              {debateError}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="hidden">
        {signalLabel} {createdAt}
      </div>
    </main>
  );
}

function formatSignalLabel(signal?: string) {
  const normalized = signal?.trim().toUpperCase().replace(/\s+/g, "_");

  if (normalized === "STRONG_BUY") {
    return "강력 매수";
  }
  if (normalized === "BUY") {
    return "매수";
  }
  if (normalized === "SELL") {
    return "매도";
  }
  if (normalized === "HOLD" || normalized === "STAY") {
    return "보류";
  }

  return signal ?? "판단 대기";
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(
    2,
    "0",
  )} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
