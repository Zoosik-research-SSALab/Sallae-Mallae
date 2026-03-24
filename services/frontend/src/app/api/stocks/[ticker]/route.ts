import { NextResponse } from "next/server";
import { getApiBaseUrl } from "../../report/utils";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    ticker: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { ticker } = await context.params;

  if (!ticker) {
    return NextResponse.json(
      { message: "ticker is required" },
      { status: 400 },
    );
  }

  const upstreamUrl = `${getApiBaseUrl()}/api/stocks/${encodeURIComponent(ticker)}`;

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
          "content-type":
            upstreamResponse.headers.get("content-type") ??
            "application/json",
        },
      });
    }

    const raw = await upstreamResponse.json();
    const data = raw.data ?? raw;
    return NextResponse.json(data);
  } catch (error) {
    console.error(`[stocks/${ticker}] upstream fetch failed:`, error);
    return NextResponse.json(
      { message: "Failed to fetch from upstream" },
      { status: 502 },
    );
  }
}
