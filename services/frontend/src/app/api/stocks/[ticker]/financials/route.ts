import { NextRequest, NextResponse } from "next/server";
import type { StockFinancialType } from "@/app/stocks/types/stockDetail";
import { getMockStockFinancials } from "@/app/stocks/utils/mockStockDetailData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    ticker: string;
  }>;
};

const validTypes = new Set<StockFinancialType>(["YEARLY", "QUARTERLY"]);

export async function GET(request: NextRequest, context: RouteContext) {
  const { ticker } = await context.params;
  const type = request.nextUrl.searchParams.get("type");

  if (!ticker) {
    return NextResponse.json(
      {
        message: "ticker is required",
      },
      { status: 400 },
    );
  }

  const safeType = validTypes.has(type as StockFinancialType) ? (type as StockFinancialType) : "YEARLY";

  return NextResponse.json(snakelizeKeys(getMockStockFinancials(ticker, safeType)));
}
