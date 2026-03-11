import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/api/auth/utils";

export async function GET(request: NextRequest) {
  return proxyAuthRequest({
    request,
    path: "/api/auth/me",
    method: "GET",
    forwardAuthorization: true,
  });
}
