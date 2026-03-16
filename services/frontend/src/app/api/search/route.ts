import { NextRequest, NextResponse } from "next/server";
import { getMockSearchAutocomplete } from "@/shared/lib/mockSearchStore";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  return NextResponse.json(snakelizeKeys(getMockSearchAutocomplete(query)));
}
