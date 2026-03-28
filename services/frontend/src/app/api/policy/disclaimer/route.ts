import type { NextRequest } from "next/server";
import { createMockPolicyResponse, proxyPolicyRequest, shouldUseMockPolicyApi } from "../utils";

export async function GET(request: NextRequest) {
  if (shouldUseMockPolicyApi()) {
    return createMockPolicyResponse("disclaimer");
  }

  return proxyPolicyRequest(request, "/api/policy/disclaimer");
}
