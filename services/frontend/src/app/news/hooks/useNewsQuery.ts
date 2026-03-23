"use client";

import { useQuery } from "@tanstack/react-query";
import type { NewsQueryParams } from "../types/news";
import { getNews } from "../api/getNews";

type Options = {
  enabled?: boolean;
};

export function useNewsQuery(params: NewsQueryParams, options: Options = {}) {
  return useQuery({
    queryKey: ["news", "list", params],
    queryFn: () => getNews(params),
    enabled: options.enabled,
    staleTime: 60_000,
  });
}
