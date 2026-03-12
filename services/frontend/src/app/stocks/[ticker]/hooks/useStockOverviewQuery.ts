"use client";

import { useQuery } from "@tanstack/react-query";
import { getStockOverview } from "../api/getStockOverview";

export function useStockOverviewQuery(ticker: string) {
  return useQuery({
    queryKey: ["stock-detail", "overview", ticker],
    queryFn: () => getStockOverview(ticker),
    enabled: Boolean(ticker),
    staleTime: 30_000,
  });
}
