"use client";

import { useQuery } from "@tanstack/react-query";
import { getTradeHistory } from "../api/getTradeHistory";
import type { TradeHistoryItem, TradeHistoryResponse } from "../types/report";

function transformTradesResponse(raw: unknown): TradeHistoryResponse {
  if (typeof raw !== "object" || raw === null) return { trades: [] };
  const record = raw as Record<string, unknown>;
  const tradeCycles = Array.isArray(record.tradeCycles) ? record.tradeCycles : [];
  return { trades: tradeCycles as TradeHistoryItem[] };
}

export function useTradeHistory(stockId: string, offset = 0, limit = 100) {
  return useQuery({
    queryKey: ["report-detail", "trade-history", stockId, offset, limit],
    queryFn: () => getTradeHistory(stockId, offset, limit),
    select: transformTradesResponse,
    enabled: Boolean(stockId),
    staleTime: 60_000,
  });
}
