import { apiFetch } from "@/shared/lib/apiClient";
import { unwrapApiResponse } from "@/shared/utils/apiResponse";

export async function getDebateReports(
  stockId: string,
  offset = 0,
  limit = 1,
) {
  const query = new URLSearchParams({
    offset: String(offset),
    limit: String(limit),
  });

  const response = await apiFetch(
    `/api/report/${encodeURIComponent(stockId.trim())}?${query.toString()}`,
    {
      cache: "no-store",
      withAuth: true,
    },
  );

  return unwrapApiResponse(response);
}
