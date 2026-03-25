"use client";

import { useQuery } from "@tanstack/react-query";
import { getDebateReports } from "../api/getDebateReports";

export function useDebateReportsQuery(stockId: string) {
  const query = useQuery({
    queryKey: ["report-detail", "debate-reports", stockId],
    queryFn: () => getDebateReports(stockId),
    enabled: Boolean(stockId),
    staleTime: 30_000,
  });

  return {
    ...query,
    reports: query.data?.reports ?? [],
  };
}
