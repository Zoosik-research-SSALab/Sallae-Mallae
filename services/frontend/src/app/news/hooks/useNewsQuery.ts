"use client";

import { useQuery } from "@tanstack/react-query";
import type { NewsQueryParams } from "../types/news";
import { getNews } from "../api/getNews";

export function useNewsQuery(params: NewsQueryParams) {
  return useQuery({
    queryKey: ["news", "list", params],
    queryFn: () => getNews(params),
    staleTime: 60_000,
  });
}
