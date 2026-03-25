export type NewsItem = {
  id: number;
  title: string;
  publisher: string;
  publishedAt: string | null;
  relatedStocks: string[];
  url: string | null;
};

export type NewsRelatedStock = {
  id: number;
  name: string;
  ticker: string;
};

export type NewsDetail = {
  id: number;
  title: string;
  snippet: string;
  publisher: string;
  publishedAt: string | null;
  url: string | null;
  relatedStocks: NewsRelatedStock[];
};

export type NewsPayload = {
  news: NewsItem[];
};

export type WatchlistNewsPagePayload = {
  totalCount: number;
  news: NewsItem[];
};

export type NewsSearchPayload = {
  keywords: string[];
};

export type NewsQueryParams = {
  offset: number;
  limit: number;
  keyword: string;
  startDate?: string;
  endDate?: string;
};

export type NewsTab = "LATEST" | "WATCHLIST";
export type NewsPeriodOption = "WEEK" | "MONTH" | "QUARTER";
export type NewsDateRange = {
  preset: NewsPeriodOption | null;
  startDate: string | null;
  endDate: string | null;
};

export type NewsTrendingKeyword = {
  rank: number;
  keyword: string;
};

export type NewsTrendingPayload = {
  trending: NewsTrendingKeyword[];
};
