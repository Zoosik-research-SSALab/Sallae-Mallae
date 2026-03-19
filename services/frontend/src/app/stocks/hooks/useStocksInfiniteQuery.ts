"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getStocks } from "../api/getStocks";
import type { StocksQueryParams, StocksResponse } from "../types/stocks";
import { STOCK_PAGE_SIZE, STOCK_TOTAL_COUNT } from "../utils/stocksFilters";

type BaseStocksQueryParams = Omit<StocksQueryParams, "offset" | "limit">;

export function useStocksInfiniteQuery(params: BaseStocksQueryParams) {
  const query = useInfiniteQuery<StocksResponse>({
    queryKey: ["stocks", params],
    queryFn: ({ pageParam = 0 }) =>
      getStocks({
        ...params,
        offset: Number(pageParam),
        limit: STOCK_PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce((total, page) => total + page.stocks.length, 0);

      if (lastPage.stocks.length === 0 || loadedCount >= STOCK_TOTAL_COUNT) {
        return undefined;
      }

      return loadedCount;
    },
    staleTime: 15_000,
    refetchInterval: 15_000,
  });

  const pages = query.data?.pages ?? [];

  return {
    ...query,
    items: pages.flatMap((page) => page.stocks),
    pageSize: STOCK_PAGE_SIZE,
    errorMessage: query.error instanceof Error ? query.error.message : null,
  };
}
