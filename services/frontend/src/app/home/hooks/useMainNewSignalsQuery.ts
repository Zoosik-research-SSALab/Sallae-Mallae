"use client";

import { useQuery } from "@tanstack/react-query";
import { getMainNewSignals } from "../api/main";

export function useMainNewSignalsQuery() {
  return useQuery({
    queryKey: ["main", "new-signals"],
    queryFn: getMainNewSignals,
    staleTime: 60_000,
  });
}
