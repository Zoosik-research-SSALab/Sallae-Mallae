import { apiFetch, connectSse } from "@/shared/lib/apiClient";
import type {
  CategoriesPayload,
  MarketIndexPayload,
  NewSignalsPayload,
  PopularSearchesPayload,
  TopStocksPayload,
} from "../types/main";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error: unknown | null;
};

export function subscribeTopStocks(handlers: { onMessage: (payload: TopStocksPayload) => void; onError?: (error: Event) => void }) {
  return connectSse<TopStocksPayload>("/api/stream/main/top-stocks", handlers);
}

export function subscribeMarketIndex(handlers: { onMessage: (payload: MarketIndexPayload) => void; onError?: (error: Event) => void }) {
  return connectSse<MarketIndexPayload>("/api/stream/main/market-index", handlers);
}

export function subscribeCategories(handlers: { onMessage: (payload: CategoriesPayload) => void; onError?: (error: Event) => void }) {
  return connectSse<CategoriesPayload>("/api/stream/main/categories", handlers);
}

export async function getMainNewSignals() {
  const payload = await apiFetch<ApiResponse<NewSignalsPayload> | NewSignalsPayload>("/api/main/new-signals", {
    cache: "no-store",
  });

  if (typeof payload === "object" && payload !== null && "data" in payload) {
    return payload.data;
  }

  return payload;
}

export async function getPopularSearches() {
  const payload = await apiFetch<TopStocksPayload>("/api/main/top-stocks", { cache: "no-store" });

  return {
    keywords: payload.stocks.slice(0, 5).map((item) => ({
      rank: item.rank,
      keyword: item.name,
    })),
  } satisfies PopularSearchesPayload;
}
