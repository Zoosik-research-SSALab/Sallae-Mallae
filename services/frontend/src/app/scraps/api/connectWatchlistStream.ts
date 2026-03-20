import { connectAuthSse } from "@/shared/lib/authApiClient";
import type { WatchlistStreamPayload } from "../types/scraps";

type WatchlistStreamHandlers = {
  onMessage: (payload: WatchlistStreamPayload) => void;
  onError?: (error: Event) => void;
};

export function connectWatchlistStream(page: number, limit: number, handlers: WatchlistStreamHandlers) {
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  return connectAuthSse<WatchlistStreamPayload>(`/api/users/watchlist?${query.toString()}`, handlers);
}
