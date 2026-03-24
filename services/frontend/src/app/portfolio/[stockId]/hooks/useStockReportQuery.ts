"use client";

import { useQuery } from "@tanstack/react-query";
import { getStockReport } from "../api/getStockReport";

export function useStockReportQuery(
  stockId: string,
  offset?: number,
  limit?: number,
) {
  return useQuery({
    queryKey: ["portfolio-stock", "report", stockId, offset, limit],
    queryFn: () => getStockReport(stockId, offset, limit),
    enabled: Boolean(stockId),
    staleTime: 60_000,
  });
}
