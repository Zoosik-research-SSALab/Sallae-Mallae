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
  final_stances: ChairmanFinalStance[];
  created_at: string;
  debate: {
    rounds: ChairmanDebateRound[];
  };
}

export interface ChairmanFinalStance {
  agent_id: string;
  agent_name: string;
  stance: string;
}

export interface ChairmanDebateRound {
  round_no: number;
  agents: ChairmanDebateAgent[];
}

export interface ChairmanDebateAgent {
  name: string;
  opinion: string;
  summary: string;
}

export interface InvestmentPerformanceResponse {
  cumulative_return: number;
  win_rate: number;
  recent_return: number;
  holding: {
    buy_date: string;
    buy_price: number;
    current_price: number;
    holding_quantity: number;
    investment_amount: number;
    evaluation_profit: number;
    current_return: number;
    holding_days: number;
  };
  chart: InvestmentPerformanceChartPoint[];
}

export interface InvestmentPerformanceChartPoint {
  date: string;
  price: number;
  trade_type?: "BUY" | "SELL";
}

export interface TradeHistoryQuery {
  offset?: number;
  limit?: number;
}

export interface TradeHistoryResponse {
  trades: TradeHistoryItem[];
}

export interface TradeHistoryItem {
  status: "HOLDING" | "CLOSED";
  buy_date: string;
  sell_date?: string;
  buy_price: number;
  sell_price?: number;
  current_price?: number;
  holding_days: number;
  return_rate: number;
}

export interface ReportPagePresentationSeed {
  market: string;
  price: number;
  changeRate: number;
  benchmarkTime: string;
  events: ReportEventItem[];
}
