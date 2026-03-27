import { apiFetch } from "@/shared/lib/apiClient";
import { unwrapApiResponse } from "@/shared/utils/apiResponse";

export async function getStockReport(
  stockId: string,
  offset?: number,
  limit?: number,
) {
  const params = new URLSearchParams();
  if (offset !== undefined) params.set("offset", String(offset));
  if (limit !== undefined) params.set("limit", String(limit));

  const query = params.toString();
  const url = `/api/report/${stockId}${query ? `?${query}` : ""}`;

  const response = await apiFetch(url, {
    cache: "no-store",
    withAuth: true,
  });

  return unwrapApiResponse(response);
}
