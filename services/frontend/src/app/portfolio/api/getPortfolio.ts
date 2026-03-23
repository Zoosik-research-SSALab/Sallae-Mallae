import type {
  PortfolioHeroMetric,
  PortfolioHolding,
  PortfolioMetricTone,
  PortfolioMonthlyReturn,
  PortfolioPageData,
  PortfolioPopularSignal,
  PortfolioSignalAction,
  PortfolioTodayTrade,
} from "../types/portfolio";
import { PORTFOLIO_HERO_METRICS } from "../utils/portfolioStaticContent";
import { authApiFetch } from "@/shared/lib/authApiClient";

type ApiResponse<T> = {
  success: boolean;
  data: T;
  error: unknown | null;
};

type PortfolioSummaryPayload = {
  cumulativeReturn?: number | null;
  hitRate?: number | null;
  yesterdayReturn?: number | null;
  alphaVsKospi?: number | null;
  holdingCount?: number | null;
};

type PortfolioPayload = {
  updatedAt?: string | null;
  summary?: PortfolioSummaryPayload | null;
  signalSummary?: {
    buyCount?: number | null;
    sellCount?: number | null;
    holdCount?: number | null;
    watchCount?: number | null;
  } | null;
  popularSignals?: Array<{
    rank?: number | null;
    stockId?: number | null;
    ticker?: string | null;
    name?: string | null;
    price?: number | null;
    signal?: string | null;
    action?: string | null;
  }> | null;
  holdings?: Array<{
    stockId?: number | null;
    ticker?: string | null;
    name?: string | null;
    buyPrice?: number | null;
    currentPrice?: number | null;
    holdingDays?: number | null;
    returnRate?: number | null;
  }> | null;
  todayTrades?: Array<{
    id?: number | null;
    stockId?: number | null;
    ticker?: string | null;
    name?: string | null;
    action?: string | null;
    executedAt?: string | null;
    executedPrice?: number | null;
    currentPrice?: number | null;
    returnRate?: number | null;
  }> | null;
  monthlyReturns?: Array<{
    month?: string | null;
    portfolioReturnRate?: number | null;
    kospiReturnRate?: number | null;
    excessReturnRate?: number | null;
  }> | null;
  hero?: {
    updatedAtLabel?: string | null;
    metrics?: unknown;
  } | null;
};

const defaultPortfolioPageData: PortfolioPageData = {
  hero: {
    updatedAtLabel: "",
    metrics: PORTFOLIO_HERO_METRICS,
  },
  holdings: [],
  todayTrades: [],
  monthlyReturns: [],
  signalSummary: {
    baseUniverseLabel: "KOSPI 200 종목 기준",
    buyCount: 0,
    sellCount: 0,
    holdCount: 0,
    watchCount: 0,
  },
  popularSignals: [],
  hallOfFame: [],
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPortfolioMetricTone(value: unknown): value is PortfolioMetricTone {
  return value === "default" || value === "danger";
}

function isPortfolioSignalAction(value: unknown): value is PortfolioSignalAction {
  return value === "BUY" || value === "SELL" || value === "HOLD" || value === "WATCH";
}

function readNumberOrNull(value: unknown) {
  return isFiniteNumber(value) ? value : null;
}

function readNumber(value: unknown, fallback = 0) {
  return isFiniteNumber(value) ? value : fallback;
}

function readString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function formatSeoulDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const partMap = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: partMap.get("year") ?? "",
    month: partMap.get("month") ?? "",
    day: partMap.get("day") ?? "",
    hour: partMap.get("hour") ?? "",
    minute: partMap.get("minute") ?? "",
  };
}

function formatUpdatedAtLabel(value: unknown) {
  if (typeof value !== "string") {
    return defaultPortfolioPageData.hero.updatedAtLabel;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return defaultPortfolioPageData.hero.updatedAtLabel;
  }

  const now = new Date();
  const currentParts = formatSeoulDateParts(now);
  const targetParts = formatSeoulDateParts(date);
  const timeLabel = `${targetParts.hour}:${targetParts.minute}`;

  if (
    currentParts.year === targetParts.year &&
    currentParts.month === targetParts.month &&
    currentParts.day === targetParts.day
  ) {
    return `오늘 ${timeLabel} 업데이트 완료`;
  }

  return `${targetParts.year}.${targetParts.month}.${targetParts.day} ${timeLabel} 업데이트 완료`;
}

function normalizeHeroMetricsFromLegacy(value: unknown): PortfolioHeroMetric[] {
  const metrics = Array.isArray(value) ? value : [];
  const metricsById = new Map<string, Partial<PortfolioHeroMetric>>();

  for (const metric of metrics) {
    if (typeof metric !== "object" || metric === null) {
      continue;
    }

    const candidate = metric as Partial<PortfolioHeroMetric>;
    if (typeof candidate.id !== "string") {
      continue;
    }

    metricsById.set(candidate.id, candidate);
  }

  return PORTFOLIO_HERO_METRICS.map((defaultMetric) => {
    const metric = metricsById.get(defaultMetric.id);

    return {
      ...defaultMetric,
      label: typeof metric?.label === "string" ? metric.label : defaultMetric.label,
      value: readNumberOrNull(metric?.value),
      unit: typeof metric?.unit === "string" ? metric.unit : defaultMetric.unit,
      decimals: isFiniteNumber(metric?.decimals) ? metric.decimals : defaultMetric.decimals,
      tone: isPortfolioMetricTone(metric?.tone) ? metric.tone : defaultMetric.tone,
    };
  });
}

