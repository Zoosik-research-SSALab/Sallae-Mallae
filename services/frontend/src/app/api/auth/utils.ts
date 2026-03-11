import { NextRequest, NextResponse } from "next/server";

export const AUTH_DEVICE_COOKIE_NAME = "sallaemallae-device-id";
export const AUTH_REFRESH_COOKIE_NAME = "refreshToken";

type DeviceIdState = {
  value: string;
  isNew: boolean;
};

function isJsonContentType(contentType: string | null) {
  return typeof contentType === "string" && contentType.includes("application/json");
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function joinBaseUrl(baseUrl: string, path: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedBaseUrl.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${normalizedBaseUrl}${normalizedPath.slice(4)}`;
  }

  return `${normalizedBaseUrl}${normalizedPath}`;
}

export function getAuthApiBaseUrl() {
  const configured =
    process.env.AUTH_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "https://j14d208.p.ssafy.io";

  return normalizeBaseUrl(configured);
}

export function resolveAuthApiUrl(path: string) {
  return joinBaseUrl(getAuthApiBaseUrl(), path);
}

export function resolveAuthRedirectUrl(redirect: string) {
  if (/^https?:\/\//i.test(redirect)) {
    return redirect;
  }

  return new URL(redirect, `${getAuthApiBaseUrl()}/`).toString();
}

export function getOrCreateDeviceId(request: NextRequest): DeviceIdState {
  const existingDeviceId = request.cookies.get(AUTH_DEVICE_COOKIE_NAME)?.value;

  if (existingDeviceId) {
    return {
      value: existingDeviceId,
      isNew: false,
    };
  }

  return {
    value: crypto.randomUUID(),
    isNew: true,
  };
}

export function applyDeviceIdCookie(response: NextResponse, deviceIdState: DeviceIdState) {
  if (!deviceIdState.isNew) {
    return response;
  }

  response.cookies.set({
    name: AUTH_DEVICE_COOKIE_NAME,
    value: deviceIdState.value,
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

export function appendSetCookieHeader(response: NextResponse, upstreamResponse: Response) {
  const setCookie = upstreamResponse.headers.get("set-cookie");
  if (setCookie) {
    response.headers.append("set-cookie", setCookie);
  }

  return response;
}

export async function readJsonSafely<T>(request: NextRequest): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

export async function readUpstreamPayload(response: Response) {
  const contentType = response.headers.get("content-type");

  if (isJsonContentType(contentType)) {
    return (await response.json()) as unknown;
  }

  const text = await response.text();
  return text || null;
}

export function createErrorResponse(message: string, status = 500, deviceIdState?: DeviceIdState) {
  const response = NextResponse.json(
    {
      code: "AUTH_PROXY_ERROR",
      message,
    },
    { status },
  );

  if (deviceIdState) {
    applyDeviceIdCookie(response, deviceIdState);
  }

  return response;
}

type ProxyAuthRequestOptions = {
  request: NextRequest;
  path: string;
  method: "GET" | "POST";
  body?: unknown;
  includeDeviceId?: boolean;
  forwardAuthorization?: boolean;
};

export async function proxyAuthRequest({
  request,
  path,
  method,
  body,
  includeDeviceId = true,
  forwardAuthorization = false,
}: ProxyAuthRequestOptions) {
  const deviceIdState = getOrCreateDeviceId(request);

  try {
    const headers = new Headers();

    if (includeDeviceId) {
      headers.set("X-Device-Id", deviceIdState.value);
    }

    if (body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    if (forwardAuthorization) {
      const authorization = request.headers.get("authorization");
      if (authorization) {
        headers.set("Authorization", authorization);
      }
    }

    const cookie = request.headers.get("cookie");
    if (cookie) {
      headers.set("Cookie", cookie);
    }

    const upstreamResponse = await fetch(resolveAuthApiUrl(path), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    if (upstreamResponse.status === 204) {
      const response = new NextResponse(null, { status: 204 });
      applyDeviceIdCookie(response, deviceIdState);
      appendSetCookieHeader(response, upstreamResponse);

      return response;
    }

    const upstreamPayload = await readUpstreamPayload(upstreamResponse);
    const response =
      upstreamPayload !== null && typeof upstreamPayload !== "string"
        ? NextResponse.json(upstreamPayload, { status: upstreamResponse.status })
        : NextResponse.json(
            {
              message:
                typeof upstreamPayload === "string" && upstreamPayload
                  ? upstreamPayload
                  : upstreamResponse.ok
                    ? "SUCCESS"
                    : "인증 요청 처리에 실패했습니다.",
            },
            { status: upstreamResponse.status },
          );

    applyDeviceIdCookie(response, deviceIdState);
    appendSetCookieHeader(response, upstreamResponse);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "인증 서버 요청 중 알 수 없는 오류가 발생했습니다.";
    return createErrorResponse(message, 502, deviceIdState);
  }
}
