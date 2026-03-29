"use client";

import { useLatestReport } from "../../hooks/useLatestReport";

export function useSymbolLatestReport(symbol: string) {
  return useLatestReport(symbol);
}
