import { authApiFetch } from "@/shared/lib/authApiClient";
import type {
  WatchlistNotificationResponse,
  WatchlistStatus,
  WatchlistToggleResponse,
} from "@/shared/types/watchlist";

export const watchlistQueryKeys = {
  all: ["watchlist"] as const,
  status: (stockId: number) => ["watchlist", "status", stockId] as const,
};

export function getWatchlistStatus(stockId: number) {
  return authApiFetch<WatchlistStatus>(`/api/users/watchlist/${stockId}`, {
    cache: "no-store",
    useBaseUrl: false,
  });
}

export function addWatchlist(stockId: number) {
  return authApiFetch<WatchlistToggleResponse, { stockId: number }>("/api/users/watchlist", {
    method: "POST",
    body: { stockId },
    useBaseUrl: false,
  });
}

export function removeWatchlist(stockId: number) {
  return authApiFetch<WatchlistToggleResponse>(`/api/users/watchlist/${stockId}`, {
    method: "DELETE",
    useBaseUrl: false,
  });
}

export function toggleWatchlistNotification(stockId: number) {
  return authApiFetch<WatchlistNotificationResponse>(`/api/users/watchlist/${stockId}`, {
    method: "PATCH",
    useBaseUrl: false,
  });
}
