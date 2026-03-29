"use client";

import { useQuery } from "@tanstack/react-query";
import type { NewsQueryParams } from "../types/news";
import { getWatchlistNewsPage } from "../api/getNews";

type Params = Pick<NewsQueryParams, "offset" | "limit" | "keyword" | "startDate" | "endDate">;

type Options = {
  enabled?: boolean;
};

export function useNewsWatchlistQuery(params: Params, options: Options = {}) {
  return useQuery({
    queryKey: ["news", "watchlist", params],
    queryFn: () => getWatchlistNewsPage(params),
    enabled: options.enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
    placeholderData: (previousData) => previousData,
  });
}
