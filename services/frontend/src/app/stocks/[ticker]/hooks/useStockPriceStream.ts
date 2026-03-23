"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StockChartPeriod, StockPricePoint, StockPricesPayload } from "@/app/stocks/types/stockDetail";
import {
  fetchStockPricePage,
  isStockPriceMockApiEnabled,
  subscribeMinutePriceStream,
} from "../api/connectStockPriceStream";

type UseStockPriceStreamOptions = {
  enabled?: boolean;
};

type StockPriceStreamState = {
  data: StockPricesPayload;
  isLoading: boolean;
  isFetchingMore: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
};

const initialPayload: StockPricesPayload = {
  prices: [],
};

function mergePrices(existing: StockPricePoint[], incoming: StockPricePoint[]) {
  const priceMap = new Map<string, StockPricePoint>();

  [...existing, ...incoming].forEach((price) => {
    priceMap.set(price.timestamp, price);
  });

  return Array.from(priceMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

async function fetchAllYearlyPages(ticker: string, stockId: number | null | undefined) {
  let cursor: string | null = null;
  let hasMore = true;
  let prices: StockPricePoint[] = [];

  while (hasMore) {
    const page = await fetchStockPricePage(ticker, stockId, "1Y", cursor);
    prices = mergePrices(prices, page.prices);
    hasMore = page.hasMore;
    cursor = page.nextCursor;

    if (!cursor) {
      break;
    }
  }

  return {
    prices,
    hasMore: false,
    nextCursor: null,
  };
}

export function useStockPriceStream(
  ticker: string,
  stockId: number | null | undefined,
  period: StockChartPeriod,
  options: UseStockPriceStreamOptions = {},
): StockPriceStreamState {
  const enabled = options.enabled ?? true;
  const [data, setData] = useState<StockPricesPayload>(initialPayload);
  const [isLoading, setIsLoading] = useState(Boolean(enabled));
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasMoreRef = useRef(false);
  const nextCursorRef = useRef<string | null>(null);
  const isFetchingMoreRef = useRef(false);

  useEffect(() => {
    if (!enabled || !ticker || (!isStockPriceMockApiEnabled() && !stockId)) {
      setData(initialPayload);
      setIsLoading(false);
      setIsFetchingMore(false);
      setError(null);
      hasMoreRef.current = false;
      nextCursorRef.current = null;
      isFetchingMoreRef.current = false;
      return;
    }

    let disposed = false;
    let fallbackPollingTimer: ReturnType<typeof setInterval> | null = null;
    let unsubscribe = () => {};

    const applyPage = (prices: StockPricePoint[], hasMore: boolean, nextCursor: string | null) => {
      if (disposed) {
        return;
      }

      setData({ prices });
      setIsLoading(false);
      setError(null);
      hasMoreRef.current = hasMore;
      nextCursorRef.current = nextCursor;
    };

    const loadInitial = async () => {
      try {
        setData(initialPayload);
        setIsLoading(true);
        setIsFetchingMore(false);
        setError(null);
        hasMoreRef.current = false;
        nextCursorRef.current = null;
        isFetchingMoreRef.current = false;

        const page =
          period === "1Y"
            ? await fetchAllYearlyPages(ticker, stockId)
            : await fetchStockPricePage(ticker, stockId, period);
        applyPage(page.prices, page.hasMore, page.nextCursor);

        if (period === "1MIN") {
          const refreshMinuteSnapshot = async () => {
            try {
              const snapshot = await fetchStockPricePage(ticker, stockId, "1MIN");
              applyPage(snapshot.prices, false, null);
            } catch {
              if (!disposed) {
                setError("stream_error");
              }
            }
          };

          unsubscribe = subscribeMinutePriceStream(ticker, stockId, {
            onSnapshot(payload) {
              applyPage(payload.prices, false, null);
            },
            onPoint(point) {
              if (disposed) {
                return;
              }

              setData((prev) => ({
                prices: mergePrices(prev.prices, [point]),
              }));
              setIsLoading(false);
              setError(null);
            },
            onError() {
              if (disposed || fallbackPollingTimer) {
                return;
              }

              fallbackPollingTimer = setInterval(() => {
                void refreshMinuteSnapshot();
              }, 60_000);
            },
          });
        }
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
  }, [enabled, period, stockId, ticker]);

  const loadMore = useCallback(() => {
    if (!enabled || period === "1MIN" || isFetchingMoreRef.current || !hasMoreRef.current || !nextCursorRef.current) {
      return;
    }

    isFetchingMoreRef.current = true;
    setIsFetchingMore(true);

    void (async () => {
      try {
        const page = await fetchStockPricePage(ticker, stockId, period, nextCursorRef.current);

        setData((prev) => ({
          prices: mergePrices(page.prices, prev.prices),
        }));

        hasMoreRef.current = page.hasMore;
        nextCursorRef.current = page.nextCursor;
      } catch {
        setError((prev) => prev ?? "stream_error");
      } finally {
        isFetchingMoreRef.current = false;
        setIsFetchingMore(false);
      }
    })();
  }, [enabled, period, stockId, ticker]);

  return useMemo(
    () => ({
      data,
      isLoading,
      isFetchingMore,
      error,
      hasMore: hasMoreRef.current,
      loadMore,
    }),
    [data, error, isFetchingMore, isLoading, loadMore],
  );
}
