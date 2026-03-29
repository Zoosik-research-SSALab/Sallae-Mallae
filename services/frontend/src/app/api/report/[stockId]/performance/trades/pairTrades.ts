/**
 * Pairs raw BUY/SELL trade events from the backend into frontend trade records.
 *
 * Backend shape:  { trade_type, trade_time, trade_price_rate, return_rate }
 * Frontend shape: { status, buy_date, sell_date?, buy_price, sell_price?, holding_days, return_rate }
 */

type RawTrade = Record<string, unknown>;

function calcHoldingDays(from: Date, to: Date): number {
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
}

function buildHolding(buy: RawTrade, now: Date): Record<string, unknown> {
  const buyTime = buy.trade_time as string;
  return {
    status: "holding",
    buy_date: buyTime,
    buy_price: buy.trade_price_rate,
    holding_days: calcHoldingDays(new Date(buyTime), now),
    return_rate: buy.return_rate ?? 0,
  };
}

export function pairTrades(
  rawTrades: RawTrade[],
  stockId: string,
): Record<string, unknown>[] {
  const now = new Date();
  const paired: Record<string, unknown>[] = [];
  let pendingBuy: RawTrade | null = null;

  for (const t of rawTrades) {
    if (t.trade_type === "BUY") {
      if (pendingBuy) {
        paired.push(buildHolding(pendingBuy, now));
      }
      pendingBuy = t;
    } else if (t.trade_type === "SELL") {
      if (pendingBuy) {
        const buyTime = pendingBuy.trade_time as string;
        const sellTime = t.trade_time as string;
        paired.push({
          status: "sold",
          buy_date: buyTime,
          sell_date: sellTime,
          buy_price: pendingBuy.trade_price_rate,
          sell_price: t.trade_price_rate,
          holding_days: calcHoldingDays(new Date(buyTime), new Date(sellTime)),
          return_rate: t.return_rate ?? pendingBuy.return_rate ?? 0,
        });
        pendingBuy = null;
      } else {
        console.warn(`[trades/${stockId}] unmatched SELL at ${String(t.trade_time)}`);
      }
    }
  }

  if (pendingBuy) {
    paired.push(buildHolding(pendingBuy, now));
  }

  return paired;
}
