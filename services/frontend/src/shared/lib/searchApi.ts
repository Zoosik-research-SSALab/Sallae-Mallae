import { apiFetch } from "@/shared/lib/apiClient";
import type {
  RecentSearchesResponse,
  SaveRecentSearchRequest,
  SearchAutocompleteResponse,
  SearchMessageResponse,
} from "@/shared/types/search";

export async function getSearchAutocomplete(query: string) {
  if (!query.trim()) {
    return {
      stocks: [],
      news: [],
    } satisfies SearchAutocompleteResponse;
  }

  return apiFetch<SearchAutocompleteResponse>(`/api/search?q=${encodeURIComponent(query)}`, {
    cache: "no-store",
  });
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
