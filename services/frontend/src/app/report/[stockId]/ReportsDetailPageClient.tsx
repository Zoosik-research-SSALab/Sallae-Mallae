"use client";

import { useMemo } from "react";
import { useStockQuoteStream } from "@/app/stocks/[ticker]/hooks/useStockQuoteStream";
import { useStockAnnouncementsQuery } from "@/app/stocks/[ticker]/hooks/useStockAnnouncementsQuery";
import { useStockOverviewQuery } from "@/app/stocks/[ticker]/hooks/useStockOverviewQuery";
import { useStockPriceStream } from "@/app/stocks/[ticker]/hooks/useStockPriceStream";
import ChairmanAnalysisSection from "../components/ChairmanAnalysisSection";
import InvestmentPerformanceSection from "../components/InvestmentPerformanceSection";
import ReportDebateSection from "../components/ReportDebateSection";
import ReportEventsSection, { mapAnnouncementsToEvents } from "../components/ReportEventsSection";
import ReportHeroSection from "../components/ReportHeroSection";
import ReportTopBarSection from "../components/ReportTopBarSection";
import { useDebateReportsQuery } from "../hooks/useDebateReportsQuery";
import { useInvestmentPerformance } from "../hooks/useInvestmentPerformance";
import { useTradeHistory } from "../hooks/useTradeHistory";

interface ReportsDetailPageClientProps {
  stockId: string;
}

