import { NextRequest, NextResponse } from "next/server";
import { isAuthProvider } from "@/shared/lib/auth";
import type { OAuthStartResponse } from "@/shared/types/auth";
import { shouldUseMockAuth } from "@/app/api/auth/mock";
import {
  appendSetCookieHeader,
  applyDeviceIdCookie,
  createErrorResponse,
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

function createMockStartPayload(provider: OAuthStartResponse["provider"]): OAuthStartResponse {
  const state = `mock-${provider}-state`;

  return {
    provider,
    redirect: `/auth/${provider}/callback?code=mock-${provider}-code&state=${state}`,
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { provider } = await context.params;

  if (!isAuthProvider(provider)) {
    return createErrorResponse("Unsupported social login provider.", 400);
  }

  const deviceIdState = getOrCreateDeviceId(request);

  if (shouldUseMockAuth()) {
    const response = NextResponse.json(createMockStartPayload(provider));
    applyDeviceIdCookie(response, deviceIdState);
    return response;
  }

  try {
    const upstreamResponse = await fetch(resolveAuthApiUrl(`/api/auth/oauth/${provider}/start`), {
      method: "GET",
      cache: "no-store",
      headers: {
        "X-Device-Id": deviceIdState.value,
      },
    });

    const upstreamPayload = await readUpstreamPayload(upstreamResponse);

    if (!upstreamResponse.ok) {
      return createErrorResponse(
        extractErrorMessage(upstreamPayload, "Failed to start social login."),
        upstreamResponse.status,
        deviceIdState,
      );
    }

    const payload = extractOAuthStartResponse(upstreamPayload);
    if (!payload) {
      return createErrorResponse("OAuth start response is invalid.", 502, deviceIdState);
    }

    const response = NextResponse.json(payload, { status: upstreamResponse.status });
    applyDeviceIdCookie(response, deviceIdState);
    appendSetCookieHeader(response, upstreamResponse);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start social login.";
    return createErrorResponse(message, 502, deviceIdState);
  }
}
