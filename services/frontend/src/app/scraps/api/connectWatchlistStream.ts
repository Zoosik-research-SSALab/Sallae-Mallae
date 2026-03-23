import { connectAuthSse } from "@/shared/lib/authApiClient";
import { resolveApiUrl } from "@/shared/lib/apiClient";
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
  const url = resolveApiUrl(`/api/users/watchlist?${query.toString()}`);

  return connectAuthSse<WatchlistStreamPayload>(url, {
    ...handlers,
    useBaseUrl: false,
  });
}
