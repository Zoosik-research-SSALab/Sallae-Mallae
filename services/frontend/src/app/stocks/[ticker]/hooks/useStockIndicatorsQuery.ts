"use client";

import { useQuery } from "@tanstack/react-query";
import { getStockIndicators } from "../api/getStockIndicators";

export function useStockIndicatorsQuery(stockId: string) {
  return useQuery({
    queryKey: ["stock-detail", "indicators", stockId],
    queryFn: () => getStockIndicators(stockId),
    enabled: Boolean(stockId),
    staleTime: 60_000,
  });
}
