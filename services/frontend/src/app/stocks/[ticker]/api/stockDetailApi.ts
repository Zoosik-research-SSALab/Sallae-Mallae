export type StockDetailApiEnvelope<T> = {
  success?: boolean;
  data?: T | null;
  error?: {
    code?: string;
    message?: string;
  } | null;
};

export function isStockDetailApiEnvelope<T>(payload: unknown): payload is StockDetailApiEnvelope<T> {
  return typeof payload === "object" && payload !== null && "success" in payload && "data" in payload;
}

export function unwrapStockDetailResponse<T>(
  payload: T | StockDetailApiEnvelope<T>,
  fallbackMessage: string,
) {
  if (isStockDetailApiEnvelope<T>(payload)) {
    if (payload.data !== null && payload.data !== undefined) {
      return payload.data;
    }

    throw new Error(payload.error?.message ?? fallbackMessage);
  }

  return payload;
}
