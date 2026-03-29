"use client";

import { useQuery } from "@tanstack/react-query";
import { getStockPerformance } from "../api/getStockPerformance";
import { transformPerformanceResponse } from "../utils/transformApiResponse";

export function useStockPerformanceQuery(stockId: string) {
  return useQuery({
    queryKey: ["portfolio-stock", "performance", stockId],
    queryFn: () => getStockPerformance(stockId),
    select: transformPerformanceResponse,
    enabled: Boolean(stockId),
    staleTime: 60_000,
  });
}
