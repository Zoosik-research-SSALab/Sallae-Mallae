import { NextRequest, NextResponse } from "next/server";
import { getMockWatchlistNews } from "@/shared/lib/mockWatchlistStore";
import { snakelizeKeys } from "@/shared/utils/case";
import { ensureMockUserAuthorized, proxyUsersApiRequest, shouldUseMockUsersApi } from "../../utils";

export const dynamic = "force-dynamic";

function parsePositiveNumber(value: string | null, fallback: number, min = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min ? parsed : fallback;
}

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

  const offset = parsePositiveNumber(request.nextUrl.searchParams.get("offset"), 0);
  const limit = parsePositiveNumber(request.nextUrl.searchParams.get("limit"), 0, 1);
  const keyword = request.nextUrl.searchParams.get("keyword")?.trim() ?? "";
  const startDate = request.nextUrl.searchParams.get("startDate")?.trim() ?? "";
  const endDate = request.nextUrl.searchParams.get("endDate")?.trim() ?? "";

  return NextResponse.json(snakelizeKeys(
    getMockWatchlistNews({
      offset,
      limit: limit > 0 ? limit : undefined,
      keyword: keyword || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
  ));
}
