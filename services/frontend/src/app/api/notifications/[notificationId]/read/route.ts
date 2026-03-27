import { NextRequest, NextResponse } from "next/server";
import { ensureMockUserAuthorized, proxyUsersApiRequest, shouldUseMockUsersApi } from "@/app/api/users/utils";
import { markMockNotificationAsRead } from "@/app/notifications/utils/mockNotificationsData";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    notificationId: string;
  }>;
};

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { notificationId } = await context.params;
  const parsedNotificationId = Number(notificationId);

  if (!Number.isFinite(parsedNotificationId)) {
    return NextResponse.json(
      {
        message: "Invalid notification id",
      },
      { status: 400 },
    );
  }

  if (shouldUseMockUsersApi()) {
    const unauthorizedResponse = ensureMockUserAuthorized(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    const updated = markMockNotificationAsRead(parsedNotificationId);
    if (!updated) {
      return NextResponse.json(
        {
          message: "Notification not found",
        },
        { status: 404 },
      );
    }

    return new NextResponse(null, { status: 204 });
  }

  return proxyUsersApiRequest({
    request,
    path: `/api/notifications/${parsedNotificationId}/read`,
    method: "PATCH",
  });
}
