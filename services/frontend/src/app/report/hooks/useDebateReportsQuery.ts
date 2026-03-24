"use client";

import { useQuery } from "@tanstack/react-query";
import { getDebateReports } from "../api/getDebateReports";

export function useDebateReportsQuery(stockId: string, offset = 0, limit = 6) {
  const query = useQuery({
    queryKey: ["report-detail", "debate-reports", stockId, offset, limit],
    queryFn: () => getDebateReports(stockId, offset, limit),
    enabled: Boolean(stockId),
    staleTime: 30_000,
  });

  return {
    ...query,
    reports: query.data?.reports ?? [],
  };
}
