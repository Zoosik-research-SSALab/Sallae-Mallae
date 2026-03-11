"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getStocks } from "../api/getStocks";
import type { StockFilterCounts, StocksQueryParams, StocksResponse } from "../types/stocks";
import { STOCK_PAGE_SIZE } from "../utils/stocksFilters";

type BaseStocksQueryParams = Omit<StocksQueryParams, "offset" | "limit">;

const EMPTY_FILTER_COUNTS: StockFilterCounts = {
  buy: 0,
  sell: 0,
  hold: 0,
};

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
      if (lastPage.stocks.length < STOCK_PAGE_SIZE) {
        return undefined;
      }

      return allPages.reduce((total, page) => total + page.stocks.length, 0);
    },
    staleTime: 15_000,
    refetchInterval: 15_000,
  });

  const pages = query.data?.pages ?? [];
  const firstPage = pages[0];

  return {
    ...query,
    items: pages.flatMap((page) => page.stocks),
    filterCounts: firstPage?.filterCounts ?? EMPTY_FILTER_COUNTS,
    pageSize: STOCK_PAGE_SIZE,
    errorMessage: query.error instanceof Error ? query.error.message : null,
  };
}
