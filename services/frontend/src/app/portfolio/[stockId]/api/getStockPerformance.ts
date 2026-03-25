import type { PerformanceResponse } from "../types/api";
import { apiFetch } from "@/shared/lib/apiClient";

type ApiEnvelope<T> = { success: boolean; data: T; error: unknown };

export async function getStockPerformance(
  stockId: string,
): Promise<PerformanceResponse> {
  const response = await apiFetch<ApiEnvelope<PerformanceResponse> | PerformanceResponse>(
    `/api/report/${stockId}/performance`,
    {
      cache: "no-store",
      withAuth: true,
    },
  );

  if ("data" in response && "success" in response) {
    return response.data;
  }

  return response;
}
