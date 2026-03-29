import { NextRequest, NextResponse } from "next/server";
import {
  ensureMockPortfolioAuthorized,
  proxyPortfolioApiRequest,
  shouldUseMockPortfolioApi,
} from "@/app/api/portfolio/utils";
import { getMockPortfolioChairmanResponse } from "@/app/portfolio/utils/mockPortfolioData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!shouldUseMockPortfolioApi()) {
    return proxyPortfolioApiRequest({
      request,
      path: "/api/portfolio/chairman",
      method: "GET",
    });
  }

  const unauthorizedResponse = ensureMockPortfolioAuthorized(request);
  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const tab = request.nextUrl.searchParams.get("tab");
  const offset = Number.parseInt(request.nextUrl.searchParams.get("offset") ?? "0", 10);
  const limit = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "6", 10);

  return NextResponse.json(
    snakelizeKeys({
      success: true,
      data: getMockPortfolioChairmanResponse(
        tab === "TODAY_TRADES" || tab === "MONTHLY_RETURNS" ? tab : "HOLDINGS",
        Number.isFinite(offset) ? offset : 0,
        Number.isFinite(limit) ? limit : 6,
      ),
      error: null,
    }),
  );
}
