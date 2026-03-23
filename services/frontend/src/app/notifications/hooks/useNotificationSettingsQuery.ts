"use client";

import { useQuery } from "@tanstack/react-query";
import { getNotificationSettings } from "../api/getNotifications";
import { notificationsQueryKeys } from "./useNotificationsListQuery";

export function useNotificationSettingsQuery(enabled = false) {
  return useQuery({
    queryKey: notificationsQueryKeys.settings(),
    queryFn: getNotificationSettings,
    enabled,
    staleTime: 60_000,
  });
}
