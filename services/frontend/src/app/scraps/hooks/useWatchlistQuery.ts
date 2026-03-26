"use client";

import { useQuery } from "@tanstack/react-query";
import { getWatchlistList, watchlistQueryKeys } from "@/shared/lib/watchlistApi";

export function useWatchlistQuery() {
  const query = useQuery({
    queryKey: watchlistQueryKeys.lists,
    queryFn: () => getWatchlistList(),
    staleTime: 30_000,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
  };
}
