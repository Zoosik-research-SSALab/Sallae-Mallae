import { apiFetch } from "@/shared/lib/apiClient";
import type { StockDetailOverview } from "@/app/stocks/types/stockDetail";

export function getStockOverview(ticker: string) {
  return apiFetch<StockDetailOverview>(`/api/stocks/${ticker}`, {
    cache: "no-store",
  });
}
