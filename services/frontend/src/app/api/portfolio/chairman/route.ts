import { NextRequest, NextResponse } from "next/server";
import { isMockAuthorized } from "@/app/api/auth/mock";
import { getMockPortfolioChairmanResponse } from "@/app/portfolio/utils/mockPortfolioData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isMockAuthorized(request)) {
    return NextResponse.json(
      {
        code: "AUTH_001",
        message: "로그인이 필요합니다.",
      },
      { status: 401 },
    );
  }

  return NextResponse.json(
    snakelizeKeys({
      success: true,
      data: getMockPortfolioChairmanResponse(),
      error: null,
    }),
  );
}
