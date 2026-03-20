import { NextRequest, NextResponse } from "next/server";
import { getMockWatchlistNews } from "@/shared/lib/mockWatchlistStore";
import { snakelizeKeys } from "@/shared/utils/case";
import { ensureMockUserAuthorized, proxyUsersApiRequest, shouldUseMockUsersApi } from "../../utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!shouldUseMockUsersApi()) {
    return proxyUsersApiRequest({
      request,
      path: "/api/users/watchlist/news",
      method: "GET",
    });
  }

  const unauthorizedResponse = ensureMockUserAuthorized(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  return NextResponse.json(snakelizeKeys(getMockWatchlistNews()));
}
