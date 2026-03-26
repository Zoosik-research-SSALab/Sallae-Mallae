import { apiFetch } from "@/shared/lib/apiClient";
import { unwrapApiResponse } from "@/shared/utils/apiResponse";

export type StockBasicInfo = {
  id: number;
  ticker: string;
  name: string;
  marketType: string;
  gicsSector: string;
  category: string;
  baseTime: string;
};

export async function getStockBasicInfo(
  stockId: string,
): Promise<StockBasicInfo> {
  const response = await apiFetch(`/api/stocks/${stockId}`, {
    cache: "no-store",
  });

  return unwrapApiResponse<StockBasicInfo>(response);
}
