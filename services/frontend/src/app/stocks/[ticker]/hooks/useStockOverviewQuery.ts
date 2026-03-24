"use client";

import { useQuery } from "@tanstack/react-query";
import { getStockOverview } from "../api/getStockOverview";

export function useStockOverviewQuery(stockId: string) {
  return useQuery({
    queryKey: ["stock-detail", "overview", stockId],
    queryFn: () => getStockOverview(stockId),
    enabled: Boolean(stockId),
    staleTime: 30_000,
  });
}
