"use client";

import { useQuery } from "@tanstack/react-query";
import { getNewsDetail } from "../api/getNews";

export function useNewsDetailQuery(newsId: number | null) {
  return useQuery({
    queryKey: ["news", "detail", newsId],
    queryFn: () => getNewsDetail(newsId ?? 0),
    enabled: newsId !== null,
    staleTime: 60_000,
  });
}
