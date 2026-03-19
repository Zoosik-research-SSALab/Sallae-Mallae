import { authApiFetch } from "@/shared/lib/authApiClient";
import type { SignalResponse, SignalsQueryParams } from "../types/signals";

function buildSignalsQueryString(params: SignalsQueryParams) {
  const searchParams = new URLSearchParams({
    filter: params.filter,
    sort: params.sort,
    offset: String(params.offset),
    limit: String(params.limit),
  });

  if (params.categories.length > 0) {
    searchParams.set("categories", params.categories.join(","));
  }

  if (params.marketCap !== "ALL") {
    searchParams.set("market_cap", params.marketCap);
  }

  if (params.keyword.trim()) {
    searchParams.set("keyword", params.keyword.trim());
  }

  return searchParams.toString();
}

export function getSignals(params: SignalsQueryParams) {
  return authApiFetch<SignalResponse>(`/api/signals?${buildSignalsQueryString(params)}`, {
    cache: "no-store",
  });
}
