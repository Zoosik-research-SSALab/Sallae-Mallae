"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { getAuthErrorMessage } from "@/shared/lib/auth";
import { completeSocialLogin, isSocialSignupPending } from "@/shared/lib/authApi";
import { writeAuthPersistenceMode } from "@/shared/lib/authPersistence";
import { useAuthStore } from "@/shared/lib/authStore";
import {
  clearPendingSocialSignup,
  clearSocialLoginState,
  readSocialLoginState,
  writePendingSocialSignup,
} from "@/shared/lib/socialAuth";
import type { AuthProvider } from "@/shared/types/auth";

type Props = {
  provider: AuthProvider;
};

const providerLabels: Record<AuthProvider, string> = {
  google: "Google",
  kakao: "카카오",
  naver: "네이버",
};

export default function AuthCallbackClient({ provider }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasSubmittedRef = useRef(false);

  useEffect(() => {
    const authorizationCode = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    const providerLabel = providerLabels[provider];

    if (error) {
      clearSocialLoginState(provider);
      window.alert(
        errorDescription
          ? `${providerLabel} 로그인에 실패했습니다. ${errorDescription}`
          : `${providerLabel} 로그인에 실패했습니다.`,
      );
      router.replace("/auth/login");
      return;
    }

    if (!authorizationCode || !state) {
      clearSocialLoginState(provider);
      window.alert("소셜 로그인 응답 값이 올바르지 않습니다.");
      router.replace("/auth/login");
      return;
    }

    const savedState = readSocialLoginState(provider);
    if (!savedState || savedState !== state) {
      clearSocialLoginState(provider);
      window.alert("유효하지 않은 로그인 요청입니다. 다시 시도해주세요.");
      router.replace("/auth/login");
      return;
    }

    if (hasSubmittedRef.current) {
      return;
    }

    hasSubmittedRef.current = true;

    let isCancelled = false;

    void completeSocialLogin(provider, {
      authorizationCode,
      state,
    })
      .then((payload) => {
        if (isCancelled) {
          return;
        }

        clearSocialLoginState(provider);

        if (isSocialSignupPending(payload)) {
          writePendingSocialSignup(payload);
          router.replace("/auth/signup/terms");
          return;
        }

        clearPendingSocialSignup();
        writeAuthPersistenceMode(true);
        useAuthStore.getState().applyAuthSession(payload);
        router.replace("/");
      })
      .catch((errorValue) => {
        if (isCancelled) {
          return;
        }

        clearSocialLoginState(provider);
        window.alert(getAuthErrorMessage(errorValue, `${providerLabel} 로그인에 실패했습니다.`));
        router.replace("/auth/login");
      });

    return () => {
      isCancelled = true;
    };
  }, [provider, router, searchParams]);

  return (
    <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[color:var(--color-bg-secondary)] px-4 py-10">
      <section className="flex w-full max-w-md flex-col items-center gap-4 rounded-[28px] bg-[color:var(--color-bg-primary)] px-8 py-10 text-center shadow-[0px_18px_40px_rgba(0,0,0,0.12)]">
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-[color:var(--color-border-primary)] border-t-[color:var(--color-bg-interactive-primary)]" />
        <h1 className="typo-heading-md text-[color:var(--color-text-primary)]">
          {providerLabels[provider]} 로그인 처리 중
        </h1>
        <p className="typo-body-md text-[color:var(--color-text-secondary)]">
          로그인 정보를 확인하고 있습니다. 잠시만 기다려주세요.
        </p>
        <Link
          href="/auth/login"
          className="typo-body-sm rounded-full bg-[color:var(--color-bg-tertiary)] px-4 py-2 font-semibold text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-bg-interactive-secondary-hovered)]"
        >
          로그인으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
