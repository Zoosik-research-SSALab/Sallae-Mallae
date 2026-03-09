export type TopStockItem = {
  rank: number;
  stockId: number;
  name: string;
  price: number;
  fluctuationRate: number;
  signal: string;
  confidence: number;
};

export type TopStocksPayload = {
  stocks: TopStockItem[];
};

export type SignalPointItem = {
  stockId: number;
  ticker: string;
  name: string;
  confidence: number;
  price: number;
  fluctuationRate: number;
};

export type NewSignalsPayload = {
  buy: SignalPointItem[];
  sell: SignalPointItem[];
};

export type MarketIndexItem = {
  value: number;
  changeRate: number;
};

export type MarketIndexPayload = {
  kospi: MarketIndexItem;
  kosdaq: MarketIndexItem;
  usdKrw: MarketIndexItem;
  baseTime: string;
};

export type CategoryStockItem = {
  name: string;
  price: number;
  fluctuationRate: number;
};

export type CategoryItem = {
  name: string;
  stocks: CategoryStockItem[];
};

export type CategoriesPayload = {
  categories: CategoryItem[];
};

export type PopularSearchItem = {
  rank: number;
  keyword: string;
};

export type PopularSearchesPayload = {
  keywords: PopularSearchItem[];
};
