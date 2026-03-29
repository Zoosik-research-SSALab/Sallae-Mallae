"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getSignals } from "../api/signals";
import type { SignalResponse, SignalsQueryParams } from "../types/signals";

const PAGE_SIZE = 6;

type BaseSignalsQueryParams = Omit<SignalsQueryParams, "offset" | "limit">;

export function useSignalsInfiniteQuery(params: BaseSignalsQueryParams) {
  const query = useInfiniteQuery<SignalResponse>({
    queryKey: ["signals", params],
    queryFn: ({ pageParam = 0 }) =>
      getSignals({
        ...params,
        offset: Number(pageParam),
        limit: PAGE_SIZE,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.signals.length < PAGE_SIZE) {
        return undefined;
      }

      return allPages.reduce((total, page) => total + page.signals.length, 0);
    },
    staleTime: 30_000,
  });

  const pages = query.data?.pages ?? [];
  const firstPage = pages[0];

  return {
    ...query,
    items: pages.flatMap((page) => page.signals),
    buyCount: firstPage?.buyCount ?? 0,
    sellCount: firstPage?.sellCount ?? 0,
    pageSize: PAGE_SIZE,
  };
}
