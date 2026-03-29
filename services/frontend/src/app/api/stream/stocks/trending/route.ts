import { NextRequest, NextResponse } from "next/server";
import { getTopStocksMock } from "@/shared/lib/mockMainData";
import { createSseResponse } from "@/shared/lib/sseResponse";
import { snakelizeKeys } from "@/shared/utils/case";
import {
  createSearchProxyHeaders,
  getSearchApiBaseUrl,
  shouldUseMockSearchApi,
} from "../../../search/utils";

export const dynamic = "force-dynamic";

function getMockTrendingStocksPayload() {
  return {
    stocks: getTopStocksMock()
      .stocks.slice(0, 5)
      .map((stock) => ({
        rank: stock.rank,
        stockId: stock.stockId,
        name: stock.name,
        price: stock.price,
        fluctuationRate: stock.fluctuationRate,
        iconUrl: null,
      })),
  };
}

export async function GET(request: NextRequest) {
  if (shouldUseMockSearchApi()) {
    return createSseResponse(() => snakelizeKeys(getMockTrendingStocksPayload()));
  }

  const headers = createSearchProxyHeaders(request, {
    includeAccept: false,
    includeAuthorization: true,
    includeCookie: true,
  });

  headers.set("Accept", "text/event-stream");

  const upstreamResponse = await fetch(`${getSearchApiBaseUrl()}/api/stream/stocks/trending`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: {
      Connection: upstreamResponse.headers.get("connection") ?? "keep-alive",
      "Cache-Control": upstreamResponse.headers.get("cache-control") ?? "no-cache, no-transform",
      "Content-Type": upstreamResponse.headers.get("content-type") ?? "text/event-stream",
    },
  });
}
