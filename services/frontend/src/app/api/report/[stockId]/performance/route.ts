import { NextResponse } from "next/server";
import { getApiBaseUrl } from "../../utils";

export const dynamic = "force-dynamic";

function getObjectKeys(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [];
  }

  return Object.keys(value as Record<string, unknown>);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ stockId: string }> },
) {
  const { stockId } = await params;

  const upstreamUrl = `${getApiBaseUrl()}/api/report/${encodeURIComponent(stockId)}/performance`;

  const headers: HeadersInit = {};
  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers["Authorization"] = authorization;
  }

  try {
    console.info(`[report/${stockId}/performance] proxy request`, {
      upstreamUrl,
      hasAuthorization: Boolean(authorization),
    });

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
            upstreamResponse.headers.get("content-type") ?? "application/json",
        },
      });
    }

    const body = (await upstreamResponse.json()) as { data?: unknown };
    const unwrapped = body.data ?? body;

    console.info(`[report/${stockId}/performance] proxy response`, {
      bodyKeys: getObjectKeys(body),
      unwrappedKeys: getObjectKeys(unwrapped),
      chartLength:
        unwrapped &&
        typeof unwrapped === "object" &&
        !Array.isArray(unwrapped) &&
        Array.isArray((unwrapped as { chart?: unknown }).chart)
          ? (unwrapped as { chart: unknown[] }).chart.length
          : null,
    });

    return NextResponse.json(unwrapped);
  } catch (error) {
    console.error(
      `[report/${stockId}/performance] upstream fetch failed:`,
      error,
    );
    return NextResponse.json(
      { message: "Failed to fetch from upstream" },
      { status: 502 },
    );
  }
}
