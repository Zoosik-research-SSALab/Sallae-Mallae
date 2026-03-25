"use client";

import { useQuery } from "@tanstack/react-query";
import { getStockFinancials } from "../api/getStockFinancials";
import type { StockFinancialType } from "@/app/stocks/types/stockDetail";

export function useStockFinancialsQuery(stockId: string, type: StockFinancialType) {
  return useQuery({
    queryKey: ["stock-detail", "financials", stockId, type],
    queryFn: () => getStockFinancials(stockId, type),
    enabled: Boolean(stockId),
    staleTime: 60_000,
  });
}
