export type NewsItem = {
  id: number;
  title: string;
  publisher: string;
  publishedAt: string;
  relatedStocks: string[];
  url: string;
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

export type RankedNewsKeyword = {
  keyword: string;
  count: number;
};
