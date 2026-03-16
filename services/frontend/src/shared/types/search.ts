export type SearchStockItem = {
  id: number;
  ticker: string;
  name: string;
  gicsSector: string;
  currentPrice: number;
  fluctuationRate: number;
};

export type SearchNewsItem = {
  id: number;
  title: string;
  publisher: string;
  publishedAt: string;
};

export type SearchAutocompleteResponse = {
  stocks: SearchStockItem[];
  news: SearchNewsItem[];
};

export type RecentSearchItem = {
  keyword: string;
  searchedAt: string;
  stockId: number | null;
};

export type RecentSearchesResponse = {
  recent: RecentSearchItem[];
};

export type SaveRecentSearchRequest = {
  keyword: string;
  stockId: number | null;
};

export type SearchMessageResponse = {
  message: string;
};
