"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addWatchlist, getWatchlistStatus, removeWatchlist, watchlistQueryKeys } from "@/shared/lib/watchlistApi";
import { useAuthStore } from "@/shared/lib/authStore";
import type { WatchlistStatus } from "@/shared/types/watchlist";

type UseWatchlistResult = WatchlistStatus & {
  isLoading: boolean;
  isPending: boolean;
  toggle: () => Promise<boolean>;
};

export function useWatchlist(stockId: number, initialWatched?: boolean): UseWatchlistResult {
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated";
  const statusQueryKey = watchlistQueryKeys.status(stockId);
  const shouldFetchStatus = isAuthenticated && initialWatched === undefined;
  const fallbackStatus: WatchlistStatus = {
    isWatched: false,
    isNotifiedEnabled: false,
  };
  const initialStatus =
    initialWatched === undefined
      ? isAuthenticated
        ? undefined
        : fallbackStatus
      : {
          isWatched: initialWatched,
          isNotifiedEnabled: false,
        };

  const statusQuery = useQuery({
    queryKey: statusQueryKey,
    queryFn: () => getWatchlistStatus(stockId),
    enabled: shouldFetchStatus,
    staleTime: 30_000,
    initialData: initialStatus,
  });

  const toggleMutation = useMutation({
    mutationFn: async (currentStatus: WatchlistStatus | undefined) => {
      if (!isAuthenticated) {
        throw new Error("로그인 유저만 접속 가능합니다.");
      }

      const nextWatched = !(currentStatus?.isWatched ?? false);

      if (nextWatched) {
        await addWatchlist(stockId);
      } else {
        await removeWatchlist(stockId);
      }

      return {
        isWatched: nextWatched,
        isNotifiedEnabled: nextWatched ? (currentStatus?.isNotifiedEnabled ?? false) : false,
      };
    },
    onMutate: async (currentStatus) => {
      const previousStatus = queryClient.getQueryData<WatchlistStatus>(statusQueryKey) ?? currentStatus ?? fallbackStatus;

      if (!isAuthenticated) {
        return {
          previousStatus,
        };
      }

      await queryClient.cancelQueries({ queryKey: statusQueryKey });

      const nextStatus: WatchlistStatus = {
        isWatched: !(previousStatus?.isWatched ?? false),
        isNotifiedEnabled: !(previousStatus?.isWatched ?? false) ? (previousStatus?.isNotifiedEnabled ?? false) : false,
      };

      queryClient.setQueryData(statusQueryKey, nextStatus);

      return {
        previousStatus,
      };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(statusQueryKey, context?.previousStatus ?? { isWatched: false, isNotifiedEnabled: false });
    },
    onSuccess: (nextStatus) => {
      queryClient.setQueryData(statusQueryKey, nextStatus);
    },
    onSettled: () => {
      if (shouldFetchStatus) {
        queryClient.invalidateQueries({ queryKey: statusQueryKey });
      }

      queryClient.invalidateQueries({ queryKey: watchlistQueryKeys.all });
    },
  });

  const toggle = useCallback(async () => {
    const nextStatus = await toggleMutation.mutateAsync(statusQuery.data);
    return nextStatus.isWatched;
  }, [statusQuery.data, toggleMutation]);

  return {
    isWatched: statusQuery.data?.isWatched ?? false,
    isNotifiedEnabled: statusQuery.data?.isNotifiedEnabled ?? false,
    isLoading: statusQuery.isLoading,
    isPending: toggleMutation.isPending,
    toggle,
  };
}
