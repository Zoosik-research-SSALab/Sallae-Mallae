"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import StocksDesktopTable from "./components/StocksDesktopTable";
import StocksMobileList from "./components/StocksMobileList";
import StocksSidebar from "./components/StocksSidebar";
import { getStocksInfiniteQueryOptions, useStocksInfiniteQuery } from "./hooks/useStocksInfiniteQuery";
import type { StockRankingMetric } from "./types/stocks";
import { ALL_SECTOR, getApiSortForRankingMetric } from "./utils/stocksFilters";
import { useAuthStore } from "@/shared/lib/authStore";
import Badge from "@/shared/ui/Badge";

export default function StocksPageClient() {
  const [selectedSectors, setSelectedSectors] = useState<string[]>([ALL_SECTOR]);
  const [activeMetric, setActiveMetric] = useState<StockRankingMetric>("TURNOVER");
  const authStatus = useAuthStore((state) => state.status);
  const authUserId = useAuthStore((state) => state.user?.userId ?? null);
  const queryClient = useQueryClient();
  const prefetchedScopeKeysRef = useRef<Set<string>>(new Set());

  const { items, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, pageSize, errorMessage } =
    useStocksInfiniteQuery({
      sectors: selectedSectors,
      sort: getApiSortForRankingMetric(activeMetric),
    });

  const prefetchIdentityKey = useMemo(
    () => (authStatus === "authenticated" && authUserId !== null ? `user:${authUserId}` : authStatus),
    [authStatus, authUserId],
  );
  const prefetchScopeKey = useMemo(
    () => `${prefetchIdentityKey}:${[...selectedSectors].sort().join(",")}`,
    [prefetchIdentityKey, selectedSectors],
  );

  useEffect(() => {
    prefetchedScopeKeysRef.current.clear();
  }, [prefetchIdentityKey]);

  useEffect(() => {
    if (authStatus === "restoring" || isLoading || items.length === 0) {
      return;
    }

    if (prefetchedScopeKeysRef.current.has(prefetchScopeKey)) {
      return;
    }

    prefetchedScopeKeysRef.current.add(prefetchScopeKey);

    const prefetchMetrics = (["TURNOVER", "VOLUME", "RETURN"] as StockRankingMetric[]).filter(
      (metric) => metric !== activeMetric,
    );

    void Promise.all(
      prefetchMetrics.map((metric) => {
        const sort = getApiSortForRankingMetric(metric);

        return queryClient.prefetchInfiniteQuery(
          getStocksInfiniteQueryOptions(
            {
              sectors: selectedSectors,
              sort,
            },
            authStatus,
          ),
        );
      }),
    );
  }, [activeMetric, authStatus, isLoading, items.length, prefetchScopeKey, queryClient, selectedSectors]);

  const handleToggleSector = (value: string) => {
    setSelectedSectors((current) => {
      if (value === ALL_SECTOR) {
        return [ALL_SECTOR];
      }

      const withoutAll = current.filter((sector) => sector !== ALL_SECTOR);

      if (withoutAll.includes(value)) {
        const nextSectors = withoutAll.filter((sector) => sector !== value);
        return nextSectors.length > 0 ? nextSectors : [ALL_SECTOR];
      }

      return [...withoutAll, value];
    });
  };

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
          <StocksSidebar selectedSectors={selectedSectors} onToggleSector={handleToggleSector} />

          <section className="flex min-w-0 flex-1 flex-col gap-6 lg:max-w-[756px]">
            <div className="flex flex-col gap-1 lg:hidden">
              <h1 className="typo-heading-lg text-[color:var(--color-text-primary)]">실시간 발견</h1>
              <p className="typo-body-xs font-medium text-[color:var(--color-text-secondary)]">코스피 200 전 종목</p>
            </div>

            {errorMessage ? <Badge tone="danger">{errorMessage}</Badge> : null}

            <StocksMobileList
              items={items}
              activeMetric={activeMetric}
              onMetricChange={setActiveMetric}
              onLoadMore={handleLoadMore}
              hasNextPage={Boolean(hasNextPage)}
              isLoading={isLoading && !isFetchingNextPage}
              isFetchingNextPage={isFetchingNextPage}
              pageSize={pageSize}
            />

            <StocksDesktopTable
              items={items}
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
