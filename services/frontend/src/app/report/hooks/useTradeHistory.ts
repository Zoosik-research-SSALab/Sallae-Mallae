"use client";

import { useQuery } from "@tanstack/react-query";
import { getTradeHistory } from "../api/getTradeHistory";

export function useTradeHistory(stockId: string, offset = 0, limit = 100) {
  return useQuery({
    queryKey: ["report-detail", "trade-history", stockId, offset, limit],
    queryFn: () => getTradeHistory(stockId, offset, limit),
    enabled: Boolean(stockId),
    staleTime: 30_000,
  });
}
