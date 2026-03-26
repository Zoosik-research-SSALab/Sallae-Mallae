import { NextRequest, NextResponse } from "next/server";
import { getMockSearchAutocomplete } from "@/shared/lib/mockSearchStore";
import { snakelizeKeys } from "@/shared/utils/case";
import {
  createProxyResponse,
  createSearchProxyHeaders,
  getSearchApiBaseUrl,
  shouldUseMockSearchApi,
} from "./utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";

  if (!shouldUseMockSearchApi()) {
    const upstreamResponse = await fetch(`${getSearchApiBaseUrl()}/api/search${request.nextUrl.search}`, {
      method: "GET",
      headers: createSearchProxyHeaders(request, {
        includeAccept: true,
        includeAuthorization: true,
        includeCookie: true,
      }),
      cache: "no-store",
    });

    return createProxyResponse(upstreamResponse);
  }

  return NextResponse.json(
    snakelizeKeys({
      success: true,
      data: getMockSearchAutocomplete(query),
      error: null,
    }),
  );
}
