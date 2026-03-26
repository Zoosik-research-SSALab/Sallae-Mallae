"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearRecentSearches,
  deleteRecentSearch,
  getRecentSearches,
  getSearchAutocomplete,
  saveRecentSearch,
  subscribeTrendingSearchStocks,
} from "@/shared/lib/searchApi";
import type {
  RecentSearchItem,
  RecentSearchesResponse,
  SaveRecentSearchRequest,
  SearchAutocompleteResponse,
  SearchNewsItem,
  SearchStockItem,
  TrendingSearchStockItem,
} from "@/shared/types/search";

type UseSearchModalOptions = {
  isLoggedIn: boolean;
};

const EMPTY_RESULTS: SearchAutocompleteResponse = {
  stocks: [],
  news: [],
};

const EMPTY_RECENT_SEARCHES: RecentSearchItem[] = [];

const searchQueryKeys = {
  recent: ["search", "recent"] as const,
  autocomplete: (keyword: string) => ["search", "autocomplete", keyword] as const,
};

function useDebouncedValue(value: string, delayMs = 180) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [delayMs, value]);

  return debouncedValue;
}

function buildRecentSearchItem(
  body: SaveRecentSearchRequest,
  searchedAt = new Date().toISOString(),
): RecentSearchItem {
  return {
    keyword: body.keyword.trim(),
    searchedAt,
    stockId: body.stockId,
  };
}

function upsertRecentSearchCache(
  current: RecentSearchesResponse | undefined,
  body: SaveRecentSearchRequest,
) {
  const nextItem = buildRecentSearchItem(body);
  const previousRecent = current?.recent ?? EMPTY_RECENT_SEARCHES;
  const nextRecent = previousRecent.filter((item) => {
    if (nextItem.stockId !== null && item.stockId !== null) {
      return item.stockId !== nextItem.stockId;
    }

    return item.keyword !== nextItem.keyword;
  });

  return {
    recent: [nextItem, ...nextRecent].slice(0, 10),
  } satisfies RecentSearchesResponse;
}

function removeRecentSearchCache(
  current: RecentSearchesResponse | undefined,
  keyword: string,
) {
  return {
    recent: (current?.recent ?? EMPTY_RECENT_SEARCHES).filter((item) => item.keyword !== keyword),
  } satisfies RecentSearchesResponse;
}

