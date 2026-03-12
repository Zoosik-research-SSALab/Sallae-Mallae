"use client";

import { useQuery } from "@tanstack/react-query";
import { getStockIndicators } from "../api/getStockIndicators";

export function useStockIndicatorsQuery(ticker: string) {
  return useQuery({
    queryKey: ["stock-detail", "indicators", ticker],
    queryFn: () => getStockIndicators(ticker),
    enabled: Boolean(ticker),
    staleTime: 60_000,
  });
}
