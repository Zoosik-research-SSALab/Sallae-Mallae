import { NextRequest, NextResponse } from "next/server";
import { isAuthProvider } from "@/shared/lib/auth";
import type { AuthProvider, OAuthStartResponse } from "@/shared/types/auth";
import {
  applyDeviceIdCookie,
  createErrorResponse,
  getOrCreateDeviceId,
  readUpstreamPayload,
  resolveAuthApiUrl,
} from "@/app/api/auth/utils";
import { shouldUseMockAuth } from "@/app/api/auth/mock";

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

function resolveOAuthClientId(provider: AuthProvider) {
  switch (provider) {
    case "google":
      return process.env.OAUTH_GOOGLE_CLIENT_ID?.trim() || process.env.NEXT_PUBLIC_OAUTH_GOOGLE_CLIENT_ID?.trim() || null;
    case "kakao":
      return process.env.OAUTH_KAKAO_CLIENT_ID?.trim() || process.env.NEXT_PUBLIC_OAUTH_KAKAO_CLIENT_ID?.trim() || null;
    case "naver":
      return process.env.OAUTH_NAVER_CLIENT_ID?.trim() || process.env.NEXT_PUBLIC_OAUTH_NAVER_CLIENT_ID?.trim() || null;
  }
}

function resolveOAuthRedirectUri(provider: AuthProvider, request: NextRequest) {
  const fallback = new URL(`/api/auth/${provider}/callback`, request.nextUrl.origin).toString();

  switch (provider) {
    case "google":
      return process.env.OAUTH_GOOGLE_REDIRECT_URI?.trim() || fallback;
    case "kakao":
      return process.env.OAUTH_KAKAO_REDIRECT_URI?.trim() || fallback;
    case "naver":
      return process.env.OAUTH_NAVER_REDIRECT_URI?.trim() || fallback;
  }
}

function extractStateFromRedirect(redirect: string, request: NextRequest) {
  const redirectUrl = /^https?:\/\//i.test(redirect)
    ? new URL(redirect)
    : new URL(redirect, request.nextUrl.origin);

  return redirectUrl.searchParams.get("state");
}

function buildProviderAuthorizationUrl(provider: AuthProvider, state: string, request: NextRequest) {
  const clientId = resolveOAuthClientId(provider);

  if (!clientId) {
    throw new Error(`${provider} OAuth client ID is not configured.`);
  }

  const redirectUri = resolveOAuthRedirectUri(provider, request);
  const authorizeUrl =
    provider === "google"
      ? "https://accounts.google.com/o/oauth2/v2/auth"
      : provider === "kakao"
        ? "https://kauth.kakao.com/oauth/authorize"
        : "https://nid.naver.com/oauth2.0/authorize";

  const url = new URL(authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  if (provider === "google") {
    url.searchParams.set("scope", "openid email profile");
  }

  if (provider === "kakao") {
    url.searchParams.set("scope", "profile_nickname,profile_image,account_email");
  }

  return url.toString();
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

function createMockStartRedirect(request: NextRequest, provider: AuthProvider) {
  const deviceIdState = getOrCreateDeviceId(request);
  const state = `mock-${provider}-state`;
  const response = NextResponse.redirect(new URL(`/auth/callback/${provider}?code=mock-${provider}-code&state=${state}`, request.url));
  applyDeviceIdCookie(response, deviceIdState);
  return response;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { provider } = await context.params;

  if (!isAuthProvider(provider)) {
    return createErrorResponse("지원하지 않는 소셜 로그인 제공자입니다.", 400);
  }

  if (shouldUseMockAuth()) {
    return createMockStartRedirect(request, provider);
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

    if (!payload?.redirect) {
      return createStartErrorRedirect(request, provider, "소셜 로그인 시작 URL을 확인하지 못했습니다.", deviceIdState);
    }

    const state = extractStateFromRedirect(payload.redirect, request);

    if (!state) {
      return createStartErrorRedirect(request, provider, "OAuth state 값이 응답에 포함되지 않았습니다.", deviceIdState);
    }

    const response = NextResponse.redirect(buildProviderAuthorizationUrl(provider, state, request));
    applyDeviceIdCookie(response, deviceIdState);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "소셜 로그인 시작 요청에 실패했습니다.";
    return createStartErrorRedirect(request, provider, message, deviceIdState);
  }
}
