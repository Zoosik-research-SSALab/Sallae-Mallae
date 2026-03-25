import { NextRequest, NextResponse } from "next/server";
import { shouldUseMockAuth } from "@/app/api/auth/mock";
import { proxyAuthRequest } from "@/app/api/auth/utils";

export async function GET(request: NextRequest) {
  if (shouldUseMockAuth()) {
    return NextResponse.json({
      success: true,
      data: [],
      error: null,
    });
  }

  return proxyAuthRequest({
    request,
    path: "/api/auth/sessions",
    method: "GET",
    forwardAuthorization: true,
  });
}
