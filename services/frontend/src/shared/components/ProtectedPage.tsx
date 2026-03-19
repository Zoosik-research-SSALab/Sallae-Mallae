"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { getMe } from "@/shared/lib/authApi";
import { useAuthStore } from "@/shared/lib/authStore";

type Props = {
  children: ReactNode;
};

export default function ProtectedPage({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const authStatus = useAuthStore((state) => state.status);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const search = searchParams.toString();
  const redirectPath = search ? `${pathname}?${search}` : pathname;

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
      router.replace(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
    }
  }, [authStatus, redirectPath, router]);

  useEffect(() => {
    if (!isAuthCheckError) {
      return;
    }

    clearAuth();
    router.replace(`/auth/login?redirect=${encodeURIComponent(redirectPath)}`);
  }, [clearAuth, isAuthCheckError, redirectPath, router]);

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
