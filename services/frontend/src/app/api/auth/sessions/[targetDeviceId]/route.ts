import { NextRequest, NextResponse } from "next/server";
import { shouldUseMockAuth } from "@/app/api/auth/mock";
import { proxyAuthRequest } from "@/app/api/auth/utils";

type RouteContext = {
  params: Promise<{
    targetDeviceId: string;
  }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (shouldUseMockAuth()) {
    return new NextResponse(null, { status: 204 });
  }

  const { targetDeviceId } = await context.params;

  return proxyAuthRequest({
    request,
    path: `/api/auth/sessions/${encodeURIComponent(targetDeviceId)}`,
    method: "DELETE",
    forwardAuthorization: true,
  });
}
