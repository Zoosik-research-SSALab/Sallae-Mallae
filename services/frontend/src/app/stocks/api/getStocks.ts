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
  const response = await fetch("/api/v1/stocks", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`종목 목록 조회 실패: ${response.status}`);
  }

  const payload = (await response.json()) as ApiResponse<StockSummary[]>;
  return payload.data ?? [];
}
