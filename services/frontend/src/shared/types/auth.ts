export const AUTH_PROVIDERS = ["google", "kakao", "naver"] as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export type AuthUser = {
  userId: number;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
  provider: string;
  role: string;
  lastLoginAt?: string | null;
};

export type AuthSessionUser = Pick<AuthUser, "userId" | "email" | "nickname" | "profileImageUrl">;

export type AuthTokens = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
};

export type EmailLoginRequest = {
  email: string;
  password: string;
};

export type SocialCallbackRequest = {
  authorizationCode: string;
  state: string;
};

export type OAuthStartResponse = {
  provider: AuthProvider;
  redirect: string;
};

export type LoginSuccessResponse = AuthTokens & {
  code?: "SUCCESS";
  user: AuthUser;
};

export type TermsAgreementItem = {
  termsId: number;
  title: string;
  required: boolean;
};

export type TermsAgreementRequiredResponse = {
  code: "TERMS_AGREEMENT_REQUIRED";
  tempToken: string;
  email: string;
  provider: string;
  requiredTerms: TermsAgreementItem[];
  optionalTerms: TermsAgreementItem[];
};

export type SocialLoginResponse = LoginSuccessResponse | TermsAgreementRequiredResponse;

export type RefreshResponse = AuthTokens;

export type MeResponse = {
  user: AuthUser;
};

export type EmailVerificationPurpose = "SIGNUP" | "PASSWORD_RESET";

export type CheckEmailResponse = {
  email: string;
  available: boolean;
};

export type SendEmailCodeRequest = {
  email: string;
  purpose: EmailVerificationPurpose;
};

export type SendEmailCodeResponse = {
  expiresIn: number;
  remainingAttempts: number;
};

export type VerifyEmailCodeRequest = {
  email: string;
  code: string;
  purpose: EmailVerificationPurpose;
};

export type VerifyEmailCodeResponse = {
  verificationToken: string;
  expiresIn: number;
};

export type SignupAgreement = {
  termsId: number;
  agreed: boolean;
};

export type SocialPolicyRequest = {
  tempToken: string;
  nickname: string;
  emailOptIn: boolean;
  agreements: SignupAgreement[];
};

export type EmailSignupRequest = {
  verificationToken: string;
  email: string;
  password: string;
  nickname: string;
  emailOptIn: boolean;
  agreements: SignupAgreement[];
};

export type SignupSuccessResponse = AuthTokens & {
  user: AuthUser;
};
