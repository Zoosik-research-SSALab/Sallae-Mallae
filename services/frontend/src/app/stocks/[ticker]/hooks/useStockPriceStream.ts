"use client";

import { useCallback } from "react";
import { connectStockPriceStream } from "../api/connectStockPriceStream";
import type { StockChartPeriod, StockPricesPayload } from "@/app/stocks/types/stockDetail";
import { useSseState } from "@/shared/hooks/useSseState";

const initialPayload: StockPricesPayload = {
  prices: [],
};

export function useStockPriceStream(ticker: string, period: StockChartPeriod) {
  const subscriptionKey = `${ticker}:${period}`;
  const subscribe = useCallback(
    (handlers: { onMessage: (payload: StockPricesPayload) => void; onError?: (error: Event) => void }) =>
      connectStockPriceStream(ticker, period, handlers),
    [period, ticker],
  );

  return useSseState(subscribe, initialPayload, {
    resetOnSubscribeChange: true,
    subscriptionKey,
  });
}
