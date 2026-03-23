export type WatchlistSignal = "BUY" | "SELL" | "HOLD" | string;

export type WatchlistStockItem = {
  total?: number;
  stockId: number;
  ticker: string;
  name: string;
  sector?: string;
  price: number;
  fluctuationRate: number;
  signal: WatchlistSignal;
  confidence: number;
};

export type WatchlistStreamPayload = {
  buyCount: number;
  sellCount: number;
  upCount: number;
  watchlist: WatchlistStockItem[];
};

export type WatchlistNewsItem = {
  id: number;
  title: string;
  summary: string;
  source: string;
  url?: string;
  publishedAt: string | null;
  relatedStocks: string[];
};

export type WatchlistNewsPayload = {
  news: WatchlistNewsItem[];
};

export type WatchlistSummary = {
  totalCount: number;
  upCount: number;
  buyCount: number;
  sellCount: number;
};
