"use client";

import { useCallback } from "react";
import { useAuthModalStore } from "@/shared/lib/authModalStore";
import { useAuthStore } from "@/shared/lib/authStore";

const LOGIN_REQUIRED_ALERT_MESSAGE = "로그인 유저만 접속 가능합니다.";

export function useRequireAuthAction() {
  const authStatus = useAuthStore((state) => state.status);
  const openLoginModal = useAuthModalStore((state) => state.openLoginModal);

  return useCallback(
    (action?: () => void) => {
      if (authStatus === "authenticated") {
        action?.();
        return true;
      }

      window.alert(LOGIN_REQUIRED_ALERT_MESSAGE);
      openLoginModal();
      return false;
    },
    [authStatus, openLoginModal],
  );
}
