import { extractAuthTokens, extractMeResponse, isTermsAgreementRequiredResponse } from "@/shared/lib/auth";
import { apiFetch } from "@/shared/lib/apiClient";
import type {
  AuthProvider,
  EmailLoginRequest,
  LoginSuccessResponse,
  MeResponse,
  RefreshResponse,
  SocialCallbackRequest,
  SocialLoginResponse,
} from "@/shared/types/auth";

export async function loginWithEmail(body: EmailLoginRequest) {
  return apiFetch<LoginSuccessResponse, EmailLoginRequest>("/api/auth/login", {
    method: "POST",
    useBaseUrl: false,
    body,
    credentials: "include",
  });
}

export function getSocialLoginStartPath(provider: AuthProvider) {
  return `/api/auth/oauth/${provider}/start`;
}

export async function completeSocialLogin(provider: AuthProvider, body: SocialCallbackRequest) {
  return apiFetch<SocialLoginResponse, SocialCallbackRequest>(`/api/auth/${provider}/callback`, {
    method: "POST",
    useBaseUrl: false,
    body,
    credentials: "include",
  });
}

export async function refreshAccessToken() {
  const payload = await apiFetch<RefreshResponse>("/api/auth/refresh", {
    method: "POST",
    useBaseUrl: false,
    credentials: "include",
  });

  const tokens = extractAuthTokens(payload);
  if (!tokens) {
    throw new Error("토큰 갱신 응답 형식이 올바르지 않습니다.");
  }

  return tokens;
}

export async function getMe(accessToken?: string) {
  const payload = await apiFetch<MeResponse>("/api/auth/me", {
    method: "GET",
    useBaseUrl: false,
    credentials: "include",
    withAuth: true,
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
  });

  const user = extractMeResponse(payload);
  if (!user) {
    throw new Error("사용자 정보 응답 형식이 올바르지 않습니다.");
  }

  return user;
}

export async function logoutFromApp() {
  return apiFetch<void>("/api/auth/logout", {
    method: "POST",
    useBaseUrl: false,
    credentials: "include",
    withAuth: true,
  });
}

export async function restoreAuthSession() {
  const tokens = await refreshAccessToken();
  const user = await getMe(tokens.accessToken);

  return {
    ...tokens,
    user,
  };
}

export function isSocialSignupPending(payload: SocialLoginResponse) {
  return isTermsAgreementRequiredResponse(payload);
}
