import { NextRequest, NextResponse } from "next/server";
import { isMockAuthorized, readMockAuthUser, shouldUseMockAuth } from "@/app/api/auth/mock";
import { proxyAuthRequest } from "@/app/api/auth/utils";

export async function GET(request: NextRequest) {
  if (shouldUseMockAuth()) {
    if (!isMockAuthorized(request)) {
      return NextResponse.json(
        {
          code: "AUTH_001",
          message: "로그인이 필요합니다.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      user: readMockAuthUser(request),
    });
  }

  return proxyAuthRequest({
    request,
    path: "/api/auth/me",
    method: "GET",
    forwardAuthorization: true,
  });
}
