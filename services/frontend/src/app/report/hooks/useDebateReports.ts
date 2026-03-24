"use client";

import { useEffect, useState } from "react";
import { getDebateReports } from "../api/getDebateReports";
import type { DebateReportsResponse } from "../types/debate";

export function useDebateReports(stockId: string, offset = 0, limit = 6) {
  const [data, setData] = useState<DebateReportsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stockId) {
      setData(null);
      setIsLoading(false);
      return;
    }

    const run = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getDebateReports(stockId, offset, limit);
        setData(response);
      } catch (err) {
        const message = err instanceof Error ? err.message : "unknown error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    run();
  }, [limit, offset, stockId]);

  return {
    reports: data?.reports ?? [],
    isLoading,
    error,
  };
}
