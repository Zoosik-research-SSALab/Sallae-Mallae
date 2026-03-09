import type { WatchlistStatus, WatchlistToggleResponse } from "@/shared/types/watchlist";

type WatchlistEntry = {
  isNotifiedEnabled: boolean;
};

const watchlistStore = new Map<number, WatchlistEntry>([
  [4, { isNotifiedEnabled: true }],
  [102, { isNotifiedEnabled: false }],
]);

export function getMockWatchlistStatus(stockId: number): WatchlistStatus {
  const entry = watchlistStore.get(stockId);

  return {
    isWatched: Boolean(entry),
    isNotifiedEnabled: entry?.isNotifiedEnabled ?? false,
  };
}

export function addMockWatchlist(stockId: number): WatchlistToggleResponse {
  watchlistStore.set(stockId, {
    isNotifiedEnabled: false,
  });

  return {
    message: "\uad00\uc2ec\uc885\ubaa9 \ucd94\uac00 \uc644\ub8cc",
    count: watchlistStore.size,
  };
}

export function removeMockWatchlist(stockId: number): WatchlistToggleResponse {
  watchlistStore.delete(stockId);

  return {
    message: "\uad00\uc2ec\uc885\ubaa9 \uc0ad\uc81c \uc644\ub8cc",
    count: watchlistStore.size,
  };
}
