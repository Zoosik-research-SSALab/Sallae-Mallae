import { NextRequest, NextResponse } from "next/server";
import { ensureMockUserAuthorized, proxyUsersApiRequest, shouldUseMockUsersApi } from "@/app/api/users/utils";
import { markAllMockNotificationsAsRead } from "@/app/notifications/utils/mockNotificationsData";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  if (shouldUseMockUsersApi()) {
    const unauthorizedResponse = ensureMockUserAuthorized(request);
    if (unauthorizedResponse) {
      return unauthorizedResponse;
    }

    markAllMockNotificationsAsRead();
    return new NextResponse(null, { status: 204 });
  }

  return proxyUsersApiRequest({
    request,
    path: "/api/notifications/read-all",
    method: "PATCH",
  });
}
