"use client";

import { useQuery } from "@tanstack/react-query";
import { getTopStocks } from "../api/main";
import type { TopStocksPayload } from "../types/main";
import { useAuthStore } from "@/shared/lib/authStore";

const initialData: TopStocksPayload = { stocks: [] };

export function useTopStocks() {
  const authStatus = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: ["main", "top-stocks", authStatus],
    queryFn: getTopStocks,
    enabled: authStatus !== "restoring",
    staleTime: 60_000,
    placeholderData: initialData,
  });
}
