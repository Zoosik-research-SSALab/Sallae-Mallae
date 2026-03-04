"use client";

import { useEffect, useState } from "react";
import { getSignals, type SignalItem } from "../_api/getSignals";

export function useSignals() {
  const [items, setItems] = useState<SignalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getSignals(6);
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
