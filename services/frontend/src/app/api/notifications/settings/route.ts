import { NextRequest, NextResponse } from "next/server";
import { ensureMockUserAuthorized, proxyUsersApiRequest, shouldUseMockUsersApi } from "@/app/api/users/utils";
import {
  getMockNotificationSettings,
  updateMockNotificationSettings,
} from "@/app/notifications/utils/mockNotificationsData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

type RequestBody = {
  isNotiEnabled?: unknown;
  isEmailNotiEnabled?: unknown;
  is_noti_enabled?: unknown;
  is_email_noti_enabled?: unknown;
};

export async function GET(request: NextRequest) {
  if (shouldUseMockUsersApi()) {
    const unauthorizedResponse = ensureMockUserAuthorized(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    return NextResponse.json(snakelizeKeys(getMockNotificationSettings()));
  }

  return proxyUsersApiRequest({
    request,
    path: "/api/notifications/settings",
    method: "GET",
  });
}

export async function PATCH(request: NextRequest) {
  if (shouldUseMockUsersApi()) {
    const unauthorizedResponse = ensureMockUserAuthorized(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const body = (await request.json().catch(() => null)) as RequestBody | null;
    const isNotiEnabled =
      typeof body?.isNotiEnabled === "boolean"
        ? body.isNotiEnabled
        : typeof body?.is_noti_enabled === "boolean"
          ? body.is_noti_enabled
          : undefined;
    const isEmailNotiEnabled =
      typeof body?.isEmailNotiEnabled === "boolean"
        ? body.isEmailNotiEnabled
        : typeof body?.is_email_noti_enabled === "boolean"
          ? body.is_email_noti_enabled
          : undefined;

    if (isNotiEnabled === undefined && isEmailNotiEnabled === undefined) {
      return NextResponse.json(
        {
          message: "No notification setting changes provided",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      snakelizeKeys(
        updateMockNotificationSettings({
          ...(isNotiEnabled !== undefined ? { isNotiEnabled } : {}),
          ...(isEmailNotiEnabled !== undefined ? { isEmailNotiEnabled } : {}),
        }),
      ),
    );
  }

  return proxyUsersApiRequest({
    request,
    path: "/api/notifications/settings",
    method: "PATCH",
  });
}
