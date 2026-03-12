import { NextResponse } from "next/server";
import { getMockPortfolioPage } from "@/app/portfolio/utils/mockPortfolioData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    snakelizeKeys({
      success: true,
      data: getMockPortfolioPage(),
      message: null,
    }),
  );
}
