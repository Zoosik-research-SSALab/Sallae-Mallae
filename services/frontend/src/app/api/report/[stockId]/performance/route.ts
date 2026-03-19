import { NextResponse } from "next/server";
import { getMockPerformanceResponse } from "@/app/portfolio/[ticker]/utils/mockApiData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stockId: string }> },
) {
  const { stockId } = await params;

  return NextResponse.json(
    snakelizeKeys(getMockPerformanceResponse(stockId)),
  );
}
