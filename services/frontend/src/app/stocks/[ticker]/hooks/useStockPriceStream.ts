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
  ticker: string,
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
    if (!enabled || !ticker) {
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

        const page = await fetchStockPricePage(ticker, period);
        applyPage(page.prices, page.hasMore, page.nextCursor);
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
    };
  }, [enabled, period, ticker]);

  const loadMore = useCallback(() => {
    if (!enabled || period === "1MIN" || isFetchingMoreRef.current || !hasMoreRef.current || !nextCursorRef.current) {
      return;
    }

    isFetchingMoreRef.current = true;
    setIsFetchingMore(true);

    void (async () => {
      try {
        const page = await fetchStockPricePage(ticker, period, nextCursorRef.current);

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
  }, [enabled, period, ticker]);

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
