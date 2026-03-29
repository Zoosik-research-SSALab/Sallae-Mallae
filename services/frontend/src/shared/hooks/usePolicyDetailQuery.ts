"use client";

import { useQuery } from "@tanstack/react-query";
import { getPolicyDetail } from "@/shared/lib/policyApi";
import type { PolicyKind } from "@/shared/types/policy";

export function usePolicyDetailQuery(kind: PolicyKind | null, enabled = true) {
  return useQuery({
    queryKey: ["policy", kind],
    queryFn: () => {
      if (!kind) {
        throw new Error("Policy kind is required.");
      }

      return getPolicyDetail(kind);
    },
    enabled: Boolean(kind) && enabled,
    staleTime: 1000 * 60 * 30,
  });
}
