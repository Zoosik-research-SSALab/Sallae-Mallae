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

export type StockIndicatorsMetricSet = {
  per: number;
  pbr: number;
  roe: number;
  debtRatio: number;
};

export type StockIndicators = StockIndicatorsMetricSet & {
  sectorAvg: StockIndicatorsMetricSet;
  prevQuarterDiff: StockIndicatorsMetricSet;
};

export type StockFinancialType = "YEARLY" | "QUARTERLY";

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
