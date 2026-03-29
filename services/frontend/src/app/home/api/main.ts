import { connectSse } from "@/shared/lib/apiClient";
import { authApiFetch } from "@/shared/lib/authApiClient";
import { subscribeTrendingSearchStocks } from "@/shared/lib/searchApi";
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

export function subscribeMarketIndex(handlers: {
  onMessage: (payload: MarketIndexPayload) => void;
  onError?: (error: Event) => void;
}) {
  return connectSse<MarketIndexPayload>("/api/stream/main/market-index", handlers);
}

export function subscribeCategories(handlers: {
  onMessage: (payload: CategoriesPayload) => void;
  onError?: (error: Event) => void;
}) {
  return connectSse<CategoriesPayload>("/api/stream/main/categories", handlers);
}

export async function getMainNewSignals() {
  const payload = await authApiFetch<ApiResponse<NewSignalsPayload> | NewSignalsPayload>(
    "/api/main/new-signals",
    {
      cache: "no-store",
    },
  );

  if (typeof payload === "object" && payload !== null && "data" in payload) {
    return payload.data;
  }

  return payload;
}

export async function getTopStocks() {
  const payload = await authApiFetch<ApiResponse<TopStocksPayload> | TopStocksPayload>(
    "/api/main/top-stocks",
    {
      cache: "no-store",
    },
  );

  if (typeof payload === "object" && payload !== null && "data" in payload) {
    return payload.data;
  }

  return payload;
}

export async function getPopularSearches() {
  const payload = await getTopStocks();

  return {
    keywords: payload.stocks.slice(0, 5).map((item) => ({
      rank: item.rank,
      keyword: item.name,
    })),
  } satisfies PopularSearchesPayload;
}

export function subscribePopularSearches(handlers: {
  onMessage: (payload: PopularSearchesPayload) => void;
  onError?: (error: Event) => void;
}) {
  return subscribeTrendingSearchStocks({
    onMessage: (payload) => {
      handlers.onMessage({
        keywords: payload.stocks.slice(0, 5).map((item) => ({
          rank: item.rank,
          keyword: item.name,
        })),
      });
    },
    onError: handlers.onError,
  });
}
