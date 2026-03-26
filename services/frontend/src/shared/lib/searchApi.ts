import { apiFetch } from "@/shared/lib/apiClient";
import type {
  RecentSearchesResponse,
  SaveRecentSearchRequest,
  SearchAutocompleteResponse,
  SearchMessageResponse,
} from "@/shared/types/search";

type SearchAutocompleteEnvelope = {
  success: boolean;
  data: SearchAutocompleteResponse;
  error: unknown;
};

type RecentSearchesEnvelope = {
  success: boolean;
  data: RecentSearchesResponse;
  error: unknown;
};

type SearchMessageEnvelope = {
  success: boolean;
  data: SearchMessageResponse;
  error: unknown;
};

function isSearchAutocompleteEnvelope(
  payload: SearchAutocompleteResponse | SearchAutocompleteEnvelope,
): payload is SearchAutocompleteEnvelope {
  return typeof payload === "object" && payload !== null && "data" in payload;
}

function normalizeSearchAutocompleteResponse(payload: SearchAutocompleteResponse | SearchAutocompleteEnvelope) {
  const response = isSearchAutocompleteEnvelope(payload) ? payload.data : payload;

  return {
    stocks: Array.isArray(response.stocks)
      ? response.stocks.map((stock) => ({
          id: Number(stock.id ?? 0),
          ticker: typeof stock.ticker === "string" ? stock.ticker : "",
          name: typeof stock.name === "string" ? stock.name : "",
          gicsSector: typeof stock.gicsSector === "string" ? stock.gicsSector : "",
          currentPrice: Number(stock.currentPrice ?? 0),
          fluctuationRate: Number(stock.fluctuationRate ?? 0),
        }))
      : [],
    news: Array.isArray(response.news)
      ? response.news.map((news) => ({
          id: Number(news.id ?? 0),
          title: typeof news.title === "string" ? news.title : "",
          publisher: typeof news.publisher === "string" ? news.publisher : "",
          publishedAt: typeof news.publishedAt === "string" ? news.publishedAt : null,
          url: typeof news.url === "string" ? news.url : null,
        }))
      : [],
  } satisfies SearchAutocompleteResponse;
}

function isRecentSearchesEnvelope(
  payload: RecentSearchesResponse | RecentSearchesEnvelope,
): payload is RecentSearchesEnvelope {
  return typeof payload === "object" && payload !== null && "data" in payload;
}

function normalizeRecentSearchesResponse(
  payload: RecentSearchesResponse | RecentSearchesEnvelope,
) {
  const response = isRecentSearchesEnvelope(payload) ? payload.data : payload;

  return {
    recent: Array.isArray(response.recent) ? response.recent : [],
  } satisfies RecentSearchesResponse;
}

function isSearchMessageEnvelope(
  payload: SearchMessageResponse | SearchMessageEnvelope,
): payload is SearchMessageEnvelope {
  return typeof payload === "object" && payload !== null && "data" in payload;
}

function normalizeSearchMessageResponse(
  payload: SearchMessageResponse | SearchMessageEnvelope,
) {
  const response = isSearchMessageEnvelope(payload) ? payload.data : payload;

  return {
    message: typeof response.message === "string" ? response.message : "",
  } satisfies SearchMessageResponse;
}

export async function getSearchAutocomplete(query: string) {
  if (!query.trim()) {
    return {
      stocks: [],
      news: [],
    } satisfies SearchAutocompleteResponse;
  }

  const payload = await apiFetch<SearchAutocompleteResponse | SearchAutocompleteEnvelope>(
    `/api/search?q=${encodeURIComponent(query)}`,
    {
      cache: "no-store",
    },
  );

  return normalizeSearchAutocompleteResponse(payload);
}

export async function getRecentSearches() {
  const payload = await apiFetch<RecentSearchesResponse | RecentSearchesEnvelope>("/api/search/recent", {
    cache: "no-store",
    withAuth: true,
  });

  return normalizeRecentSearchesResponse(payload);
}

export async function saveRecentSearch(body: SaveRecentSearchRequest) {
  const payload = await apiFetch<SearchMessageResponse | SearchMessageEnvelope, SaveRecentSearchRequest>("/api/search/recent", {
    method: "POST",
    body,
    withAuth: true,
  });

  return normalizeSearchMessageResponse(payload);
}

export async function deleteRecentSearch(keyword: string) {
  const payload = await apiFetch<SearchMessageResponse | SearchMessageEnvelope>(`/api/search/recent/${encodeURIComponent(keyword)}`, {
    method: "DELETE",
    withAuth: true,
  });

  return normalizeSearchMessageResponse(payload);
}

export async function clearRecentSearches() {
  const payload = await apiFetch<SearchMessageResponse | SearchMessageEnvelope>("/api/search/recent", {
    method: "DELETE",
    withAuth: true,
  });

  return normalizeSearchMessageResponse(payload);
}