function normalizeHeroMetrics(summary: PortfolioSummaryPayload | null | undefined, legacyMetrics: unknown): PortfolioHeroMetric[] {
  if (!summary) {
    return normalizeHeroMetricsFromLegacy(legacyMetrics);
  }

  const metricValueById = new Map<string, number | null>([
    ["cumulative-return", readNumberOrNull(summary.cumulativeReturn)],
    ["hit-rate", readNumberOrNull(summary.hitRate)],
    ["alpha-vs-kospi", readNumberOrNull(summary.alphaVsKospi)],
    ["holding-count", readNumberOrNull(summary.holdingCount)],
  ]);

  return PORTFOLIO_HERO_METRICS.map((metric) => ({
    ...metric,
    value: metricValueById.get(metric.id) ?? null,
  }));
}

function normalizePopularSignals(value: PortfolioPayload["popularSignals"]): PortfolioPopularSignal[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const rawAction = item.action ?? item.signal;

      return {
        rank: readNumber(item.rank, index + 1),
        stockId: readNumber(item.stockId),
        ticker: readString(item.ticker),
        name: readString(item.name),
        price: readNumber(item.price),
        action: isPortfolioSignalAction(rawAction) ? rawAction : "WATCH",
      };
    });
}

function normalizeHoldings(value: PortfolioPayload["holdings"]): PortfolioHolding[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      stockId: readNumber(item.stockId),
      ticker: readString(item.ticker),
      name: readString(item.name),
      buyPrice: readNumber(item.buyPrice),
      currentPrice: readNumber(item.currentPrice),
      holdingDays: readNumberOrNull(item.holdingDays),
      returnRate: readNumber(item.returnRate),
    }));
}

function normalizeTodayTrades(value: PortfolioPayload["todayTrades"]): PortfolioTodayTrade[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item, index) => ({
      id: readNumber(item.id, index + 1),
      stockId: readNumber(item.stockId),
      ticker: readString(item.ticker),
      name: readString(item.name),
      action: item.action === "SELL" ? "SELL" : "BUY",
      executedAt: readString(item.executedAt),
      executedPrice: readNumber(item.executedPrice),
      currentPrice: readNumber(item.currentPrice),
      returnRate: readNumber(item.returnRate),
    }));
}

function normalizeMonthlyReturns(value: PortfolioPayload["monthlyReturns"]): PortfolioMonthlyReturn[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      month: readString(item.month),
      portfolioReturnRate: readNumber(item.portfolioReturnRate),
      kospiReturnRate: readNumber(item.kospiReturnRate),
      excessReturnRate: readNumber(item.excessReturnRate),
    }));
}

function normalizePortfolioPageData(value: unknown): PortfolioPageData {
  const candidate = typeof value === "object" && value !== null ? (value as PortfolioPayload) : {};
  const summary = typeof candidate.summary === "object" && candidate.summary !== null ? candidate.summary : null;
  const signalSummary =
    typeof candidate.signalSummary === "object" && candidate.signalSummary !== null ? candidate.signalSummary : null;
  const hero = typeof candidate.hero === "object" && candidate.hero !== null ? candidate.hero : null;

  return {
    hero: {
      updatedAtLabel:
        formatUpdatedAtLabel(candidate.updatedAt) ||
        readString(hero?.updatedAtLabel, defaultPortfolioPageData.hero.updatedAtLabel),
      metrics: normalizeHeroMetrics(summary, hero?.metrics),
    },
    holdings: normalizeHoldings(candidate.holdings),
    todayTrades: normalizeTodayTrades(candidate.todayTrades),
    monthlyReturns: normalizeMonthlyReturns(candidate.monthlyReturns),
    signalSummary: {
      baseUniverseLabel: defaultPortfolioPageData.signalSummary.baseUniverseLabel,
      buyCount: readNumber(signalSummary?.buyCount, defaultPortfolioPageData.signalSummary.buyCount),
      sellCount: readNumber(signalSummary?.sellCount, defaultPortfolioPageData.signalSummary.sellCount),
      holdCount: readNumber(signalSummary?.holdCount, defaultPortfolioPageData.signalSummary.holdCount),
      watchCount: readNumber(signalSummary?.watchCount, defaultPortfolioPageData.signalSummary.watchCount),
    },
    popularSignals: normalizePopularSignals(candidate.popularSignals),
    hallOfFame: defaultPortfolioPageData.hallOfFame,
  };
}

export async function getPortfolio() {
  const payload = await authApiFetch<ApiResponse<PortfolioPayload>>("/api/portfolio/chairman", {
    cache: "no-store",
  });

  if (!payload.data) {
    throw new Error("포트폴리오 데이터를 불러오지 못했습니다.");
  }

  return normalizePortfolioPageData(payload.data);
}
