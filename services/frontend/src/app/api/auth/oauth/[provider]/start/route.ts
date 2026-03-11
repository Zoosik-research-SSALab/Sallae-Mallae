import { NextRequest, NextResponse } from "next/server";
import { isAuthProvider } from "@/shared/lib/auth";
import type { OAuthStartResponse } from "@/shared/types/auth";
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
      const response =
        upstreamPayload !== null && typeof upstreamPayload !== "string"
          ? NextResponse.json(upstreamPayload, { status: upstreamResponse.status })
          : createErrorResponse("소셜 로그인 시작 요청에 실패했습니다.", upstreamResponse.status, deviceIdState);

      applyDeviceIdCookie(response, deviceIdState);
      return response;
    }

    const payload = extractOAuthStartResponse(upstreamPayload);

    if (!payload || typeof payload.redirect !== "string") {
      return createErrorResponse("소셜 로그인 시작 URL을 확인하지 못했습니다.", 502, deviceIdState);
    }

    const response = NextResponse.json(
      {
        ...payload,
        redirect: resolveClientRedirect(request, payload.redirect),
      },
      {
        status: upstreamResponse.status,
      },
    );

    applyDeviceIdCookie(response, deviceIdState);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "소셜 로그인 시작 요청에 실패했습니다.";
    return createErrorResponse(message, 502, deviceIdState);
  }
}
