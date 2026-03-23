import { type NextRequest, NextResponse } from "next/server";
import { getMockReportResponse } from "@/app/portfolio/[ticker]/utils/mockApiData";
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
  request: NextRequest,
  { params }: { params: Promise<{ stockId: string }> },
) {
  const { stockId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const offset = Number(searchParams.get("offset") ?? 0);
  const limit = Number(searchParams.get("limit") ?? 6);

  if (shouldUseMock()) {
    return NextResponse.json(
      snakelizeKeys(getMockReportResponse(stockId, offset, limit)),
    );
  }

  const queryString = request.nextUrl.search;
  const upstreamUrl = `${getApiBaseUrl()}/api/report/${stockId}${queryString}`;

  const headers: HeadersInit = {};
  const authorization = request.headers.get("authorization");
  if (authorization) {
    headers["Authorization"] = authorization;
  }

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
}
