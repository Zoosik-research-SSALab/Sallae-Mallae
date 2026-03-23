import { apiFetch } from "@/shared/lib/apiClient";
import type { TradeHistoryResponse } from "../types/report";

export async function getTradeHistory(stockId: string, offset = 0, limit = 10): Promise<TradeHistoryResponse> {
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });

  return apiFetch<TradeHistoryResponse>(`/api/report/${encodeURIComponent(stockId.trim())}/performance/trades?${query.toString()}`, {
    cache: "no-store",
  });
}
