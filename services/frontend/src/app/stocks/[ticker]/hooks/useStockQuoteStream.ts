"use client";

import { useEffect, useState } from "react";
import {
  subscribeStockQuoteStream,
  type StockQuoteSnapshot,
} from "../api/connectStockPriceStream";

type UseStockQuoteStreamOptions = {
  enabled?: boolean;
};

const initialData: StockQuoteSnapshot = {
  currentPrice: null,
  changeRate: null,
};

export function useStockQuoteStream(ticker: string, options: UseStockQuoteStreamOptions = {}) {
  const enabled = options.enabled ?? true;
  const isInactive = !enabled || !ticker;
  const [data, setData] = useState<StockQuoteSnapshot>(initialData);
  const [isLoading, setIsLoading] = useState(Boolean(enabled));
  const [error, setError] = useState<string | null>(null);
  const [resolvedTicker, setResolvedTicker] = useState<string | null>(null);

  useEffect(() => {
    if (isInactive) {
      return;
    }

    let disposed = false;
    let unsubscribe = () => {};

    const applySnapshot = (snapshot: StockQuoteSnapshot) => {
      if (disposed) {
        return;
      }

      setData(snapshot);
      setResolvedTicker(ticker);
      setIsLoading(false);
      setError(null);
    };

    unsubscribe = subscribeStockQuoteStream(ticker, {
      onMessage(snapshot) {
        applySnapshot(snapshot);
      },
      onError() {
        if (!disposed) {
          setResolvedTicker(ticker);
          setError("stream_error");
          setIsLoading(false);
        }
      },
    });

    return () => {
      disposed = true;
      unsubscribe();
    };
  }, [isInactive, ticker]);

  if (isInactive) {
    return {
      data: initialData,
      isLoading: false,
      error: null,
    };
  }

  const isResolvedForCurrentTicker = resolvedTicker === ticker;

  return {
    data: isResolvedForCurrentTicker ? data : initialData,
    isLoading: isResolvedForCurrentTicker ? isLoading : true,
    error: isResolvedForCurrentTicker ? error : null,
  };
}
