import { authApiFetch } from "@/shared/lib/authApiClient";
import type {
  NotificationItem,
  NotificationListItemApi,
  NotificationListPayload,
  NotificationSettings,
  NotificationSettingsApi,
  NotificationSettingsPatch,
  NotificationTab,
} from "../types/notifications";
import { normalizeNotificationType } from "../utils/notificationFormatters";

const NOTIFICATION_COUNT_FETCH_LIMIT = 99;

type NotificationListApiPayload = {
  notifications?: NotificationListItemApi[] | null;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: unknown;
};

function hasDataEnvelope<T>(payload: ApiEnvelope<T> | T): payload is ApiEnvelope<T> {
  return typeof payload === "object" && payload !== null && "data" in payload;
}

function normalizeNotificationItem(item: NotificationListItemApi): NotificationItem {
  return {
    id: Number(item.id ?? 0),
    notiType: normalizeNotificationType(item.notiType ?? item.noti_type),
    stockName: String(item.stockName ?? item.stock_name ?? ""),
    message: String(item.message ?? ""),
    isRead: Boolean(item.isRead ?? item.is_read),
    createdAt:
      typeof item.createdAt === "string"
        ? item.createdAt
        : typeof item.created_at === "string"
          ? item.created_at
          : null,
    stockId: Number(item.stockId ?? item.stock_id ?? 0),
  };
}

function normalizeNotificationSettings(payload: NotificationSettingsApi): NotificationSettings {
  return {
    isNotiEnabled: Boolean(payload.isNotiEnabled ?? payload.is_noti_enabled),
    isEmailNotiEnabled: Boolean(payload.isEmailNotiEnabled ?? payload.is_email_noti_enabled),
  };
}

export async function getNotifications(params: {
  tab: NotificationTab;
  limit: number;
  includeHasMore?: boolean;
}) {
  const requestLimit = params.includeHasMore ? params.limit + 1 : params.limit;
  const search = new URLSearchParams({
    tab: params.tab,
    limit: String(requestLimit),
  });

  const payload = await authApiFetch<
    ApiEnvelope<NotificationListApiPayload> | NotificationListApiPayload
  >(
    `/api/notifications/list?${search.toString()}`,
    {
      cache: "no-store",
    },
  );

  const listPayload: NotificationListApiPayload = hasDataEnvelope(payload)
    ? payload.data ?? { notifications: [] }
    : payload;
  const notifications = Array.isArray(listPayload.notifications)
    ? listPayload.notifications.map((item) => normalizeNotificationItem(item as NotificationListItemApi))
    : [];
  const hasMore = params.includeHasMore ? notifications.length > params.limit : false;

  return {
    notifications: params.includeHasMore ? notifications.slice(0, params.limit) : notifications,
    hasMore,
  } satisfies NotificationListPayload;
}

export async function getNotificationCount() {
  const payload = await getNotifications({
    tab: "ALL",
    limit: NOTIFICATION_COUNT_FETCH_LIMIT,
  });

  return payload.notifications.reduce((count, item) => count + (item.isRead ? 0 : 1), 0);
}

export async function getNotificationSettings() {
  const payload = await authApiFetch<ApiEnvelope<NotificationSettingsApi> | NotificationSettingsApi>(
    "/api/notifications/settings",
    {
      cache: "no-store",
    },
  );

  const settingsPayload: NotificationSettingsApi = hasDataEnvelope(payload)
    ? payload.data ?? {}
    : payload;
  return normalizeNotificationSettings(settingsPayload);
}

export async function updateNotificationSettings(patch: NotificationSettingsPatch) {
  const payload = await authApiFetch<ApiEnvelope<NotificationSettingsApi> | NotificationSettingsApi, NotificationSettingsPatch>(
    "/api/notifications/settings",
    {
      method: "PATCH",
      body: patch,
    },
  );

  const settingsPayload: NotificationSettingsApi = hasDataEnvelope(payload)
    ? payload.data ?? {}
    : payload;
  return normalizeNotificationSettings(settingsPayload);
}

export async function markNotificationAsRead(notificationId: number) {
  await authApiFetch<void>(`/api/notifications/read/${notificationId}`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsAsRead(tab: NotificationTab) {
  const search = new URLSearchParams({
    tab,
  });

  await authApiFetch<void>(`/api/notifications/read-all?${search.toString()}`, {
    method: "PATCH",
  });
}

export async function deleteNotification(notificationId: number) {
  await authApiFetch<void>(`/api/notifications/${notificationId}`, {
    method: "DELETE",
  });
}
