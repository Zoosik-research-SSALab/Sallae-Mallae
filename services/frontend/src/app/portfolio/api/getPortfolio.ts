import type { PortfolioPageData } from "../types/portfolio";
import { apiFetch } from "@/shared/lib/apiClient";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string | null;
};

export async function getPortfolio() {
  const payload = await apiFetch<ApiResponse<PortfolioPageData>>("/api/portfolio", {
    cache: "no-store",
    useBaseUrl: false,
  });

  if (!payload.data) {
    throw new Error("포트폴리오 데이터를 불러오지 못했습니다.");
  }

  return payload.data;
}
