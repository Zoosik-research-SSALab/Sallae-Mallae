import { extractAuthTokens, extractMeResponse, isTermsAgreementRequiredResponse } from "@/shared/lib/auth";
import { getOrCreateAuthDeviceId } from "@/shared/lib/authDevice";
import { apiFetch } from "@/shared/lib/apiClient";
import type {
  AuthProvider,
  CheckEmailResponse,
  EmailSignupRequest,
  EmailLoginRequest,
  LoginSuccessResponse,
  MeResponse,
  RefreshResponse,
  SendEmailCodeRequest,
  SendEmailCodeResponse,
  SignupSuccessResponse,
  SocialCallbackRequest,
  SocialLoginResponse,
  VerifyEmailCodeRequest,
  VerifyEmailCodeResponse,
} from "@/shared/types/auth";

type AuthApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: {
    code?: string;
    message?: string;
  } | null;
};

function isAuthApiEnvelope<T>(value: unknown): value is AuthApiEnvelope<T> {
  return typeof value === "object" && value !== null && "success" in value && "data" in value;
}

function unwrapAuthApiResponse<T>(payload: T | AuthApiEnvelope<T>, fallbackMessage: string) {
  if (isAuthApiEnvelope<T>(payload)) {
    if (payload.data !== null) {
      return payload.data;
    }

    throw new Error(payload.error?.message ?? fallbackMessage);
  }

  return payload;
}

export async function loginWithEmail(body: EmailLoginRequest) {
  const payload = await apiFetch<LoginSuccessResponse | AuthApiEnvelope<LoginSuccessResponse>, EmailLoginRequest>(
    "/api/auth/login",
    {
      method: "POST",
      useBaseUrl: false,
      body,
      credentials: "include",
    },
  );

  return unwrapAuthApiResponse(payload, "로그인 응답 형식이 올바르지 않습니다.");
}

export function getSocialLoginStartPath(provider: AuthProvider) {
  return `/api/auth/oauth/${provider}/start`;
}

export async function completeSocialLogin(provider: AuthProvider, body: SocialCallbackRequest) {
  const payload = await apiFetch<SocialLoginResponse | AuthApiEnvelope<SocialLoginResponse>, SocialCallbackRequest>(
    `/api/auth/${provider}/callback`,
    {
      method: "POST",
      useBaseUrl: false,
      body,
      credentials: "include",
    },
  );

  return unwrapAuthApiResponse(payload, "소셜 로그인 응답 형식이 올바르지 않습니다.");
}

export async function refreshAccessToken() {
  const payload = await apiFetch<RefreshResponse | AuthApiEnvelope<RefreshResponse>>("/api/auth/refresh", {
    method: "POST",
    useBaseUrl: false,
    credentials: "include",
  });

  const unwrapped = unwrapAuthApiResponse(payload, "토큰 갱신 응답 형식이 올바르지 않습니다.");

  const tokens = extractAuthTokens(unwrapped);
  if (!tokens) {
    throw new Error("토큰 갱신 응답 형식이 올바르지 않습니다.");
  }

  return tokens;
}

export async function getMe(accessToken?: string) {
  const payload = await apiFetch<MeResponse | AuthApiEnvelope<MeResponse>>("/api/auth/me", {
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

  const unwrapped = unwrapAuthApiResponse(payload, "사용자 정보 응답 형식이 올바르지 않습니다.");

  const user = extractMeResponse(unwrapped);
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

export async function checkEmailAvailability(email: string) {
  const payload = await apiFetch<CheckEmailResponse | AuthApiEnvelope<CheckEmailResponse>>(
    `/api/auth/check-email/${encodeURIComponent(email)}`,
    {
      method: "GET",
    },
  );

  return unwrapAuthApiResponse(payload, "이메일 중복 확인 응답 형식이 올바르지 않습니다.");
}

export async function sendEmailCode(body: SendEmailCodeRequest) {
  const payload = await apiFetch<SendEmailCodeResponse | AuthApiEnvelope<SendEmailCodeResponse>, SendEmailCodeRequest>(
    "/api/auth/email/send-code",
    {
      method: "POST",
      body,
      headers: {
        "X-Device-Id": getOrCreateAuthDeviceId(),
      },
    },
  );

  return unwrapAuthApiResponse(payload, "인증코드 발송 응답 형식이 올바르지 않습니다.");
}

export async function verifyEmailCode(body: VerifyEmailCodeRequest) {
  const payload = await apiFetch<
    VerifyEmailCodeResponse | AuthApiEnvelope<VerifyEmailCodeResponse>,
    VerifyEmailCodeRequest
  >("/api/auth/email/verify-code", {
    method: "POST",
    body,
    headers: {
      "X-Device-Id": getOrCreateAuthDeviceId(),
    },
  });

  return unwrapAuthApiResponse(payload, "이메일 인증 응답 형식이 올바르지 않습니다.");
}

export async function signupWithEmail(body: EmailSignupRequest) {
  const payload = await apiFetch<SignupSuccessResponse | AuthApiEnvelope<SignupSuccessResponse>, EmailSignupRequest>(
    "/api/auth/signup",
    {
      method: "POST",
      body,
      credentials: "include",
      headers: {
        "X-Device-Id": getOrCreateAuthDeviceId(),
      },
    },
  );

  return unwrapAuthApiResponse(payload, "회원가입 응답 형식이 올바르지 않습니다.");
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
