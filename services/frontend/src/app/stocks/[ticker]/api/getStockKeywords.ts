import { apiFetch } from "@/shared/lib/apiClient";
import type { StockKeywordsPayload } from "@/app/stocks/types/stockDetail";

export function getStockKeywords(ticker: string) {
  return apiFetch<StockKeywordsPayload>(`/api/stocks/${ticker}/keywords`, {
    cache: "no-store",
  });
}
