import { NextRequest } from "next/server";
import { createMockSendCodeResponse } from "@/app/api/auth/signupMock";
import { shouldUseMockAuth } from "@/app/api/auth/mock";
import { createErrorResponse, proxyAuthRequest, readJsonSafely } from "@/app/api/auth/utils";
import type { SendEmailCodeRequest } from "@/shared/types/auth";

export async function POST(request: NextRequest) {
  const body = await readJsonSafely<SendEmailCodeRequest>(request);

  if (!body?.email || !body.purpose) {
    return createErrorResponse("이메일 인증 요청 값이 올바르지 않습니다.", 400);
  }

  if (shouldUseMockAuth()) {
    return createMockSendCodeResponse(body);
  }

  return proxyAuthRequest({
    request,
    path: "/api/auth/email/send-code",
    method: "POST",
    body,
  });
}
