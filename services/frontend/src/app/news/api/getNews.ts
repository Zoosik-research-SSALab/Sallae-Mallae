import { apiFetch } from "@/shared/lib/apiClient";
import type { NewsPayload, NewsQueryParams } from "../types/news";

function createNewsSearchParams(params: NewsQueryParams) {
  const searchParams = new URLSearchParams({
    offset: String(params.offset),
    limit: String(params.limit),
  });

  if (params.keyword) {
    searchParams.set("keyword", params.keyword);
  }

  return searchParams.toString();
}

export function getNews(params: NewsQueryParams) {
  return apiFetch<NewsPayload>(`/api/news?${createNewsSearchParams(params)}`, {
    cache: "no-store",
  });
}
