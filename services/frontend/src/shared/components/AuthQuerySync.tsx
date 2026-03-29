"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/shared/lib/authStore";

function getAuthIdentity(status: ReturnType<typeof useAuthStore.getState>["status"], userId: number | null) {
  if (status === "restoring") {
    return "restoring";
  }

  if (status === "authenticated" && userId !== null) {
    return `user:${userId}`;
  }

  return "guest";
}

export default function AuthQuerySync() {
  const queryClient = useQueryClient();
  const status = useAuthStore((state) => state.status);
  const userId = useAuthStore((state) => state.user?.userId ?? null);
  const previousIdentityRef = useRef<string | null>(null);

  useEffect(() => {
    const currentIdentity = getAuthIdentity(status, userId);

    if (currentIdentity === "restoring") {
      return;
    }

    if (previousIdentityRef.current === null) {
      previousIdentityRef.current = currentIdentity;
      return;
    }

    if (previousIdentityRef.current !== currentIdentity) {
      queryClient.clear();
    }

    previousIdentityRef.current = currentIdentity;
  }, [queryClient, status, userId]);

  return null;
}
