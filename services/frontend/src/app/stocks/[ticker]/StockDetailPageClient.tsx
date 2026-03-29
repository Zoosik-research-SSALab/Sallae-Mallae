"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { StockChartPeriod, StockFinancialType } from "@/app/stocks/types/stockDetail";
import type { StockQuoteSnapshot } from "./api/connectStockPriceStream";
import { useStockAnnouncementsQuery } from "./hooks/useStockAnnouncementsQuery";
import { useStockFinancialsQuery } from "./hooks/useStockFinancialsQuery";
import { useStockIndicatorsQuery } from "./hooks/useStockIndicatorsQuery";
import { useStockKeywordsQuery } from "./hooks/useStockKeywordsQuery";
import { useStockOverviewQuery } from "./hooks/useStockOverviewQuery";
import { useStockPriceStream } from "./hooks/useStockPriceStream";
import { useStockQuoteStream } from "./hooks/useStockQuoteStream";
import StockAnnouncementsSection from "./components/StockAnnouncementsSection";
import NewsDetailModal from "../../news/components/NewsDetailModal";
import StockDetailTopBar from "./components/StockDetailTopBar";
import StockFinancialSection from "./components/StockFinancialSection";
import StockIndicatorsSection from "./components/StockIndicatorsSection";
import StockKeywordsNewsSection from "./components/StockKeywordsNewsSection";
import StockOverviewSection from "./components/StockOverviewSection";
import StockSectionLoadingOverlay from "./components/common/StockSectionLoadingOverlay";

type Props = {
  stockId: string;
};

const SEOUL_TIME_ZONE = "Asia/Seoul";

function getSeoulMinuteParts(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const readPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";

  return {
    year: readPart("year"),
    month: readPart("month"),
    day: readPart("day"),
    hour: readPart("hour"),
    minute: readPart("minute"),
  };
}

function getSeoulMinuteKey(value: string | Date) {
  const parts = getSeoulMinuteParts(value);

  if (!parts) {
    return null;
  }

  return `${parts.year}-${parts.month}-${parts.day}-${parts.hour}-${parts.minute}`;
}

