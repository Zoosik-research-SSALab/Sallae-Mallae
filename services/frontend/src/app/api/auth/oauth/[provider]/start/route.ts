import { NextRequest, NextResponse } from "next/server";
import { isAuthProvider } from "@/shared/lib/auth";
import type { AuthProvider, OAuthStartResponse } from "@/shared/types/auth";
import {
  applyDeviceIdCookie,
  createErrorResponse,
  getAuthApiBaseUrl,
  getOrCreateDeviceId,
  readUpstreamPayload,
  resolveAuthApiUrl,
} from "@/app/api/auth/utils";

type RouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractOAuthStartResponse(value: unknown): OAuthStartResponse | null {
  if (isRecord(value) && typeof value.provider === "string" && typeof value.redirect === "string") {
    return value as OAuthStartResponse;
  }

  if (!isRecord(value) || !isRecord(value.data)) {
    return null;
  }

  const { provider, redirect } = value.data;
  if (typeof provider !== "string" || typeof redirect !== "string") {
    return null;
  }

  return {
    provider: provider as OAuthStartResponse["provider"],
    redirect,
  };
}

function extractErrorMessage(value: unknown, fallback: string) {
  if (!isRecord(value)) {
    return fallback;
  }

  if (typeof value.message === "string") {
    return value.message;
  }

  if (isRecord(value.error) && typeof value.error.message === "string") {
    return value.error.message;
  }

  return fallback;
}

function resolveClientRedirect(request: NextRequest, redirect: string) {
  if (/^https?:\/\//i.test(redirect)) {
    const redirectUrl = new URL(redirect);
    const backendOrigin = new URL(getAuthApiBaseUrl()).origin;

    if (redirectUrl.origin === backendOrigin && redirectUrl.pathname.startsWith("/api/auth/")) {
      return new URL(`${redirectUrl.pathname}${redirectUrl.search}`, request.nextUrl.origin).toString();
    }

    return redirect;
  }

  return new URL(redirect, request.nextUrl.origin).toString();
}

function createStartErrorRedirect(
  request: NextRequest,
  provider: AuthProvider,
  message: string,
  deviceIdState: ReturnType<typeof getOrCreateDeviceId>,
) {
  const errorUrl = new URL(`/auth/callback/${provider}`, request.url);
  errorUrl.searchParams.set("error", "oauth_start_failed");
  errorUrl.searchParams.set("error_description", message);

  const response = NextResponse.redirect(errorUrl);
  applyDeviceIdCookie(response, deviceIdState);
  return response;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { provider } = await context.params;

  if (!isAuthProvider(provider)) {
    return createErrorResponse("지원하지 않는 소셜 로그인 제공자입니다.", 400);
  }

  const deviceIdState = getOrCreateDeviceId(request);

  try {
    const upstreamResponse = await fetch(resolveAuthApiUrl(`/api/auth/oauth/${provider}/start`), {
      method: "GET",
      cache: "no-store",
    });

    const upstreamPayload = await readUpstreamPayload(upstreamResponse);

    if (!upstreamResponse.ok) {
      return createStartErrorRedirect(
        request,
        provider,
        extractErrorMessage(upstreamPayload, "소셜 로그인 시작 요청에 실패했습니다."),
        deviceIdState,
      );
    }

    const payload = extractOAuthStartResponse(upstreamPayload);

    if (!payload || typeof payload.redirect !== "string") {
      return createErrorResponse("소셜 로그인 시작 URL을 확인하지 못했습니다.", 502, deviceIdState);
    }

    const response = NextResponse.redirect(resolveClientRedirect(request, payload.redirect));

    applyDeviceIdCookie(response, deviceIdState);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "소셜 로그인 시작 요청에 실패했습니다.";
    return createStartErrorRedirect(request, provider, message, deviceIdState);
  }
}
