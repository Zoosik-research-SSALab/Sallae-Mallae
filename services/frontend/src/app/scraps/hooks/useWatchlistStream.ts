"use client";

import { useCallback } from "react";
import { connectWatchlistStream } from "../api/connectWatchlistStream";
import type { WatchlistStreamPayload } from "../types/scraps";
import { useSseState } from "@/app/home/hooks/useSseState";

const initialWatchlistStreamPayload: WatchlistStreamPayload = {
  buyCount: 0,
  sellCount: 0,
  upCount: 0,
  watchlist: [],
};

export function useWatchlistStream(page: number, limit: number) {
  const subscribe = useCallback(
    (handlers: { onMessage: (payload: WatchlistStreamPayload) => void; onError?: (error: Event) => void }) =>
      connectWatchlistStream(page, limit, handlers),
    [limit, page],
  );

  return useSseState(subscribe, initialWatchlistStreamPayload);
}
