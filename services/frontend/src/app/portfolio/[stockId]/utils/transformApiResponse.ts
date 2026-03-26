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
  const fallback: PerformanceResponse = {
    cumulativeReturn: 0,
    winRate: 0,
    averageReturn1y: 0,
    recentReturn: 0,
    holding: {
      buyDate: "",
      buyPrice: 0,
      currentPrice: 0,
      holdingQuantity: 0,
      investmentAmount: 0,
      evaluationProfit: 0,
      currentReturn: 0,
      holdingDays: 0,
    },
    chart: [],
  };

  if (typeof raw !== "object" || raw === null) return fallback;

  const record = raw as Record<string, unknown>;
  return {
    cumulativeReturn: (record.cumulativeReturn as number) ?? fallback.cumulativeReturn,
    winRate: (record.winRate as number) ?? fallback.winRate,
    averageReturn1y: (record.averageReturn1y as number) ?? fallback.averageReturn1y,
    recentReturn: (record.recentReturn as number) ?? fallback.recentReturn,
    holding: (record.holding as PerformanceResponse["holding"]) ?? fallback.holding,
    chart: Array.isArray(record.chart) ? (record.chart as PerformanceResponse["chart"]) : fallback.chart,
  };
}

// ── Trades: trade_cycles 사용 ──

export function transformTradesResponse(raw: unknown): TradesResponse {
  if (typeof raw !== "object" || raw === null) return { trades: [] };

  const record = raw as Record<string, unknown>;
  const tradeCycles = Array.isArray(record.tradeCycles) ? record.tradeCycles : [];

  return { trades: tradeCycles as TradeItem[] };
}
