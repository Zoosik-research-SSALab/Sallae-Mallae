"use client";

import { useQuery } from "@tanstack/react-query";
import { getDebateReports } from "../api/getDebateReports";
import { transformDebateResponse } from "../utils/transformDebateResponse";

export function useDebateReportsQuery(stockId: string) {
  return useQuery({
    queryKey: ["report-detail", "debate-reports", stockId],
    queryFn: () => getDebateReports(stockId),
    select: transformDebateResponse,
    enabled: Boolean(stockId),
    staleTime: 60_000,
  });
}
