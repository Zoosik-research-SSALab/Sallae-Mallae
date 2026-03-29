import { apiFetch } from "@/shared/lib/apiClient";
import type { PolicyDetail, PolicyKind } from "@/shared/types/policy";

type PolicyApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error?: {
    code?: string;
    message?: string;
  } | null;
};

function isPolicyApiEnvelope<T>(value: unknown): value is PolicyApiEnvelope<T> {
  return typeof value === "object" && value !== null && "success" in value && "data" in value;
}

function unwrapPolicyApiResponse<T>(payload: T | PolicyApiEnvelope<T>, fallbackMessage: string) {
  if (isPolicyApiEnvelope<T>(payload)) {
    if (payload.data !== null) {
      return payload.data;
    }

    throw new Error(payload.error?.message ?? fallbackMessage);
  }

  return payload;
}

export async function getPolicyDetail(kind: PolicyKind) {
  const payload = await apiFetch<PolicyDetail | PolicyApiEnvelope<PolicyDetail>>(`/api/policy/${kind}`, {
    method: "GET",
    useBaseUrl: false,
  });

  return unwrapPolicyApiResponse(payload, "Policy detail response is invalid.");
}
