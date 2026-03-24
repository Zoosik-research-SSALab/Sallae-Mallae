export type StockChartPeriod = "1MIN" | "1D" | "1W" | "1M" | "1Y";

export type StockDetailOverview = {
  id: number;
  ticker: string;
  name: string;
  marketType: string;
  gicsSector: string;
  category: string;
  baseTime: string;
  latestPrice: {
    tradeDate: string | null;
    closePrice: number | null;
    fluctuationRate: number | null;
  } | null;
  priceRange52w: {
    highPrice: number | null;
    highDate: string | null;
    lowPrice: number | null;
    lowDate: string | null;
    distanceFromHighRate: number | null;
    distanceFromLowRate: number | null;
  } | null;
};

export type StockPricePoint = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type StockPricesPayload = {
  prices: StockPricePoint[];
};

export type StockValuationIndicators = {
  per: number | null;
  psr: number | null;
  pbr: number | null;
};

export type StockEarningsIndicators = {
  eps: number | null;
  bps: number | null;
  roe: number | null;
};

export type StockDividendIndicators = {
  periodLabel: string;
  paymentCount: number;
  paymentMonths: string;
  annualDividendPerShare: number | null;
  dividendYield: number | null;
};

export type StockIndicators = {
  valuation: StockValuationIndicators;
  earnings: StockEarningsIndicators;
  dividend: StockDividendIndicators;
};

export type StockFinancialType = "YEARLY" | "QUARTERLY";

export type StockPriceChartMode = "line" | "candlestick";

export type StockFinancialItem = {
  year: number;
  quarter?: number;
  revenue: number;
  operatingProfit: number;
};

export type StockFinancialsPayload = {
  financials: StockFinancialItem[];
};

export type StockKeyword = {
  id: number;
  name: string;
};

export type StockKeywordNewsItem = {
  id: number;
  title: string;
  publisher: string;
  publishedAt: string;
  url?: string;
};

export type StockKeywordsPayload = {
  keywords: StockKeyword[];
  news: StockKeywordNewsItem[];
};

export type StockAnnouncementItem = {
  id: number;
  title: string;
  announcedAt: string;
};

export type StockAnnouncementsPayload = {
  total: number;
  announcements: StockAnnouncementItem[];
};

export type StockAnnouncementDetail = StockAnnouncementItem & {
  content: string;
  url: string;
};
