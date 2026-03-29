import { NextRequest, NextResponse } from "next/server";
import {
  clearMockRecentSearches,
  getMockRecentSearches,
  saveMockRecentSearch,
} from "@/shared/lib/mockSearchStore";
import type { SaveRecentSearchRequest } from "@/shared/types/search";
import { camelizeKeys, snakelizeKeys } from "@/shared/utils/case";
import {
  createProxyResponse,
  createSearchProxyHeaders,
  getSearchApiBaseUrl,
  isAuthorizedSearchRequest,
  shouldUseMockSearchApi,
} from "../utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAuthorizedSearchRequest(request)) {
    return NextResponse.json(
      {
        message: "로그인이 필요합니다.",
      },
      { status: 401 },
    );
  }

  if (!shouldUseMockSearchApi()) {
    const upstreamResponse = await fetch(`${getSearchApiBaseUrl()}/api/search/recent`, {
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

  return NextResponse.json(snakelizeKeys(getMockRecentSearches()));
}

export async function POST(request: NextRequest) {
  if (!isAuthorizedSearchRequest(request)) {
    return NextResponse.json(
      {
        message: "로그인이 필요합니다.",
      },
      { status: 401 },
    );
  }

  if (!shouldUseMockSearchApi()) {
    const body = await request.text();
    const upstreamResponse = await fetch(`${getSearchApiBaseUrl()}/api/search/recent`, {
      method: "POST",
      headers: createSearchProxyHeaders(request, {
        includeAccept: true,
        includeAuthorization: true,
        includeCookie: true,
        includeContentType: true,
      }),
      body,
      cache: "no-store",
    });

    return createProxyResponse(upstreamResponse);
  }

  let body: SaveRecentSearchRequest = {
    keyword: "",
    stockId: null,
  };

  try {
    body = camelizeKeys<SaveRecentSearchRequest>((await request.json()) as unknown);
  } catch {
    body = {
      keyword: "",
      stockId: null,
    };
  }

  if (!body.keyword.trim()) {
    return NextResponse.json(
      {
        message: "keyword is required",
      },
      { status: 400 },
    );
  }

  return NextResponse.json(snakelizeKeys(saveMockRecentSearch(body)));
}

export async function DELETE(request: NextRequest) {
  if (!isAuthorizedSearchRequest(request)) {
    return NextResponse.json(
      {
        message: "로그인이 필요합니다.",
      },
      { status: 401 },
    );
  }

  if (!shouldUseMockSearchApi()) {
    const upstreamResponse = await fetch(`${getSearchApiBaseUrl()}/api/search/recent`, {
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

  return NextResponse.json(snakelizeKeys(clearMockRecentSearches()));
}
