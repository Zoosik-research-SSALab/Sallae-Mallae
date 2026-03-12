"use client";

import { useQuery } from "@tanstack/react-query";
import { getNotificationCount } from "@/app/notifications/api/getNotificationCount";

const notificationCountQueryKey = ["notifications", "unread-count"] as const;

export function useNotificationCountQuery(enabled = true) {
  return useQuery({
    queryKey: notificationCountQueryKey,
    queryFn: getNotificationCount,
    enabled,
    staleTime: 60 * 1000,
    refetchInterval: enabled ? 60 * 1000 : false,
    refetchOnMount: false,
  });
}
