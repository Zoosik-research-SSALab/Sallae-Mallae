import { camelizeKeys } from "@/shared/utils/case";
import type {
  ReportResponse,
  PerformanceResponse,
  TradesResponse,
} from "../types/api";
import {
  transformReportResponse,
  transformPerformanceResponse,
  transformTradesResponse,
} from "../utils/transformApiResponse";

function getBackendBaseUrl() {
  const configured =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
    "https://j14d208.p.ssafy.io";
  return configured.endsWith("/") ? configured.slice(0, -1) : configured;
}

async function serverApiFetch<T>(
  path: string,
  accessToken?: string,
): Promise<T> {
  const url = `${getBackendBaseUrl()}${path}`;
  const headers: HeadersInit = {};
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Server fetch failed: ${response.status}`);
  }

  const raw = await response.json();
  const data = raw.data ?? raw;
  return camelizeKeys<T>(data);
}

export async function serverGetStockReport(
  stockId: string,
  accessToken?: string,
): Promise<ReportResponse> {
  const raw = await serverApiFetch<unknown>(
    `/api/report/${stockId}`,
    accessToken,
  );
  return transformReportResponse(raw);
}

export async function serverGetStockPerformance(
  stockId: string,
  accessToken?: string,
): Promise<PerformanceResponse> {
  const raw = await serverApiFetch<unknown>(
    `/api/report/${stockId}/performance`,
    accessToken,
  );
  return transformPerformanceResponse(raw);
}

export async function serverGetStockTrades(
  stockId: string,
  accessToken?: string,
): Promise<TradesResponse> {
  const raw = await serverApiFetch<unknown>(
    `/api/report/${stockId}/performance/trades`,
    accessToken,
  );
  return transformTradesResponse(raw);
}
