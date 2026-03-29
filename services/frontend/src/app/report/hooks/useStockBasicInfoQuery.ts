"use client";

import { useQuery } from "@tanstack/react-query";
import { getStockBasicInfo } from "@/app/portfolio/[stockId]/api/getStockBasicInfo";

export function useStockBasicInfoQuery(stockId: string) {
  return useQuery({
    queryKey: ["stock-basic-info", stockId],
    queryFn: () => getStockBasicInfo(stockId),
    enabled: Boolean(stockId),
    staleTime: 60_000,
  });
}
