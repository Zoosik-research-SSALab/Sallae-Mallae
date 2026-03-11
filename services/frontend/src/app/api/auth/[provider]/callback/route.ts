import { NextRequest, NextResponse } from "next/server";
import { isAuthProvider } from "@/shared/lib/auth";
import type { SocialCallbackRequest } from "@/shared/types/auth";
import {
  applyDeviceIdCookie,
  createErrorResponse,
  getOrCreateDeviceId,
  proxyAuthRequest,
  readJsonSafely,
  readUpstreamPayload,
  resolveAuthApiUrl,
} from "@/app/api/auth/utils";

type RouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

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

  if (!code && !error && state) {
    const deviceIdState = getOrCreateDeviceId(request);

    try {
      const upstreamUrl = new URL(resolveAuthApiUrl(`/api/auth/${provider}/callback`));
      upstreamUrl.searchParams.set("state", state);

      const headers = new Headers({
        "X-Device-Id": deviceIdState.value,
      });
      const cookie = request.headers.get("cookie");

      if (cookie) {
        headers.set("Cookie", cookie);
      }

      const upstreamResponse = await fetch(upstreamUrl, {
        method: "GET",
        headers,
        redirect: "manual",
        cache: "no-store",
      });

      const location = upstreamResponse.headers.get("location");

      if (location && upstreamResponse.status >= 300 && upstreamResponse.status < 400) {
        const response = NextResponse.redirect(location);
        applyDeviceIdCookie(response, deviceIdState);
        return response;
      }

      const upstreamPayload = await readUpstreamPayload(upstreamResponse);
      const errorUrl = new URL(`/auth/callback/${provider}`, request.url);
      errorUrl.searchParams.set("error", "oauth_start_failed");

      if (
        typeof upstreamPayload === "object" &&
        upstreamPayload !== null &&
        "error" in upstreamPayload &&
        typeof upstreamPayload.error === "object" &&
        upstreamPayload.error !== null &&
        "message" in upstreamPayload.error &&
        typeof upstreamPayload.error.message === "string"
      ) {
        errorUrl.searchParams.set("error_description", upstreamPayload.error.message);
      } else {
        errorUrl.searchParams.set("error_description", "소셜 로그인 서버가 인증 화면으로 연결하지 못했습니다.");
      }

      const response = NextResponse.redirect(errorUrl);
      applyDeviceIdCookie(response, deviceIdState);
      return response;
    } catch (errorValue) {
      const errorUrl = new URL(`/auth/callback/${provider}`, request.url);
      errorUrl.searchParams.set("error", "oauth_start_failed");
      errorUrl.searchParams.set(
        "error_description",
        errorValue instanceof Error ? errorValue.message : "소셜 로그인 시작 요청 중 오류가 발생했습니다.",
      );

      return NextResponse.redirect(errorUrl);
    }
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

  const body = await readJsonSafely<SocialCallbackRequest>(request);

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
