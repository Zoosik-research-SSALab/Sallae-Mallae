import { apiFetch } from "@/shared/lib/apiClient";

type ApiEnvelope<T> = { success: boolean; data: T; error: unknown };

export async function getStockTrades(
  stockId: string,
  offset?: number,
  limit?: number,
) {
  const params = new URLSearchParams();
  if (offset !== undefined) params.set("offset", String(offset));
  if (limit !== undefined) params.set("limit", String(limit));

  const query = params.toString();
  const url = `/api/report/${stockId}/performance/trades${query ? `?${query}` : ""}`;

  const response = await apiFetch<ApiEnvelope<unknown> | unknown>(url, {
    cache: "no-store",
    withAuth: true,
  });

  // Unwrap envelope only
  if (
    typeof response === "object" &&
    response !== null &&
    "data" in response &&
    "success" in response
  ) {
    return (response as ApiEnvelope<unknown>).data;
  }

  return response;
}
