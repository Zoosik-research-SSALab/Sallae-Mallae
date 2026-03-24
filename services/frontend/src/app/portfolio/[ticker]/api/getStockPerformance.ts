import type { PerformanceResponse } from "../types/api";
import { apiFetch } from "@/shared/lib/apiClient";

export async function getStockPerformance(
  stockId: string,
): Promise<PerformanceResponse> {
  return apiFetch<PerformanceResponse>(`/api/report/${stockId}/performance`, {
    cache: "no-store",
    useBaseUrl: false,
    withAuth: true,
  });
}