function toSeoulMinuteTimestamp(value: string | Date) {
  const parts = getSeoulMinuteParts(value);

  if (!parts) {
    return null;
  }

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00+09:00`;
}

function getSeoulMinuteTimestampMs(value: string | Date) {
  const timestamp = toSeoulMinuteTimestamp(value);

  if (!timestamp) {
    return null;
  }

  const time = new Date(timestamp).getTime();
  return Number.isNaN(time) ? null : time;
}

function mergeMinutePricesWithQuoteTick(
  prices: Array<{
    timestamp: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>,
  quote: StockQuoteSnapshot,
) {
  if (typeof quote.tickPrice !== "number" || typeof quote.tickTimestamp !== "string") {
    return prices;
  }

  const tickMinuteKey = getSeoulMinuteKey(quote.tickTimestamp);
  const tickMinuteTimestamp = toSeoulMinuteTimestamp(quote.tickTimestamp);

  if (!tickMinuteKey || !tickMinuteTimestamp) {
    return prices;
  }

  if (prices.length === 0) {
    return [
      {
        timestamp: tickMinuteTimestamp,
        open: quote.tickPrice,
        high: quote.tickPrice,
        low: quote.tickPrice,
        close: quote.tickPrice,
        volume: 0,
      },
    ];
  }

  const lastPrice = prices.at(-1);
  if (!lastPrice) {
    return prices;
  }

  const lastMinuteKey = getSeoulMinuteKey(lastPrice.timestamp);
  if (!lastMinuteKey) {
    return prices;
  }

  if (tickMinuteKey < lastMinuteKey) {
    return prices;
  }

  if (tickMinuteKey === lastMinuteKey) {
    return [
      ...prices.slice(0, -1),
      {
        ...lastPrice,
        high: Math.max(lastPrice.high, quote.tickPrice),
        low: Math.min(lastPrice.low, quote.tickPrice),
        close: quote.tickPrice,
      },
    ];
  }

  return [
    ...prices,
    {
      timestamp: tickMinuteTimestamp,
      open: quote.tickPrice,
      high: quote.tickPrice,
      low: quote.tickPrice,
      close: quote.tickPrice,
      volume: 0,
    },
  ];
}

export default function StockDetailPageClient({ stockId }: Props) {
  const router = useRouter();
  const [chartPeriod, setChartPeriod] = useState<StockChartPeriod>("1MIN");
  const [financialType, setFinancialType] = useState<StockFinancialType>("QUARTERLY");
  const [selectedNewsId, setSelectedNewsId] = useState<number | null>(null);
  const lastMinuteBackfillKeyRef = useRef<string | null>(null);

  const overviewQuery = useStockOverviewQuery(stockId);
  const indicatorsQuery = useStockIndicatorsQuery(stockId);
  const financialsQuery = useStockFinancialsQuery(stockId, financialType);
  const keywordsQuery = useStockKeywordsQuery(stockId);
  const announcementsQuery = useStockAnnouncementsQuery(stockId, 3, 0);
  const chartPriceStream = useStockPriceStream(stockId, chartPeriod);
  const quoteTicker = overviewQuery.data?.ticker ?? "";
  const quoteStream = useStockQuoteStream(quoteTicker, {
    enabled: Boolean(quoteTicker),
  });

  const currentPrice = useMemo(() => {
    if (typeof quoteStream.data.tickPrice === "number") {
      return quoteStream.data.tickPrice;
    }

    if (typeof quoteStream.data.currentPrice === "number") {
      return quoteStream.data.currentPrice;
    }

    return overviewQuery.data?.latestPrice?.closePrice ?? 0;
  }, [overviewQuery.data?.latestPrice?.closePrice, quoteStream.data.currentPrice, quoteStream.data.tickPrice]);

  const changeRate = useMemo(() => {
    if (typeof quoteStream.data.changeRate === "number") {
      return quoteStream.data.changeRate;
    }

    return overviewQuery.data?.latestPrice?.fluctuationRate ?? 0;
  }, [overviewQuery.data?.latestPrice?.fluctuationRate, quoteStream.data.changeRate]);

  const chartPrices = useMemo(() => {
    if (chartPeriod !== "1MIN") {
      return chartPriceStream.data.prices;
    }

    return mergeMinutePricesWithQuoteTick(chartPriceStream.data.prices, quoteStream.data);
  }, [chartPeriod, chartPriceStream.data.prices, quoteStream.data]);

  useEffect(() => {
    if (chartPeriod !== "1MIN" || chartPriceStream.isLoading || !chartPriceStream.data.prices.length) {
      return;
    }

    const lastPriceTimestamp = chartPriceStream.data.prices.at(-1)?.timestamp;
    const tickTimestamp = quoteStream.data.tickTimestamp;

    if (typeof lastPriceTimestamp !== "string" || typeof tickTimestamp !== "string") {
      return;
    }

    const lastPriceMinuteMs = getSeoulMinuteTimestampMs(lastPriceTimestamp);
    const tickMinuteMs = getSeoulMinuteTimestampMs(tickTimestamp);

    if (lastPriceMinuteMs === null || tickMinuteMs === null || tickMinuteMs <= lastPriceMinuteMs) {
      return;
    }

    const gapMinutes = Math.floor((tickMinuteMs - lastPriceMinuteMs) / 60_000);

    if (gapMinutes < 2) {
      return;
    }

    const backfillKey = `${lastPriceMinuteMs}-${tickMinuteMs}`;

    if (lastMinuteBackfillKeyRef.current === backfillKey) {
      return;
    }

    lastMinuteBackfillKeyRef.current = backfillKey;
    chartPriceStream.refetch();
  }, [
    chartPeriod,
    chartPriceStream,
    chartPriceStream.data.prices,
    chartPriceStream.isLoading,
    chartPriceStream.refetch,
    quoteStream.data.tickTimestamp,
  ]);

  const displayBaseTime = quoteStream.data.tickTimestamp ?? overviewQuery.data?.baseTime ?? "";

  const isOverviewPending = overviewQuery.isLoading || Boolean(overviewQuery.error) || !overviewQuery.data;
  const isChartPending = chartPriceStream.isLoading || (!chartPriceStream.data.prices.length && Boolean(chartPriceStream.error));
  const isIndicatorsPending = indicatorsQuery.isLoading || Boolean(indicatorsQuery.error);
  const isFinancialsPending = financialsQuery.isLoading || Boolean(financialsQuery.error);
  const isKeywordsPending = keywordsQuery.isLoading || Boolean(keywordsQuery.error);
  const isAnnouncementsPending = announcementsQuery.isLoading || Boolean(announcementsQuery.error);

  return (
    <main className="flex w-full justify-center bg-[color:var(--color-bg-primary)] pb-16">
      <div className="flex w-full flex-col items-center">
        <StockDetailTopBar stockId={overviewQuery.data?.id} stockName={overviewQuery.data?.name ?? stockId} />

        <div className="mx-auto flex w-full flex-col gap-12 px-4 py-6 md:px-6 md:py-8 xl:w-[88%] xl:max-w-[1152px] xl:px-0 xl:py-10">
          {isOverviewPending ? (
            <StockSectionLoadingOverlay active className="rounded-[24px]">
              <div className="space-y-6">
                <div className="h-12 w-48 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
                <div className="h-[360px] animate-pulse rounded-2xl bg-[color:var(--color-bg-secondary)]" />
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-40 animate-pulse rounded-2xl bg-[color:var(--color-bg-secondary)]" />
                  ))}
                </div>
              </div>
            </StockSectionLoadingOverlay>
          ) : (
            <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start xl:gap-20">
              <section className="min-w-0">
                <StockOverviewSection
                  overview={overviewQuery.data}
                  prices={chartPrices}
                  currentPrice={currentPrice}
                  changeRate={changeRate}
                  baseTime={displayBaseTime}
                  chartPeriod={chartPeriod}
                  onChartPeriodChange={setChartPeriod}
                  isChartLoading={isChartPending}
                  isChartFetchingMore={chartPriceStream.isFetchingMore}
                  chartHasMore={chartPriceStream.hasMore}
                  onRequestChartMore={chartPriceStream.loadMore}
                />

                <StockIndicatorsSection indicators={indicatorsQuery.data} isLoading={isIndicatorsPending} />

                <StockFinancialSection
                  type={financialType}
                  onTypeChange={setFinancialType}
                  financials={financialsQuery.data?.financials ?? []}
                  latestAnnouncement={announcementsQuery.data?.announcements[0]}
                  isLoading={isFinancialsPending}
                />
              </section>

              <aside className="flex min-w-0 flex-col gap-12 xl:pt-2">
                <StockKeywordsNewsSection
                  keywords={keywordsQuery.data?.keywords ?? []}
                  isLoading={isKeywordsPending}
                  onHeaderClick={() => {
                    const stockName = overviewQuery.data?.name?.trim();
                    router.push(`/news${stockName ? `?keyword=${encodeURIComponent(stockName)}` : ""}`);
                  }}
                  onNewsSelect={setSelectedNewsId}
                />
                <StockAnnouncementsSection
                  stockId={overviewQuery.data.id}
                  announcements={announcementsQuery.data?.announcements ?? []}
                  isLoading={isAnnouncementsPending}
                />
              </aside>
            </div>
          )}
        </div>
      </div>
      {selectedNewsId !== null ? <NewsDetailModal newsId={selectedNewsId} onClose={() => setSelectedNewsId(null)} /> : null}
    </main>
  );
}
