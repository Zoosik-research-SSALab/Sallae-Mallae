import { apiFetch } from "@/shared/lib/apiClient";

export type StockDetail = {
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

export async function getStockDetail(ticker: string): Promise<StockDetail> {
  const payload = await apiFetch<ApiResponse<StockDetail>>(`/api/v1/stocks/${ticker}`, { cache: "no-store" });
  return payload.data;
}
