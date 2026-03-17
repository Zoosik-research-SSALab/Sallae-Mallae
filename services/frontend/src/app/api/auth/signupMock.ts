import { NextResponse } from "next/server";
import { applyMockAuthCookies, createMockAuthUser, createMockRefreshResponse } from "./mock";
import type {
  CheckEmailResponse,
  EmailSignupRequest,
  EmailVerificationPurpose,
  SendEmailCodeRequest,
  SendEmailCodeResponse,
  SignupAgreement,
  SignupSuccessResponse,
  VerifyEmailCodeRequest,
  VerifyEmailCodeResponse,
} from "@/shared/types/auth";

const MOCK_CODE = "123456";
const CODE_EXPIRES_IN = 300;
const VERIFICATION_TOKEN_EXPIRES_IN = 600;
const MAX_VERIFY_ATTEMPTS = 5;
const REQUIRED_TERMS_IDS = [1, 2, 3] as const;

type MockRegisteredAccount = {
  email: string;
  password: string;
  emailOptIn: boolean;
  agreements: SignupAgreement[];
  responseUser: SignupSuccessResponse["user"];
};

type MockCodeRecord = {
  email: string;
  purpose: EmailVerificationPurpose;
  code: string;
  expiresAt: number;
  remainingAttempts: number;
};

type MockVerificationRecord = {
  email: string;
  purpose: EmailVerificationPurpose;
  token: string;
  expiresAt: number;
};

type MockSignupState = {
  registeredAccounts: Map<string, MockRegisteredAccount>;
  codeRecords: Map<string, MockCodeRecord>;
  verificationRecords: Map<string, MockVerificationRecord>;
};

const globalSignupState = globalThis as typeof globalThis & {
  __SALLAEMALLAE_SIGNUP_MOCK_STATE__?: MockSignupState;
};

