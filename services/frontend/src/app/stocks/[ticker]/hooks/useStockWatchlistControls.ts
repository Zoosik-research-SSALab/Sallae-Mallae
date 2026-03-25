"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/lib/authStore";
import {
  addWatchlist,
  getWatchlistStatus,
  removeWatchlist,
  toggleWatchlistNotification,
  watchlistQueryKeys,
} from "@/shared/lib/watchlistApi";
import type { WatchlistStatus } from "@/shared/types/watchlist";

type UseStockWatchlistControlsResult = WatchlistStatus & {
  isLoading: boolean;
  isWatchlistPending: boolean;
  isNotificationPending: boolean;
  toggleWatchlist: () => Promise<boolean>;
  toggleNotification: () => Promise<boolean>;
};

const fallbackStatus: WatchlistStatus = {
  isWatched: false,
  isNotifiedEnabled: false,
};

export function useStockWatchlistControls(stockId: number): UseStockWatchlistControlsResult {
  const queryClient = useQueryClient();
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated";
  const statusQueryKey = watchlistQueryKeys.status(stockId);

  const statusQuery = useQuery({
    queryKey: statusQueryKey,
    queryFn: () => getWatchlistStatus(stockId),
    enabled: isAuthenticated,
    staleTime: 30_000,
    initialData: isAuthenticated ? undefined : fallbackStatus,
  });

  const watchlistMutation = useMutation({
    mutationFn: async (currentStatus: WatchlistStatus | undefined) => {
      if (!isAuthenticated) {
        throw new Error("로그인한 사용자만 접근 가능합니다.");
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
      } satisfies WatchlistStatus;
    },
    onMutate: async (currentStatus) => {
      const previousStatus =
        queryClient.getQueryData<WatchlistStatus>(statusQueryKey) ??
        currentStatus ??
        fallbackStatus;

      if (!isAuthenticated) {
        return {
          previousStatus,
        };
      }

      await queryClient.cancelQueries({ queryKey: statusQueryKey });

      const nextStatus: WatchlistStatus = {
        isWatched: !previousStatus.isWatched,
        isNotifiedEnabled: previousStatus.isWatched
          ? false
          : previousStatus.isNotifiedEnabled,
      };

      queryClient.setQueryData(statusQueryKey, nextStatus);

      return {
        previousStatus,
      };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(statusQueryKey, context?.previousStatus ?? fallbackStatus);
    },
    onSuccess: (nextStatus) => {
      queryClient.setQueryData(statusQueryKey, nextStatus);
    },
    onSettled: () => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: statusQueryKey });
      }
      queryClient.invalidateQueries({ queryKey: watchlistQueryKeys.lists });
    },
  });

  const notificationMutation = useMutation({
    mutationFn: async (currentStatus: WatchlistStatus | undefined) => {
      if (!isAuthenticated) {
        throw new Error("로그인한 사용자만 접근 가능합니다.");
      }

      if (!currentStatus?.isWatched) {
        throw new Error("관심종목에 추가한 뒤 알림을 설정할 수 있습니다.");
      }

      const response = await toggleWatchlistNotification(
        stockId,
        !currentStatus.isNotifiedEnabled,
      );

      return {
        isWatched: true,
        isNotifiedEnabled: response.isNotifiedEnabled,
      } satisfies WatchlistStatus;
    },
    onMutate: async (currentStatus) => {
      const previousStatus =
        queryClient.getQueryData<WatchlistStatus>(statusQueryKey) ??
        currentStatus ??
        fallbackStatus;

      if (!isAuthenticated || !previousStatus.isWatched) {
        return {
          previousStatus,
        };
      }

      await queryClient.cancelQueries({ queryKey: statusQueryKey });

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
      queryClient.setQueryData(statusQueryKey, context?.previousStatus ?? fallbackStatus);
    },
    onSuccess: (nextStatus) => {
      queryClient.setQueryData(statusQueryKey, nextStatus);
    },
    onSettled: () => {
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: statusQueryKey });
      }
      queryClient.invalidateQueries({ queryKey: watchlistQueryKeys.lists });
    },
  });

  const toggleWatchlist = useCallback(async () => {
    const nextStatus = await watchlistMutation.mutateAsync(statusQuery.data);
    return nextStatus.isWatched;
  }, [statusQuery.data, watchlistMutation]);

  const toggleNotification = useCallback(async () => {
    const nextStatus = await notificationMutation.mutateAsync(statusQuery.data);
    return nextStatus.isNotifiedEnabled;
  }, [notificationMutation, statusQuery.data]);

  return {
    isWatched: statusQuery.data?.isWatched ?? false,
    isNotifiedEnabled: statusQuery.data?.isNotifiedEnabled ?? false,
    isLoading: statusQuery.isLoading,
    isWatchlistPending: watchlistMutation.isPending,
    isNotificationPending: notificationMutation.isPending,
    toggleWatchlist,
    toggleNotification,
  };
}
