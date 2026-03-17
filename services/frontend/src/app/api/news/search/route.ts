import { NextRequest, NextResponse } from "next/server";
import { getMockNewsSearchResponse } from "@/app/news/utils/mockNewsData";
import { parseNewsNumberParam } from "@/app/news/utils/newsQueryUtils";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const keyword = searchParams.get("keyword")?.trim() ?? "";
  const limit = parseNewsNumberParam(searchParams.get("limit"), 8, 1);

  return NextResponse.json(snakelizeKeys(getMockNewsSearchResponse(keyword, limit)));
}
