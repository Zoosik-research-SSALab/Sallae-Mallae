import { NextRequest, NextResponse } from "next/server";
import { addMockWatchlist } from "@/shared/lib/mockWatchlistStore";
import { camelizeKeys, snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

type PostWatchlistBody = {
  stockId?: number;
};

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
