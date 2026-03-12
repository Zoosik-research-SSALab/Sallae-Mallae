"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWatchlistStatus,
  toggleWatchlistNotification,
  watchlistQueryKeys,
} from "@/shared/lib/watchlistApi";
import type { WatchlistStatus } from "@/shared/types/watchlist";

type UseWatchlistNotificationResult = {
  isWatched: boolean;
  isNotifiedEnabled: boolean;
  isLoading: boolean;
  isPending: boolean;
  toggle: () => Promise<boolean>;
};

export function useWatchlistNotification(stockId: number, enabled = true): UseWatchlistNotificationResult {
  const queryClient = useQueryClient();
  const statusQueryKey = watchlistQueryKeys.status(stockId);

  const statusQuery = useQuery({
    queryKey: statusQueryKey,
    queryFn: () => getWatchlistStatus(stockId),
    enabled,
    staleTime: 30_000,
  });

  const toggleMutation = useMutation({
    mutationFn: async (currentStatus: WatchlistStatus | undefined) => {
      if (!currentStatus?.isWatched) {
        throw new Error("관심종목에 추가한 뒤 알림을 설정할 수 있습니다.");
      }

      const response = await toggleWatchlistNotification(stockId);

      return {
        isWatched: true,
        isNotifiedEnabled: response.isNotifiedEnabled,
      } satisfies WatchlistStatus;
    },
    onMutate: async (currentStatus) => {
      if (!currentStatus?.isWatched) {
        return {
          previousStatus: currentStatus,
        };
      }

      await queryClient.cancelQueries({ queryKey: statusQueryKey });

      const previousStatus = queryClient.getQueryData<WatchlistStatus>(statusQueryKey) ?? currentStatus;
      const nextStatus: WatchlistStatus = {
        isWatched: true,
        isNotifiedEnabled: !previousStatus.isNotifiedEnabled,
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
    const nextStatus = await toggleMutation.mutateAsync(statusQuery.data);
    return nextStatus.isNotifiedEnabled;
  }, [statusQuery.data, toggleMutation]);

  return {
    isWatched: statusQuery.data?.isWatched ?? false,
    isNotifiedEnabled: statusQuery.data?.isNotifiedEnabled ?? false,
    isLoading: statusQuery.isLoading,
    isPending: toggleMutation.isPending,
    toggle,
  };
}
