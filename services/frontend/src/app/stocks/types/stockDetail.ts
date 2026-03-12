export type StockChartPeriod = "1MIN" | "1D" | "1W" | "1M" | "3M" | "1Y" | "3Y";

export type StockDetailOverview = {
  id: number;
  ticker: string;
  name: string;
  marketType: string;
  gicsSector: string;
  category: string;
  baseTime: string;
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
  per: number;
  psr: number;
  pbr: number;
};

export type StockEarningsIndicators = {
  eps: number;
  bps: number;
  roe: number;
};

export type StockDividendIndicators = {
  periodLabel: string;
  paymentCount: number;
  paymentMonths: string;
  annualDividendPerShare: number;
  dividendYield: number;
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
  news: StockKeywordNewsItem[];
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
  totalNewsCount: number;
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
