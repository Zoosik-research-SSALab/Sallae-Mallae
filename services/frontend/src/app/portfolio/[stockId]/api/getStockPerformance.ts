import type { PerformanceResponse } from "../types/api";
import { apiFetch } from "@/shared/lib/apiClient";

type ApiEnvelope<T> = { success: boolean; data: T; error: unknown };

export async function getStockPerformance(
  stockId: string,
): Promise<PerformanceResponse> {
  return apiFetch<PerformanceResponse>(`/api/report/${stockId}/performance`, {
    cache: "no-store",
    withAuth: true,
  });
}
