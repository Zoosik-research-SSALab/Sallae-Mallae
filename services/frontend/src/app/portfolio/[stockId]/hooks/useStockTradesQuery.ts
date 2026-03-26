"use client";

import { useQuery } from "@tanstack/react-query";
import { getStockTrades } from "../api/getStockTrades";
import { transformTradesResponse } from "../utils/transformApiResponse";

export function useStockTradesQuery(stockId: string, offset = 0, limit = 20) {
  return useQuery({
    queryKey: ["portfolio-stock", "trades", stockId, offset, limit],
    queryFn: () => getStockTrades(stockId, offset, limit),
    select: transformTradesResponse,
    enabled: Boolean(stockId),
    staleTime: 60_000,
  });
}
