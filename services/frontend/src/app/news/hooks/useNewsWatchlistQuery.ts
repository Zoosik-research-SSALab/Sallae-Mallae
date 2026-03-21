"use client";

import { useQuery } from "@tanstack/react-query";
import { getWatchlistNewsPage } from "../api/getNews";

type Params = {
  offset: number;
  limit: number;
};

export function useNewsWatchlistQuery(params: Params, enabled = true) {
  return useQuery({
    queryKey: ["news", "watchlist", params],
    queryFn: () => getWatchlistNewsPage(params),
    enabled,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
}
