import { apiFetch } from "@/shared/lib/apiClient";

export type NotificationItem = {
  id: number;
  notifyType: "SELL" | "BUY" | "FLUCTUATION" | "ANNOUNCEMENT" | string;
  title: string;
  message: string;
  linkUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

type CursorMeta = {
  nextCursor: number | null;
  hasNext: boolean;
};

type CursorPage<T> = {
  data: T[];
  meta: CursorMeta;
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string | null;
};

export async function getNotifications(cursor?: number | null, size = 6): Promise<CursorPage<NotificationItem>> {
  const search = new URLSearchParams();
  search.set("size", String(size));
  if (cursor) {
    search.set("cursor", String(cursor));
  }

  const payload = await apiFetch<ApiResponse<CursorPage<NotificationItem>>>(`/api/v1/notifications?${search.toString()}`, {
    headers: {
      "X-User-Id": "1",
    },
    cache: "no-store",
  });

  return payload.data;
}
