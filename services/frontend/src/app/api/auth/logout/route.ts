import { NextRequest, NextResponse } from "next/server";
import { clearMockAuthCookies, isMockAuthorized, shouldUseMockAuth } from "@/app/api/auth/mock";
import { proxyAuthRequest } from "@/app/api/auth/utils";

export async function POST(request: NextRequest) {
  if (shouldUseMockAuth() || isMockAuthorized(request)) {
    const response = new NextResponse(null, { status: 204 });
    return clearMockAuthCookies(response);
  }

  const response = await proxyAuthRequest({
    request,
    path: "/api/auth/logout",
    method: "POST",
    forwardAuthorization: true,
  });

  return clearMockAuthCookies(response);
}
