import { type NextRequest, NextResponse } from "next/server";
import { getMockTradesResponse } from "@/app/portfolio/[ticker]/utils/mockApiData";
import { snakelizeKeys } from "@/shared/utils/case";
import { shouldUseMock, getApiBaseUrl } from "../../../utils";
import { pairTrades } from "./pairTrades";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stockId: string }> },
) {
  const { stockId } = await params;

  if (shouldUseMock()) {
    const searchParams = request.nextUrl.searchParams;
    const offset = Number(searchParams.get("offset") ?? 0);
    const limit = Number(searchParams.get("limit") ?? 10);

    return NextResponse.json(
      snakelizeKeys(getMockTradesResponse(offset, limit)),
    );
  }

  const queryString = request.nextUrl.search;
  const upstreamUrl = `${getApiBaseUrl()}/api/report/${encodeURIComponent(stockId)}/performance/trades${queryString}`;

  const headers: HeadersInit = {};
  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers["Authorization"] = authorization;
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!upstreamResponse.ok) {
      return new NextResponse(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: {
          "content-type": upstreamResponse.headers.get("content-type") ?? "application/json",
        },
      });
    }

    const raw = await upstreamResponse.json();
    const data = raw.data ?? raw;
    const rawTrades = Array.isArray(data?.trades) ? data.trades : [];

    return NextResponse.json({ trades: pairTrades(rawTrades, stockId) });
  } catch (error) {
    console.error(`[report/${stockId}/performance/trades] upstream fetch failed:`, error);
    return NextResponse.json(
      { message: "Failed to fetch from upstream" },
      { status: 502 },
    );
  }
}
