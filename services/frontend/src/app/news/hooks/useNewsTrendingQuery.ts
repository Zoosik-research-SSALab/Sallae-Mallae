"use client";

import { useQuery } from "@tanstack/react-query";
import { getTrendingNews } from "../api/getNews";

export function useNewsTrendingQuery() {
  return useQuery({
    queryKey: ["news", "trending"],
    queryFn: getTrendingNews,
    staleTime: 60_000,
  });
}
