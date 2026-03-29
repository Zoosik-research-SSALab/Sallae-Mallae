import { authApiFetch } from "@/shared/lib/authApiClient";
import type { SignalResponseEnvelope, SignalsQueryParams } from "../types/signals";

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
  return authApiFetch<SignalResponseEnvelope>(`/api/signals?${buildSignalsQueryString(params)}`, {
    cache: "no-store",
  }).then((payload) => {
    if (!payload.data) {
      throw new Error("매매신호 데이터를 불러오지 못했습니다.");
    }

    return payload.data;
  });
}
