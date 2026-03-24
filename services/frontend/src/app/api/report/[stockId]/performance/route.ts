import { NextResponse } from "next/server";
import { getMockPerformanceResponse } from "@/app/portfolio/[ticker]/utils/mockApiData";
import { snakelizeKeys } from "@/shared/utils/case";
import { shouldUseMock, getApiBaseUrl } from "../../utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ stockId: string }> },
) {
  const { stockId } = await params;

  if (shouldUseMock()) {
    return NextResponse.json(
      snakelizeKeys(getMockPerformanceResponse()),
    );
  }

  const upstreamUrl = `${getApiBaseUrl()}/api/report/${encodeURIComponent(stockId)}/performance`;

  const headers: HeadersInit = {};
  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers["Authorization"] = authorization;
  }

  try {
    const upstreamResponse = await fetch(upstreamUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!upstreamResponse.ok) {
      return new NextResponse(upstreamResponse.body, {
        status: upstreamResponse.status,
        headers: {
          "content-type": upstreamResponse.headers.get("content-type") ?? "application/json",
        },
      });
    }

    const body = (await upstreamResponse.json()) as { data?: unknown };
    return NextResponse.json(body.data ?? body);
  } catch (error) {
    console.error(`[report/${stockId}/performance] upstream fetch failed:`, error);
    return NextResponse.json(
      { message: "Failed to fetch from upstream" },
      { status: 502 },
    );
  }
}
