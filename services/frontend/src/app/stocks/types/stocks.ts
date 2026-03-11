export type StockSignal = "BUY" | "SELL" | "HOLD";
export type StockSignalFilter = "ALL" | StockSignal;
export type StockMarketCapFilter = "ALL" | "LARGE" | "MID";
export type StocksApiSort = "MARKET_CAP" | "CHANGE";
export type StockRankingMetric = "TURNOVER" | "VOLUME" | "RETURN" | "DIVIDEND";

export type StockFilterCounts = {
  buy: number;
  sell: number;
  hold: number;
};

export type StockItem = {
  rank: number;
  id: number;
  ticker: string;
  name: string;
  gicsSector: string;
  price: number;
  fluctuationRate: number;
  signal: StockSignal;
  confidence: number;
  isWatchlisted: boolean;
  tradingValue: number;
  tradingVolume: number;
  dividendYield: number;
  marketCap: number;
  marketCapSize: Exclude<StockMarketCapFilter, "ALL">;
};

export type StocksResponse = {
  filterCounts: StockFilterCounts;
  stocks: StockItem[];
};

export type StocksQueryParams = {
  signal: StockSignalFilter;
  sector: string;
  marketCap: StockMarketCapFilter;
  sort?: StocksApiSort;
  keyword: string;
  offset: number;
  limit: number;
};
