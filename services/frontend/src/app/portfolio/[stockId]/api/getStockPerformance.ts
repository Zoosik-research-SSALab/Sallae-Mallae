import { apiFetch } from "@/shared/lib/apiClient";

type ApiEnvelope<T> = { success: boolean; data: T; error: unknown };

export async function getStockPerformance(stockId: string) {
  const response = await apiFetch<ApiEnvelope<unknown> | unknown>(
    `/api/report/${stockId}/performance`,
    {
      cache: "no-store",
      withAuth: true,
    },
  );

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
