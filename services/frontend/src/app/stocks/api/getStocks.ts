import { apiFetch } from "@/shared/lib/apiClient";

export type StockSummary = {
  id: number;
  ticker: string;
  name: string;
  marketType: string;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string | null;
};

export async function getStocks(): Promise<StockSummary[]> {
  const payload = await apiFetch<ApiResponse<StockSummary[]>>("/api/v1/stocks", { cache: "no-store" });
  return payload.data ?? [];
}
