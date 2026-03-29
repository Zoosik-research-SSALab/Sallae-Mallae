import { NextRequest, NextResponse } from "next/server";
import { getMockNewsTrendingResponse } from "@/app/news/utils/mockNewsData";
import { snakelizeKeys } from "@/shared/utils/case";

export const dynamic = "force-dynamic";

function isEnabled(rawValue: string | undefined) {
  const value = rawValue?.trim().toLowerCase();
  return value === "true" || value === "enabled";
}

function isDisabled(rawValue: string | undefined) {
  const value = rawValue?.trim().toLowerCase();
  return value === "false" || value === "disabled";
}

function shouldUseMockNewsApi() {
  const explicit = process.env.NEXT_PUBLIC_USE_API_MOCK;
  if (isEnabled(explicit)) {
    return true;
  }

  if (isDisabled(explicit)) {
    return false;
  }

  return !isDisabled(process.env.NEXT_PUBLIC_API_MOCKING);
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || process.env.AUTH_API_BASE_URL?.trim() || "https://j14d208.p.ssafy.io";
  return normalizeBaseUrl(configured);
}

export async function GET(request: NextRequest) {
  if (shouldUseMockNewsApi()) {
    return NextResponse.json(snakelizeKeys(getMockNewsTrendingResponse()));
  }

  const headers = new Headers();
  const accept = request.headers.get("accept");
  const cookie = request.headers.get("cookie");

  if (accept) {
    headers.set("Accept", accept);
  }

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  const upstreamResponse = await fetch(`${getApiBaseUrl()}/api/news/trending`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  const response = new NextResponse(upstreamResponse.body, {
    status: upstreamResponse.status,
  });

  const upstreamContentType = upstreamResponse.headers.get("content-type");
  if (upstreamContentType) {
    response.headers.set("content-type", upstreamContentType);
  }

  return response;
}
