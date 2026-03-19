import type { PortfolioPageData } from "../types/portfolio";
import { authApiFetch } from "@/shared/lib/authApiClient";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  message: string | null;
};

const defaultPortfolioPageData: PortfolioPageData = {
  hero: {
    updatedAtLabel: "",
    title: "",
    description: "",
    metrics: [],
  },
  holdings: [],
  todayTrades: [],
  monthlyReturns: [],
  signalSummary: {
    baseUniverseLabel: "",
    buyCount: 0,
    sellCount: 0,
    holdCount: 0,
    watchCount: 0,
  },
  popularSignals: [],
  hallOfFame: [],
};

function normalizePortfolioPageData(value: unknown): PortfolioPageData {
  const candidate = typeof value === "object" && value !== null ? (value as Partial<PortfolioPageData>) : {};
  const hero =
    typeof candidate.hero === "object" && candidate.hero !== null
      ? (candidate.hero as Partial<PortfolioPageData["hero"]>)
      : {};
  const signalSummary =
    typeof candidate.signalSummary === "object" && candidate.signalSummary !== null
      ? (candidate.signalSummary as Partial<PortfolioPageData["signalSummary"]>)
      : {};

  return {
    hero: {
      updatedAtLabel:
        typeof hero.updatedAtLabel === "string" ? hero.updatedAtLabel : defaultPortfolioPageData.hero.updatedAtLabel,
      title: typeof hero.title === "string" ? hero.title : defaultPortfolioPageData.hero.title,
      description: typeof hero.description === "string" ? hero.description : defaultPortfolioPageData.hero.description,
      metrics: Array.isArray(hero.metrics) ? hero.metrics : defaultPortfolioPageData.hero.metrics,
    },
    holdings: Array.isArray(candidate.holdings) ? candidate.holdings : defaultPortfolioPageData.holdings,
    todayTrades: Array.isArray(candidate.todayTrades) ? candidate.todayTrades : defaultPortfolioPageData.todayTrades,
    monthlyReturns: Array.isArray(candidate.monthlyReturns)
      ? candidate.monthlyReturns
      : defaultPortfolioPageData.monthlyReturns,
    signalSummary: {
      baseUniverseLabel:
        typeof signalSummary.baseUniverseLabel === "string"
          ? signalSummary.baseUniverseLabel
          : defaultPortfolioPageData.signalSummary.baseUniverseLabel,
      buyCount:
        typeof signalSummary.buyCount === "number" ? signalSummary.buyCount : defaultPortfolioPageData.signalSummary.buyCount,
      sellCount:
        typeof signalSummary.sellCount === "number"
          ? signalSummary.sellCount
          : defaultPortfolioPageData.signalSummary.sellCount,
      holdCount:
        typeof signalSummary.holdCount === "number"
          ? signalSummary.holdCount
          : defaultPortfolioPageData.signalSummary.holdCount,
      watchCount:
        typeof signalSummary.watchCount === "number"
          ? signalSummary.watchCount
          : defaultPortfolioPageData.signalSummary.watchCount,
    },
    popularSignals: Array.isArray(candidate.popularSignals) ? candidate.popularSignals : defaultPortfolioPageData.popularSignals,
    hallOfFame: Array.isArray(candidate.hallOfFame) ? candidate.hallOfFame : defaultPortfolioPageData.hallOfFame,
  };
}

export async function getPortfolio() {
  const payload = await authApiFetch<ApiResponse<PortfolioPageData>>("/api/portfolio/chairman", {
    cache: "no-store",
  });

  if (!payload.data) {
    throw new Error("포트폴리오 데이터를 불러오지 못했습니다.");
  }

  return normalizePortfolioPageData(payload.data);
}
