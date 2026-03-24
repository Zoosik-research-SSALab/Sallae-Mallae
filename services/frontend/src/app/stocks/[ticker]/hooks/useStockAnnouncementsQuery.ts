"use client";

import { useQuery } from "@tanstack/react-query";
import { getStockAnnouncements } from "../api/getStockAnnouncements";

export function useStockAnnouncementsQuery(stockId: string, limit = 4, offset = 0) {
  return useQuery({
    queryKey: ["stock-detail", "announcements", stockId, limit, offset],
    queryFn: () => getStockAnnouncements(stockId, limit, offset),
    enabled: Boolean(stockId),
    staleTime: 60_000,
  });
}
