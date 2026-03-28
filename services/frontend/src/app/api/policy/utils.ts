import { NextRequest, NextResponse } from "next/server";
import type { PolicyDetail, PolicyKind } from "@/shared/types/policy";

function isEnabled(rawValue: string | undefined) {
  const value = rawValue?.trim().toLowerCase();
  return value === "true" || value === "enabled";
}

function isDisabled(rawValue: string | undefined) {
  const value = rawValue?.trim().toLowerCase();
  return value === "false" || value === "disabled";
}

function getApiMockingMode() {
  const explicit = process.env.NEXT_PUBLIC_USE_API_MOCK;
  if (isEnabled(explicit)) {
    return "enabled";
  }

  if (isDisabled(explicit)) {
    return "disabled";
  }

  return isDisabled(process.env.NEXT_PUBLIC_API_MOCKING) ? "disabled" : "enabled";
}

function normalizeBaseUrl(value: string) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function joinApiUrl(baseUrl: string, path: string) {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (normalizedBaseUrl.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${normalizedBaseUrl}${normalizedPath.slice(4)}`;
  }

  return `${normalizedBaseUrl}${normalizedPath}`;
}

function getApiBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "https://j14d208.p.ssafy.io";
  return normalizeBaseUrl(configured);
}

export function shouldUseMockPolicyApi() {
  return getApiMockingMode() === "enabled";
}

const mockPolicyMap: Record<PolicyKind, PolicyDetail> = {
  terms: {
    id: 1,
    termType: "SERVICE",
    version: "1.0",
    title: "서비스 이용약관",
    content:
      "제1조 (목적)\n이 약관은 살래말래 위원회 서비스 이용과 관련한 기본 사항을 정합니다.\n\n제2조 (서비스 제공)\n회사는 회원에게 주식 정보, 리포트, 알림 서비스를 제공합니다.",
    isRequired: true,
    enforcedAt: "2025-01-01T00:00:00",
  },
  privacy: {
    id: 2,
    termType: "PRIVACY",
    version: "1.0",
    title: "개인정보 처리방침",
    content:
      "1. 개인정보의 처리 목적\n회사는 회원 식별, 서비스 운영, 문의 대응을 위해 필요한 범위의 개인정보를 처리합니다.\n\n2. 보유 및 이용 기간\n관련 법령 또는 회원 탈퇴 시까지 보관합니다.",
    isRequired: true,
    enforcedAt: "2025-01-01T00:00:00",
  },
  disclaimer: {
    id: 3,
    termType: "INVESTMENT_DISCLAIMER",
    version: "1.0",
    title: "투자 면책 고지",
    content:
      "본 서비스에서 제공하는 정보는 투자 판단의 참고 자료이며, 특정 투자 성과를 보장하지 않습니다.\n모든 투자 판단과 책임은 이용자 본인에게 있습니다.",
    isRequired: true,
    enforcedAt: "2025-01-01T00:00:00",
  },
};

export function createMockPolicyResponse(kind: PolicyKind) {
  return NextResponse.json({
    success: true,
    data: mockPolicyMap[kind],
    error: null,
  });
}

export async function proxyPolicyRequest(request: NextRequest, path: string) {
  const headers = new Headers();
  const accept = request.headers.get("accept");
  const targetUrl = joinApiUrl(getApiBaseUrl(), `${path}${request.nextUrl.search}`);

  if (accept) {
    headers.set("Accept", accept);
  }

  const upstreamResponse = await fetch(targetUrl, {
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
