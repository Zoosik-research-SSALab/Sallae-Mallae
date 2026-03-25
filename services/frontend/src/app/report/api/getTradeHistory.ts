import { apiFetch } from "@/shared/lib/apiClient";
import type { TradeHistoryResponse } from "../types/report";

export async function getTradeHistory(stockId: string, _offset = 0, _limit = 10): Promise<TradeHistoryResponse> {
  return apiFetch<TradeHistoryResponse>(`/api/report/${encodeURIComponent(stockId.trim())}/performance/trades`, {
    cache: "no-store",
    withAuth: true,
  });
}
