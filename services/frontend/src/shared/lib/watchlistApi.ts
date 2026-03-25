import { authApiFetch } from "@/shared/lib/authApiClient";
import type {
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
    { stockId: number }
  >("/api/users/watchlist", {
    method: "POST",
    body: { stockId },
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
