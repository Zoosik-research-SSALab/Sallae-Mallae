import { NextRequest, NextResponse } from "next/server";
import { getTopStocksMock } from "@/shared/lib/mockMainData";
import { createSseResponse } from "@/shared/lib/sseResponse";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

function isEnabled(rawValue: string | undefined) {
  const value = rawValue?.trim().toLowerCase();
  return value === "true" || value === "enabled";
}

function isDisabled(rawValue: string | undefined) {
  const value = rawValue?.trim().toLowerCase();
  return value === "false" || value === "disabled";
}

function shouldUseMockTrendingStocks() {
  const explicit = process.env.NEXT_PUBLIC_USE_API_MOCK;
  if (isEnabled(explicit)) {
    return true;
  }

  if (isDisabled(explicit)) {
    return false;
  }

  return !isDisabled(process.env.NEXT_PUBLIC_API_MOCKING);
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || process.env.AUTH_API_BASE_URL?.trim() || "https://j14d208.p.ssafy.io";
  return normalizeBaseUrl(configured);
}

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
  if (shouldUseMockTrendingStocks()) {
    return createSseResponse(() => snakelizeKeys(getMockTrendingStocksPayload()));
  }

  const headers = new Headers();
  const cookie = request.headers.get("cookie");

  headers.set("Accept", "text/event-stream");

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const upstreamResponse = await fetch(`${getApiBaseUrl()}/api/stream/stocks/trending`, {
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
