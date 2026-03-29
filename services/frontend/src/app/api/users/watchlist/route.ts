import { NextRequest, NextResponse } from "next/server";
import { addMockWatchlist, getMockWatchlistListResponse } from "@/shared/lib/mockWatchlistStore";
import { camelizeKeys, snakelizeKeys } from "@/shared/utils/case";
import { ensureMockUserAuthorized, proxyUsersApiRequest, shouldUseMockUsersApi } from "../utils";

export const dynamic = "force-dynamic";

type PostWatchlistBody = {
  stockId?: number;
  stock_id?: number;
};

export async function GET(request: NextRequest) {
  if (!shouldUseMockUsersApi()) {
    return proxyUsersApiRequest({
      request,
      path: "/api/users/watchlist",
      method: "GET",
      acceptOverride: "application/json",
    });
  }

  const unauthorizedResponse = ensureMockUserAuthorized(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  return NextResponse.json({
    success: true,
    data: snakelizeKeys(getMockWatchlistListResponse()),
    error: null,
  });
}

export async function POST(request: NextRequest) {
  if (!shouldUseMockUsersApi()) {
    return proxyUsersApiRequest({
      request,
      path: "/api/users/watchlist",
      method: "POST",
    });
  }

  const unauthorizedResponse = ensureMockUserAuthorized(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  let body: PostWatchlistBody = {};

  try {
    body = camelizeKeys<PostWatchlistBody>((await request.json()) as unknown);
  } catch {
    body = {};
  }

  const stockId = body.stockId ?? body.stock_id;

  if (typeof stockId !== "number") {
    return NextResponse.json(
      {
        message: "stock_id is required",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(snakelizeKeys(addMockWatchlist(stockId)));
}
