"use client";

import { infiniteQueryOptions, useInfiniteQuery } from "@tanstack/react-query";
import { getStocks } from "../api/getStocks";
import type { StocksQueryParams, StocksResponse } from "../types/stocks";
import { STOCK_PAGE_SIZE, STOCK_TOTAL_COUNT } from "../utils/stocksFilters";
import { useAuthStore } from "@/shared/lib/authStore";

type BaseStocksQueryParams = Omit<StocksQueryParams, "offset" | "limit">;

export function normalizeStocksQueryParams(params: BaseStocksQueryParams) {
  return {
    ...params,
    sectors: [...params.sectors].sort(),
  };
}

export function getStocksInfiniteQueryOptions(
  params: BaseStocksQueryParams,
  authStatus: ReturnType<typeof useAuthStore.getState>["status"],
) {
  const normalizedParams = normalizeStocksQueryParams(params);

  return infiniteQueryOptions<StocksResponse>({
    queryKey: ["stocks", normalizedParams, authStatus],
    queryFn: ({ pageParam = 0 }) =>
      getStocks({
        ...normalizedParams,
        offset: Number(pageParam),
        limit: STOCK_PAGE_SIZE,
      }),
    enabled: authStatus !== "restoring",
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce(
        (total, page) => total + page.stocks.length,
        0,
      );

      if (lastPage.stocks.length === 0 || loadedCount >= STOCK_TOTAL_COUNT) {
        return undefined;
      }

      return loadedCount;
    },
    staleTime: 15_000,
    refetchInterval: 15_000,
  });
}

function dedupeStockItems(pages: StocksResponse[]) {
  const seen = new Set<number>();

  return pages.flatMap((page) =>
    page.stocks.filter((stock) => {
      if (seen.has(stock.id)) {
        return false;
      }

      seen.add(stock.id);
      return true;
    }),
  );
}

export function useStocksInfiniteQuery(params: BaseStocksQueryParams) {
  const authStatus = useAuthStore((state) => state.status);
  const query = useInfiniteQuery(getStocksInfiniteQueryOptions(params, authStatus));

  const pages = query.data?.pages ?? [];

  return {
    ...query,
    items: dedupeStockItems(pages),
    pageSize: STOCK_PAGE_SIZE,
    errorMessage: query.error instanceof Error ? query.error.message : null,
  };
}
