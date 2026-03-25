import { apiFetch } from "@/shared/lib/apiClient";
import type { TradeHistoryResponse } from "../types/report";

type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: {
    code?: string;
    message?: string;
  } | null;
};

export async function getTradeHistory(stockId: string, _offset = 0, _limit = 10): Promise<TradeHistoryResponse> {
  const payload = await apiFetch<ApiEnvelope<TradeHistoryResponse>>(
    `/api/report/${encodeURIComponent(stockId.trim())}/performance/trades`,
    {
      cache: "no-store",
      withAuth: true,
    },
  );

  if (!payload.success || !payload.data) {
    throw new Error(payload.error?.message ?? "거래 내역 응답이 비어 있습니다.");
  }

  return payload.data;
}
