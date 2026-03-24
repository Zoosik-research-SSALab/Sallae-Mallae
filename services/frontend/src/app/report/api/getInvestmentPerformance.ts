import { apiFetch } from "@/shared/lib/apiClient";
import type { InvestmentPerformanceResponse } from "../types/report";

export async function getInvestmentPerformance(stockId: string): Promise<InvestmentPerformanceResponse> {
  return apiFetch<InvestmentPerformanceResponse>(`/api/report/${encodeURIComponent(stockId.trim())}/performance`, {
    cache: "no-store",
  });
}
