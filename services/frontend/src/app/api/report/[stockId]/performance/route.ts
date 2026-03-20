import { NextResponse } from "next/server";
import { getMockPerformanceResponse } from "@/app/portfolio/[ticker]/utils/mockApiData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

function shouldUseMock() {
  const explicit = process.env.NEXT_PUBLIC_USE_API_MOCK?.trim().toLowerCase();
  if (explicit === "true") return true;
  if (explicit === "false") return false;

  const raw = process.env.NEXT_PUBLIC_API_MOCKING?.trim().toLowerCase();
  return raw !== "false" && raw !== "disabled";
}

function getApiBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "https://j14d208.p.ssafy.io";
  return configured.endsWith("/") ? configured.slice(0, -1) : configured;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ stockId: string }> },
) {
  const { stockId } = await params;

  if (shouldUseMock()) {
    return NextResponse.json(
      snakelizeKeys(getMockPerformanceResponse(stockId)),
    );
  }

  const upstreamUrl = `${getApiBaseUrl()}/api/report/${stockId}/performance`;

  const upstreamResponse = await fetch(upstreamUrl, {
    method: "GET",
    cache: "no-store",
  });

  return new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers: {
      "content-type": upstreamResponse.headers.get("content-type") ?? "application/json",
    },
  });
}
