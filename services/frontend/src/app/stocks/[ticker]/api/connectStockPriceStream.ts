import { connectSse } from "@/shared/lib/apiClient";
import type { StockChartPeriod, StockPricesPayload } from "@/app/stocks/types/stockDetail";

type StockPriceStreamHandlers = {
  onMessage: (payload: StockPricesPayload) => void;
  onError?: (error: Event) => void;
};

export function connectStockPriceStream(ticker: string, period: StockChartPeriod, handlers: StockPriceStreamHandlers) {
  const query = new URLSearchParams({
    period,
  });

  return connectSse<StockPricesPayload>(`/api/stocks/${ticker}/prices?${query.toString()}`, handlers);
}
