"use client";

import { useMemo, useState } from "react";
import StocksDesktopTable from "./components/StocksDesktopTable";
import StocksMobileList from "./components/StocksMobileList";
import StocksSidebar from "./components/StocksSidebar";
import { useStocksInfiniteQuery } from "./hooks/useStocksInfiniteQuery";
import type { StockRankingMetric } from "./types/stocks";
import { sortStocksByMetric } from "./utils/stockMetrics";
import { ALL_SECTOR, getApiSortForRankingMetric } from "./utils/stocksFilters";
import Badge from "@/shared/ui/Badge";

export default function StocksPageClient() {
  const [selectedSector, setSelectedSector] = useState(ALL_SECTOR);
  const [activeMetric, setActiveMetric] = useState<StockRankingMetric>("TURNOVER");

  const { items, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, pageSize, errorMessage } =
    useStocksInfiniteQuery({
      signal: "ALL",
      sector: selectedSector,
      marketCap: "ALL",
      sort: getApiSortForRankingMetric(activeMetric),
      keyword: "",
    });

  const sortedItems = useMemo(() => sortStocksByMetric(items, activeMetric), [items, activeMetric]);

  const handleLoadMore = () => {
    if (!hasNextPage || isFetchingNextPage) {
      return;
    }

    void fetchNextPage();
  };

  return (
    <main className="flex w-full justify-center bg-[color:var(--color-bg-primary)]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-center gap-10 px-6 py-10 lg:flex-row lg:items-start">
        <div className="mx-auto flex w-full max-w-[1024px] flex-col gap-8 lg:flex-row lg:items-start lg:gap-12">
          <StocksSidebar selectedSector={selectedSector} onSelectSector={setSelectedSector} />

          <section className="flex min-w-0 flex-1 flex-col gap-6 lg:max-w-[756px]">
            <div className="flex flex-col gap-1 lg:hidden">
              <h1 className="typo-heading-md text-[color:var(--color-text-primary)]">실시간 발견</h1>
              <p className="typo-body-xs font-medium text-[color:var(--color-text-secondary)]">코스피 200 전 종목</p>
            </div>

            {errorMessage ? <Badge tone="danger">{errorMessage}</Badge> : null}

            <StocksMobileList
              items={sortedItems}
              activeMetric={activeMetric}
              onMetricChange={setActiveMetric}
              onLoadMore={handleLoadMore}
              hasNextPage={Boolean(hasNextPage)}
              isLoading={isLoading && !isFetchingNextPage}
              isFetchingNextPage={isFetchingNextPage}
              pageSize={pageSize}
            />

            <StocksDesktopTable
              items={sortedItems}
              activeMetric={activeMetric}
              onMetricChange={setActiveMetric}
              onLoadMore={handleLoadMore}
              hasNextPage={Boolean(hasNextPage)}
              isLoading={isLoading && !isFetchingNextPage}
              isFetchingNextPage={isFetchingNextPage}
              pageSize={pageSize}
            />

            {!isLoading && isFetching && !isFetchingNextPage ? (
              <p className="typo-body-sm text-center text-[color:var(--color-text-tertiary)]">실시간 순위를 동기화하는 중...</p>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
