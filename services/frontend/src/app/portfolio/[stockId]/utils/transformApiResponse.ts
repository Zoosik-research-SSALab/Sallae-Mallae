import type {
  ReportResponse,
  ReportItem,
  PerformanceResponse,
  TradesResponse,
  TradeItem,
} from "../types/api";

// ── Report: chairman flatten + reports 래핑 ──

function flattenReportItem(r: Record<string, unknown>): ReportItem {
  const chairmanWrapper = r.chairman as Record<string, unknown> | undefined;
  const innerChairman = chairmanWrapper?.chairman ?? chairmanWrapper;
  return {
    date: (r.date as string) ?? "",
    chairman: innerChairman as ReportItem["chairman"],
    finalStances: (chairmanWrapper?.finalStances ?? r.finalStances ?? []) as ReportItem["finalStances"],
    createdAt: (chairmanWrapper?.createdAt ?? r.createdAt ?? "") as string,
    debate: (r.debate ?? { rounds: [] }) as ReportItem["debate"],
  };
}

export function transformReportResponse(raw: unknown): ReportResponse {
  if (typeof raw !== "object" || raw === null) return { reports: [] };

  // Already has { reports: [...] } shape
  if ("reports" in raw && Array.isArray((raw as Record<string, unknown>).reports)) {
    const reports = (raw as Record<string, unknown>).reports as Record<string, unknown>[];
    return { reports: reports.map(flattenReportItem) };
  }

  // Backend returns array directly
  if (Array.isArray(raw)) {
    return { reports: raw.map((r) => flattenReportItem(r as Record<string, unknown>)) };
  }

  // Single object
  return { reports: [flattenReportItem(raw as Record<string, unknown>)] };
}

// ── Performance: type assertion ──

export function transformPerformanceResponse(raw: unknown): PerformanceResponse {
  return raw as PerformanceResponse;
}

// ── Trades: pairTrades ──

type RawTrade = Record<string, unknown>;

function calcHoldingDays(from: Date, to: Date): number {
  return Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86_400_000));
}

function pairTrades(rawTrades: RawTrade[]): TradeItem[] {
  const now = new Date();
  const paired: TradeItem[] = [];
  let pendingBuy: RawTrade | null = null;

  // 백엔드가 최신순으로 반환할 수 있으므로 tradeTime 기준 오름차순 정렬
  const sorted = [...rawTrades].sort((a, b) => {
    const timeA = new Date(a.tradeTime as string).getTime();
    const timeB = new Date(b.tradeTime as string).getTime();
    return timeA - timeB;
  });

  for (const t of sorted) {
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

export function transformTradesResponse(raw: unknown): TradesResponse {
  if (typeof raw !== "object" || raw === null) return { trades: [] };

  const record = raw as Record<string, unknown>;
  const rawTrades = Array.isArray(record.trades) ? record.trades : [];

  if (rawTrades.length === 0) return { trades: [] };

  return { trades: pairTrades(rawTrades as RawTrade[]) };
}
