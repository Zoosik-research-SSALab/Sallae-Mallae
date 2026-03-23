"use client";

import { useQuery } from "@tanstack/react-query";
import { getWatchlistNewsPage } from "../api/getNews";

type Params = {
  offset: number;
  limit: number;
};

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
  });
}
