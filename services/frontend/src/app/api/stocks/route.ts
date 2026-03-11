import { NextRequest, NextResponse } from "next/server";
import { getMockStocksResponse, isSupportedStockSector } from "@/app/stocks/utils/mockStocksData";
import type { StockMarketCapFilter, StockSignal, StocksApiSort, StocksQueryParams } from "@/app/stocks/types/stocks";
import { ALL_SECTOR, STOCK_PAGE_SIZE } from "@/app/stocks/utils/stocksFilters";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

const validSignals = new Set<StockSignal>(["BUY", "SELL", "HOLD"]);
const validMarketCaps = new Set<StockMarketCapFilter>(["ALL", "LARGE", "MID"]);
const validSorts = new Set<StocksApiSort>(["MARKET_CAP", "CHANGE"]);

function parseNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const signal = searchParams.get("signal");
  const marketCap = searchParams.get("market_cap");
  const sort = searchParams.get("sort");
  const sector = searchParams.get("sector")?.trim() ?? "";

  const params: StocksQueryParams = {
    signal: validSignals.has(signal as StockSignal) ? (signal as StockSignal) : "ALL",
    sector: sector && isSupportedStockSector(sector) ? sector : ALL_SECTOR,
    marketCap: validMarketCaps.has(marketCap as StockMarketCapFilter) ? (marketCap as StockMarketCapFilter) : "ALL",
    sort: validSorts.has(sort as StocksApiSort) ? (sort as StocksApiSort) : "CHANGE",
    keyword: searchParams.get("keyword")?.trim() ?? "",
    offset: parseNumber(searchParams.get("offset"), 0),
    limit: Math.max(1, parseNumber(searchParams.get("limit"), STOCK_PAGE_SIZE)),
  };

  return NextResponse.json(snakelizeKeys(getMockStocksResponse(params)));
}
