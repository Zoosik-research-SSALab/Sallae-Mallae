import { NextRequest, NextResponse } from "next/server";
import { getMockNewsResponse, NEWS_PAGE_SIZE } from "@/app/news/utils/mockNewsData";
import { parseNewsNumberParam } from "@/app/news/utils/newsQueryUtils";
import { snakelizeKeys } from "@/shared/utils/case";
import type { NewsQueryParams } from "@/app/news/types/news";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const params: NewsQueryParams = {
    offset: parseNewsNumberParam(searchParams.get("offset"), 0),
    limit: parseNewsNumberParam(searchParams.get("limit"), NEWS_PAGE_SIZE, 1),
    keyword: searchParams.get("keyword")?.trim() ?? "",
  };

  return NextResponse.json(snakelizeKeys(getMockNewsResponse(params)));
}
