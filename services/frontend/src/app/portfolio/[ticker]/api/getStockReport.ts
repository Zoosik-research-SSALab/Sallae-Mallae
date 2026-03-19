import type { ReportResponse } from "../types/api";
import { apiFetch } from "@/shared/lib/apiClient";

export async function getStockReport(
  stockId: string,
  offset?: number,
  limit?: number,
): Promise<ReportResponse> {
  const params = new URLSearchParams();
  if (offset !== undefined) params.set("offset", String(offset));
  if (limit !== undefined) params.set("limit", String(limit));

  const query = params.toString();
  const url = `/api/report/${stockId}${query ? `?${query}` : ""}`;

  return apiFetch<ReportResponse>(url, {
    cache: "no-store",
    useBaseUrl: false,
  });
}
