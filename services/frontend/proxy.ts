import { NextResponse, type NextRequest } from "next/server";

const AUTH_REFRESH_COOKIE_NAME = "refreshToken";
const MOCK_AUTH_COOKIE_NAME = "sallaemallae-mock-auth";

const PROTECTED_PATH_PREFIXES = ["/portfolio", "/signals", "/reports", "/scraps", "/notifications", "/mypage", "/watchlist"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const hasRefreshToken = Boolean(request.cookies.get(AUTH_REFRESH_COOKIE_NAME)?.value);
  const hasMockAuthCookie = Boolean(request.cookies.get(MOCK_AUTH_COOKIE_NAME)?.value);

  if (hasRefreshToken || hasMockAuthCookie) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("redirect", `${pathname}${search}`);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/portfolio/:path*", "/signals/:path*", "/reports/:path*", "/scraps/:path*", "/notifications/:path*", "/mypage/:path*", "/watchlist/:path*"],
};
