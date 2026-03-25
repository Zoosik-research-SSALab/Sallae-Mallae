import type { TradesResponse, TradeItem } from "../types/api";
import { apiFetch } from "@/shared/lib/apiClient";

type ApiEnvelope<T> = { success: boolean; data: T; error: unknown };
type RawTrade = Record<string, unknown>;

function calcHoldingDays(from: Date, to: Date): number {
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
}

// Pair BUY/SELL events into TradeItem records
function pairTrades(rawTrades: RawTrade[]): TradeItem[] {
  const now = new Date();
  const paired: TradeItem[] = [];
  let pendingBuy: RawTrade | null = null;

  for (const t of rawTrades) {
    if (t.tradeType === "BUY") {
      if (pendingBuy) {
        const buyTime = pendingBuy.tradeTime as string;
        paired.push({
          status: "holding",
          buyDate: buyTime,
          buyPrice: (pendingBuy.tradePriceRate as number) ?? 0,
          holdingDays: calcHoldingDays(new Date(buyTime), now),
          returnRate: (pendingBuy.returnRate as number) ?? 0,
        });
      }
      pendingBuy = t;
    } else if (t.tradeType === "SELL") {
      if (pendingBuy) {
        const buyTime = pendingBuy.tradeTime as string;
        const sellTime = t.tradeTime as string;
        paired.push({
          status: "sold",
          buyDate: buyTime,
          sellDate: sellTime,
          buyPrice: (pendingBuy.tradePriceRate as number) ?? 0,
          sellPrice: (t.tradePriceRate as number) ?? 0,
          holdingDays: calcHoldingDays(new Date(buyTime), new Date(sellTime)),
          returnRate: (t.returnRate as number) ?? (pendingBuy.returnRate as number) ?? 0,
        });
        pendingBuy = null;
      }
    }
  }

  if (pendingBuy) {
    const buyTime = pendingBuy.tradeTime as string;
    paired.push({
      status: "holding",
      buyDate: buyTime,
      buyPrice: (pendingBuy.tradePriceRate as number) ?? 0,
      holdingDays: calcHoldingDays(new Date(buyTime), now),
      returnRate: (pendingBuy.returnRate as number) ?? 0,
    });
  }

  return paired;
}

export async function getStockTrades(
  stockId: string,
  offset?: number,
  limit?: number,
): Promise<TradesResponse> {
  const params = new URLSearchParams();
  if (offset !== undefined) params.set("offset", String(offset));
  if (limit !== undefined) params.set("limit", String(limit));

  const query = params.toString();
  const url = `/api/report/${stockId}/performance/trades${query ? `?${query}` : ""}`;

  const response = await apiFetch<ApiEnvelope<unknown> | unknown>(url, {
    cache: "no-store",
    withAuth: true,
  });

  // Unwrap envelope
  const unwrapped =
    typeof response === "object" &&
    response !== null &&
    "data" in response &&
    "success" in response
      ? (response as ApiEnvelope<unknown>).data
      : response;

  if (typeof unwrapped !== "object" || unwrapped === null) return { trades: [] };

  const record = unwrapped as Record<string, unknown>;
  const rawTrades = Array.isArray(record.trades) ? record.trades : [];

  if (rawTrades.length === 0) return { trades: [] };

  return { trades: pairTrades(rawTrades as RawTrade[]) };
}
