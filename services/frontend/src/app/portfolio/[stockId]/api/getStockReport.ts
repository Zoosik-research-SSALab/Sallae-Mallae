import type { ReportResponse } from "../types/api";
import { apiFetch } from "@/shared/lib/apiClient";

type ApiEnvelope<T> = { success: boolean; data: T; error: unknown };

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

  const response = await apiFetch<ApiEnvelope<ReportResponse> | ReportResponse>(url, {
    cache: "no-store",
    useBaseUrl: false,
    withAuth: true,
  });

  if ("data" in response && "success" in response) {
    return response.data;
  }

  return response;
}
