import { apiFetch } from "@/shared/lib/apiClient";
import { unwrapApiResponse } from "@/shared/utils/apiResponse";

export async function getStockPerformance(stockId: string) {
  const response = await apiFetch(`/api/report/${stockId}/performance`, {
    cache: "no-store",
    withAuth: true,
  });

  return unwrapApiResponse(response);
}