export function useSearchModal({ isLoggedIn }: UseSearchModalOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const shouldIgnoreSearchTriggerFocusRef = useRef(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchKeyword, setSearchKeywordState] = useState("");
  const [trendingStocks, setTrendingStocks] = useState<TrendingSearchStockItem[]>([]);
  const [trendingStocksUpdatedAt, setTrendingStocksUpdatedAt] = useState<string | null>(null);
  const [hasTrendingStocksError, setHasTrendingStocksError] = useState(false);

  const trimmedKeyword = searchKeyword.trim();
  const debouncedKeyword = useDebouncedValue(trimmedKeyword);
  const shouldSubscribeToTrending = isSearchModalOpen && !trimmedKeyword;

  const recentSearchesQuery = useQuery({
    queryKey: searchQueryKeys.recent,
    queryFn: getRecentSearches,
    enabled: isSearchModalOpen && isLoggedIn,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    select: (data) => data.recent,
  });

  const autocompleteQuery = useQuery({
    queryKey: searchQueryKeys.autocomplete(debouncedKeyword),
    queryFn: () => getSearchAutocomplete(debouncedKeyword),
    enabled: isSearchModalOpen && debouncedKeyword.length > 0,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    select: (data) => ({
      stocks: data.stocks,
      news: data.news,
    } satisfies SearchAutocompleteResponse),
  });

  const saveRecentSearchMutation = useMutation({
    mutationFn: saveRecentSearch,
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: searchQueryKeys.recent });

      const previousRecentSearches = queryClient.getQueryData<RecentSearchesResponse>(searchQueryKeys.recent);
      queryClient.setQueryData(searchQueryKeys.recent, upsertRecentSearchCache(previousRecentSearches, body));

      return { previousRecentSearches };
    },
    onError: (_error, _body, context) => {
      queryClient.setQueryData(searchQueryKeys.recent, context?.previousRecentSearches);
    },
  });

  const removeRecentSearchMutation = useMutation({
    mutationFn: deleteRecentSearch,
    onMutate: async (keyword) => {
      await queryClient.cancelQueries({ queryKey: searchQueryKeys.recent });

      const previousRecentSearches = queryClient.getQueryData<RecentSearchesResponse>(searchQueryKeys.recent);
      queryClient.setQueryData(searchQueryKeys.recent, removeRecentSearchCache(previousRecentSearches, keyword));

      return { previousRecentSearches };
    },
    onError: (_error, _keyword, context) => {
      queryClient.setQueryData(searchQueryKeys.recent, context?.previousRecentSearches);
    },
  });

  const clearRecentSearchesMutation = useMutation({
    mutationFn: clearRecentSearches,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: searchQueryKeys.recent });

      const previousRecentSearches = queryClient.getQueryData<RecentSearchesResponse>(searchQueryKeys.recent);
      queryClient.setQueryData(searchQueryKeys.recent, {
        recent: [],
      } satisfies RecentSearchesResponse);

      return { previousRecentSearches };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(searchQueryKeys.recent, context?.previousRecentSearches);
    },
  });

  useEffect(() => {
    if (isLoggedIn) {
      return;
    }

    queryClient.removeQueries({ queryKey: searchQueryKeys.recent });
  }, [isLoggedIn, queryClient]);

  useEffect(() => {
    if (!shouldSubscribeToTrending) {
      return;
    }

    return subscribeTrendingSearchStocks({
      onMessage: (payload) => {
        setTrendingStocks(payload.stocks.slice(0, 5));
        setTrendingStocksUpdatedAt(new Date().toISOString());
        setHasTrendingStocksError(false);
      },
      onError: () => {
        setHasTrendingStocksError(true);
      },
    });
  }, [shouldSubscribeToTrending]);

  const setSearchKeyword = useCallback((value: string) => {
    if (!value.trim()) {
      setHasTrendingStocksError(false);
    }

    setSearchKeywordState(value);
  }, []);

  const openSearchModal = useCallback(() => {
    if (shouldIgnoreSearchTriggerFocusRef.current) {
      shouldIgnoreSearchTriggerFocusRef.current = false;
      return;
    }

    setHasTrendingStocksError(false);
    setIsSearchModalOpen(true);
  }, []);

  const closeSearchModal = useCallback(() => {
    shouldIgnoreSearchTriggerFocusRef.current = true;
    setIsSearchModalOpen(false);
    setHasTrendingStocksError(false);
    setSearchKeywordState("");
  }, []);

  const submitSearch = useCallback((keyword: string) => {
    const nextValue = keyword.trim();
    if (!nextValue) {
      return;
    }

    setSearchKeyword(nextValue);
  }, [setSearchKeyword]);

  const goToStockDetail = useCallback(
    (stockId: number) => {
      closeSearchModal();
      router.push(`/stocks/${stockId}`);
    },
    [closeSearchModal, router],
  );

  const persistRecentSearch = useCallback(
    async (body: SaveRecentSearchRequest) => {
      if (!isLoggedIn) {
        return;
      }

      try {
        await saveRecentSearchMutation.mutateAsync(body);
      } catch {
        // Ignore recent-search save failures so search navigation still works.
      }
    },
    [isLoggedIn, saveRecentSearchMutation],
  );

  const handleStockSelect = useCallback(
    async (stock: SearchStockItem) => {
      await persistRecentSearch({
        keyword: stock.name,
        stockId: stock.id,
      });

      goToStockDetail(stock.id);
    },
    [goToStockDetail, persistRecentSearch],
  );

  const handleNewsSelect = useCallback(
    (news: SearchNewsItem) => {
      if (!news.url) {
        return;
      }

      closeSearchModal();
      window.open(news.url, "_blank", "noopener,noreferrer");
    },
    [closeSearchModal],
  );

  const handleTrendingStockSelect = useCallback(
    async (stock: TrendingSearchStockItem) => {
      await persistRecentSearch({
        keyword: stock.name,
        stockId: stock.stockId,
      });

      goToStockDetail(stock.stockId);
    },
    [goToStockDetail, persistRecentSearch],
  );

  const handleRecentSearchClick = useCallback(
    (item: RecentSearchItem) => {
      if (item.stockId !== null) {
        goToStockDetail(item.stockId);
        return;
      }

      submitSearch(item.keyword);
    },
    [goToStockDetail, submitSearch],
  );

  const handleRecentSearchRemove = useCallback(
    async (keyword: string) => {
      try {
        await removeRecentSearchMutation.mutateAsync(keyword);
      } catch {
        // Keep current cache state when delete fails.
      }
    },
    [removeRecentSearchMutation],
  );

  const handleRecentSearchesClear = useCallback(async () => {
    try {
      await clearRecentSearchesMutation.mutateAsync();
    } catch {
      // Keep current cache state when clear fails.
    }
  }, [clearRecentSearchesMutation]);

  const searchResults =
    !trimmedKeyword || trimmedKeyword !== debouncedKeyword
      ? EMPTY_RESULTS
      : (autocompleteQuery.data ?? EMPTY_RESULTS);

  const isTrendingStocksLoading =
    shouldSubscribeToTrending &&
    trendingStocks.length === 0 &&
    !hasTrendingStocksError;

  const isSearchLoading =
    isSearchModalOpen &&
    trimmedKeyword.length > 0 &&
    (trimmedKeyword !== debouncedKeyword || autocompleteQuery.isFetching);

  return {
    isSearchModalOpen,
    searchKeyword,
    recentSearches: isLoggedIn ? (recentSearchesQuery.data ?? EMPTY_RECENT_SEARCHES) : EMPTY_RECENT_SEARCHES,
    searchResults,
    isSearchLoading,
    trendingStocks,
    trendingStocksUpdatedAt,
    isTrendingStocksLoading,
    setSearchKeyword,
    openSearchModal,
    closeSearchModal,
    submitSearch,
    handleStockSelect,
    handleNewsSelect,
    handleTrendingStockSelect,
    handleRecentSearchClick,
    handleRecentSearchRemove,
    handleRecentSearchesClear,
  };
}
