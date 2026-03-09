"use client";

import { subscribeTopStocks } from "../api/main";
import { useSseState } from "./useSseState";
import type { TopStocksPayload } from "../types/main";

const initialData: TopStocksPayload = { stocks: [] };

export function useTopStocks() {
  return useSseState(subscribeTopStocks, initialData);
}
