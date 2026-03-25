export type TradeStatus = "holding" | "sold" | "best";

export type TradeEntry = {
  id: string;
  status: TradeStatus;
  dateRange: string;
  buyPrice: number;
  sellPrice: number | null;
  currentPrice: number | null;
  returnRate: number;
  durationLabel: string;
};

export type CommitteeMember = {
  role: string;
  opinion: string;
  alignment: "left" | "right";
  isDark?: boolean;
};

export type BacktestBestTrade = {
  returnRate: number;
  period: string;
  buyPrice: number;
  sellPrice: number;
};

export type BacktestStats = {
  oneYearReturn: number;
  oneYearTradeCount: number;
  allTimeTradeCount: number;
  allTimeSince: string;
};

export type StockDetailData = {
  ticker: string;
  name: string;
  description: string;
  portfolioLabel: string;
  isAiPortfolio: boolean;
  performance: {
    totalPnl: number;
    returnRate: number;
    holdingCount: number;
    investmentPrincipal: number;
    buyDate: string;
    holdingDays: number;
    buyPrice: number;
    currentPrice: number;
  };
  trades: TradeEntry[];
  backtest: {
    bestTrade: BacktestBestTrade;
    stats: BacktestStats;
  };
  committee: {
    finalDecision: string;
    confidence: number;
    briefingDate: string;
    members: CommitteeMember[];
  };
};
