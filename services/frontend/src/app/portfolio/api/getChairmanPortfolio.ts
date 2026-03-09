import { apiFetch } from "@/shared/lib/apiClient";

export type PortfolioHolding = {
  stockId: number;
  ticker: string;
  stockName: string;
  portfolioWeight: number;
  returnRate: number;
};

export type DailyPerformance = {
  recordDate: string;
  dailyReturn: number;
  cumulativeReturn: number;
  mdd: number;
};

export type ChairmanPortfolio = {
  name: string;
  cumulativeReturn: number;
  totalTrades: number;
  winningTrades: number;
  holdings: PortfolioHolding[];
  performance: DailyPerformance[];
  source: "api" | "fallback";
};

const fallbackData: ChairmanPortfolio = {
  name: "회장 포트폴리오",
  cumulativeReturn: 3.24,
  totalTrades: 12,
  winningTrades: 7,
  holdings: [
    { stockId: 1, ticker: "005930", stockName: "삼성전자", portfolioWeight: 18.0, returnRate: 2.1 },
    { stockId: 2, ticker: "000660", stockName: "SK하이닉스", portfolioWeight: 16.0, returnRate: 4.3 },
    { stockId: 3, ticker: "035420", stockName: "NAVER", portfolioWeight: 9.0, returnRate: -1.2 },
  ],
  performance: [
    { recordDate: "2026-03-01", dailyReturn: 0.42, cumulativeReturn: 2.1, mdd: -1.5 },
    { recordDate: "2026-03-02", dailyReturn: 0.3, cumulativeReturn: 2.4, mdd: -1.5 },
    { recordDate: "2026-03-03", dailyReturn: 0.84, cumulativeReturn: 3.24, mdd: -1.5 },
  ],
  source: "fallback",
};

export async function getChairmanPortfolio(): Promise<ChairmanPortfolio> {
  try {
    const payload = await apiFetch<{ data?: ChairmanPortfolio }>("/api/v1/portfolio/chairman", { cache: "no-store" });
    return payload.data ? { ...payload.data, source: "api" } : fallbackData;
  } catch {
    return fallbackData;
  }
}
