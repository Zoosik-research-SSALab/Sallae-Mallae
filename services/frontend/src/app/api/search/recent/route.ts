import { NextRequest, NextResponse } from "next/server";
import {
  clearMockRecentSearches,
  getMockRecentSearches,
  saveMockRecentSearch,
} from "@/shared/lib/mockSearchStore";
import type { SaveRecentSearchRequest } from "@/shared/types/search";
import { camelizeKeys, snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  return Boolean(request.headers.get("authorization"));
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        message: "인증이 필요합니다.",
      },
      { status: 401 },
    );
  }

  return NextResponse.json(snakelizeKeys(getMockRecentSearches()));
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        message: "인증이 필요합니다.",
      },
      { status: 401 },
    );
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
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        message: "인증이 필요합니다.",
      },
      { status: 401 },
    );
  }

  return NextResponse.json(snakelizeKeys(clearMockRecentSearches()));
}
