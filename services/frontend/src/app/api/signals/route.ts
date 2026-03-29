import { NextRequest, NextResponse } from "next/server";
import { isMockAuthorized } from "@/app/api/auth/mock";
import type { SignalMarketCapSize, SignalQueryFilter, SignalQuerySort, SignalSectorName, SignalsQueryParams } from "@/app/signals/types/signals";
import { getSignalsMock } from "@/app/signals/utils/mockSignalsData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

const validFilters = new Set<SignalQueryFilter>(["ALL", "BUY", "SELL"]);
const validSorts = new Set<SignalQuerySort>(["LATEST", "UP", "DOWN"]);
const validMarketCaps = new Set<SignalsQueryParams["marketCap"]>(["ALL", "LARGE", "MID"]);

function parseNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function parseCategories(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((category) => decodeURIComponent(category).trim())
    .filter(Boolean) as SignalSectorName[];
}

export async function GET(request: NextRequest) {
  if (!isMockAuthorized(request)) {
    return NextResponse.json(
      {
        code: "AUTH_001",
        message: "로그인이 필요합니다.",
      },
      { status: 401 },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const filter = searchParams.get("filter");
  const sort = searchParams.get("sort");
  const marketCap = searchParams.get("market_cap");

  const params: SignalsQueryParams = {
    filter: validFilters.has(filter as SignalQueryFilter) ? (filter as SignalQueryFilter) : "ALL",
    sort: validSorts.has(sort as SignalQuerySort) ? (sort as SignalQuerySort) : "LATEST",
    offset: parseNumber(searchParams.get("offset"), 0),
    limit: Math.max(1, parseNumber(searchParams.get("limit"), 6)),
    categories: parseCategories(searchParams.get("categories")),
    marketCap: validMarketCaps.has(marketCap as SignalsQueryParams["marketCap"])
      ? (marketCap as SignalMarketCapSize | "ALL")
      : "ALL",
    keyword: searchParams.get("keyword")?.trim() ?? "",
  };

  return NextResponse.json(snakelizeKeys(getSignalsMock(params)));
}
