import { NextRequest, NextResponse } from "next/server";

type SearchProxyHeaderOptions = {
  includeAccept?: boolean;
  includeAuthorization?: boolean;
  includeCookie?: boolean;
  includeContentType?: boolean;
};

function isEnabled(rawValue: string | undefined) {
  const value = rawValue?.trim().toLowerCase();
  return value === "true" || value === "enabled";
}

function isDisabled(rawValue: string | undefined) {
  const value = rawValue?.trim().toLowerCase();
  return value === "false" || value === "disabled";
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function shouldUseMockSearchApi() {
  const explicit = process.env.NEXT_PUBLIC_USE_API_MOCK;
  if (isEnabled(explicit)) {
    return true;
  }

  if (isDisabled(explicit)) {
    return false;
  }

  return !isDisabled(process.env.NEXT_PUBLIC_API_MOCKING);
}

export function getSearchApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || process.env.AUTH_API_BASE_URL?.trim() || "https://j14d208.p.ssafy.io";
  return normalizeBaseUrl(configured);
}

export function isAuthorizedSearchRequest(request: NextRequest) {
  return Boolean(request.headers.get("authorization"));
}

export function createSearchProxyHeaders(
  request: NextRequest,
  {
    includeAccept = true,
    includeAuthorization = true,
    includeCookie = true,
    includeContentType = false,
  }: SearchProxyHeaderOptions = {},
) {
  const headers = new Headers();

  if (includeAccept) {
    const accept = request.headers.get("accept");
    if (accept) {
      headers.set("Accept", accept);
    }
  }

  if (includeAuthorization) {
    const authorization = request.headers.get("authorization");
    if (authorization) {
      headers.set("Authorization", authorization);
    }
  }

  if (includeCookie) {
    const cookie = request.headers.get("cookie");
    if (cookie) {
      headers.set("Cookie", cookie);
    }
  }

  if (includeContentType) {
    const contentType = request.headers.get("content-type");
    if (contentType) {
      headers.set("Content-Type", contentType);
    }
  }

  return headers;
}

export function createProxyResponse(upstreamResponse: Response) {
  const response = new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
  });

  const upstreamContentType = upstreamResponse.headers.get("content-type");
  if (upstreamContentType) {
    response.headers.set("content-type", upstreamContentType);
  }

  return response;
}
