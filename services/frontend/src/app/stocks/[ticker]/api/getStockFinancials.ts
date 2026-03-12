import { apiFetch } from "@/shared/lib/apiClient";
import type { StockFinancialType, StockFinancialsPayload } from "@/app/stocks/types/stockDetail";

export function getStockFinancials(ticker: string, type: StockFinancialType) {
  const query = new URLSearchParams({
    type,
  });

  return apiFetch<StockFinancialsPayload>(`/api/stocks/${ticker}/financials?${query.toString()}`, {
    cache: "no-store",
    useBaseUrl: false,
  });
}
