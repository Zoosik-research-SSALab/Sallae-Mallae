import { NextRequest, NextResponse } from "next/server";
import { createMockRefreshResponse, hasMockAuthSession, shouldUseMockAuth } from "@/app/api/auth/mock";
import { proxyAuthRequest } from "@/app/api/auth/utils";

export async function POST(request: NextRequest) {
  if (shouldUseMockAuth()) {
    if (!hasMockAuthSession(request)) {
      return NextResponse.json(
        {
          code: "AUTH_001",
          message: "로그인이 필요합니다.",
        },
        { status: 401 },
      );
    }

    return NextResponse.json(createMockRefreshResponse());
  }

  return proxyAuthRequest({
    request,
    path: "/api/auth/refresh",
    method: "POST",
  });
}
