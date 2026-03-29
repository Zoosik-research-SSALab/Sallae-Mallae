"use client";

import { useQuery } from "@tanstack/react-query";
import { getInvestmentPerformance } from "../api/getInvestmentPerformance";

export function useInvestmentPerformance(stockId: string) {
  return useQuery({
    queryKey: ["report-detail", "investment-performance", stockId],
    queryFn: () => getInvestmentPerformance(stockId),
    enabled: Boolean(stockId),
    staleTime: 30_000,
  });
}
