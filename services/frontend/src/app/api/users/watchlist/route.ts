import { NextRequest, NextResponse } from "next/server";
import { addMockWatchlist, getMockWatchlistSnapshot } from "@/shared/lib/mockWatchlistStore";
import { createSseResponse } from "@/shared/lib/sseResponse";
import { camelizeKeys, snakelizeKeys } from "@/shared/utils/case";
import { ensureMockUserAuthorized, proxyUsersApiRequest, shouldUseMockUsersApi } from "../utils";

export const dynamic = "force-dynamic";

type PostWatchlistBody = {
  stockId?: number;
};

type BackendWatchlistItem = {
  stockId?: number;
  ticker?: string;
  name?: string;
};

type BackendWatchlistResponse = {
  total?: number;
  watchlist?: BackendWatchlistItem[];
};

type BackendApiResponse = {
  success?: boolean;
  data?: BackendWatchlistResponse;
};

type WatchlistStreamItem = {
  total: number;
  stockId: number;
  ticker: string;
  name: string;
  price: number;
  fluctuationRate: number;
  signal: "HOLD";
  confidence: number;
};

type WatchlistStreamPayload = {
  buyCount: number;
  sellCount: number;
  upCount: number;
  watchlist: WatchlistStreamItem[];
};

function readPositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

function wantsEventStream(request: NextRequest) {
  return request.headers.get("accept")?.includes("text/event-stream") ?? false;
}

function toWatchlistStreamPayload(payload: BackendWatchlistResponse, page: number, limit: number): WatchlistStreamPayload {
  const total = typeof payload.total === "number" ? payload.total : 0;
  const watchlist = Array.isArray(payload.watchlist) ? payload.watchlist : [];
  const safeLimit = Math.max(1, limit);
  const totalPages = total === 0 ? 1 : Math.ceil(total / safeLimit);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * safeLimit;
  const paginatedItems = watchlist.slice(startIndex, startIndex + safeLimit);

  return {
    buyCount: 0,
    sellCount: 0,
    upCount: 0,
    watchlist: paginatedItems.map((item) => ({
      total,
      stockId: typeof item.stockId === "number" ? item.stockId : 0,
      ticker: typeof item.ticker === "string" ? item.ticker : "",
      name: typeof item.name === "string" ? item.name : "",
      price: 0,
      fluctuationRate: 0,
      signal: "HOLD",
      confidence: 0,
    })),
  };
}

export async function GET(request: NextRequest) {
  const page = readPositiveInteger(request.nextUrl.searchParams.get("page"), 1);
  const limit = readPositiveInteger(request.nextUrl.searchParams.get("limit"), 5);

  if (!shouldUseMockUsersApi()) {
    const upstreamResponse = await proxyUsersApiRequest({
      request,
      path: "/api/users/watchlist",
      method: "GET",
      acceptOverride: "application/json",
    });

    if (!upstreamResponse.ok) {
      return upstreamResponse;
    }

    const upstreamPayload = camelizeKeys<BackendApiResponse>((await upstreamResponse.json()) as unknown);
    const watchlistPayload = toWatchlistStreamPayload(upstreamPayload.data ?? {}, page, limit);

    if (wantsEventStream(request)) {
      return createSseResponse(() => snakelizeKeys(watchlistPayload), 5000);
    }

    return NextResponse.json(snakelizeKeys(watchlistPayload));
  }

  const unauthorizedResponse = ensureMockUserAuthorized(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const snapshot = getMockWatchlistSnapshot({ page, limit });

  if (wantsEventStream(request)) {
    return createSseResponse(() => snakelizeKeys(snapshot), 5000);
  }

  return NextResponse.json(snakelizeKeys(snapshot));
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

  if (typeof body.stockId !== "number") {
    return NextResponse.json(
      {
        message: "stock_id is required",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(snakelizeKeys(addMockWatchlist(body.stockId)));
}
