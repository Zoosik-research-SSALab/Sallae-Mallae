import { NextRequest } from "next/server";
import { proxyAuthRequest } from "@/app/api/auth/utils";

export async function POST(request: NextRequest) {
  return proxyAuthRequest({
    request,
    path: "/api/auth/refresh",
    method: "POST",
  });
}
