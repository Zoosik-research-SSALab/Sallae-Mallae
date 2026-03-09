"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addWatchlist, getWatchlistStatus, removeWatchlist, watchlistQueryKeys } from "@/shared/lib/watchlistApi";
import type { WatchlistStatus } from "@/shared/types/watchlist";

type UseWatchlistResult = WatchlistStatus & {
  isLoading: boolean;
  isPending: boolean;
  toggle: () => Promise<void>;
};

export function useWatchlist(stockId: number): UseWatchlistResult {
  const queryClient = useQueryClient();
  const statusQueryKey = watchlistQueryKeys.status(stockId);

  const statusQuery = useQuery({
    queryKey: statusQueryKey,
    queryFn: () => getWatchlistStatus(stockId),
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: async (currentStatus: WatchlistStatus | undefined) => {
      const nextWatched = !(currentStatus?.isWatched ?? false);

      if (nextWatched) {
        await addWatchlist(stockId);
      } else {
        await removeWatchlist(stockId);
      }

      try {
        return await getWatchlistStatus(stockId);
      } catch {
        return {
          isWatched: nextWatched,
          isNotifiedEnabled: currentStatus?.isNotifiedEnabled ?? false,
        };
      }
    },
    onMutate: async (currentStatus) => {
      await queryClient.cancelQueries({ queryKey: statusQueryKey });

      const previousStatus = queryClient.getQueryData<WatchlistStatus>(statusQueryKey) ?? currentStatus;
      const nextStatus: WatchlistStatus = {
        isWatched: !(previousStatus?.isWatched ?? false),
        isNotifiedEnabled: previousStatus?.isNotifiedEnabled ?? false,
      };

      queryClient.setQueryData(statusQueryKey, nextStatus);

      return {
        previousStatus,
      };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousStatus) {
        queryClient.setQueryData(statusQueryKey, context.previousStatus);
      }
    },
    onSuccess: (nextStatus) => {
      queryClient.setQueryData(statusQueryKey, nextStatus);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: statusQueryKey });
      queryClient.invalidateQueries({ queryKey: watchlistQueryKeys.all });
    },
  });

  const toggle = useCallback(async () => {
    await toggleMutation.mutateAsync(statusQuery.data);
  }, [statusQuery.data, toggleMutation]);

  return {
    isWatched: statusQuery.data?.isWatched ?? false,
    isNotifiedEnabled: statusQuery.data?.isNotifiedEnabled ?? false,
    isLoading: statusQuery.isLoading,
    isPending: toggleMutation.isPending,
    toggle,
  };
}
