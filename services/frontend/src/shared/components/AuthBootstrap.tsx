"use client";

import { useEffect, useRef } from "react";
import { restoreAuthSession } from "@/shared/lib/authApi";
import { shouldRestoreAuthSession } from "@/shared/lib/authPersistence";
import { useAuthStore } from "@/shared/lib/authStore";

export default function AuthBootstrap() {
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    if (hasRestoredRef.current) {
      return;
    }

    hasRestoredRef.current = true;

    let isCancelled = false;

    const { applyAuthSession, clearAuth, setRestoring } = useAuthStore.getState();
    setRestoring();

    if (!shouldRestoreAuthSession()) {
      clearAuth();
      return;
    }

    void restoreAuthSession()
      .then((session) => {
        if (isCancelled) {
          return;
        }

        applyAuthSession(session);
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        clearAuth();
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return null;
}
