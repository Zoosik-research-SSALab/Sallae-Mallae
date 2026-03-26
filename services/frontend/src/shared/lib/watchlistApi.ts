import { authApiFetch } from "@/shared/lib/authApiClient";
import type {
  WatchlistListResponse,
  WatchlistNotificationResponse,
  WatchlistStatus,
  WatchlistToggleResponse,
} from "@/shared/types/watchlist";

export const watchlistQueryKeys = {
  all: ["watchlist"] as const,
  lists: ["watchlist", "list"] as const,
  status: (stockId: number) => ["watchlist", "status", stockId] as const,
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: unknown | null;
};

type WatchlistStatusPayload = {
  isWatched?: boolean;
  isNotifiedEnabled?: boolean;
  isNotiEnabled?: boolean;
};

type WatchlistNotificationPayload = {
  isNotifiedEnabled?: boolean;
  isNotiEnabled?: boolean;
};

type WatchlistNotificationRequest = {
  isNotiEnabled: boolean;
};

type WatchlistListItemPayload = {
  stockId?: number;
  ticker?: string;
  name?: string;
  isNotifiedEnabled?: boolean;
  isNotiEnabled?: boolean;
  price?: number;
  fluctuationRate?: number;
  signal?: string;
  confidence?: number;
  createdAt?: string | null;
};

type WatchlistListPayload = {
  total?: number;
  totalCount?: number;
  buyCount?: number;
  sellCount?: number;
  upCount?: number;
  watchlist?: WatchlistListItemPayload[];
};

function unwrapApiEnvelope<T>(payload: T | ApiEnvelope<T>) {
  if (typeof payload === "object" && payload !== null && "data" in payload) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.data !== undefined) {
      return envelope.data;
    }
  }

  return payload as T;
}

function normalizeWatchlistStatus(payload: WatchlistStatusPayload | undefined): WatchlistStatus {
  return {
    isWatched: payload?.isWatched ?? false,
    isNotifiedEnabled:
      payload?.isNotifiedEnabled ?? payload?.isNotiEnabled ?? false,
  };
}

function normalizeWatchlistNotification(
  payload: WatchlistNotificationPayload | undefined,
): WatchlistNotificationResponse {
  return {
    isNotifiedEnabled:
      payload?.isNotifiedEnabled ?? payload?.isNotiEnabled ?? false,
  };
}

function normalizeWatchlistList(
  payload: WatchlistListPayload | undefined,
): WatchlistListResponse {
  const items = Array.isArray(payload?.watchlist) ? payload.watchlist : [];

  return {
    totalCount: payload?.totalCount ?? payload?.total ?? items.length,
    buyCount: payload?.buyCount ?? 0,
    sellCount: payload?.sellCount ?? 0,
    upCount: payload?.upCount ?? 0,
    watchlist: items.map((item) => ({
      stockId: item.stockId ?? 0,
      ticker: item.ticker ?? "",
      name: item.name ?? "",
      isNotifiedEnabled: item.isNotifiedEnabled ?? item.isNotiEnabled ?? false,
      price: item.price ?? 0,
      fluctuationRate: item.fluctuationRate ?? 0,
      signal: item.signal ?? "HOLD",
      confidence: item.confidence ?? 0,
      createdAt: item.createdAt ?? null,
    })),
  };
}

export async function getWatchlistList() {
  const payload = await authApiFetch<WatchlistListPayload | ApiEnvelope<WatchlistListPayload>>(
    "/api/users/watchlist",
    {
      cache: "no-store",
    },
  );

  return normalizeWatchlistList(unwrapApiEnvelope(payload));
}

export async function getWatchlistStatus(stockId: number) {
  const payload = await authApiFetch<WatchlistStatusPayload | ApiEnvelope<WatchlistStatusPayload>>(
    `/api/users/watchlist/${stockId}`,
    {
      cache: "no-store",
    },
  );

  return normalizeWatchlistStatus(unwrapApiEnvelope(payload));
}

export async function addWatchlist(stockId: number) {
  const payload = await authApiFetch<
    WatchlistToggleResponse | ApiEnvelope<WatchlistToggleResponse>,
    { stock_id: number }
  >("/api/users/watchlist", {
    method: "POST",
    body: { stock_id: stockId },
  });

  return unwrapApiEnvelope(payload);
}

export async function removeWatchlist(stockId: number) {
  const payload = await authApiFetch<
    WatchlistToggleResponse | ApiEnvelope<WatchlistToggleResponse>
  >(`/api/users/watchlist/${stockId}`, {
    method: "DELETE",
  });

  return unwrapApiEnvelope(payload);
}

export async function toggleWatchlistNotification(
  stockId: number,
  isNotiEnabled: boolean,
) {
  const payload = await authApiFetch<
    WatchlistNotificationPayload | ApiEnvelope<WatchlistNotificationPayload>,
    WatchlistNotificationRequest
  >(`/api/users/watchlist/${stockId}`, {
    method: "PATCH",
    body: {
      isNotiEnabled,
    },
  });

  return normalizeWatchlistNotification(unwrapApiEnvelope(payload));
}
