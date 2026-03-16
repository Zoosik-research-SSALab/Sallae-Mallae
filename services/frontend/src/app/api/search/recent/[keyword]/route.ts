import { NextRequest, NextResponse } from "next/server";
import { deleteMockRecentSearch } from "@/shared/lib/mockSearchStore";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  return Boolean(request.headers.get("authorization"));
}

type RouteContext = {
  params: Promise<{
    keyword: string;
  }>;
};

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        message: "인증이 필요합니다.",
      },
      { status: 401 },
    );
  }

  const { keyword } = await context.params;

  return NextResponse.json(snakelizeKeys(deleteMockRecentSearch(decodeURIComponent(keyword))));
}
