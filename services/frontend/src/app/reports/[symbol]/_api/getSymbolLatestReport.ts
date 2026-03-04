import { getLatestReport } from "../../_api/getLatestReport";

export function getSymbolLatestReport(symbol: string) {
  return getLatestReport(symbol);
}
