"use client";

import { useQuery } from "@tanstack/react-query";
import { getMainNewSignals } from "../api/main";
import { useAuthStore } from "@/shared/lib/authStore";

export function useMainNewSignalsQuery() {
  const authStatus = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: ["main", "new-signals", authStatus],
    queryFn: getMainNewSignals,
    enabled: authStatus !== "restoring",
    staleTime: 60_000,
  });
}
