"use client";

import { useQuery } from "@tanstack/react-query";
import { getPortfolio } from "../api/getPortfolio";

export function usePortfolioQuery() {
  return useQuery({
    queryKey: ["portfolio", "page"],
    queryFn: getPortfolio,
    staleTime: 60_000,
  });
}
