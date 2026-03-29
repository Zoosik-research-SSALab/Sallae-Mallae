"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect } from "react";
import { getMe } from "@/shared/lib/authApi";
import { useAuthStore } from "@/shared/lib/authStore";

type Props = {
  children: ReactNode;
};

export default function ProtectedPage({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const authStatus = useAuthStore((state) => state.status);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const getRedirectPath = useCallback(() => {
    if (typeof window === "undefined") {
      return pathname;
    }

    const search = window.location.search;
    return search ? `${pathname}${search}` : pathname;
  }, [pathname]);

  const {
    isLoading: isAuthCheckLoading,
    isError: isAuthCheckError,
  } = useQuery({
    queryKey: ["auth", "me", pathname],
    queryFn: () => getMe(),
    enabled: authStatus === "authenticated",
    retry: false,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (authStatus === "restoring") {
      return;
    }

    if (authStatus === "unauthenticated") {
      const redirectPath = getRedirectPath();
      router.replace(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
    }
  }, [authStatus, getRedirectPath, router]);

  useEffect(() => {
    if (!isAuthCheckError) {
      return;
    }

    clearAuth();
    const redirectPath = getRedirectPath();
    router.replace(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
  }, [clearAuth, getRedirectPath, isAuthCheckError, router]);

  if (authStatus !== "authenticated" || isAuthCheckLoading) {
    return (
      <main className="flex min-h-[40vh] items-center justify-center bg-[color:var(--color-bg-primary)]">
        <p className="typo-body-md text-[color:var(--color-text-secondary)]">로그인 상태를 확인하는 중...</p>
      </main>
    );
  }

  if (isAuthCheckError) {
    return null;
  }

  return <>{children}</>;
}
