"use client";

import { useQuery } from "@tanstack/react-query";
import { getStockKeywords } from "../api/getStockKeywords";

export function useStockKeywordsQuery(stockId: string) {
  return useQuery({
    queryKey: ["stock-detail", "keywords", stockId],
    queryFn: () => getStockKeywords(stockId),
    enabled: Boolean(stockId),
    staleTime: 60_000,
  });
}
