"use client";

import { useQuery } from "@tanstack/react-query";
import { getPortfolioHallOfFame } from "../api/getPortfolioHallOfFame";

export function usePortfolioHallOfFameQuery() {
  return useQuery({
    queryKey: ["portfolio", "hall-of-fame"],
    queryFn: getPortfolioHallOfFame,
    staleTime: 60_000,
  });
}
