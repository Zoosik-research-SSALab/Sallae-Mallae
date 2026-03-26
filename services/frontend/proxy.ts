import { NextResponse, type NextRequest } from "next/server";

const AUTH_REFRESH_COOKIE_NAME = "refreshToken";
const AUTH_ACCESS_TOKEN_COOKIE_NAME = "sallaemallae-access-token";
const AUTH_DEVICE_COOKIE_NAME = "sallaemallae-device-id";
const MOCK_AUTH_COOKIE_NAME = "sallaemallae-mock-auth";

const PROTECTED_PATH_PREFIXES = [
  "/portfolio",
  "/signals",
  "/reports",
  "/scraps",
  "/notifications",
  "/mypage",
  "/watchlist",
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function getAuthApiBaseUrl() {
  const configured =
    process.env.AUTH_API_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "https://j14d208.p.ssafy.io";
  return configured.endsWith("/") ? configured.slice(0, -1) : configured;
}

async function ensureAccessTokenCookie(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  // 이미 accessToken 쿠키가 있으면 갱신 불필요
  if (request.cookies.get(AUTH_ACCESS_TOKEN_COOKIE_NAME)?.value) {
    return response;
  }

  const refreshToken = request.cookies.get(AUTH_REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) return response;

  const deviceId = request.cookies.get(AUTH_DEVICE_COOKIE_NAME)?.value;

  try {
    const headers: HeadersInit = {
      Cookie: `${AUTH_REFRESH_COOKIE_NAME}=${refreshToken}`,
    };
    if (deviceId) {
      headers["X-Device-Id"] = deviceId;
    }

    const refreshResponse = await fetch(
      `${getAuthApiBaseUrl()}/api/auth/refresh`,
      {
        method: "POST",
        headers,
        cache: "no-store",
      },
    );

    if (!refreshResponse.ok) return response;

    const payload = await refreshResponse.json();
    const accessToken =
      payload?.access_token ??
      payload?.accessToken ??
      payload?.data?.access_token ??
      payload?.data?.accessToken;

    if (!accessToken || typeof accessToken !== "string") return response;

    const expiresIn =
      payload?.expires_in ??
      payload?.expiresIn ??
      payload?.data?.expires_in ??
      payload?.data?.expiresIn ??
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
  } catch {
    // refresh 실패해도 페이지 접근은 허용 (클라이언트에서 재시도)
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const hasRefreshToken = Boolean(
    request.cookies.get(AUTH_REFRESH_COOKIE_NAME)?.value,
  );
  const hasMockAuthCookie = Boolean(
    request.cookies.get(MOCK_AUTH_COOKIE_NAME)?.value,
  );

  if (!hasRefreshToken && !hasMockAuthCookie) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  return ensureAccessTokenCookie(request, response);
}

export const config = {
  matcher: [
    "/portfolio/:path*",
    "/signals/:path*",
    "/report/:path*",
    "/scraps/:path*",
    "/notifications/:path*",
    "/mypage/:path*",
    "/watchlist/:path*",
  ],
};
