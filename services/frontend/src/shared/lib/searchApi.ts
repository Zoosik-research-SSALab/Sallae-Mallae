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

function isSearchAutocompleteEnvelope(
  payload: SearchAutocompleteResponse | SearchAutocompleteEnvelope,
): payload is SearchAutocompleteEnvelope {
  return typeof payload === "object" && payload !== null && "data" in payload;
}

function normalizeSearchAutocompleteResponse(payload: SearchAutocompleteResponse | SearchAutocompleteEnvelope) {
  const response = isSearchAutocompleteEnvelope(payload) ? payload.data : payload;

  return {
    stocks: Array.isArray(response.stocks) ? response.stocks : [],
    news: Array.isArray(response.news) ? response.news : [],
  } satisfies SearchAutocompleteResponse;
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
  return apiFetch<RecentSearchesResponse>("/api/search/recent", {
    cache: "no-store",
    withAuth: true,
  });
}

export async function saveRecentSearch(body: SaveRecentSearchRequest) {
  return apiFetch<SearchMessageResponse, SaveRecentSearchRequest>("/api/search/recent", {
    method: "POST",
    body,
    withAuth: true,
  });
}

export async function deleteRecentSearch(keyword: string) {
  return apiFetch<SearchMessageResponse>(`/api/search/recent/${encodeURIComponent(keyword)}`, {
    method: "DELETE",
    withAuth: true,
  });
}

export async function clearRecentSearches() {
  return apiFetch<SearchMessageResponse>("/api/search/recent", {
    method: "DELETE",
    withAuth: true,
  });
}
