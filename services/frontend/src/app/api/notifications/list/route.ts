import { NextRequest, NextResponse } from "next/server";
import { ensureMockUserAuthorized, proxyUsersApiRequest, shouldUseMockUsersApi } from "@/app/api/users/utils";
import { getMockNotifications } from "@/app/notifications/utils/mockNotificationsData";
import { NOTIFICATION_TABS, type NotificationTab } from "@/app/notifications/types/notifications";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

function parseTab(value: string | null): NotificationTab {
  if (!value) {
    return "ALL";
  }

  const normalized = value.trim().toUpperCase();
  return NOTIFICATION_TABS.includes(normalized as NotificationTab) ? (normalized as NotificationTab) : "ALL";
}

function parseLimit(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 6;
  }

  return Math.floor(parsed);
}

export async function GET(request: NextRequest) {
  if (shouldUseMockUsersApi()) {
    const unauthorizedResponse = ensureMockUserAuthorized(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const tab = parseTab(request.nextUrl.searchParams.get("tab"));
    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

    return NextResponse.json(snakelizeKeys(getMockNotifications(tab, limit)));
  }

  return proxyUsersApiRequest({
    request,
    path: "/api/notifications/list",
    method: "GET",
  });
}
