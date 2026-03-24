import { NextResponse } from "next/server";
import { getMockDebateReportsResponseByQuery, hasMockDebateReports } from "@/app/report/utils/mockDebateReportData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{
    stockId: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  const { stockId } = await params;
  const { searchParams } = new URL(request.url);
  const offset = Number(searchParams.get("offset") ?? "0");
  const limit = Number(searchParams.get("limit") ?? "6");

  if (!hasMockDebateReports(stockId)) {
    return NextResponse.json(
      {
        message: "report not found",
      },
      { status: 404 },
    );
  }

  const payload = getMockDebateReportsResponseByQuery(stockId, {
    offset: Number.isFinite(offset) ? offset : 0,
    limit: Number.isFinite(limit) ? limit : 6,
  });

  return NextResponse.json(snakelizeKeys(payload));
}
