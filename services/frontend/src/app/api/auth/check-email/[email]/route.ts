import { NextRequest } from "next/server";
import { createMockCheckEmailResponse } from "@/app/api/auth/signupMock";
import { shouldUseMockAuth } from "@/app/api/auth/mock";
import { proxyAuthRequest } from "@/app/api/auth/utils";

type RouteContext = {
  params: Promise<{
    email: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { email } = await context.params;

  if (shouldUseMockAuth()) {
    return createMockCheckEmailResponse(email);
  }

  return proxyAuthRequest({
    request,
    path: `/api/auth/check-email/${encodeURIComponent(email)}`,
    method: "GET",
  });
}
