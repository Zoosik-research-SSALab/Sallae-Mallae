export type WatchlistStatus = {
  isWatched: boolean;
  isNotifiedEnabled: boolean;
};

export type WatchlistToggleResponse = {
  message: string;
  count: number;
};

export type WatchlistNotificationResponse = {
  isNotifiedEnabled: boolean;
};

export type WatchlistListItem = {
  stockId: number;
  ticker: string;
  name: string;
  isNotifiedEnabled: boolean;
  price: number;
  fluctuationRate: number;
  signal: "BUY" | "SELL" | "HOLD" | string;
  confidence: number;
  createdAt: string | null;
};

export type WatchlistListResponse = {
  totalCount: number;
  buyCount: number;
  sellCount: number;
  upCount: number;
  watchlist: WatchlistListItem[];
};
