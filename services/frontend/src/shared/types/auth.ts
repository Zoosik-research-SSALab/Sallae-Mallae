export const AUTH_PROVIDERS = ["google", "kakao", "naver"] as const;

export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

export type AuthUser = {
  userId: number;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
  provider: string;
  role: string;
  lastLoginAt: string;
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
