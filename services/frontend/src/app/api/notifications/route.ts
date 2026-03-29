import { NextRequest, NextResponse } from "next/server";
import { ensureMockUserAuthorized, proxyUsersApiRequest, shouldUseMockUsersApi } from "@/app/api/users/utils";
import { NOTIFICATION_TABS, type NotificationTab } from "@/app/notifications/types/notifications";
import { deleteAllMockNotifications } from "@/app/notifications/utils/mockNotificationsData";

export const dynamic = "force-dynamic";

function parseNotificationTab(value: unknown): NotificationTab {
  if (typeof value !== "string") {
    return "ALL";
  }

  const normalized = value.trim().toUpperCase();
  return NOTIFICATION_TABS.includes(normalized as NotificationTab) ? (normalized as NotificationTab) : "ALL";
}

async function readNotificationTabFromBody(request: NextRequest) {
  try {
    const body = (await request.json()) as { tab?: unknown };
    return parseNotificationTab(body?.tab);
  } catch {
    return "ALL";
  }
}

export async function DELETE(request: NextRequest) {
  if (shouldUseMockUsersApi()) {
    const unauthorizedResponse = ensureMockUserAuthorized(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const tab = await readNotificationTabFromBody(request);
    const { deletedCount } = deleteAllMockNotifications(tab);

    return NextResponse.json({
      message: "전체 삭제 처리 완료",
      count: deletedCount,
    });
  }

  return proxyUsersApiRequest({
    request,
    path: "/api/notifications",
    method: "DELETE",
  });
}
