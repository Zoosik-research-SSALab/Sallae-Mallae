import { type NextRequest, NextResponse } from "next/server";
import { getMockTradesResponse } from "@/app/portfolio/[ticker]/utils/mockApiData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

function shouldUseMock() {
  const explicit = process.env.NEXT_PUBLIC_USE_API_MOCK?.trim().toLowerCase();
  if (explicit === "true") return true;
  if (explicit === "false") return false;

  const raw = process.env.NEXT_PUBLIC_API_MOCKING?.trim().toLowerCase();
  return raw !== "false" && raw !== "disabled";
}

function getApiBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "https://j14d208.p.ssafy.io";
  return configured.endsWith("/") ? configured.slice(0, -1) : configured;
}

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
      snakelizeKeys(getMockTradesResponse(stockId, offset, limit)),
    );
  }

  const queryString = request.nextUrl.search;
  const upstreamUrl = `${getApiBaseUrl()}/api/report/${stockId}/performance/trades${queryString}`;

  const headers: HeadersInit = {};
  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers["Authorization"] = authorization;
  }

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

  // Backend: { trades: [{ trade_type, trade_time, trade_price_rate, return_rate }] }
  // Frontend expects: { trades: [{ status, buy_date, sell_date?, buy_price, sell_price?, holding_days, return_rate }] }
  const rawTrades = Array.isArray(data?.trades) ? data.trades : [];

  // Pair BUY/SELL events into trade records
  const paired: Record<string, unknown>[] = [];
  let pendingBuy: Record<string, unknown> | null = null;

  for (const t of rawTrades) {
    if (t.trade_type === "BUY") {
      // If there's a previous unmatched BUY, push it as holding
      if (pendingBuy) {
        const buyTime = pendingBuy.trade_time as string;
        const now = new Date();
        const buyDate = new Date(buyTime);
        const holdingDays = Math.max(1, Math.ceil((now.getTime() - buyDate.getTime()) / 86400000));
        paired.push({
          status: "holding",
          buy_date: buyTime,
          buy_price: pendingBuy.trade_price_rate,
          holding_days: holdingDays,
          return_rate: pendingBuy.return_rate ?? 0,
        });
      }
      pendingBuy = t;
    } else if (t.trade_type === "SELL" && pendingBuy) {
      const buyTime = pendingBuy.trade_time as string;
      const sellTime = t.trade_time as string;
      const buyDate = new Date(buyTime);
      const sellDate = new Date(sellTime);
      const holdingDays = Math.max(1, Math.ceil((sellDate.getTime() - buyDate.getTime()) / 86400000));
      paired.push({
        status: "sold",
        buy_date: buyTime,
        sell_date: sellTime,
        buy_price: pendingBuy.trade_price_rate,
        sell_price: t.trade_price_rate,
        holding_days: holdingDays,
        return_rate: t.return_rate ?? pendingBuy.return_rate ?? 0,
      });
      pendingBuy = null;
    }
  }

  // Push remaining unmatched BUY as holding
  if (pendingBuy) {
    const buyTime = pendingBuy.trade_time as string;
    const now = new Date();
    const buyDate = new Date(buyTime);
    const holdingDays = Math.max(1, Math.ceil((now.getTime() - buyDate.getTime()) / 86400000));
    paired.push({
      status: "holding",
      buy_date: buyTime,
      buy_price: pendingBuy.trade_price_rate,
      holding_days: holdingDays,
      return_rate: pendingBuy.return_rate ?? 0,
    });
  }

  return NextResponse.json({ trades: paired });
}
