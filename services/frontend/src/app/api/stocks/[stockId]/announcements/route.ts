import { NextRequest, NextResponse } from "next/server";
import { getMockAnnouncements } from "@/app/stocks/utils/mockStockDetailData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    stockId: string;
  }>;
};

function readPositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { stockId } = await context.params;

  if (!stockId) {
    return NextResponse.json(
      {
        message: "stockId is required",
      },
      { status: 400 },
    );
  }

  const limit = Math.max(1, readPositiveInteger(request.nextUrl.searchParams.get("limit"), 4));
  const offset = readPositiveInteger(request.nextUrl.searchParams.get("offset"), 0);

  return NextResponse.json(snakelizeKeys(getMockAnnouncements(stockId, limit, offset)));
}
