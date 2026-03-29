import { NextRequest } from "next/server";
import { createMockEmailLoginResponse, shouldUseMockAuth } from "@/app/api/auth/mock";
import { createErrorResponse, proxyAuthRequest, readJsonSafely } from "@/app/api/auth/utils";
import type { EmailLoginRequest } from "@/shared/types/auth";

export async function POST(request: NextRequest) {
  const body = await readJsonSafely<EmailLoginRequest>(request);

  if (!body?.email || !body.password) {
    return createErrorResponse("이메일과 비밀번호를 모두 입력해 주세요.", 400);
  }

  if (shouldUseMockAuth()) {
    return createMockEmailLoginResponse(body);
  }

  return proxyAuthRequest({
    request,
    path: "/api/auth/login",
    method: "POST",
    body,
  });
}
