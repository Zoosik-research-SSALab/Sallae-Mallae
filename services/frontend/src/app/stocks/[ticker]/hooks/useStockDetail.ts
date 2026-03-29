"use client";

import { useEffect, useState } from "react";
import { getStockDetail, type StockDetail } from "../api/getStockDetail";

export function useStockDetail(ticker: string) {
  const [item, setItem] = useState<StockDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticker) {
      setIsLoading(false);
      return;
    }

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getStockDetail(ticker);
        setItem(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [ticker]);

  return { item, isLoading, error };
}
