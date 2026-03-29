import { extractAuthTokens, extractMeResponse, isTermsAgreementRequiredResponse } from "@/shared/lib/auth";
import { authApiFetch } from "@/shared/lib/authApiClient";
import { getOrCreateAuthDeviceId } from "@/shared/lib/authDevice";
import { apiFetch } from "@/shared/lib/apiClient";
import type {
  AuthProvider,
  CheckEmailResponse,
  EmailLoginRequest,
  EmailSignupRequest,
  LoginSuccessResponse,
  MeResponse,
  OAuthStartResponse,
  RefreshResponse,
  SendEmailCodeRequest,
  SendEmailCodeResponse,
  SignupSuccessResponse,
  SocialCallbackRequest,
  SocialLoginResponse,
  SocialPolicyRequest,
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

function createDeviceIdHeader() {
  return {
    "X-Device-Id": getOrCreateAuthDeviceId(),
  };
}

export async function loginWithEmail(body: EmailLoginRequest) {
  const payload = await apiFetch<LoginSuccessResponse | AuthApiEnvelope<LoginSuccessResponse>, EmailLoginRequest>(
    "/api/auth/login",
    {
      method: "POST",
      useBaseUrl: false,
      body,
      credentials: "include",
      headers: createDeviceIdHeader(),
    },
  );

  return unwrapAuthApiResponse(payload, "Login response is invalid.");
}

export async function requestSocialLoginStart(provider: AuthProvider) {
  const payload = await apiFetch<OAuthStartResponse | AuthApiEnvelope<OAuthStartResponse>>(
    `/api/auth/oauth/${provider}/start`,
    {
      method: "GET",
      useBaseUrl: false,
      credentials: "include",
      headers: createDeviceIdHeader(),
    },
  );

  return unwrapAuthApiResponse(payload, "OAuth start response is invalid.");
}

export async function completeSocialLogin(provider: AuthProvider, body: SocialCallbackRequest) {
  const payload = await apiFetch<SocialLoginResponse | AuthApiEnvelope<SocialLoginResponse>, SocialCallbackRequest>(
    `/api/auth/${provider}/callback`,
    {
      method: "POST",
      useBaseUrl: false,
      body,
      credentials: "include",
      headers: createDeviceIdHeader(),
    },
  );

  return unwrapAuthApiResponse(payload, "Social login response is invalid.");
}

export async function completeSocialSignup(body: SocialPolicyRequest) {
  const payload = await apiFetch<LoginSuccessResponse | AuthApiEnvelope<LoginSuccessResponse>, SocialPolicyRequest>(
    "/api/auth/policy",
    {
      method: "POST",
      useBaseUrl: false,
      body,
      credentials: "include",
      headers: createDeviceIdHeader(),
    },
  );

  return unwrapAuthApiResponse(payload, "Social signup completion response is invalid.");
}

export async function refreshAccessToken() {
  const payload = await apiFetch<RefreshResponse | AuthApiEnvelope<RefreshResponse>>("/api/auth/refresh", {
    method: "POST",
    useBaseUrl: false,
    credentials: "include",
    headers: createDeviceIdHeader(),
  });

  const unwrapped = unwrapAuthApiResponse(payload, "Refresh response is invalid.");
  const tokens = extractAuthTokens(unwrapped);

  if (!tokens) {
    throw new Error("Refresh response is invalid.");
  }

  return tokens;
}

export async function getMe(accessToken?: string) {
  const payload = await authApiFetch<MeResponse | AuthApiEnvelope<MeResponse>>("/api/auth/me", {
    method: "GET",
    useBaseUrl: false,
    credentials: "include",
    headers: accessToken
      ? {
          Authorization: `Bearer ${accessToken}`,
        }
      : undefined,
  });

  const unwrapped = unwrapAuthApiResponse(payload, "Me response is invalid.");
  const user = extractMeResponse(unwrapped);

  if (!user) {
    throw new Error("Me response is invalid.");
  }

  return user;
}

export async function logoutFromApp() {
  return authApiFetch<void>("/api/auth/logout", {
    method: "POST",
    useBaseUrl: false,
    credentials: "include",
    headers: createDeviceIdHeader(),
  });
}

export async function logoutFromAllDevices() {
  return authApiFetch<void>("/api/auth/logout/all", {
    method: "POST",
    useBaseUrl: false,
    credentials: "include",
    headers: createDeviceIdHeader(),
  });
}

export async function getAuthSessions() {
  const payload = await authApiFetch<unknown | AuthApiEnvelope<unknown>>("/api/auth/sessions", {
    method: "GET",
    useBaseUrl: false,
    credentials: "include",
    headers: createDeviceIdHeader(),
  });

  return unwrapAuthApiResponse(payload, "Sessions response is invalid.");
}

export async function revokeAuthSession(targetDeviceId: string) {
  return authApiFetch<void>(`/api/auth/sessions/${encodeURIComponent(targetDeviceId)}`, {
    method: "DELETE",
    useBaseUrl: false,
    credentials: "include",
    headers: createDeviceIdHeader(),
  });
}

export async function checkEmailAvailability(email: string) {
  const payload = await apiFetch<CheckEmailResponse | AuthApiEnvelope<CheckEmailResponse>>(
    `/api/auth/check-email/${encodeURIComponent(email)}`,
    {
      method: "GET",
    },
  );

  return unwrapAuthApiResponse(payload, "Email availability response is invalid.");
}

export async function sendEmailCode(body: SendEmailCodeRequest) {
  const payload = await apiFetch<SendEmailCodeResponse | AuthApiEnvelope<SendEmailCodeResponse>, SendEmailCodeRequest>(
    "/api/auth/email/send-code",
    {
      method: "POST",
      body,
      headers: createDeviceIdHeader(),
    },
  );

  return unwrapAuthApiResponse(payload, "Send code response is invalid.");
}

export async function verifyEmailCode(body: VerifyEmailCodeRequest) {
  const payload = await apiFetch<
    VerifyEmailCodeResponse | AuthApiEnvelope<VerifyEmailCodeResponse>,
    VerifyEmailCodeRequest
  >("/api/auth/email/verify-code", {
    method: "POST",
    body,
    headers: createDeviceIdHeader(),
  });

  return unwrapAuthApiResponse(payload, "Verify code response is invalid.");
}

export async function signupWithEmail(body: EmailSignupRequest) {
  const payload = await apiFetch<SignupSuccessResponse | AuthApiEnvelope<SignupSuccessResponse>, EmailSignupRequest>(
    "/api/auth/signup",
    {
      method: "POST",
      body,
      credentials: "include",
      headers: createDeviceIdHeader(),
    },
  );

  return unwrapAuthApiResponse(payload, "Signup response is invalid.");
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
