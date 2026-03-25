import { apiFetch } from "@/shared/lib/apiClient";
import type { InvestmentPerformanceResponse } from "../types/report";

function isInvestmentPerformanceResponse(value: unknown): value is InvestmentPerformanceResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const isNullableNumber = (entry: unknown) => entry == null || typeof entry === "number";

  return (
    isNullableNumber(candidate.cumulativeReturn) &&
    typeof candidate.winRate === "number" &&
    isNullableNumber(candidate.averageReturn1y) &&
    isNullableNumber(candidate.recentReturn) &&
    (candidate.holding == null || typeof candidate.holding === "object") &&
    Array.isArray(candidate.chart)
  );
}

export async function getInvestmentPerformance(stockId: string): Promise<InvestmentPerformanceResponse> {
  const requestUrl = `/api/report/${encodeURIComponent(stockId.trim())}/performance`;

  console.info("[report/performance] request", { stockId, requestUrl });

  const response = await apiFetch<InvestmentPerformanceResponse>(requestUrl, {
    cache: "no-store",
    withAuth: true,
  });

  if (!isInvestmentPerformanceResponse(response)) {
    console.error("[report/performance] unexpected payload", response);
    throw new Error("성과 응답 구조가 예상과 다릅니다. /api/report/{stockId}/performance 응답을 확인해 주세요.");
  }

  console.info("[report/performance] response summary", {
    stockId,
    chartLength: response.chart.length,
    holdingKeys:
      response.holding && typeof response.holding === "object"
        ? Object.keys(response.holding)
        : [],
  });

  return response;
}
