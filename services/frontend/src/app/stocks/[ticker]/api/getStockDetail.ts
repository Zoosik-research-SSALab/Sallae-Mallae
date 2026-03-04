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
  const response = await fetch(`/api/v1/stocks/${ticker}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`종목 상세 조회 실패: ${response.status}`);
  }

  const payload = (await response.json()) as ApiResponse<StockDetail>;
  return payload.data;
}
