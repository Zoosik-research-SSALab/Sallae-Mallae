import type { InvestmentPerformanceChartPoint } from "../types/report";

export type TradeSignalEvent = {
  id: string;
  date: string;
  signal: "매수" | "매도";
  price?: number;
  returnRate?: number;
};

export function buildTradeSignalEvents(chart: InvestmentPerformanceChartPoint[]) {
  return chart
    .flatMap((point, index) => {
      const tradeType = normalizeTradeType(point.tradeType);

      if (!tradeType) {
        return [];
      }

      const event: TradeSignalEvent = {
        id: `${point.date}-${tradeType.toLowerCase()}-${index}`,
        date: point.date,
        signal: tradeType === "BUY" ? "매수" : "매도",
        price: point.price,
      };

      return [event];
    })
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}

function normalizeTradeType(value?: string | null) {
  const normalized = value?.trim().toUpperCase();
  return normalized === "BUY" || normalized === "SELL" ? normalized : null;
}
