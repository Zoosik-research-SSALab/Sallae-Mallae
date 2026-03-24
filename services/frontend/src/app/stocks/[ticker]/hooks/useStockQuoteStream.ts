"use client";

import { useEffect, useState } from "react";
import {
  fetchStockQuote,
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

  useEffect(() => {
    if (isInactive) {
      return;
    }

    let disposed = false;
    let fallbackPollingTimer: ReturnType<typeof setInterval> | null = null;
    let unsubscribe = () => {};

    const applySnapshot = (snapshot: StockQuoteSnapshot) => {
      if (disposed) {
        return;
      }

      setData(snapshot);
      setIsLoading(false);
      setError(null);
    };

    const loadInitial = async () => {
      try {
        setIsLoading(true);
        setError(null);
        applySnapshot(await fetchStockQuote(ticker));

        unsubscribe = subscribeStockQuoteStream(ticker, {
          onMessage(snapshot) {
            applySnapshot(snapshot);
          },
          onError() {
            if (disposed || fallbackPollingTimer) {
              return;
            }

            fallbackPollingTimer = setInterval(() => {
              void (async () => {
                try {
                  applySnapshot(await fetchStockQuote(ticker));
                } catch {
                  if (!disposed) {
                    setError("stream_error");
                    setIsLoading(false);
                  }
                }
              })();
            }, 60_000);
          },
        });
      } catch {
        if (!disposed) {
          setIsLoading(false);
          setError("stream_error");
        }
      }
    };

    void loadInitial();

    return () => {
      disposed = true;
      unsubscribe();
      if (fallbackPollingTimer) {
        clearInterval(fallbackPollingTimer);
      }
    };
  }, [isInactive, ticker]);

  if (isInactive) {
    return {
      data: initialData,
      isLoading: false,
      error: null,
    };
  }

  return {
    data,
    isLoading,
    error,
  };
}
