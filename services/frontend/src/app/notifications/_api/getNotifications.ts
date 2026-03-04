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

  const response = await fetch(`/api/v1/notifications?${search.toString()}`, {
    headers: {
      "X-User-Id": "1",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`알림 조회 실패: ${response.status}`);
  }

  const payload = (await response.json()) as ApiResponse<CursorPage<NotificationItem>>;
  return payload.data;
}
