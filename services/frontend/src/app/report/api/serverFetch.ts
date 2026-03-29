import { camelizeKeys } from "@/shared/utils/case";
import type { StockBasicInfo } from "@/app/portfolio/[stockId]/api/getStockBasicInfo";

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

export async function serverGetDebateReports(
  stockId: string,
  accessToken?: string,
): Promise<unknown> {
  return serverApiFetch<unknown>(
    `/api/report/${encodeURIComponent(stockId)}?offset=0&limit=1`,
    accessToken,
  );
}

export async function serverGetInvestmentPerformance(
  stockId: string,
  accessToken?: string,
): Promise<unknown> {
  return serverApiFetch<unknown>(
    `/api/report/${encodeURIComponent(stockId)}/performance`,
    accessToken,
  );
}

export async function serverGetTradeHistory(
  stockId: string,
  accessToken?: string,
): Promise<unknown> {
  return serverApiFetch<unknown>(
    `/api/report/${encodeURIComponent(stockId)}/performance/trades`,
    accessToken,
  );
}

export async function serverGetStockBasicInfo(
  stockId: string,
  accessToken?: string,
): Promise<StockBasicInfo> {
  return serverApiFetch<StockBasicInfo>(
    `/api/stocks/${encodeURIComponent(stockId)}`,
    accessToken,
  );
}
