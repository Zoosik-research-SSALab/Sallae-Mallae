import { ApiError } from "@/shared/lib/apiClient";
import type {
  AuthProvider,
  AuthSessionUser,
  AuthTokens,
  AuthUser,
  TermsAgreementRequiredResponse,
} from "@/shared/types/auth";

type RecordValue = Record<string, unknown>;

const authErrorMessages: Record<string, string> = {
  AUTH_001: "로그인이 필요합니다.",
  LOGIN_001: "이메일 또는 비밀번호가 올바르지 않습니다.",
  LOGIN_002: "로그인 시도가 너무 많아 계정이 잠겼습니다. 30분 후 다시 시도해 주세요.",
  LOGIN_003: "탈퇴한 계정입니다. 복구 기간 내에만 다시 로그인할 수 있습니다.",
  LOGIN_004: "계정 복구 가능 기간이 만료되었습니다.",
  LOGIN_005: "정지된 계정입니다. 관리자에게 문의해 주세요.",
  EMAIL_001: "이미 가입된 이메일입니다.",
  SIGNUP_001: "이메일 인증이 유효하지 않거나 만료되었습니다.",
  SIGNUP_003: "필수 약관에 모두 동의해 주세요.",
  PWD_002: "비밀번호는 8자 이상이고 영문, 숫자, 특수문자를 모두 포함해야 합니다.",
  RATE_001: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  RATE_002: "이메일 발송 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  VERIFY_001: "인증코드가 일치하지 않습니다.",
  VERIFY_002: "인증코드가 만료되었습니다.",
  VERIFY_003: "인증 시도 횟수를 초과했습니다.",
  OAUTH_003: "소셜 로그인 검증에 실패했습니다. 다시 시도해 주세요.",
  OAUTH_004: "지원하지 않는 소셜 로그인 제공자입니다.",
  OAUTH_005: "이미 다른 로그인 방식으로 가입된 이메일입니다.",
  OAUTH_006: "소셜 로그인 제공자와 통신하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  TOKEN_001: "로그인 세션이 만료되었습니다. 다시 로그인해 주세요.",
  TOKEN_002: "세션 검증에 실패했습니다. 다시 로그인해 주세요.",
  TOKEN_003: "기기 정보가 일치하지 않아 세션을 복원할 수 없습니다.",
};

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null;
}

function readOptionalString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function extractErrorDetails(payload: unknown) {
  if (!isRecord(payload)) {
    return null;
  }

  if (typeof payload.code === "string" || typeof payload.message === "string") {
    return {
      code: typeof payload.code === "string" ? payload.code : null,
      message: typeof payload.message === "string" ? payload.message : null,
    };
  }

  if (isRecord(payload.error)) {
    return {
      code: typeof payload.error.code === "string" ? payload.error.code : null,
      message: typeof payload.error.message === "string" ? payload.error.message : null,
    };
  }

  return null;
}

export function isAuthProvider(value: string): value is AuthProvider {
  return value === "google" || value === "kakao" || value === "naver";
}

export function extractAuthUser(value: unknown): AuthUser | null {
  if (!isRecord(value)) {
    return null;
  }

  const userId = typeof value.userId === "number" ? value.userId : typeof value.id === "number" ? value.id : null;
  const email = readOptionalString(value.email);
  const nickname = readOptionalString(value.nickname);
  const provider = readOptionalString(value.provider);
  const role = readOptionalString(value.role);
  const lastLoginAt = readOptionalString(value.lastLoginAt);
  const profileImageUrl = readOptionalString(value.profileImageUrl) ?? readOptionalString(value.profile_image_url);

  if (userId === null || !email || !nickname || !provider || !role) {
    return null;
  }

  return {
    userId,
    email,
    nickname,
    profileImageUrl,
    provider,
    role,
    lastLoginAt,
  };
}

export function extractAuthTokens(value: unknown): AuthTokens | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.accessToken !== "string" ||
    typeof value.tokenType !== "string" ||
    typeof value.expiresIn !== "number"
  ) {
    return null;
  }

  return {
    accessToken: value.accessToken,
    tokenType: value.tokenType,
    expiresIn: value.expiresIn,
  };
}

export function extractMeResponse(value: unknown): AuthUser | null {
  const directUser = extractAuthUser(value);
  if (directUser) {
    return directUser;
  }

  if (!isRecord(value)) {
    return null;
  }

  return extractAuthUser(value.user ?? value.data);
}

export function toAuthSessionUser(user: AuthUser): AuthSessionUser {
  return {
    userId: user.userId,
    email: user.email,
    nickname: user.nickname,
    profileImageUrl: user.profileImageUrl,
  };
}

export function isTermsAgreementRequiredResponse(value: unknown): value is TermsAgreementRequiredResponse {
  return isRecord(value) && value.code === "TERMS_AGREEMENT_REQUIRED" && typeof value.tempToken === "string";
}

export function getAuthErrorMessage(error: unknown, fallbackMessage = "로그인 요청이 실패했습니다.") {
  if (error instanceof ApiError) {
    const details = extractErrorDetails(error.payload);
    if (details?.code) {
      return authErrorMessages[details.code] ?? details.message ?? fallbackMessage;
    }

    if (details?.message) {
      return details.message;
    }

    return error.message || fallbackMessage;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallbackMessage;
}
