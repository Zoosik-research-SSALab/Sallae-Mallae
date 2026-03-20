import { NextRequest, NextResponse } from "next/server";
import { applyMockAuthCookies, readMockAuthUser } from "@/app/api/auth/mock";
import { proxyUsersApiRequest, shouldUseMockUsersApi } from "../utils";

export async function PATCH(request: NextRequest) {
  if (shouldUseMockUsersApi()) {
    const currentUser = readMockAuthUser(request);

    if (!currentUser) {
      return NextResponse.json(
        {
          code: "AUTH_001",
          message: "로그인이 필요합니다.",
        },
        { status: 401 },
      );
    }

    const body = (await request.json().catch(() => null)) as { nickname?: unknown } | null;
    const nickname = typeof body?.nickname === "string" ? body.nickname.trim() : "";

    if (!nickname) {
      return NextResponse.json(
        {
          code: "PROFILE_001",
          message: "닉네임을 입력해주세요.",
        },
        { status: 400 },
      );
    }

    const updatedUser = {
      ...currentUser,
      nickname,
    };

    const response = NextResponse.json(updatedUser);
    applyMockAuthCookies(response, updatedUser);
    return response;
  }

  return proxyUsersApiRequest({
    request,
    path: "/api/users/profile",
    method: "PATCH",
  });
}

export async function DELETE(request: NextRequest) {
  return proxyUsersApiRequest({
    request,
    path: "/api/users/profile",
    method: "DELETE",
  });
}
