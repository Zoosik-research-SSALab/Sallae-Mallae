import { apiFetch } from "@/shared/lib/apiClient";

export type StockBasicInfo = {
  id: number;
  ticker: string;
  name: string;
  marketType: string;
  gicsSector: string;
  category: string;
  baseTime: string;
};

type StockBasicInfoEnvelope = {
  success: boolean;
  data: StockBasicInfo;
  error: unknown;
};

export async function getStockBasicInfo(stockId: string): Promise<StockBasicInfo> {
  const response = await apiFetch<StockBasicInfoEnvelope | StockBasicInfo>(`/api/stocks/${stockId}`, {
    cache: "no-store",
  });

  if ("data" in response && "success" in response) {
    return response.data;
  }

  return response;
}
