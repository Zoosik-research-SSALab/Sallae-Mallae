import { apiFetch, connectSse } from "@/shared/lib/apiClient";
import type {
  CategoriesPayload,
  MarketIndexPayload,
  NewSignalsPayload,
  PopularSearchesPayload,
  TopStocksPayload,
} from "../types/main";

export function subscribeTopStocks(handlers: { onMessage: (payload: TopStocksPayload) => void; onError?: (error: Event) => void }) {
  return connectSse<TopStocksPayload>("/api/main/test/top-stocks", handlers);
}

export function subscribeMarketIndex(handlers: { onMessage: (payload: MarketIndexPayload) => void; onError?: (error: Event) => void }) {
  return connectSse<MarketIndexPayload>("/api/main/test/market-index", handlers);
}

export function subscribeCategories(handlers: { onMessage: (payload: CategoriesPayload) => void; onError?: (error: Event) => void }) {
  return connectSse<CategoriesPayload>("/api/main/test/categories", handlers);
}

export async function getMainNewSignals() {
  return apiFetch<NewSignalsPayload>("/api/main/test/new-signals", { cache: "no-store" });
}

export async function getPopularSearches() {
  const payload = await apiFetch<TopStocksPayload>("/api/main/test/top-stocks", { cache: "no-store" });

  return {
    keywords: payload.stocks.slice(0, 5).map((item) => ({
      rank: item.rank,
      keyword: item.name,
    })),
  } satisfies PopularSearchesPayload;
}
