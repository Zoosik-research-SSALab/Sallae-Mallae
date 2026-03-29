import { apiFetch, connectSse } from "@/shared/lib/apiClient";
import type {
  CategoriesPayload,
  MarketIndexPayload,
  NewSignalsPayload,
  PopularSearchesPayload,
  TopStocksPayload,
} from "../types/main";

export function subscribeTopStocks(handlers: { onMessage: (payload: TopStocksPayload) => void; onError?: (error: Event) => void }) {
  return connectSse<TopStocksPayload>("/api/main/top-stocks", handlers);
}

export function subscribeMarketIndex(handlers: { onMessage: (payload: MarketIndexPayload) => void; onError?: (error: Event) => void }) {
  return connectSse<MarketIndexPayload>("/api/main/market-index", handlers);
}

export function subscribeCategories(handlers: { onMessage: (payload: CategoriesPayload) => void; onError?: (error: Event) => void }) {
  return connectSse<CategoriesPayload>("/api/main/categories", handlers);
}

export async function getMainNewSignals() {
  return apiFetch<NewSignalsPayload>("/api/main/new-signals", { cache: "no-store" });
}

export async function getPopularSearches() {
  return apiFetch<PopularSearchesPayload>("/api/main/popular-searches", { cache: "no-store" });
}
