import { NextRequest, NextResponse } from "next/server";
import { getMockStocksResponse, isSupportedStockSector } from "@/app/stocks/utils/mockStocksData";
import type { StocksApiSort, StocksQueryParams } from "@/app/stocks/types/stocks";
import { ALL_SECTOR, STOCK_PAGE_SIZE } from "@/app/stocks/utils/stocksFilters";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

const validSorts = new Set<StocksApiSort>(["TRADING_VALUE", "TRADING_VOLUME", "DIVIDEND_YIELD", "CHANGE"]);

function parseNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sort = searchParams.get("sort");
  const sector = searchParams.get("sector")?.trim() ?? "";

  const params: StocksQueryParams = {
    sector: sector && isSupportedStockSector(sector) ? sector : ALL_SECTOR,
    sort: validSorts.has(sort as StocksApiSort) ? (sort as StocksApiSort) : "TRADING_VALUE",
    offset: parseNumber(searchParams.get("offset"), 0),
    limit: Math.max(1, parseNumber(searchParams.get("limit"), STOCK_PAGE_SIZE)),
  };

  return NextResponse.json(snakelizeKeys(getMockStocksResponse(params)));
}
