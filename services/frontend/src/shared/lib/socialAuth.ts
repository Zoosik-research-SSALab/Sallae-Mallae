import { requestSocialLoginStart } from "@/shared/lib/authApi";
import type { AuthProvider, TermsAgreementRequiredResponse } from "@/shared/types/auth";

const OAUTH_STATE_STORAGE_PREFIX = "social-oauth-state";
const SOCIAL_SIGNUP_STORAGE_KEY = "social-signup-pending";

export type PendingSocialSignup = TermsAgreementRequiredResponse;

function getAppOrigin() {
  const explicitOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  if (explicitOrigin) {
    return explicitOrigin.replace(/\/$/, "");
  }

  if (typeof window === "undefined") {
    throw new Error("Public app origin is not available.");
  }

  return window.location.origin;
}

function getProviderClientId(provider: AuthProvider) {
  switch (provider) {
    case "google":
      return process.env.NEXT_PUBLIC_OAUTH_GOOGLE_CLIENT_ID?.trim() || null;
    case "kakao":
      return process.env.NEXT_PUBLIC_OAUTH_KAKAO_CLIENT_ID?.trim() || null;
    case "naver":
      return process.env.NEXT_PUBLIC_OAUTH_NAVER_CLIENT_ID?.trim() || null;
  }
}

function getOAuthStateStorageKey(provider: AuthProvider) {
  return `${OAUTH_STATE_STORAGE_PREFIX}:${provider}`;
}

function getFrontendCallbackUrl(provider: AuthProvider) {
  return new URL(`/auth/${provider}/callback`, `${getAppOrigin()}/`).toString();
}

function buildProviderAuthorizationUrl(provider: AuthProvider, state: string) {
  const clientId = getProviderClientId(provider);

  if (!clientId) {
    throw new Error(`${provider} OAuth client ID is not configured.`);
  }

  const redirectUri = getFrontendCallbackUrl(provider);
  const authorizeUrl =
    provider === "google"
      ? "https://accounts.google.com/o/oauth2/v2/auth"
      : provider === "kakao"
        ? "https://kauth.kakao.com/oauth/authorize"
        : "https://nid.naver.com/oauth2.0/authorize";

  const url = new URL(authorizeUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  if (provider === "google") {
    url.searchParams.set("scope", "openid email profile");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
  }

  if (provider === "kakao") {
    url.searchParams.set("scope", "profile_nickname,profile_image,account_email");
  }

  return url.toString();
}

function readBrowserUrl(url: string) {
  return new URL(url, `${getAppOrigin()}/`);
}

function isMockCallbackRedirect(provider: AuthProvider, redirect: string) {
  const url = readBrowserUrl(redirect);
  return url.pathname === `/auth/${provider}/callback` && url.searchParams.has("code");
}

export function extractStateFromRedirect(redirect: string) {
  return readBrowserUrl(redirect).searchParams.get("state");
}

export function writeSocialLoginState(provider: AuthProvider, state: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(getOAuthStateStorageKey(provider), state);
}

export function readSocialLoginState(provider: AuthProvider) {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(getOAuthStateStorageKey(provider));
}

export function clearSocialLoginState(provider: AuthProvider) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(getOAuthStateStorageKey(provider));
}

export function writePendingSocialSignup(payload: TermsAgreementRequiredResponse) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(SOCIAL_SIGNUP_STORAGE_KEY, JSON.stringify(payload));
}

export function readPendingSocialSignup(): PendingSocialSignup | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(SOCIAL_SIGNUP_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<PendingSocialSignup>;

    if (
      parsed &&
      parsed.code === "TERMS_AGREEMENT_REQUIRED" &&
      typeof parsed.tempToken === "string" &&
      Array.isArray(parsed.requiredTerms) &&
      Array.isArray(parsed.optionalTerms)
    ) {
      return parsed as PendingSocialSignup;
    }
  } catch {
    return null;
  }

  return null;
}

export function clearPendingSocialSignup() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(SOCIAL_SIGNUP_STORAGE_KEY);
}

export async function startSocialLogin(provider: AuthProvider) {
  const payload = await requestSocialLoginStart(provider);
  const state = extractStateFromRedirect(payload.redirect);

  if (!state) {
    throw new Error("OAuth state is missing from the start response.");
  }

  clearPendingSocialSignup();
  writeSocialLoginState(provider, state);

  const destination = isMockCallbackRedirect(provider, payload.redirect)
    ? readBrowserUrl(payload.redirect).toString()
    : buildProviderAuthorizationUrl(provider, state);

  window.location.assign(destination);
}
