import { apiFetch } from "@/shared/lib/apiClient";
import type { StockIndicators } from "@/app/stocks/types/stockDetail";

export function getStockIndicators(ticker: string) {
  return apiFetch<StockIndicators>(`/api/stocks/${ticker}/indicators`, {
    cache: "no-store",
  });
}
