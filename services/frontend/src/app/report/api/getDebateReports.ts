import { apiFetch } from "@/shared/lib/apiClient";
import type { DebateReportsResponse } from "../types/debate";

export async function getDebateReports(stockId: string, offset = 0, limit = 6): Promise<DebateReportsResponse> {
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });

  return apiFetch<DebateReportsResponse>(`/api/report/${encodeURIComponent(stockId.trim())}?${query.toString()}`, {
    cache: "no-store",
  });
}
