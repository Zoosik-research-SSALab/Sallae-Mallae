import { NextRequest, NextResponse } from "next/server";
import type { StockChartPeriod } from "@/app/stocks/types/stockDetail";
import { getMockStockPrices } from "@/app/stocks/utils/mockStockDetailData";
import { createSseResponse } from "@/shared/lib/sseResponse";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    stockId: string;
  }>;
};

const validPeriods = new Set<StockChartPeriod>(["1MIN", "1D", "1W", "1M", "3M", "1Y", "3Y"]);

export async function GET(request: NextRequest, context: RouteContext) {
  const { stockId } = await context.params;
  const period = request.nextUrl.searchParams.get("period");

  if (!stockId) {
    return NextResponse.json(
      {
        message: "stockId is required",
      },
      { status: 400 },
    );
  }

  const safePeriod = validPeriods.has(period as StockChartPeriod) ? (period as StockChartPeriod) : "1D";

  return createSseResponse(() => snakelizeKeys(getMockStockPrices(stockId, safePeriod)), 4000);
}
