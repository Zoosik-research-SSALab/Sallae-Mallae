"use client";

import { useQuery } from "@tanstack/react-query";
import { getPopularSearches } from "../api/main";

export function usePopularSearchesQuery() {
  return useQuery({
    queryKey: ["main", "popular-searches"],
    queryFn: getPopularSearches,
    staleTime: 60_000,
  });
}
