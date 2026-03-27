"use client";

import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "../api/getNotifications";
import type { NotificationTab } from "../types/notifications";

export const notificationsQueryKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationsQueryKeys.all, "list"] as const,
  list: (tab: NotificationTab, limit: number) => [...notificationsQueryKeys.lists(), tab, limit] as const,
  unreadCount: () => [...notificationsQueryKeys.all, "unread-count"] as const,
  settings: () => [...notificationsQueryKeys.all, "settings"] as const,
};

export function useNotificationsListQuery(tab: NotificationTab, limit: number, enabled = true) {
  return useQuery({
    queryKey: notificationsQueryKeys.list(tab, limit),
    queryFn: () => getNotifications({ tab, limit, includeHasMore: true }),
    enabled,
    placeholderData: (previousData, previousQuery) => {
      const previousKey = previousQuery?.queryKey;

      if (!Array.isArray(previousKey) || previousKey.length < 4) {
        return undefined;
      }

      const previousTab = previousKey[2];
      const previousLimit = previousKey[3];

      if (previousTab !== tab || typeof previousLimit !== "number" || previousLimit > limit) {
        return undefined;
      }

      return previousData;
    },
    staleTime: 30_000,
    refetchInterval: enabled ? 60_000 : false,
  });
}
