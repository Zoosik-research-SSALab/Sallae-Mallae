import type { MARKET_CATEGORIES } from "@/shared/lib/marketCategories";

export type SignalQueryFilter = "ALL" | "BUY" | "SELL";
export type SignalQuerySort = "LATEST" | "UP" | "DOWN";
export type SignalMarketCapSize = "LARGE" | "MID";
export type SignalMarketCapFilter = "ALL" | SignalMarketCapSize;
export type SignalSectorName = (typeof MARKET_CATEGORIES)[number]["name"];

export type SignalItem = {
  stockId: number;
  ticker: string;
  name: string;
  category?: SignalSectorName | string | null;
  marketCapSize?: SignalMarketCapSize | null;
  price: number;
  fluctuationRate: number;
  signal: Exclude<SignalQueryFilter, "ALL">;
  confidence: number;
  createdAt: string | null;
};

export type SignalResponse = {
  buyCount: number;
  sellCount: number;
  signals: SignalItem[];
};

export type SignalResponseEnvelope = {
  success: boolean;
  data: SignalResponse | null;
  error: unknown;
};

export type SignalsQueryParams = {
  filter: SignalQueryFilter;
  sort: SignalQuerySort;
  offset: number;
  limit: number;
  categories: SignalSectorName[];
  marketCap: SignalMarketCapFilter;
  keyword: string;
};
