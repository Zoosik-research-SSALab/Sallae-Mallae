"use client";

import { useMemo, useState } from "react";
import type { StockChartPeriod, StockFinancialType } from "@/app/stocks/types/stockDetail";
import Badge from "@/shared/ui/Badge";
import { getChangeRate, getLatestClose } from "./utils/stockDetailFormatters";
import { useStockAnnouncementsQuery } from "./hooks/useStockAnnouncementsQuery";
import { useStockFinancialsQuery } from "./hooks/useStockFinancialsQuery";
import { useStockIndicatorsQuery } from "./hooks/useStockIndicatorsQuery";
import { useStockKeywordsQuery } from "./hooks/useStockKeywordsQuery";
import { useStockOverviewQuery } from "./hooks/useStockOverviewQuery";
import { useStockPriceStream } from "./hooks/useStockPriceStream";
import StockAnnouncementsSection from "./components/StockAnnouncementsSection";
import StockDetailTopBar from "./components/StockDetailTopBar";
import StockFinancialSection from "./components/StockFinancialSection";
import StockIndicatorsSection from "./components/StockIndicatorsSection";
import StockKeywordsNewsSection from "./components/StockKeywordsNewsSection";
import StockOverviewSection from "./components/StockOverviewSection";

type Props = {
  ticker: string;
};

export default function StockDetailPageClient({ ticker }: Props) {
  const [chartPeriod, setChartPeriod] = useState<StockChartPeriod>("1MIN");
  const [financialType, setFinancialType] = useState<StockFinancialType>("YEARLY");

  const overviewQuery = useStockOverviewQuery(ticker);
  const indicatorsQuery = useStockIndicatorsQuery(ticker);
  const financialsQuery = useStockFinancialsQuery(ticker, financialType);
  const keywordsQuery = useStockKeywordsQuery(ticker);
  const announcementsQuery = useStockAnnouncementsQuery(ticker, 4, 0);
  const priceStream = useStockPriceStream(ticker, chartPeriod);

  const currentPrice = useMemo(() => getLatestClose(priceStream.data.prices), [priceStream.data.prices]);
  const changeRate = useMemo(() => getChangeRate(priceStream.data.prices), [priceStream.data.prices]);
  const errorMessage =
    (overviewQuery.error instanceof Error && overviewQuery.error.message) ||
    (indicatorsQuery.error instanceof Error && indicatorsQuery.error.message) ||
    (financialsQuery.error instanceof Error && financialsQuery.error.message) ||
    (keywordsQuery.error instanceof Error && keywordsQuery.error.message) ||
    (announcementsQuery.error instanceof Error && announcementsQuery.error.message) ||
    (priceStream.error ? "차트 데이터를 불러오지 못했습니다." : null);

  return (
    <main className="flex w-full justify-center bg-[color:var(--color-bg-primary)] pb-16">
      <div className="flex w-full flex-col">
        <StockDetailTopBar stockId={overviewQuery.data?.id} stockName={overviewQuery.data?.name ?? ticker} />

        <div className="mx-auto flex w-full max-w-[1152px] flex-col gap-10 px-4 py-6 md:px-6 md:py-8 xl:px-8 xl:py-10">
          {errorMessage ? <Badge tone="danger">{errorMessage}</Badge> : null}

          {overviewQuery.isLoading || !overviewQuery.data ? (
            <div className="space-y-6">
              <div className="h-12 w-48 animate-pulse rounded bg-[color:var(--color-bg-secondary)]" />
              <div className="h-[360px] animate-pulse rounded-2xl bg-[color:var(--color-bg-secondary)]" />
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-40 animate-pulse rounded-2xl bg-[color:var(--color-bg-secondary)]" />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
              <section className="min-w-0">
                <StockOverviewSection
                  overview={overviewQuery.data}
                  prices={priceStream.data.prices}
                  currentPrice={currentPrice}
                  changeRate={changeRate}
                  chartPeriod={chartPeriod}
                  onChartPeriodChange={setChartPeriod}
                  isChartLoading={priceStream.isLoading}
                />

                <StockIndicatorsSection indicators={indicatorsQuery.data} isLoading={indicatorsQuery.isLoading} />

                <StockFinancialSection
                  type={financialType}
                  onTypeChange={setFinancialType}
                  financials={financialsQuery.data?.financials ?? []}
                  latestAnnouncement={announcementsQuery.data?.announcements[0]}
                  isLoading={financialsQuery.isLoading}
                />
              </section>

              <aside className="flex min-w-0 flex-col gap-12">
                <StockKeywordsNewsSection
                  keywords={keywordsQuery.data?.keywords ?? []}
                  news={keywordsQuery.data?.news ?? []}
                  isLoading={keywordsQuery.isLoading}
                />
                <StockAnnouncementsSection
                  ticker={overviewQuery.data.ticker}
                  announcements={announcementsQuery.data?.announcements ?? []}
                  isLoading={announcementsQuery.isLoading}
                />
              </aside>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
