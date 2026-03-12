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
