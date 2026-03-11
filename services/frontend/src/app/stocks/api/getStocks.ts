import type { StocksQueryParams, StocksResponse } from "../types/stocks";
import { ALL_SECTOR } from "../utils/stocksFilters";
import { apiFetch } from "@/shared/lib/apiClient";

function buildStocksQueryString(params: StocksQueryParams) {
  const searchParams = new URLSearchParams({
    offset: String(params.offset),
    limit: String(params.limit),
  });

  if (params.signal !== "ALL") {
    searchParams.set("signal", params.signal);
  }

  if (params.sector && params.sector !== ALL_SECTOR) {
    searchParams.set("sector", params.sector);
  }

  if (params.marketCap !== "ALL") {
    searchParams.set("market_cap", params.marketCap);
  }

  if (params.sort) {
    searchParams.set("sort", params.sort);
  }

  if (params.keyword.trim()) {
    searchParams.set("keyword", params.keyword.trim());
  }

  return searchParams.toString();
}

export function getStocks(params: StocksQueryParams) {
  return apiFetch<StocksResponse>(`/api/stocks?${buildStocksQueryString(params)}`, {
    cache: "no-store",
  });
}
