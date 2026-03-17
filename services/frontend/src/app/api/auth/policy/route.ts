import { NextRequest, NextResponse } from "next/server";
import { applyMockAuthCookies, createMockAuthUser, createMockLoginResponse, shouldUseMockAuth } from "@/app/api/auth/mock";
import { createErrorResponse, proxyAuthRequest, readJsonSafely } from "@/app/api/auth/utils";
import type { SocialPolicyRequest } from "@/shared/types/auth";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractSocialPolicyRequest(value: unknown): SocialPolicyRequest | null {
  if (
    !isRecord(value) ||
    typeof value.tempToken !== "string" ||
    typeof value.nickname !== "string" ||
    typeof value.emailOptIn !== "boolean" ||
    !Array.isArray(value.agreements)
  ) {
    return null;
  }

  const agreements = value.agreements
    .map((item) => {
      if (!isRecord(item) || typeof item.termsId !== "number" || typeof item.agreed !== "boolean") {
        return null;
      }

      return {
        termsId: item.termsId,
        agreed: item.agreed,
      };
    })
    .filter((item): item is SocialPolicyRequest["agreements"][number] => item !== null);

  if (agreements.length !== value.agreements.length) {
    return null;
  }

  return {
    tempToken: value.tempToken.trim(),
    nickname: value.nickname.trim(),
    emailOptIn: value.emailOptIn,
    agreements,
  };
}

function hasRequiredAgreements(agreements: SocialPolicyRequest["agreements"]) {
  return [1, 2, 3].every((termsId) => agreements.some((item) => item.termsId === termsId && item.agreed));
}

export async function POST(request: NextRequest) {
  const payload = await readJsonSafely<unknown>(request);
  const body = extractSocialPolicyRequest(payload);

  if (!body || !body.tempToken || !body.nickname) {
    return createErrorResponse("Invalid social signup payload.", 400);
  }

  if (!hasRequiredAgreements(body.agreements)) {
    return createErrorResponse("Required terms must be agreed.", 400);
  }

  if (shouldUseMockAuth()) {
    const normalizedNickname = body.nickname.replace(/\s+/g, "-").toLowerCase() || "social-user";
    const user = createMockAuthUser({
      provider: "SOCIAL",
      email: `${normalizedNickname}@mock.sallaemallae.local`,
    });
    user.nickname = body.nickname;

    const response = NextResponse.json(createMockLoginResponse(user), { status: 201 });
    applyMockAuthCookies(response, user);
    return response;
  }

  return proxyAuthRequest({
    request,
    path: "/api/auth/policy",
    method: "POST",
    body,
  });
}
