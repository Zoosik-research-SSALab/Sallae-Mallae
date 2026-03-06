export type SignalItem = {
  id: number;
  ticker: string;
  signal: "BUY" | "HOLD" | "SELL" | "STAY" | string;
  confidence: number;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string | null;
};

export async function getSignals(size = 6, cursor?: number): Promise<SignalItem[]> {
  const params = new URLSearchParams({ size: String(size) });
  if (cursor) {
    params.set("cursor", String(cursor));
  }

  const response = await fetch(`/api/v1/signals?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`매매신호 조회 실패: ${response.status}`);
  }

  const payload = (await response.json()) as ApiResponse<SignalItem[]>;
  return payload.data ?? [];
}
