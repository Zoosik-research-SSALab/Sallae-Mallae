"use client";

import { useEffect, useState } from "react";
import { getStocks, type StockSummary } from "../_api/getStocks";

export function useStocks() {
  const [items, setItems] = useState<StockSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getStocks();
        setItems(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, []);

  return { items, isLoading, error };
}
