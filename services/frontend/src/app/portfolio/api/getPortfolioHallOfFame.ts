import type { PortfolioHallOfFameSection } from "../types/portfolio";
import { authApiFetch } from "@/shared/lib/authApiClient";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error: unknown | null;
};

type HallRankingItem = {
  rank?: number | null;
  stockId?: number | null;
  ticker?: string | null;
  name?: string | null;
  value?: number | null;
};

type HallHitRateItem = {
  rank?: number | null;
  stockId?: number | null;
  ticker?: string | null;
  name?: string | null;
  hitRate?: number | null;
  winningTrades?: number | null;
  totalTrades?: number | null;
};

type PortfolioHallOfFamePayload = {
  hitRateTop5?: HallHitRateItem[] | null;
  cumulativeReturnTop10?: HallRankingItem[] | null;
  maxSingleReturnTop5?: HallRankingItem[] | null;
  averageReturnTop5?: HallRankingItem[] | null;
};

function readNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readName(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeValueItems(
  items: HallRankingItem[] | null | undefined,
  suffix: string,
  fallbackPrefix: string,
) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => item && typeof item === "object")
    .map((item, index) => ({
      rank: readNumber(item.rank, index + 1),
      name: readName(item.name, `${fallbackPrefix} ${index + 1}`),
      value: readNumber(item.value),
      suffix,
    }));
}

function normalizeHitRateItems(items: HallHitRateItem[] | null | undefined) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .filter((item) => item && typeof item === "object")
    .map((item, index) => ({
      rank: readNumber(item.rank, index + 1),
      name: readName(item.name, `종목 ${index + 1}`),
      value: readNumber(item.hitRate),
      suffix: "%",
    }));
}

function normalizePortfolioHallOfFame(value: unknown): PortfolioHallOfFameSection[] {
  const candidate =
    typeof value === "object" && value !== null ? (value as PortfolioHallOfFamePayload) : {};

  const sections: PortfolioHallOfFameSection[] = [
    {
      id: "hit-rate",
      title: "예측 적중률 TOP 5",
      tone: "info",
      items: normalizeHitRateItems(candidate.hitRateTop5),
    },
    {
      id: "cumulative-return",
      title: "누적 수익률 TOP 5",
      tone: "danger",
      items: normalizeValueItems(candidate.cumulativeReturnTop10, "%", "종목"),
    },
    {
      id: "best-single-trade",
      title: "최대 단일 수익률 TOP 5",
      tone: "warning",
      items: normalizeValueItems(candidate.maxSingleReturnTop5, "%", "종목"),
    },
    {
      id: "average-return",
      title: "평균 수익률 TOP 5",
      tone: "success",
      items: normalizeValueItems(candidate.averageReturnTop5, "%", "종목"),
    },
  ];

  return sections.filter((section) => section.items.length > 0);
}

export async function getPortfolioHallOfFame() {
  const payload = await authApiFetch<ApiResponse<PortfolioHallOfFamePayload>>("/api/portfolio/chairman/hall-of-fame", {
    cache: "no-store",
  });

  if (!payload.data) {
    throw new Error("명예의 전당 데이터를 불러오지 못했습니다.");
  }

  return normalizePortfolioHallOfFame(payload.data);
}
