/**
 * Shared utilities for /api/report/* route handlers.
 */

import { shouldUseMockAuth } from "@/app/api/auth/mock";

export function getApiBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "https://j14d208.p.ssafy.io";
  return configured.endsWith("/") ? configured.slice(0, -1) : configured;
}

export function shouldUseMockReportApi() {
  return shouldUseMockAuth();
}
