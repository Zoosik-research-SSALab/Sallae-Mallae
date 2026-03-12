"use client";

import { useQuery } from "@tanstack/react-query";
import { getStockKeywords } from "../api/getStockKeywords";

export function useStockKeywordsQuery(ticker: string) {
  return useQuery({
    queryKey: ["stock-detail", "keywords", ticker],
    queryFn: () => getStockKeywords(ticker),
    enabled: Boolean(ticker),
    staleTime: 60_000,
  });
}
