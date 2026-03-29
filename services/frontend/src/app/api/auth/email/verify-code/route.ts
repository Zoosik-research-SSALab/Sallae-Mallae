import { NextRequest } from "next/server";
import { createMockVerifyCodeResponse } from "@/app/api/auth/signupMock";
import { shouldUseMockAuth } from "@/app/api/auth/mock";
import { createErrorResponse, proxyAuthRequest, readJsonSafely } from "@/app/api/auth/utils";
import type { VerifyEmailCodeRequest } from "@/shared/types/auth";

export async function POST(request: NextRequest) {
  const body = await readJsonSafely<VerifyEmailCodeRequest>(request);

  if (!body?.email || !body.code || !body.purpose) {
    return createErrorResponse("인증코드 검증 요청 값이 올바르지 않습니다.", 400);
  }

  if (shouldUseMockAuth()) {
    return createMockVerifyCodeResponse(body);
  }

  return proxyAuthRequest({
    request,
    path: "/api/auth/email/verify-code",
    method: "POST",
    body,
  });
}
