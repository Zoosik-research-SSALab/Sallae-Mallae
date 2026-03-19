export type StocksApiSort = "TRADING_VALUE" | "TRADING_VOLUME" | "DIVIDEND_YIELD" | "CHANGE";
export type StockRankingMetric = "TURNOVER" | "VOLUME" | "RETURN" | "DIVIDEND";

export type StockItem = {
  rank: number;
  id: number;
  ticker: string;
  name: string;
  gicsSector: string;
  price: number;
  fluctuationRate: number;
  isWatchlisted: boolean;
  tradingValue: number;
  tradingVolume: number;
  dividendYield: number | null;
};

export type StocksResponse = {
  stocks: StockItem[];
};

export type StocksQueryParams = {
  sectors: string[];
  sort?: StocksApiSort;
  offset: number;
  limit: number;
};
