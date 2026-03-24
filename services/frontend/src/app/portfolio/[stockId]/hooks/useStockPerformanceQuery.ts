"use client";

import { useQuery } from "@tanstack/react-query";
import { getStockPerformance } from "../api/getStockPerformance";

export function useStockPerformanceQuery(stockId: string) {
  return useQuery({
    queryKey: ["portfolio-stock", "performance", stockId],
    queryFn: () => getStockPerformance(stockId),
    enabled: Boolean(stockId),
    staleTime: 60_000,
  });
}
