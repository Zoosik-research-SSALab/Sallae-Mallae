import { apiFetch } from "@/shared/lib/apiClient";
import type { WatchlistNewsPayload } from "../types/scraps";

export function getWatchlistNews() {
  return apiFetch<WatchlistNewsPayload>("/api/users/watchlist/news", {
    cache: "no-store",
  });
}
