"use client";

import { useQuery } from "@tanstack/react-query";
import { getStockFinancials } from "../api/getStockFinancials";
import type { StockFinancialType } from "@/app/stocks/types/stockDetail";

export function useStockFinancialsQuery(ticker: string, type: StockFinancialType) {
  return useQuery({
    queryKey: ["stock-detail", "financials", ticker, type],
    queryFn: () => getStockFinancials(ticker, type),
    enabled: Boolean(ticker),
    staleTime: 60_000,
  });
}
