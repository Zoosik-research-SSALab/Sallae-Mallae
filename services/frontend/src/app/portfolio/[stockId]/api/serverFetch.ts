import { camelizeKeys } from "@/shared/utils/case";
import type { ReportResponse, PerformanceResponse, TradesResponse, TradeItem } from "../types/api";

function getBackendBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "https://j14d208.p.ssafy.io";
  return configured.endsWith("/") ? configured.slice(0, -1) : configured;
}

async function serverApiFetch<T>(path: string, accessToken?: string): Promise<T> {
  const url = `${getBackendBaseUrl()}${path}`;
  const headers: HeadersInit = {};
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Server fetch failed: ${response.status}`);
  }

  const raw = await response.json();
  const data = raw.data ?? raw;
  return camelizeKeys<T>(data);
}

// ── Report: chairman flatten ──

type RawReportItem = Record<string, unknown>;

function flattenChairman(r: RawReportItem) {
  const chairmanWrapper = r.chairman as Record<string, unknown> | undefined;
  const innerChairman = chairmanWrapper?.chairman ?? chairmanWrapper;
  return {
    date: r.date,
    chairman: innerChairman,
    finalStances: chairmanWrapper?.finalStances ?? r.finalStances ?? [],
    createdAt: chairmanWrapper?.createdAt ?? r.createdAt ?? null,
    debate: r.debate ?? { rounds: [] },
  };
}

export async function serverGetStockReport(
  stockId: string,
  accessToken?: string,
): Promise<ReportResponse> {
  const raw = await serverApiFetch<unknown>(`/api/report/${stockId}`, accessToken);
  const items = Array.isArray(raw) ? raw : [raw];
  return { reports: items.map((r) => flattenChairman(r as RawReportItem)) } as ReportResponse;
}

// ── Performance: simple unwrap (already handled by serverApiFetch) ──

export async function serverGetStockPerformance(
  stockId: string,
  accessToken?: string,
): Promise<PerformanceResponse> {
  return serverApiFetch<PerformanceResponse>(`/api/report/${stockId}/performance`, accessToken);
}

// ── Trades: pairTrades logic ──

type RawTrade = Record<string, unknown>;

function calcHoldingDays(from: Date, to: Date): number {
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
}

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

export async function serverGetStockTrades(
  stockId: string,
  accessToken?: string,
): Promise<TradesResponse> {
  const raw = await serverApiFetch<{ trades?: unknown[] }>(`/api/report/${stockId}/performance/trades`, accessToken);
  const rawTrades = Array.isArray(raw.trades) ? raw.trades : [];
  return { trades: pairTrades(rawTrades as RawTrade[]) };
}
