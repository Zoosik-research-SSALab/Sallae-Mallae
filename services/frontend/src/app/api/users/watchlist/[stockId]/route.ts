import { NextResponse } from "next/server";
import { getMockWatchlistStatus, removeMockWatchlist } from "@/shared/lib/mockWatchlistStore";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    stockId: string;
  }>;
};

async function readStockId(context: RouteContext) {
  const { stockId } = await context.params;
  return Number(stockId);
}

export async function GET(_: Request, context: RouteContext) {
  const stockId = await readStockId(context);

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

export async function DELETE(_: Request, context: RouteContext) {
  const stockId = await readStockId(context);

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
