import { authApiFetch } from "@/shared/lib/authApiClient";
import type { WatchlistNewsPayload } from "../types/scraps";

export function getWatchlistNews() {
  return authApiFetch<WatchlistNewsPayload>("/api/users/watchlist/news", {
    cache: "no-store",
  });
}