export default function ReportsDetailPageClient({ stockId }: ReportsDetailPageClientProps) {
  const { reports: debateReports, isLoading: isDebateLoading, error: debateError } = useDebateReportsQuery(stockId);
  const overviewQuery = useStockOverviewQuery(stockId);
  const announcementsQuery = useStockAnnouncementsQuery(stockId, 4, 0);
  const priceStream = useStockPriceStream(stockId, "1Y");
  const investmentPerformanceQuery = useInvestmentPerformance(stockId);
  const tradeHistoryQuery = useTradeHistory(stockId, 0, 100);

  const debateReport = debateReports[0] ?? null;
  const companyName = overviewQuery.data?.name ?? "";
  const ticker = overviewQuery.data?.ticker ?? stockId;
  const quoteTicker = overviewQuery.data?.ticker ?? "";
  const quoteStream = useStockQuoteStream(quoteTicker, {
    enabled: Boolean(quoteTicker),
  });
  const prices = priceStream.data.prices;
  const performance = investmentPerformanceQuery.data ?? null;
  const trades = tradeHistoryQuery.data?.trades ?? [];
  const events = useMemo(
    () => mapAnnouncementsToEvents(announcementsQuery.data?.announcements ?? []),
    [announcementsQuery.data?.announcements],
  );
  const latestPrice = typeof quoteStream.data.currentPrice === "number" ? quoteStream.data.currentPrice : undefined;
  const changeRate = typeof quoteStream.data.changeRate === "number" ? quoteStream.data.changeRate : 0;
  const benchmarkTime = formatBenchmarkTime(quoteStream.data.tickTimestamp ?? overviewQuery.data?.baseTime ?? "");
  const market = overviewQuery.data?.marketType ?? "";
  const priceText = typeof latestPrice === "number" ? `${Math.round(latestPrice).toLocaleString("ko-KR")}원` : "";
  const changeText = `${changeRate > 0 ? "+" : ""}${changeRate.toFixed(1)}%`;
  const signalLabel = formatSignalLabel(debateReport?.chairman.signal);
  const createdAt = formatDateTime(debateReport?.createdAt ?? "");
  const isMetaLoading = overviewQuery.isLoading || quoteStream.isLoading;
  const metaError =
    overviewQuery.error instanceof Error
      ? overviewQuery.error.message
      : quoteStream.error ?? priceStream.error;
  const debateErrorMessage = debateError instanceof Error ? debateError.message : null;
  const eventsError = announcementsQuery.error instanceof Error ? announcementsQuery.error.message : null;
  const tradeHistoryError = tradeHistoryQuery.error instanceof Error ? tradeHistoryQuery.error.message : null;
  const performanceError = investmentPerformanceQuery.error instanceof Error ? investmentPerformanceQuery.error.message : null;
  const isHeroReady = Boolean(overviewQuery.data && typeof latestPrice === "number");
  const isPerformanceReady = Boolean((performance?.chart?.length ?? 0) > 1) && !investmentPerformanceQuery.isLoading;
  const isDebateReady = !isDebateLoading;
  const isChairmanReady = !isDebateLoading;
  const isEventsReady = prices.length > 1 && !announcementsQuery.isLoading;

  return (
    <main className="flex flex-col items-center bg-[color:var(--color-bg-primary)]">
      {overviewQuery.data ? (
        <ReportTopBarSection stockId={stockId} companyName={companyName} />
      ) : (
        <TopBarSkeleton stockId={stockId} />
      )}

      <div className="flex w-full flex-col items-center gap-16">
        <section className="flex w-full max-w-[1152px] flex-col gap-16 px-4 py-10">
          {isHeroReady ? (
            <ReportHeroSection
              market={market}
              ticker={ticker}
              benchmarkTime={benchmarkTime}
              companyName={companyName}
              priceText={priceText}
              changeRate={changeRate}
              changeText={changeText}
            />
          ) : (
            <SectionSkeleton className="h-[164px]" />
          )}

          {isPerformanceReady ? (
            <InvestmentPerformanceSection
              companyName={companyName}
              performance={performance}
              trades={trades}
              isLoading={investmentPerformanceQuery.isLoading || tradeHistoryQuery.isLoading}
              error={performanceError ?? tradeHistoryError}
            />
          ) : (
            <SectionSkeleton className="h-[620px]" />
          )}

          {isDebateReady ? (
            <ReportDebateSection stockId={stockId} companyName={companyName} report={debateReport} />
          ) : (
            <SectionSkeleton className="h-[780px]" />
          )}
        </section>

        {isChairmanReady ? (
          <ChairmanAnalysisSection report={debateReport} />
        ) : (
          <SectionSkeleton className="h-80 w-full max-w-none rounded-none" />
        )}

        {isEventsReady ? (
          <ReportEventsSection
            companyName={companyName}
            prices={prices}
            events={events}
            isLoading={announcementsQuery.isLoading || priceStream.isLoading}
            error={eventsError ?? priceStream.error}
          />
        ) : (
          <SectionSkeleton className="h-[760px] w-full max-w-[1152px]" />
        )}
      </div>

      {isDebateLoading || debateErrorMessage || isMetaLoading || metaError ? (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2">
          {isMetaLoading ? (
            <div className="rounded-md bg-[color:var(--color-bg-secondary)] px-3 py-2 text-sm text-[color:var(--color-text-secondary)]">
              종목 데이터를 로딩 중...
            </div>
          ) : null}
          {isDebateLoading ? (
            <div className="rounded-md bg-[color:var(--color-bg-secondary)] px-3 py-2 text-sm text-[color:var(--color-text-secondary)]">
              토론 데이터 로딩 중...
            </div>
          ) : null}
          {metaError ? (
            <div className="rounded-md bg-[color:var(--color-bg-danger-subtle)] px-3 py-2 text-sm text-[color:var(--color-text-danger-bold)]">
              {metaError}
            </div>
          ) : null}
          {debateErrorMessage ? (
            <div className="rounded-md bg-[color:var(--color-bg-danger-subtle)] px-3 py-2 text-sm text-[color:var(--color-text-danger-bold)]">
              {debateErrorMessage}
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

function TopBarSkeleton({ stockId }: { stockId: string }) {
  return (
    <section className="flex w-full flex-col items-center border-b border-[color:var(--color-border-primary)] bg-[color:var(--color-bg-primary)]">
      <div className="flex w-full max-w-[1152px] items-center justify-between gap-6 px-4 py-4">
        <div className="flex items-center gap-6">
          <div className="flex h-10 w-10 items-center justify-center text-[color:var(--color-text-tertiary)]">
            <span className="text-2xl leading-none">←</span>
          </div>
          <div className="flex items-center gap-2 text-base font-bold text-[color:var(--color-text-primary)]">
            <div className="h-6 w-32 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
            <span className="text-[color:var(--color-text-tertiary)]">|</span>
            <span>종목 상세 정보</span>
            <span className="sr-only">{stockId}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="h-10 w-24 animate-pulse rounded-lg bg-[color:var(--color-bg-secondary)]" />
          <div className="h-10 w-24 animate-pulse rounded-lg bg-[color:var(--color-bg-secondary)]" />
        </div>
      </div>
    </section>
  );
}

function SectionSkeleton({ className }: { className: string }) {
  return <div className={`w-full animate-pulse rounded-2xl bg-[color:var(--color-bg-secondary)] ${className}`} />;
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

function formatBenchmarkTime(value: string) {
  if (!value) {
    return "";
  }

  const formatted = formatDateTime(value);
  return formatted ? `${formatted} 기준` : "";
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
