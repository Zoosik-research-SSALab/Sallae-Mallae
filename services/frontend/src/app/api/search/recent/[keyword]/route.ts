import { NextRequest, NextResponse } from "next/server";
import { deleteMockRecentSearch } from "@/shared/lib/mockSearchStore";
import { snakelizeKeys } from "@/shared/utils/case";
import {
  createProxyResponse,
  createSearchProxyHeaders,
  getSearchApiBaseUrl,
  isAuthorizedSearchRequest,
  shouldUseMockSearchApi,
} from "../../utils";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    keyword: string;
  }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAuthorizedSearchRequest(request)) {
    return NextResponse.json(
      {
        message: "로그인이 필요합니다.",
      },
      { status: 401 },
    );
  }

  const { keyword } = await context.params;
  const decodedKeyword = decodeURIComponent(keyword);

  if (!shouldUseMockSearchApi()) {
    const upstreamResponse = await fetch(`${getSearchApiBaseUrl()}/api/search/recent/${encodeURIComponent(decodedKeyword)}`, {
      method: "DELETE",
      headers: createSearchProxyHeaders(request, {
        includeAccept: true,
        includeAuthorization: true,
        includeCookie: true,
      }),
      cache: "no-store",
    });

    return createProxyResponse(upstreamResponse);
  }

  return NextResponse.json(snakelizeKeys(deleteMockRecentSearch(decodedKeyword)));
}
