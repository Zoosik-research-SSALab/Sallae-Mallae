"use client";

import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWatchlistStatus,
  toggleWatchlistNotification,
  watchlistQueryKeys,
} from "@/shared/lib/watchlistApi";
import { useAuthStore } from "@/shared/lib/authStore";
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
  const authStatus = useAuthStore((state) => state.status);
  const isAuthenticated = authStatus === "authenticated";
  const statusQueryKey = watchlistQueryKeys.status(stockId);
  const latestStatusRef = useRef<WatchlistStatus | undefined>(undefined);
  const fallbackStatus: WatchlistStatus = {
    isWatched: false,
    isNotifiedEnabled: false,
  };

  const statusQuery = useQuery({
    queryKey: statusQueryKey,
    queryFn: () => getWatchlistStatus(stockId),
    enabled: isAuthenticated && enabled,
    staleTime: 30_000,
    initialData: isAuthenticated ? undefined : fallbackStatus,
  });

  useEffect(() => {
    latestStatusRef.current = statusQuery.data;
  }, [statusQuery.data]);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: async (currentStatus: WatchlistStatus | undefined) => {
      if (!isAuthenticated) {
        throw new Error("로그인 유저만 접속 가능합니다.");
      }

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
      const previousStatus = queryClient.getQueryData<WatchlistStatus>(statusQueryKey) ?? currentStatus ?? fallbackStatus;

      if (!isAuthenticated) {
        return {
          previousStatus,
        };
      }

      if (!currentStatus?.isWatched) {
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
      queryClient.setQueryData(statusQueryKey, context?.previousStatus ?? { isWatched: false, isNotifiedEnabled: false });
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
    const nextStatus = await mutateAsync(latestStatusRef.current);
    return nextStatus.isNotifiedEnabled;
  }, [mutateAsync]);

  return {
    isWatched: statusQuery.data?.isWatched ?? false,
    isNotifiedEnabled: statusQuery.data?.isNotifiedEnabled ?? false,
    isLoading: statusQuery.isLoading,
    isPending,
    toggle,
  };
}
