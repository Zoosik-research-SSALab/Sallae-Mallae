import { apiFetch } from "@/shared/lib/apiClient";

export type LatestReport = {
  ticker: string;
  mlSignal: "BUY" | "HOLD" | "SELL" | "STAY" | string;
  mlConfidence: number;
  reportTime: string;
  note: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string | null;
};

export async function getLatestReport(stockId: string): Promise<LatestReport> {
  const payload = await apiFetch<ApiResponse<LatestReport>>(`/api/report/${stockId}/latest`, {
    cache: "no-store",
  });

  return payload.data;
}
