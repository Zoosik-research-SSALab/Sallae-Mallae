import { NextResponse } from "next/server";
import { getMockInvestmentPerformance } from "@/app/report/utils/mockReportPageData";
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

  return NextResponse.json(snakelizeKeys(getMockInvestmentPerformance(stockId)));
}
