"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { completeSocialLogin, isSocialSignupPending } from "@/shared/lib/authApi";
import { getAuthErrorMessage } from "@/shared/lib/auth";
import { writeAuthPersistenceMode } from "@/shared/lib/authPersistence";
import { useAuthStore } from "@/shared/lib/authStore";
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

  const providerLabel = providerLabels[provider];

  useEffect(() => {
    const authorizationCode = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      window.alert(errorDescription ? `${providerLabel} 로그인에 실패했습니다. ${errorDescription}` : `${providerLabel} 로그인에 실패했습니다.`);
      router.replace("/");
      return;
    }

    if (!authorizationCode || !state) {
      window.alert("소셜 로그인 승인 정보가 올바르지 않습니다.");
      router.replace("/");
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

        if (isSocialSignupPending(payload)) {
          window.alert("약관 동의가 필요한 신규 회원입니다. 해당 흐름은 아직 준비되지 않았습니다.");
          router.replace("/");
          return;
        }

        writeAuthPersistenceMode(true);
        useAuthStore.getState().applyAuthSession(payload);
        router.replace("/");
      })
      .catch((errorValue) => {
        if (isCancelled) {
          return;
        }

        window.alert(getAuthErrorMessage(errorValue, `${providerLabel} 로그인에 실패했습니다.`));
        router.replace("/");
      });

    return () => {
      isCancelled = true;
    };
  }, [provider, providerLabel, router, searchParams]);

  return (
    <main className="flex min-h-[calc(100vh-72px)] items-center justify-center bg-[color:var(--color-bg-secondary)] px-4 py-10">
      <section className="flex w-full max-w-md flex-col items-center gap-4 rounded-[28px] bg-[color:var(--color-bg-primary)] px-8 py-10 text-center shadow-[0px_18px_40px_rgba(0,0,0,0.12)]">
        <div className="h-12 w-12 animate-spin rounded-full border-[3px] border-[color:var(--color-border-primary)] border-t-[color:var(--color-bg-interactive-primary)]" />
        <h1 className="typo-heading-md text-[color:var(--color-text-primary)]">{providerLabel} 로그인 처리 중</h1>
        <p className="typo-body-md text-[color:var(--color-text-secondary)]">{providerLabel} 로그인 정보를 확인하고 있습니다.</p>
        <Link
          href="/"
          className="typo-body-sm rounded-full bg-[color:var(--color-bg-tertiary)] px-4 py-2 font-semibold text-[color:var(--color-text-primary)] transition-colors hover:bg-[color:var(--color-bg-interactive-secondary-hovered)]"
        >
          홈으로 돌아가기
        </Link>
      </section>
    </main>
  );
}
