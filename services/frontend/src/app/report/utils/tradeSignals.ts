import type { TradeHistoryItem } from "../types/report";

export type TradeSignalEvent = {
  id: string;
  date: string;
  signal: "매수" | "매도";
  price?: number;
  returnRate?: number;
};

export function buildTradeSignalEvents(trades: TradeHistoryItem[]) {
  return trades
    .flatMap((trade, index) => {
      const events: TradeSignalEvent[] = [
        {
          id: `${trade.buyDate}-buy-${index}`,
          date: trade.buyDate,
          signal: "매수",
          price: trade.buyPrice,
          returnRate: trade.status === "HOLDING" ? trade.returnRate : undefined,
        },
      ];

      if (trade.sellDate) {
        events.push({
          id: `${trade.sellDate}-sell-${index}`,
          date: trade.sellDate,
          signal: "매도",
          price: trade.sellPrice,
          returnRate: trade.returnRate,
        });
      }

      return events;
    })
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
}
