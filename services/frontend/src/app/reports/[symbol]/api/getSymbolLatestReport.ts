import { getLatestReport } from "../../api/getLatestReport";

export function getSymbolLatestReport(symbol: string) {
  return getLatestReport(symbol);
}

