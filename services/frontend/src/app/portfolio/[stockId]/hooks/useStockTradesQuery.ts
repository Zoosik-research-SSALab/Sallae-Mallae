"use client";

import { useQuery } from "@tanstack/react-query";
import { getStockTrades } from "../api/getStockTrades";

export function useStockTradesQuery(
  stockId: string,
  offset?: number,
  limit?: number,
) {
  return useQuery({
    queryKey: ["portfolio-stock", "trades", stockId, offset, limit],
    queryFn: () => getStockTrades(stockId, offset, limit),
    enabled: Boolean(stockId),
    staleTime: 60_000,
  });
}
