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

export function useNotificationsListQuery(tab: NotificationTab, limit: number) {
  return useQuery({
    queryKey: notificationsQueryKeys.list(tab, limit),
    queryFn: () => getNotifications({ tab, limit }),
    placeholderData: (previousData) => previousData,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
