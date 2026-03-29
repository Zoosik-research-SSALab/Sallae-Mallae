"use client";

import { subscribeMarketIndex } from "../api/main";
import { useSseState } from "@/shared/hooks/useSseState";
import type { MarketIndexPayload } from "../types/main";

const initialData: MarketIndexPayload = {
  kospi: { value: 0, changeRate: 0 },
  kosdaq: { value: 0, changeRate: 0 },
  usdKrw: { value: 0, changeRate: 0 },
  baseTime: "",
};

export function useMarketIndex() {
  return useSseState(subscribeMarketIndex, initialData);
}
