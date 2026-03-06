"use client";

import { useQuery } from "@tanstack/react-query";
import { getNotificationCount } from "@/app/notifications/api/getNotificationCount";

const notificationCountQueryKey = ["notifications", "unread-count"] as const;

export function useNotificationCountQuery(enabled = true) {
  return useQuery({
    queryKey: notificationCountQueryKey,
    queryFn: getNotificationCount,
    enabled,
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000,
  });
}
