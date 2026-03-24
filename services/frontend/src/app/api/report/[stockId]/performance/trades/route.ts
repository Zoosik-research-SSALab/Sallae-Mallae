import { NextResponse } from "next/server";
import { getMockTradeHistory, hasMockTradeHistory } from "@/app/report/utils/mockReportPageData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    stockId: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { stockId } = await context.params;

  if (!stockId) {
    return NextResponse.json(
      {
        message: "stockId is required",
      },
      { status: 400 },
    );
  }

  if (!hasMockTradeHistory(stockId)) {
    return NextResponse.json(
      {
        message: "trade history not found",
      },
      { status: 404 },
    );
  }

  const { searchParams } = new URL(request.url);
  const offset = Number(searchParams.get("offset") ?? "0");
  const limit = Number(searchParams.get("limit") ?? "10");

  return NextResponse.json(
    snakelizeKeys(
      getMockTradeHistory(stockId, {
        offset: Number.isFinite(offset) ? offset : 0,
        limit: Number.isFinite(limit) ? limit : 10,
      }),
    ),
  );
}
