import { NextRequest, NextResponse } from "next/server";
import { AUTH_DEVICE_COOKIE_NAME, AUTH_REFRESH_COOKIE_NAME } from "./utils";
import type {
  AuthProvider,
  AuthTokens,
  AuthUser,
  EmailLoginRequest,
  LoginSuccessResponse,
} from "@/shared/types/auth";

const MOCK_AUTH_COOKIE_NAME = "sallaemallae-mock-auth";
const MOCK_ACCESS_TOKEN = "mock-access-token";
const MOCK_REFRESH_TOKEN = "mock-refresh-token";
const MOCK_TOKEN_TYPE = "Bearer";
const MOCK_EXPIRES_IN = 60 * 60;

type MockAuthUserCookie = AuthUser;

function isEnabled(rawValue: string | undefined) {
  const value = rawValue?.trim().toLowerCase();
  return value === "true" || value === "enabled";
}

function isDisabled(rawValue: string | undefined) {
  const value = rawValue?.trim().toLowerCase();
  return value === "false" || value === "disabled";
}

export function shouldUseMockAuth() {
  const explicit = process.env.AUTH_API_MOCKING;
  if (isEnabled(explicit)) {
    return true;
  }

  if (isDisabled(explicit)) {
    return false;
  }

  return isEnabled(process.env.NEXT_PUBLIC_API_MOCKING);
}

function createMockUserId(email: string) {
  return Array.from(email).reduce((sum, char) => sum + char.charCodeAt(0), 0) + 1000;
}

function toMockNickname(email: string, provider: string) {
  const localPart = email.split("@")[0]?.trim();
  return localPart || `${provider} 사용자`;
}

export function createMockAuthUser(params: { provider: string; email: string }): AuthUser {
  const { provider, email } = params;

  return {
    userId: createMockUserId(email),
    email,
    nickname: toMockNickname(email, provider),
    profileImageUrl: null,
    provider,
    role: "USER",
    lastLoginAt: new Date().toISOString(),
  };
}

export function createMockLoginResponse(user: AuthUser): LoginSuccessResponse {
  return {
    accessToken: MOCK_ACCESS_TOKEN,
    tokenType: MOCK_TOKEN_TYPE,
    expiresIn: MOCK_EXPIRES_IN,
    user,
  };
}

export function createMockRefreshResponse(): AuthTokens {
  return {
    accessToken: MOCK_ACCESS_TOKEN,
    tokenType: MOCK_TOKEN_TYPE,
    expiresIn: MOCK_EXPIRES_IN,
  };
}

function getSecureCookieOptions() {
  return {
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

function encodeMockUser(user: MockAuthUserCookie) {
  return encodeURIComponent(JSON.stringify(user));
}

function decodeMockUser(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(value)) as MockAuthUserCookie;
  } catch {
    return null;
  }
}

export function readMockAuthUser(request: NextRequest) {
  return decodeMockUser(request.cookies.get(MOCK_AUTH_COOKIE_NAME)?.value);
}

export function hasMockAuthSession(request: NextRequest) {
  return request.cookies.get(AUTH_REFRESH_COOKIE_NAME)?.value === MOCK_REFRESH_TOKEN && Boolean(readMockAuthUser(request));
}

export function isMockAuthorized(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (authorization === `${MOCK_TOKEN_TYPE} ${MOCK_ACCESS_TOKEN}`) {
    return true;
  }

  return hasMockAuthSession(request);
}

export function applyMockAuthCookies(response: NextResponse, user: AuthUser) {
  const cookieOptions = getSecureCookieOptions();

  response.cookies.set({
    name: AUTH_REFRESH_COOKIE_NAME,
    value: MOCK_REFRESH_TOKEN,
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    ...cookieOptions,
  });

  response.cookies.set({
    name: MOCK_AUTH_COOKIE_NAME,
    value: encodeMockUser(user),
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    ...cookieOptions,
  });

  return response;
}

export function clearMockAuthCookies(response: NextResponse) {
  const cookieOptions = getSecureCookieOptions();

  response.cookies.set({
    name: AUTH_REFRESH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    maxAge: 0,
    ...cookieOptions,
  });

  response.cookies.set({
    name: MOCK_AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    maxAge: 0,
    ...cookieOptions,
  });

  response.cookies.set({
    name: AUTH_DEVICE_COOKIE_NAME,
    value: "",
    httpOnly: false,
    maxAge: 0,
    ...cookieOptions,
  });

  return response;
}

export function createMockEmailLoginResponse(body: EmailLoginRequest) {
  const user = createMockAuthUser({
    provider: "email",
    email: body.email,
  });

  const response = NextResponse.json(createMockLoginResponse(user));
  applyMockAuthCookies(response, user);
  return response;
}

export function createMockSocialLoginResponse(provider: AuthProvider) {
  const user = createMockAuthUser({
    provider,
    email: `${provider}@mock.sallaemallae.local`,
  });

  const response = NextResponse.json(createMockLoginResponse(user));
  applyMockAuthCookies(response, user);
  return response;
}

