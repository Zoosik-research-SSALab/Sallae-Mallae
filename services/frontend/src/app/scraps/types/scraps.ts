import type { WatchlistListItem, WatchlistListResponse } from "@/shared/types/watchlist";

export type WatchlistSignal = "BUY" | "SELL" | "HOLD" | string;

export type WatchlistStockItem = WatchlistListItem;

export type WatchlistPayload = WatchlistListResponse;

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
  totalCount: number;
  news: WatchlistNewsItem[];
};

export type WatchlistSummary = {
  totalCount: number;
  upCount: number;
  buyCount: number;
  sellCount: number;
};
