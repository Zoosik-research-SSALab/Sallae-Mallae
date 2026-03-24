import { apiFetch } from "@/shared/lib/apiClient";
import type { StockFinancialType, StockFinancialsPayload } from "@/app/stocks/types/stockDetail";
import type { StockDetailApiEnvelope } from "./stockDetailApi";
import { unwrapStockDetailResponse } from "./stockDetailApi";

export async function getStockFinancials(ticker: string, type: StockFinancialType) {
  const query = new URLSearchParams({
    type,
  });

  const payload = await apiFetch<StockFinancialsPayload | StockDetailApiEnvelope<StockFinancialsPayload>>(
    `/api/stocks/${ticker}/financials?${query.toString()}`,
    {
      cache: "no-store",
    },
  );

  return unwrapStockDetailResponse(payload, "종목 실적 응답이 올바르지 않습니다.");
}
