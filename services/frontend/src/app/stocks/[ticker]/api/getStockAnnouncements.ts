import { apiFetch } from "@/shared/lib/apiClient";
import type { StockAnnouncementsPayload } from "@/app/stocks/types/stockDetail";
import type { StockDetailApiEnvelope } from "./stockDetailApi";
import { unwrapStockDetailResponse } from "./stockDetailApi";

export async function getStockAnnouncements(ticker: string, limit = 4, offset = 0) {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const payload = await apiFetch<StockAnnouncementsPayload | StockDetailApiEnvelope<StockAnnouncementsPayload>>(
    `/api/stocks/${ticker}/announcements?${query.toString()}`,
    {
      cache: "no-store",
    },
  );

  return unwrapStockDetailResponse(payload, "종목 공시 응답이 올바르지 않습니다.");
}
