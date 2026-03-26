import { type NextRequest, NextResponse } from "next/server";
import { getApiBaseUrl } from "../utils";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stockId: string }> },
) {
  const { stockId } = await params;

  const queryString = request.nextUrl.search;
  const upstreamUrl = `${getApiBaseUrl()}/api/report/${encodeURIComponent(stockId)}${queryString}`;

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
            upstreamResponse.headers.get("content-type") ?? "application/json",
        },
      });
    }

    const raw = await upstreamResponse.json();
    const data = raw.data ?? raw;

    // Backend returns an array; frontend expects { reports: [...] }
    // Backend nests chairman as chairman.chairman; flatten it
    const items = Array.isArray(data) ? data : [data];
    const reports = items.map((r: Record<string, unknown>) => {
      const chairmanWrapper = r.chairman as Record<string, unknown> | undefined;
      // Backend: { chairman: { chairman: { signal, ... }, final_stances, created_at } }
      // Frontend expects: { chairman: { signal, ... }, final_stances, created_at }
      const innerChairman = chairmanWrapper?.chairman ?? chairmanWrapper;
      return {
        date: r.date,
        chairman: innerChairman,
        final_stances: chairmanWrapper?.final_stances ?? r.final_stances ?? [],
        created_at: chairmanWrapper?.created_at ?? r.created_at ?? null,
        debate: r.debate ?? { rounds: [] },
      };
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error(`[report/${stockId}] upstream fetch failed:`, error);
    return NextResponse.json(
      { message: "Failed to fetch from upstream" },
      { status: 502 },
    );
  }
}