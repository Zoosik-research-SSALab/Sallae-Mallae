// API response types for portfolio stock detail endpoints
// These represent shapes AFTER camelCase conversion by apiClient

// ── GET /api/report/{stockId} ─────────────────────────────────────────────────

export type ReportAgent = {
  name: string;
  opinion: string;
  summary: string;
};

export type ReportRound = {
  roundNo: number;
  agents: ReportAgent[];
};

export type ReportDebate = {
  rounds: ReportRound[];
};

export type ReportChairman = {
  signal: string;
  confidence: number;
  summary: string;
};

export type ReportFinalStance = {
  agentId: string;
  agentName: string;
  stance: string;
};

export type ReportItem = {
  date: string;
  chairman: ReportChairman;
  finalStances: ReportFinalStance[];
  createdAt: string;
  debate: ReportDebate;
};

export type ReportResponse = {
  reports: ReportItem[];
};

// ── GET /api/report/{stockId}/performance ─────────────────────────────────────

export type PerformanceHolding = {
  buyDate: string;
  buyPrice: number;
  currentPrice: number;
  holdingQuantity: number;
  investmentAmount: number;
  evaluationProfit: number;
  currentReturn: number;
  holdingDays: number;
};

export type PerformanceChartPoint = {
  date: string;
  price: number;
  tradeType?: string;
};

export type PerformanceResponse = {
  cumulativeReturn: number;
  winRate: number;
  recentReturn: number;
  holding: PerformanceHolding;
  chart: PerformanceChartPoint[];
};

// ── GET /api/report/{stockId}/performance/trades ──────────────────────────────

export type TradeItem = {
  status: string;
  buyDate: string;
  sellDate?: string;
  buyPrice: number;
  sellPrice?: number;
  currentPrice?: number;
  holdingDays: number;
  returnRate: number;
  cycleId?: string;
  buyCount?: number;
  sellCount?: number;
  remainingQuantity?: number;
  hasPartialSell?: boolean;
};

export type TradesResponse = {
  trades: TradeItem[];
};
