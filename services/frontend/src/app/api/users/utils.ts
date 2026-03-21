import { NextRequest, NextResponse } from "next/server";
import { isMockAuthorized, shouldUseMockAuth } from "@/app/api/auth/mock";

function isEnabled(rawValue: string | undefined) {
  const value = rawValue?.trim().toLowerCase();
  return value === "true" || value === "enabled";
}

function isDisabled(rawValue: string | undefined) {
  const value = rawValue?.trim().toLowerCase();
  return value === "false" || value === "disabled";
}

function getApiMockingMode() {
  const explicit = process.env.NEXT_PUBLIC_USE_API_MOCK;
  if (isEnabled(explicit)) {
    return "enabled";
  }

  if (isDisabled(explicit)) {
    return "disabled";
  }

  return isDisabled(process.env.NEXT_PUBLIC_API_MOCKING) ? "disabled" : "enabled";
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function joinApiUrl(baseUrl: string, path: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedBaseUrl.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${normalizedBaseUrl}${normalizedPath.slice(4)}`;
  }

  return `${normalizedBaseUrl}${normalizedPath}`;
}

function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || process.env.AUTH_API_BASE_URL?.trim() || "https://j14d208.p.ssafy.io";
  return normalizeBaseUrl(configured);
}

export function shouldUseMockUsersApi() {
  if (shouldUseMockAuth()) {
    return true;
  }

  return getApiMockingMode() === "enabled";
}

export function createUnauthorizedResponse() {
  return NextResponse.json(
    {
      code: "AUTH_001",
      message: "로그인이 필요합니다.",
    },
    { status: 401 },
  );
}

export function ensureMockUserAuthorized(request: NextRequest) {
  if (!isMockAuthorized(request)) {
    return createUnauthorizedResponse();
  }

  return null;
}

type ProxyUsersApiRequestOptions = {
  request: NextRequest;
  path: string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  acceptOverride?: string;
};

export async function proxyUsersApiRequest({ request, path, method, acceptOverride }: ProxyUsersApiRequestOptions) {
  const headers = new Headers();
  const authorization = request.headers.get("authorization");
  const cookie = request.headers.get("cookie");
  const contentType = request.headers.get("content-type");
  const accept = request.headers.get("accept");
  const deviceId = request.headers.get("x-device-id");

  if (authorization) {
    headers.set("Authorization", authorization);
  }

  if (deviceId) {
    headers.set("X-Device-Id", deviceId);
  }

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  if (acceptOverride) {
    headers.set("Accept", acceptOverride);
  } else if (accept) {
    headers.set("Accept", accept);
  }

  const body = method === "GET" ? undefined : await request.text();
  const upstreamResponse = await fetch(joinApiUrl(getApiBaseUrl(), `${path}${request.nextUrl.search}`), {
    method,
    headers,
    body: body && body.length > 0 ? body : undefined,
    cache: "no-store",
  });

  const response = new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
  });

  const upstreamContentType = upstreamResponse.headers.get("content-type");
  if (upstreamContentType) {
    response.headers.set("content-type", upstreamContentType);
  }

  const setCookie = upstreamResponse.headers.get("set-cookie");
  if (setCookie) {
    response.headers.append("set-cookie", setCookie);
  }

  return response;
}
