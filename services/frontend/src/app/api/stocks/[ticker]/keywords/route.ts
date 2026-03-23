import { NextResponse } from "next/server";
import { getMockStockKeywords } from "@/app/stocks/utils/mockStockDetailData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    ticker: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { ticker } = await context.params;

  if (!ticker) {
    return NextResponse.json(
      {
        message: "ticker is required",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(snakelizeKeys(getMockStockKeywords(ticker)));
}
