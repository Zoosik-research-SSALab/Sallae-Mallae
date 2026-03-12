import { NextResponse } from "next/server";
import { getMockStockOverview } from "@/app/stocks/utils/mockStockDetailData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    stockId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { stockId } = await context.params;

  if (!stockId) {
    return NextResponse.json(
      {
        message: "stockId is required",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(snakelizeKeys(getMockStockOverview(stockId)));
}
