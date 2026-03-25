import { NextRequest, NextResponse } from "next/server";
import {
  getMockWatchlistStatus,
  removeMockWatchlist,
  toggleMockWatchlistNotification,
} from "@/shared/lib/mockWatchlistStore";
import { camelizeKeys, snakelizeKeys } from "@/shared/utils/case";
import { ensureMockUserAuthorized, proxyUsersApiRequest, shouldUseMockUsersApi } from "../../utils";

export const dynamic = "force-dynamic";

type PatchWatchlistNotificationBody = {
  isNotiEnabled?: boolean;
};

type RouteContext = {
  params: Promise<{
    stockId: string;
  }>;
};

async function readStockId(context: RouteContext) {
  const { stockId } = await context.params;
  return Number(stockId);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const stockId = await readStockId(context);

  if (!shouldUseMockUsersApi()) {
    return proxyUsersApiRequest({
      request,
      path: `/api/users/watchlist/${encodeURIComponent(String(stockId))}`,
      method: "GET",
    });
  }

  const unauthorizedResponse = ensureMockUserAuthorized(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  if (!Number.isFinite(stockId)) {
    return NextResponse.json(
      {
        message: "Invalid stockId",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(snakelizeKeys(getMockWatchlistStatus(stockId)));
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const stockId = await readStockId(context);

  if (!shouldUseMockUsersApi()) {
    return proxyUsersApiRequest({
      request,
      path: `/api/users/watchlist/${encodeURIComponent(String(stockId))}`,
      method: "DELETE",
    });
  }

  const unauthorizedResponse = ensureMockUserAuthorized(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  if (!Number.isFinite(stockId)) {
    return NextResponse.json(
      {
        message: "Invalid stockId",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(snakelizeKeys(removeMockWatchlist(stockId)));
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const stockId = await readStockId(context);

  if (!shouldUseMockUsersApi()) {
    return proxyUsersApiRequest({
      request,
      path: `/api/users/watchlist/${encodeURIComponent(String(stockId))}`,
      method: "PATCH",
    });
  }

  const unauthorizedResponse = ensureMockUserAuthorized(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  if (!Number.isFinite(stockId)) {
    return NextResponse.json(
      {
        message: "Invalid stockId",
      },
      { status: 400 },
    );
  }

  const status = getMockWatchlistStatus(stockId);

  if (!status.isWatched) {
    return NextResponse.json(
      {
        message: "Watchlist entry not found",
      },
      { status: 404 },
    );
  }

  let body: PatchWatchlistNotificationBody = {};

  try {
    body = camelizeKeys<PatchWatchlistNotificationBody>(
      (await request.json()) as unknown,
    );
  } catch {
    body = {};
  }

  return NextResponse.json(
    snakelizeKeys(
      toggleMockWatchlistNotification(stockId, body.isNotiEnabled),
    ),
  );
}
