import type { StocksQueryParams, StocksResponse } from "../types/stocks";
import { ALL_SECTOR } from "../utils/stocksFilters";
import { apiFetch } from "@/shared/lib/apiClient";

type StocksApiEnvelope = {
  success: boolean;
  data: StocksResponse | null;
  error: {
    code?: string;
    message?: string;
  } | null;
};

function buildStocksQueryString(params: StocksQueryParams) {
  const searchParams = new URLSearchParams({
    offset: String(params.offset),
    limit: String(params.limit),
  });

  const normalizedSectors = params.sectors.filter(Boolean);
  const shouldAppendSectors = normalizedSectors.length > 0 && !normalizedSectors.includes(ALL_SECTOR);

  if (shouldAppendSectors) {
    normalizedSectors.forEach((sector) => {
      searchParams.append("sector", sector);
    });
  }

  if (params.sort) {
    searchParams.set("sort", params.sort);
  }

  return searchParams.toString();
}

function isStocksApiEnvelope(payload: unknown): payload is StocksApiEnvelope {
  return typeof payload === "object" && payload !== null && "success" in payload && "data" in payload;
}

function unwrapStocksResponse(payload: StocksResponse | StocksApiEnvelope) {
  if (isStocksApiEnvelope(payload)) {
    if (payload.data !== null) {
      return payload.data;
    }

    throw new Error(payload.error?.message ?? "Stocks response is invalid.");
  }

  return payload;
}

function normalizeStocksResponse(payload: StocksResponse) {
  return {
    stocks: payload.stocks.map((stock) => ({
      ...stock,
      dividendYield: stock.dividendYield ?? null,
    })),
  } satisfies StocksResponse;
}

export async function getStocks(params: StocksQueryParams) {
  const payload = await apiFetch<StocksResponse | StocksApiEnvelope>(`/api/stocks?${buildStocksQueryString(params)}`, {
    cache: "no-store",
  });

  return normalizeStocksResponse(unwrapStocksResponse(payload));
}
