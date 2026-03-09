import { apiFetch } from "@/shared/lib/apiClient";
import type { WatchlistStatus, WatchlistToggleResponse } from "@/shared/types/watchlist";

export const watchlistQueryKeys = {
  all: ["watchlist"] as const,
  status: (stockId: number) => ["watchlist", "status", stockId] as const,
};

export function getWatchlistStatus(stockId: number) {
  return apiFetch<WatchlistStatus>(`/api/users/watchlist/${stockId}`, {
    cache: "no-store",
  });
}

export function addWatchlist(stockId: number) {
  return apiFetch<WatchlistToggleResponse, { stockId: number }>("/api/users/watchlist", {
    method: "POST",
    body: { stockId },
  });
}

export function removeWatchlist(stockId: number) {
  return apiFetch<WatchlistToggleResponse>(`/api/users/watchlist/${stockId}`, {
    method: "DELETE",
  });
}
