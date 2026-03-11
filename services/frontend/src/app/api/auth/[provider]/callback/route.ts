import { NextRequest, NextResponse } from "next/server";
import { isAuthProvider } from "@/shared/lib/auth";
import type { SocialCallbackRequest } from "@/shared/types/auth";
import { createErrorResponse, proxyAuthRequest, readJsonSafely } from "@/app/api/auth/utils";

type RouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractSocialCallbackRequest(value: unknown): SocialCallbackRequest | null {
  if (!isRecord(value) || typeof value.state !== "string") {
    return null;
  }

  const authorizationCode =
    typeof value.authorizationCode === "string"
      ? value.authorizationCode
      : typeof value.authorization_code === "string"
        ? value.authorization_code
        : null;

  if (!authorizationCode) {
    return null;
  }

  return {
    authorizationCode,
    state: value.state,
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { provider } = await context.params;

  if (!isAuthProvider(provider)) {
    return createErrorResponse("지원하지 않는 소셜 로그인 제공자입니다.", 400);
  }

  const callbackUrl = new URL(`/auth/callback/${provider}`, request.url);
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get("error_description");

  if (!code && !error) {
    callbackUrl.searchParams.set("error", "oauth_start_failed");
    callbackUrl.searchParams.set("error_description", "소셜 로그인 요청 정보가 올바르지 않습니다.");

    if (state) {
      callbackUrl.searchParams.set("state", state);
    }

    return NextResponse.redirect(callbackUrl);
  }

  if (code) {
    callbackUrl.searchParams.set("code", code);
  }

  if (state) {
    callbackUrl.searchParams.set("state", state);
  }

  if (error) {
    callbackUrl.searchParams.set("error", error);
  }

  if (errorDescription) {
    callbackUrl.searchParams.set("error_description", errorDescription);
  }

  return NextResponse.redirect(callbackUrl);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { provider } = await context.params;

  if (!isAuthProvider(provider)) {
    return createErrorResponse("지원하지 않는 소셜 로그인 제공자입니다.", 400);
  }

  const payload = await readJsonSafely<unknown>(request);
  const body = extractSocialCallbackRequest(payload);

  if (!body?.authorizationCode || !body.state) {
    return createErrorResponse("소셜 로그인 승인 정보가 올바르지 않습니다.", 400);
  }

  return proxyAuthRequest({
    request,
    path: `/api/auth/${provider}/callback`,
    method: "POST",
    body,
  });
}
