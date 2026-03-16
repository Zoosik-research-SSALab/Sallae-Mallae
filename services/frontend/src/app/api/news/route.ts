import { NextRequest, NextResponse } from "next/server";
import { getMockNewsResponse, NEWS_PAGE_SIZE } from "@/app/news/utils/mockNewsData";
import { snakelizeKeys } from "@/shared/utils/case";
import type { NewsQueryParams } from "@/app/news/types/news";

export const dynamic = "force-dynamic";

function parseNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const params: NewsQueryParams = {
    offset: parseNumber(searchParams.get("offset"), 0),
    limit: Math.max(1, parseNumber(searchParams.get("limit"), NEWS_PAGE_SIZE)),
    keyword: searchParams.get("keyword")?.trim() ?? "",
  };

  return NextResponse.json(snakelizeKeys(getMockNewsResponse(params)));
}
