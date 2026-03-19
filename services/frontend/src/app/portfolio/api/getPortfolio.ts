import type { PortfolioPageData } from "../types/portfolio";
import { authApiFetch } from "@/shared/lib/authApiClient";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string | null;
};

export async function getPortfolio() {
  const payload = await authApiFetch<ApiResponse<PortfolioPageData>>("/api/portfolio/chairman", {
    cache: "no-store",
  });

  if (!payload.data) {
    throw new Error("포트폴리오 데이터를 불러오지 못했습니다.");
  }

  return payload.data;
}
