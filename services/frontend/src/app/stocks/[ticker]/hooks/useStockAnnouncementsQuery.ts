"use client";

import { useQuery } from "@tanstack/react-query";
import { getStockAnnouncements } from "../api/getStockAnnouncements";

export function useStockAnnouncementsQuery(ticker: string, limit = 4, offset = 0) {
  return useQuery({
    queryKey: ["stock-detail", "announcements", ticker, limit, offset],
    queryFn: () => getStockAnnouncements(ticker, limit, offset),
    enabled: Boolean(ticker),
    staleTime: 60_000,
  });
}
