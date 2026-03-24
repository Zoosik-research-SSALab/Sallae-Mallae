"use client";

import { useMemo, useState } from "react";
import type { StockChartPeriod, StockFinancialType } from "@/app/stocks/types/stockDetail";
import { getChangeRate, getLatestClose } from "./utils/stockDetailFormatters";
import { useStockAnnouncementsQuery } from "./hooks/useStockAnnouncementsQuery";
import { useStockFinancialsQuery } from "./hooks/useStockFinancialsQuery";
import { useStockIndicatorsQuery } from "./hooks/useStockIndicatorsQuery";
import { useStockKeywordsQuery } from "./hooks/useStockKeywordsQuery";
import { useStockOverviewQuery } from "./hooks/useStockOverviewQuery";
import { useStockPriceStream } from "./hooks/useStockPriceStream";
import { useStockQuoteStream } from "./hooks/useStockQuoteStream";
import StockAnnouncementsSection from "./components/StockAnnouncementsSection";
import StockDetailTopBar from "./components/StockDetailTopBar";
import StockFinancialSection from "./components/StockFinancialSection";
import StockIndicatorsSection from "./components/StockIndicatorsSection";
import StockKeywordsNewsSection from "./components/StockKeywordsNewsSection";
import StockOverviewSection from "./components/StockOverviewSection";
import StockSectionLoadingOverlay from "./components/common/StockSectionLoadingOverlay";

type Props = {
  ticker: string;
};

export default function StockDetailPageClient({ ticker }: Props) {
  const [chartPeriod, setChartPeriod] = useState<StockChartPeriod>("1D");
  const [financialType, setFinancialType] = useState<StockFinancialType>("YEARLY");

  const overviewQuery = useStockOverviewQuery(ticker);
  const indicatorsQuery = useStockIndicatorsQuery(ticker);
  const financialsQuery = useStockFinancialsQuery(ticker, financialType);
  const keywordsQuery = useStockKeywordsQuery(ticker);
  const announcementsQuery = useStockAnnouncementsQuery(ticker, 4, 0);
  const chartPriceStream = useStockPriceStream(ticker, chartPeriod);
  const quoteStream = useStockQuoteStream(ticker);

  const currentPrice = useMemo(() => {
    if (typeof quoteStream.data.currentPrice === "number" && quoteStream.data.currentPrice > 0) {
      return quoteStream.data.currentPrice;
    }

    const latestClose = getLatestClose(chartPriceStream.data.prices);

    if (latestClose > 0) {
      return latestClose;
    }

    return overviewQuery.data?.latestPrice?.closePrice ?? 0;
  }, [chartPriceStream.data.prices, overviewQuery.data?.latestPrice?.closePrice, quoteStream.data.currentPrice]);

  const changeRate = useMemo(() => {
    if (typeof quoteStream.data.changeRate === "number") {
      return quoteStream.data.changeRate;
    }

    if (chartPeriod === "1MIN" && chartPriceStream.data.prices.length >= 2) {
      return getChangeRate(chartPriceStream.data.prices);
    }

    return overviewQuery.data?.latestPrice?.fluctuationRate ?? 0;
  }, [chartPeriod, chartPriceStream.data.prices, overviewQuery.data?.latestPrice?.fluctuationRate, quoteStream.data.changeRate]);

  const isOverviewPending = overviewQuery.isLoading || Boolean(overviewQuery.error) || !overviewQuery.data;
  const isChartPending = chartPriceStream.isLoading || (!chartPriceStream.data.prices.length && Boolean(chartPriceStream.error));
  const isIndicatorsPending = indicatorsQuery.isLoading || Boolean(indicatorsQuery.error);
  const isFinancialsPending = financialsQuery.isLoading || Boolean(financialsQuery.error);
  const isKeywordsPending = keywordsQuery.isLoading || Boolean(keywordsQuery.error);
  const isAnnouncementsPending = announcementsQuery.isLoading || Boolean(announcementsQuery.error);

  return (
    <main className="flex w-full justify-center bg-[color:var(--color-bg-primary)] pb-16">
      <div className="flex w-full flex-col items-center">
        <StockDetailTopBar stockId={overviewQuery.data?.id} stockName={overviewQuery.data?.name ?? ticker} />

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
                  prices={chartPriceStream.data.prices}
                  currentPrice={currentPrice}
                  changeRate={changeRate}
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
                  news={keywordsQuery.data?.news ?? []}
                  isLoading={isKeywordsPending}
                />
                <StockAnnouncementsSection
                  ticker={overviewQuery.data.ticker}
                  announcements={announcementsQuery.data?.announcements ?? []}
                  isLoading={isAnnouncementsPending}
                />
              </aside>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
