import { NextRequest, NextResponse } from "next/server";

export const AUTH_DEVICE_COOKIE_NAME = "sallaemallae-device-id";
export const AUTH_REFRESH_COOKIE_NAME = "refreshToken";
export const AUTH_ACCESS_TOKEN_COOKIE_NAME = "sallaemallae-access-token";

type DeviceIdState = {
  value: string;
  isNew: boolean;
};

function shouldLogProxyDebug() {
  return process.env.NODE_ENV !== "production";
}

function createAuthorizationPreview(authorization: string | null) {
  if (!authorization) {
    return null;
  }

  if (authorization.length <= 20) {
    return authorization;
  }

  return `${authorization.slice(0, 12)}...${authorization.slice(-6)}`;
}

function logAuthProxyDebug(label: string, payload: Record<string, unknown>) {
  if (!shouldLogProxyDebug()) {
    return;
  }

  console.info(`[auth-proxy:${label}]`, payload);
}

function isJsonContentType(contentType: string | null) {
  return typeof contentType === "string" && contentType.includes("application/json");
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function normalizeOrigin(value: string) {
  return normalizeBaseUrl(value.trim());
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

export function getPublicAppOrigin(request: NextRequest) {
  const explicitOrigin =
    process.env.APP_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();

  if (explicitOrigin) {
    return normalizeOrigin(explicitOrigin);
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.trim();
  const hostHeader = request.headers.get("host")?.trim();
  const protocolHeader = request.headers.get("x-forwarded-proto")?.trim();

  const host = forwardedHost || hostHeader;
  const protocol = protocolHeader || request.nextUrl.protocol.replace(/:$/, "") || "http";

  if (host) {
    const normalizedHost = process.env.NODE_ENV === "development" ? host.replace(/^0\.0\.0\.0(?=[:/]|$)/, "localhost") : host;
    return `${protocol}://${normalizedHost}`;
  }

  const fallbackUrl = new URL(request.url);
  if (process.env.NODE_ENV === "development" && fallbackUrl.hostname === "0.0.0.0") {
    fallbackUrl.hostname = "localhost";
  }

  return normalizeOrigin(fallbackUrl.origin);
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
  const headerDeviceId = request.headers.get("x-device-id")?.trim();
  const existingDeviceId = request.cookies.get(AUTH_DEVICE_COOKIE_NAME)?.value;

  if (headerDeviceId) {
    return {
      value: headerDeviceId,
      isNew: existingDeviceId !== headerDeviceId,
    };
  }

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

export function applyAccessTokenCookie(response: NextResponse, payload: unknown) {
  if (typeof payload !== "object" || payload === null) return response;

  const record = payload as Record<string, unknown>;
  const accessToken =
    (record.access_token as string | undefined) ??
    (record.accessToken as string | undefined) ??
    ((record.data as Record<string, unknown> | undefined)?.access_token as string | undefined) ??
    ((record.data as Record<string, unknown> | undefined)?.accessToken as string | undefined);

  if (!accessToken || typeof accessToken !== "string") return response;

  const expiresIn =
    (record.expires_in as number | undefined) ??
    (record.expiresIn as number | undefined) ??
    ((record.data as Record<string, unknown> | undefined)?.expires_in as number | undefined) ??
    ((record.data as Record<string, unknown> | undefined)?.expiresIn as number | undefined) ??
    3600;

  response.cookies.set({
    name: AUTH_ACCESS_TOKEN_COOKIE_NAME,
    value: accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: typeof expiresIn === "number" ? expiresIn : 3600,
  });

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
  method: "GET" | "POST" | "DELETE";
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
  const targetUrl = resolveAuthApiUrl(path);

  try {
    const headers = new Headers();
    const authorization = request.headers.get("authorization");
    const cookie = request.headers.get("cookie");

    if (includeDeviceId) {
      headers.set("X-Device-Id", deviceIdState.value);
    }

    if (body !== undefined) {
      headers.set("Content-Type", "application/json");
    }

    if (forwardAuthorization) {
      if (authorization) {
        headers.set("Authorization", authorization);
      }
    }

    if (cookie) {
      headers.set("Cookie", cookie);
    }

    logAuthProxyDebug("request", {
      method,
      path,
      targetUrl,
      includeDeviceId,
      forwardedDeviceId: headers.get("X-Device-Id"),
      hasAuthorization: Boolean(authorization),
      authorizationPreview: createAuthorizationPreview(authorization),
      hasRefreshTokenCookie: Boolean(request.cookies.get(AUTH_REFRESH_COOKIE_NAME)?.value),
      hasDeviceIdCookie: Boolean(request.cookies.get(AUTH_DEVICE_COOKIE_NAME)?.value),
    });

    const upstreamResponse = await fetch(targetUrl, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });

    logAuthProxyDebug("response", {
      method,
      path,
      targetUrl,
      status: upstreamResponse.status,
      ok: upstreamResponse.ok,
      hasSetCookie: Boolean(upstreamResponse.headers.get("set-cookie")),
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

    if (upstreamResponse.ok && upstreamPayload) {
      applyAccessTokenCookie(response, upstreamPayload);
    }

    // appendSetCookieHeader must be LAST — response.cookies.set() above
    // rebuilds the Set-Cookie header internally, so raw append must come after.
    appendSetCookieHeader(response, upstreamResponse);

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "인증 서버 요청 중 알 수 없는 오류가 발생했습니다.";
    return createErrorResponse(message, 502, deviceIdState);
  }
}
