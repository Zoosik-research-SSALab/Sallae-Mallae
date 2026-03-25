export type PortfolioMetricTone = "default" | "danger";

export type PortfolioBoardTab = "holdings" | "todayTrades" | "monthlyReturns";

export type PortfolioHeroMetric = {
  id: string;
  label: string;
  value: number | null;
  unit: string;
  decimals: number;
  tone: PortfolioMetricTone;
};

export type PortfolioHero = {
  updatedAtLabel: string;
  metrics: PortfolioHeroMetric[];
};

export type PortfolioHolding = {
  stockId: number;
  ticker: string;
  name: string;
  buyPrice: number | null;
  currentPrice: number | null;
  holdingDays: number | null;
  holdingQuantity: number | null;
  returnRate: number | null;
};

export type PortfolioTradeAction = "BUY" | "SELL";

export type PortfolioTodayTrade = {
  id: number;
  stockId: number;
  ticker: string;
  name: string;
  action: PortfolioTradeAction;
  executedAt: string;
  executedPrice: number | null;
  currentPrice: number | null;
  holdingQuantity: number | null;
  returnRate: number | null;
};

export type PortfolioMonthlyReturn = {
  month: string;
  portfolioReturnRate: number | null;
  realizedProfitAmount: number | null;
  buyCount: number | null;
  sellCount: number | null;
};

export type PortfolioSignalSummary = {
  baseUniverseLabel: string;
  buyCount: number;
  sellCount: number;
  holdCount: number;
  watchCount: number;
};

export type PortfolioSignalAction = "BUY" | "SELL" | "HOLD" | "WATCH";

export type PortfolioPopularSignal = {
  rank: number;
  stockId: number;
  ticker: string;
  name: string;
  price: number;
  action: PortfolioSignalAction;
};

export type PortfolioHallOfFameTone = "info" | "danger" | "warning" | "success";

export type PortfolioHallOfFameItem = {
  rank: number;
  name: string;
  value: number;
  suffix: string;
};

export type PortfolioHallOfFameSection = {
  id: string;
  title: string;
  tone: PortfolioHallOfFameTone;
  items: PortfolioHallOfFameItem[];
};

export type PortfolioPageData = {
  hero: PortfolioHero;
  holdings: PortfolioHolding[];
  todayTrades: PortfolioTodayTrade[];
  monthlyReturns: PortfolioMonthlyReturn[];
  signalSummary: PortfolioSignalSummary;
  popularSignals: PortfolioPopularSignal[];
  hallOfFame: PortfolioHallOfFameSection[];
};
