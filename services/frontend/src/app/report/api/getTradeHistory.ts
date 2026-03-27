import { apiFetch } from "@/shared/lib/apiClient";
import { unwrapApiResponse } from "@/shared/utils/apiResponse";

export async function getTradeHistory(stockId: string, offset = 0, limit = 100) {
  const params = new URLSearchParams();
  if (offset) params.set("offset", String(offset));
  if (limit) params.set("limit", String(limit));

  const query = params.toString();
  const url = `/api/report/${encodeURIComponent(stockId.trim())}/performance/trades${query ? `?${query}` : ""}`;

  const response = await apiFetch(url, {
    cache: "no-store",
    withAuth: true,
  });

  return unwrapApiResponse(response);
}
