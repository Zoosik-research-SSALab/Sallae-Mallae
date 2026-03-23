import type { TradesResponse } from "../types/api";
import { apiFetch } from "@/shared/lib/apiClient";

export async function getStockTrades(
  stockId: string,
  offset?: number,
  limit?: number,
): Promise<TradesResponse> {
  const params = new URLSearchParams();
  if (offset !== undefined) params.set("offset", String(offset));
  if (limit !== undefined) params.set("limit", String(limit));

  const query = params.toString();
  const url = `/api/report/${stockId}/performance/trades${query ? `?${query}` : ""}`;

  return apiFetch<TradesResponse>(url, {
    cache: "no-store",
    useBaseUrl: false,
    withAuth: true,
  });
}
