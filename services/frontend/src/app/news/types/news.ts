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

export type NewsSearchPayload = {
  keywords: string[];
};

export type NewsQueryParams = {
  offset: number;
  limit: number;
  keyword: string;
};

export type NewsTab = "LATEST" | "WATCHLIST";
export type NewsSortOption = "LATEST" | "RELEVANCE" | "POPULAR";
export type NewsPeriodOption = "WEEK" | "MONTH" | "QUARTER";
export type NewsPeriodFilter = NewsPeriodOption | null;

export type NewsTrendingKeyword = {
  rank: number;
  keyword: string;
};

export type NewsTrendingPayload = {
  trending: NewsTrendingKeyword[];
};
