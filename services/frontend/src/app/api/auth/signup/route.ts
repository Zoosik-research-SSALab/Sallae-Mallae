import { NextRequest } from "next/server";
import { createMockSignupResponse } from "@/app/api/auth/signupMock";
import { shouldUseMockAuth } from "@/app/api/auth/mock";
import { createErrorResponse, proxyAuthRequest, readJsonSafely } from "@/app/api/auth/utils";
import type { EmailSignupRequest } from "@/shared/types/auth";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractEmailSignupRequest(value: unknown): EmailSignupRequest | null {
  const verificationToken =
    isRecord(value) && typeof value.verificationToken === "string"
      ? value.verificationToken
      : isRecord(value) && typeof value.verification_token === "string"
        ? value.verification_token
        : null;
  const email = isRecord(value) && typeof value.email === "string" ? value.email : null;
  const password = isRecord(value) && typeof value.password === "string" ? value.password : null;
  const nickname = isRecord(value) && typeof value.nickname === "string" ? value.nickname : null;
  const emailOptIn =
    isRecord(value) && typeof value.emailOptIn === "boolean"
      ? value.emailOptIn
      : isRecord(value) && typeof value.email_opt_in === "boolean"
        ? value.email_opt_in
        : null;

  if (
    !isRecord(value) ||
    verificationToken === null ||
    email === null ||
    password === null ||
    nickname === null ||
    emailOptIn === null ||
    !Array.isArray(value.agreements)
  ) {
    return null;
  }

  const agreements = value.agreements
    .map((item) => {
      const termsId =
        isRecord(item) && typeof item.termsId === "number"
          ? item.termsId
          : isRecord(item) && typeof item.terms_id === "number"
            ? item.terms_id
            : null;

      if (!isRecord(item) || termsId === null || typeof item.agreed !== "boolean") {
        return null;
      }

      return {
        termsId,
        agreed: item.agreed,
      };
    })
    .filter((item): item is EmailSignupRequest["agreements"][number] => item !== null);

  if (agreements.length !== value.agreements.length) {
    return null;
  }

  return {
    verificationToken: verificationToken.trim(),
    email: email.trim(),
    password,
    nickname: nickname.trim(),
    emailOptIn,
    agreements,
  };
}

export async function POST(request: NextRequest) {
  const payload = await readJsonSafely<unknown>(request);
  const body = extractEmailSignupRequest(payload);

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
