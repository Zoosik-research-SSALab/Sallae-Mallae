"use client";

import { useEffect, useState } from "react";
import { getLatestReport, type LatestReport } from "../api/getLatestReport";

export function useLatestReport(symbol: string) {
  const [report, setReport] = useState<LatestReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) {
      setIsLoading(false);
      return;
    }

    const run = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getLatestReport(symbol);
        setReport(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [symbol]);

  return { report, isLoading, error };
}
