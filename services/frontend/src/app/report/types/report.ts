export type ReportEventItem = {
  id: string;
  date: string;
  category: string;
  title: string;
  description: string;
  tone: "info" | "neutral" | "danger";
};

export interface ChairmanAnalysisReportsQuery {
  offset?: number;
  limit?: number;
}

export interface ChairmanAnalysisReportsResponse {
  reports: ChairmanAnalysisReport[];
}

export interface ChairmanAnalysisReport {
  date: string;
  chairman: {
    signal: string;
    confidence: number;
    summary: string;
  };
  finalStances: ChairmanFinalStance[];
  createdAt: string;
  debate: {
    rounds: ChairmanDebateRound[];
  };
}

export interface ChairmanFinalStance {
  agentId: string;
  agentName: string;
  stance: string;
}

export interface ChairmanDebateRound {
  roundNo: number;
  agents: ChairmanDebateAgent[];
}

export interface ChairmanDebateAgent {
  name: string;
  opinion: string;
  summary: string;
}

export interface InvestmentPerformanceResponse {
  cumulativeReturn: number | null;
  winRate: number;
  averageReturn1y: number | null;
  recentReturn: number | null;
  holding: {
    buyDate: string;
    buyPrice: number;
    currentPrice: number;
    holdingQuantity: number;
    investmentAmount: number;
    evaluationProfit: number;
    currentReturn: number;
    holdingDays: number;
  } | null;
  chart: InvestmentPerformanceChartPoint[];
}

export interface InvestmentPerformanceChartPoint {
  date: string;
  price: number;
  tradeType: "BUY" | "SELL" | null;
}

export interface TradeHistoryQuery {
  offset?: number;
  limit?: number;
}

export interface TradeHistoryResponse {
  trades: TradeHistoryItem[];
}

export interface TradeHistoryItem {
  status: string;
  buyDate: string;
  sellDate?: string;
  buyPrice: number;
  sellPrice?: number;
  currentPrice?: number;
  holdingDays: number;
  returnRate: number;
}

export interface ReportPagePresentationSeed {
  market: string;
  price: number;
  changeRate: number;
  benchmarkTime: string;
  events: ReportEventItem[];
}
