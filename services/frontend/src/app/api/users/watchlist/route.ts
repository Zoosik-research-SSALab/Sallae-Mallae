import { NextRequest, NextResponse } from "next/server";
import { addMockWatchlist, getMockWatchlistSnapshot } from "@/shared/lib/mockWatchlistStore";
import { createSseResponse } from "@/shared/lib/sseResponse";
import { camelizeKeys, snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

type PostWatchlistBody = {
  stockId?: number;
};

function readPositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function GET(request: NextRequest) {
  const page = readPositiveInteger(request.nextUrl.searchParams.get("page"), 1);
  const limit = readPositiveInteger(request.nextUrl.searchParams.get("limit"), 5);

  return createSseResponse(() => snakelizeKeys(getMockWatchlistSnapshot({ page, limit })), 5000);
}

export async function POST(request: NextRequest) {
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
