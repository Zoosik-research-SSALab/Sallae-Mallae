import { NextRequest, NextResponse } from "next/server";
import {
  ensureMockPortfolioAuthorized,
  proxyPortfolioApiRequest,
  shouldUseMockPortfolioApi,
} from "@/app/api/portfolio/utils";
import { getMockPortfolioHallOfFameResponse } from "@/app/portfolio/utils/mockPortfolioData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!shouldUseMockPortfolioApi()) {
    return proxyPortfolioApiRequest({
      request,
      path: "/api/portfolio/chairman/hall-of-fame",
      method: "GET",
    });
  }

  const unauthorizedResponse = ensureMockPortfolioAuthorized(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  return NextResponse.json(
    snakelizeKeys({
      success: true,
      data: getMockPortfolioHallOfFameResponse(),
      error: null,
    }),
  );
}
