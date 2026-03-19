import { type NextRequest, NextResponse } from "next/server";
import { getMockTradesResponse } from "@/app/portfolio/[ticker]/utils/mockApiData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stockId: string }> },
) {
  const { stockId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const offset = Number(searchParams.get("offset") ?? 0);
  const limit = Number(searchParams.get("limit") ?? 10);

  return NextResponse.json(
    snakelizeKeys(getMockTradesResponse(stockId, offset, limit)),
  );
}
