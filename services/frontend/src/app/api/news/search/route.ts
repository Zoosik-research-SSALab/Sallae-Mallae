import { NextRequest, NextResponse } from "next/server";
import { getMockNewsSearchResponse } from "@/app/news/utils/mockNewsData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

function parseNumber(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const keyword = searchParams.get("keyword")?.trim() ?? "";
  const limit = parseNumber(searchParams.get("limit"), 8);

  return NextResponse.json(snakelizeKeys(getMockNewsSearchResponse(keyword, limit)));
}