function getSignupState() {
  if (!globalSignupState.__SALLAEMALLAE_SIGNUP_MOCK_STATE__) {
    const seededUser = createMockAuthUser({
      provider: "EMAIL",
      email: "taken@example.com",
    });

    globalSignupState.__SALLAEMALLAE_SIGNUP_MOCK_STATE__ = {
      registeredAccounts: new Map([
        [
          normalizeEmail(seededUser.email),
          {
            email: seededUser.email,
            password: "Password1!",
            emailOptIn: false,
            agreements: REQUIRED_TERMS_IDS.map((termsId) => ({ termsId, agreed: true })),
            responseUser: {
              userId: seededUser.userId,
              email: seededUser.email,
              nickname: seededUser.nickname,
              profileImageUrl: seededUser.profileImageUrl,
              provider: "EMAIL",
              role: seededUser.role,
            },
          },
        ],
      ]),
      codeRecords: new Map(),
      verificationRecords: new Map(),
    };
  }

  return globalSignupState.__SALLAEMALLAE_SIGNUP_MOCK_STATE__;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createCodeKey(email: string, purpose: EmailVerificationPurpose) {
  return `${purpose}:${normalizeEmail(email)}`;
}

function createVerificationKey(token: string) {
  return token.trim();
}

function createErrorResponse(status: number, code: string, message: string) {
  return NextResponse.json(
    {
      code,
      message,
    },
    { status },
  );
}

function isPasswordValid(password: string) {
  return /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}

function hasRequiredAgreements(agreements: SignupAgreement[]) {
  return REQUIRED_TERMS_IDS.every((termsId) => agreements.some((item) => item.termsId === termsId && item.agreed));
}

function createSignupResponseUser(email: string, nickname: string) {
  const user = createMockAuthUser({
    provider: "EMAIL",
    email,
  });

  return {
    responseUser: {
      userId: user.userId,
      email,
      nickname,
      profileImageUrl: null,
      provider: "EMAIL",
      role: "USER",
    },
    sessionUser: {
      ...user,
      nickname,
      provider: "EMAIL",
      role: "USER",
    },
  };
}

export function createMockCheckEmailResponse(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const payload: CheckEmailResponse = {
    email: normalizedEmail,
    available: !getSignupState().registeredAccounts.has(normalizedEmail),
  };

  return NextResponse.json(payload);
}

export function createMockSendCodeResponse(body: SendEmailCodeRequest) {
  const state = getSignupState();
  const email = normalizeEmail(body.email);

  if (body.purpose === "SIGNUP" && state.registeredAccounts.has(email)) {
    return createErrorResponse(409, "EMAIL_001", "이미 가입된 이메일입니다.");
  }

  const key = createCodeKey(email, body.purpose);
  state.codeRecords.set(key, {
    email,
    purpose: body.purpose,
    code: MOCK_CODE,
    expiresAt: Date.now() + CODE_EXPIRES_IN * 1000,
    remainingAttempts: MAX_VERIFY_ATTEMPTS,
  });

  const payload: SendEmailCodeResponse = {
    expiresIn: CODE_EXPIRES_IN,
    remainingAttempts: MAX_VERIFY_ATTEMPTS,
  };

  return NextResponse.json(payload);
}

export function createMockVerifyCodeResponse(body: VerifyEmailCodeRequest) {
  const state = getSignupState();
  const email = normalizeEmail(body.email);
  const key = createCodeKey(email, body.purpose);
  const record = state.codeRecords.get(key);

  if (!record || record.expiresAt <= Date.now()) {
    state.codeRecords.delete(key);
    return createErrorResponse(400, "VERIFY_002", "인증코드가 만료되었습니다.");
  }

  if (record.code !== body.code.trim()) {
    record.remainingAttempts -= 1;

    if (record.remainingAttempts <= 0) {
      state.codeRecords.delete(key);
      return createErrorResponse(400, "VERIFY_003", "인증 시도 횟수를 초과했습니다.");
    }

    state.codeRecords.set(key, record);
    return createErrorResponse(400, "VERIFY_001", "인증코드가 일치하지 않습니다.");
  }

  const verificationToken = `verify_${crypto.randomUUID().replaceAll("-", "")}`;
  state.verificationRecords.set(createVerificationKey(verificationToken), {
    email,
    purpose: body.purpose,
    token: verificationToken,
    expiresAt: Date.now() + VERIFICATION_TOKEN_EXPIRES_IN * 1000,
  });

  const payload: VerifyEmailCodeResponse = {
    verificationToken,
    expiresIn: VERIFICATION_TOKEN_EXPIRES_IN,
  };

  return NextResponse.json(payload);
}

export function createMockSignupResponse(body: EmailSignupRequest) {
  const state = getSignupState();
  const email = normalizeEmail(body.email);
  const verificationToken = createVerificationKey(body.verificationToken);
  const verificationRecord = state.verificationRecords.get(verificationToken);

  if (!verificationRecord || verificationRecord.expiresAt <= Date.now() || verificationRecord.email !== email || verificationRecord.purpose !== "SIGNUP") {
    state.verificationRecords.delete(verificationToken);
    return createErrorResponse(400, "SIGNUP_001", "이메일 인증이 유효하지 않거나 만료되었습니다.");
  }

  if (state.registeredAccounts.has(email)) {
    return createErrorResponse(409, "EMAIL_001", "이미 가입된 이메일입니다.");
  }

  if (!isPasswordValid(body.password)) {
    return createErrorResponse(400, "PWD_002", "비밀번호는 8자 이상이며 영문, 숫자, 특수문자를 모두 포함해야 합니다.");
  }

  const nickname = body.nickname.trim();
  if (nickname.length < 2 || nickname.length > 20) {
    return createErrorResponse(400, "SIGNUP_002", "닉네임은 2자 이상 20자 이하여야 합니다.");
  }

  if (!hasRequiredAgreements(body.agreements)) {
    return createErrorResponse(400, "SIGNUP_003", "필수 약관에 모두 동의해 주세요.");
  }

  const { responseUser, sessionUser } = createSignupResponseUser(email, nickname);
  const tokens = createMockRefreshResponse();

  state.registeredAccounts.set(email, {
    email,
    password: body.password,
    emailOptIn: body.emailOptIn,
    agreements: body.agreements,
    responseUser,
  });
  state.verificationRecords.delete(verificationToken);
  state.codeRecords.delete(createCodeKey(email, "SIGNUP"));

  const response = NextResponse.json<SignupSuccessResponse>(
    {
      ...tokens,
      user: responseUser,
    },
    { status: 201 },
  );

  applyMockAuthCookies(response, sessionUser);
  return response;
}
