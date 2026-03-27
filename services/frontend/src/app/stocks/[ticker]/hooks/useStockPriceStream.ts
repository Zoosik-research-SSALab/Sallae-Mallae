"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StockChartPeriod, StockPricePoint, StockPricesPayload } from "@/app/stocks/types/stockDetail";
import { fetchStockPricePage } from "../api/connectStockPriceStream";

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
  refetch: () => void;
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

export function useStockPriceStream(
  stockId: string,
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
  const requestIdRef = useRef(0);

  const loadInitial = useCallback(async (resetData: boolean) => {
    const requestId = ++requestIdRef.current;

    try {
      if (resetData) {
        setData(initialPayload);
      }
      setIsLoading(true);
      setIsFetchingMore(false);
      setError(null);
      hasMoreRef.current = false;
      nextCursorRef.current = null;
      isFetchingMoreRef.current = false;

      const page = await fetchStockPricePage(stockId, period);

      if (requestId !== requestIdRef.current) {
        return;
      }

      setData({ prices: page.prices });
      setIsLoading(false);
      setError(null);
      hasMoreRef.current = page.hasMore;
      nextCursorRef.current = page.nextCursor;
    } catch {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setError("stream_error");
      }
    }
  }, [period, stockId]);

  useEffect(() => {
    if (!enabled || !stockId) {
      requestIdRef.current += 1;
      setData(initialPayload);
      setIsLoading(false);
      setIsFetchingMore(false);
      setError(null);
      hasMoreRef.current = false;
      nextCursorRef.current = null;
      isFetchingMoreRef.current = false;
      return;
    }

    void loadInitial(true);

    return () => {
      requestIdRef.current += 1;
    };
  }, [enabled, loadInitial, stockId]);

  const loadMore = useCallback(() => {
    if (!enabled || period === "1MIN" || isFetchingMoreRef.current || !hasMoreRef.current || !nextCursorRef.current) {
      return;
    }

    isFetchingMoreRef.current = true;
    setIsFetchingMore(true);

    void (async () => {
      try {
        const page = await fetchStockPricePage(stockId, period, nextCursorRef.current);

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
  }, [enabled, period, stockId]);

  const refetch = useCallback(() => {
    if (!enabled || !stockId || isFetchingMoreRef.current) {
      return;
    }

    void loadInitial(false);
  }, [enabled, loadInitial, stockId]);

  return useMemo(
    () => ({
      data,
      isLoading,
      isFetchingMore,
      error,
      hasMore: hasMoreRef.current,
      loadMore,
      refetch,
    }),
    [data, error, isFetchingMore, isLoading, loadMore, refetch],
  );
}
