"use client";

import { useQuery } from "@tanstack/react-query";
import { getWatchlistNews } from "../api/getWatchlistNews";

export function useWatchlistNewsQuery() {
  const query = useQuery({
    queryKey: ["scraps", "watchlist-news"],
    queryFn: getWatchlistNews,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    errorMessage: query.error instanceof Error ? query.error.message : null,
  };
}
