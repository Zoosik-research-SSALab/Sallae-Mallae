import { NextRequest } from "next/server";
import type { EmailLoginRequest } from "@/shared/types/auth";
import { createErrorResponse, proxyAuthRequest, readJsonSafely } from "@/app/api/auth/utils";

export async function POST(request: NextRequest) {
  const body = await readJsonSafely<EmailLoginRequest>(request);

  if (!body?.email || !body.password) {
    return createErrorResponse("이메일과 비밀번호를 모두 입력해 주세요.", 400);
  }

  return proxyAuthRequest({
    request,
    path: "/api/auth/login",
    method: "POST",
    body,
  });
}
