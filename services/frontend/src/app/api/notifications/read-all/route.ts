import { NextRequest, NextResponse } from "next/server";
import { ensureMockUserAuthorized, proxyUsersApiRequest, shouldUseMockUsersApi } from "@/app/api/users/utils";
import { NOTIFICATION_TABS, type NotificationTab } from "@/app/notifications/types/notifications";
import { markAllMockNotificationsAsRead } from "@/app/notifications/utils/mockNotificationsData";

export const dynamic = "force-dynamic";

function parseNotificationTab(value: unknown): NotificationTab {
  if (typeof value !== "string") {
    return "ALL";
  }

  const normalized = value.trim().toUpperCase();
  return NOTIFICATION_TABS.includes(normalized as NotificationTab) ? (normalized as NotificationTab) : "ALL";
}

export async function PATCH(request: NextRequest) {
  if (shouldUseMockUsersApi()) {
    const unauthorizedResponse = ensureMockUserAuthorized(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const tab = parseNotificationTab(request.nextUrl.searchParams.get("tab"));
    const { updatedCount } = markAllMockNotificationsAsRead(tab);

    return NextResponse.json({
      message: "전체 읽음 처리 완료",
      count: updatedCount,
    });
  }

  return proxyUsersApiRequest({
    request,
    path: "/api/notifications/read-all",
    method: "PATCH",
  });
}
