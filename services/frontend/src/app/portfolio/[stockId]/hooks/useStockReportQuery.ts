"use client";

import { useQuery } from "@tanstack/react-query";
import { getStockReport } from "../api/getStockReport";
import { transformReportResponse } from "../utils/transformApiResponse";

export function useStockReportQuery(
  stockId: string,
  offset = 0,
  limit = 1000,
) {
  return useQuery({
    queryKey: ["portfolio-stock", "report", stockId, offset, limit],
    queryFn: () => getStockReport(stockId, offset, limit),
    select: transformReportResponse,
    enabled: Boolean(stockId),
    staleTime: 60_000,
  });
}
