import { apiFetch } from "@/shared/lib/apiClient";
import type { StockAnnouncementsPayload } from "@/app/stocks/types/stockDetail";

export function getStockAnnouncements(ticker: string, limit = 4, offset = 0) {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return apiFetch<StockAnnouncementsPayload>(`/api/stocks/${ticker}/announcements?${query.toString()}`, {
    cache: "no-store",
  });
}
