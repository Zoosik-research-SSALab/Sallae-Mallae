import { apiFetch } from "@/shared/lib/apiClient";
import type { StockKeywordsPayload } from "@/app/stocks/types/stockDetail";
import type { StockDetailApiEnvelope } from "./stockDetailApi";
import { unwrapStockDetailResponse } from "./stockDetailApi";

export async function getStockKeywords(stockId: string) {
  const payload = await apiFetch<StockKeywordsPayload | StockDetailApiEnvelope<StockKeywordsPayload>>(
    `/api/stocks/${stockId}/keywords`,
    {
      cache: "no-store",
    },
  );

  return unwrapStockDetailResponse(payload, "종목 키워드 응답이 올바르지 않습니다.");
}
