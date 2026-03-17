import { NextRequest } from "next/server";
import { createMockSignupResponse } from "@/app/api/auth/signupMock";
import { shouldUseMockAuth } from "@/app/api/auth/mock";
import { createErrorResponse, proxyAuthRequest, readJsonSafely } from "@/app/api/auth/utils";
import type { EmailSignupRequest } from "@/shared/types/auth";

export async function POST(request: NextRequest) {
  const body = await readJsonSafely<EmailSignupRequest>(request);

  if (!body?.verificationToken || !body.email || !body.password || !body.nickname || !Array.isArray(body.agreements)) {
    return createErrorResponse("회원가입 요청 값이 올바르지 않습니다.", 400);
  }

  if (shouldUseMockAuth()) {
    return createMockSignupResponse(body);
  }

  return proxyAuthRequest({
    request,
    path: "/api/auth/signup",
    method: "POST",
    body,
  });
}
