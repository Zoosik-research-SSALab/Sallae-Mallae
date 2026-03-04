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

export async function getLatestReport(symbol: string): Promise<LatestReport> {
  const response = await fetch(`/api/v1/reports/${symbol}/latest`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`리포트 조회 실패: ${response.status}`);
  }

  const payload = (await response.json()) as ApiResponse<LatestReport>;
  return payload.data;
}
