import { apiFetch } from "@/shared/lib/apiClient";
import type { StockIndicators } from "@/app/stocks/types/stockDetail";
import type { StockDetailApiEnvelope } from "./stockDetailApi";
import { unwrapStockDetailResponse } from "./stockDetailApi";

export async function getStockIndicators(stockId: string) {
  const payload = await apiFetch<StockIndicators | StockDetailApiEnvelope<StockIndicators>>(
    `/api/stocks/${stockId}/indicators`,
    {
      cache: "no-store",
    },
  );

  return unwrapStockDetailResponse(payload, "종목 지표 응답이 올바르지 않습니다.");
}
