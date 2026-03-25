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

const PORTFOLIO_TAB_FETCH_LIMIT = 50;
const MAX_PORTFOLIO_TAB_FETCH_ATTEMPTS = 20;

type PortfolioApiTab = "HOLDINGS" | "TODAY_TRADES" | "MONTHLY_RETURNS";

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

type PortfolioPageInfoPayload = {
  offset?: number | null;
  limit?: number | null;
  totalCount?: number | null;
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
    holdingQuantity?: number | null;
    returnRate?: number | null;
  }> | null;
  todayTrades?: Array<{
    id?: number | null;
    stockId?: number | null;
    ticker?: string | null;
    name?: string | null;
    action?: string | null;
    tradeType?: string | null;
    executedAt?: string | null;
    tradeTime?: string | null;
    executedPrice?: number | null;
    tradePrice?: number | null;
    currentPrice?: number | null;
    holdingQuantity?: number | null;
    returnRate?: number | null;
  }> | null;
  monthlyReturns?: Array<{
    month?: string | null;
    portfolioReturnRate?: number | null;
    monthlyReturn?: number | null;
    realizedProfitAmount?: number | null;
    buyCount?: number | null;
    sellCount?: number | null;
  }> | null;
  page?: PortfolioPageInfoPayload | null;
  hero?: {
    updatedAtLabel?: string | null;
    metrics?: unknown;
  } | null;
};

type PortfolioTabQueryResult = {
  payload: PortfolioPayload | null;
  items: unknown[];
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

function formatTradeTimeLabel(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const parts = formatSeoulDateParts(date);
  return `${parts.hour}:${parts.minute}`;
}

function formatMonthLabel(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  if (/^\d{4}-\d{2}$/.test(value)) {
    return value.replace("-", ".");
  }

  return value;
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

function normalizeHeroMetrics(
  summary: PortfolioSummaryPayload | null | undefined,
  legacyMetrics: unknown,
): PortfolioHeroMetric[] {
  if (!summary) {
    return normalizeHeroMetricsFromLegacy(legacyMetrics);
  }

  const metricValueById = new Map<string, number | null>([
    ["cumulative-return", readNumberOrNull(summary.cumulativeReturn)],
    ["hit-rate", readNumberOrNull(summary.hitRate)],
    ["yesterday_return", readNumberOrNull(summary.yesterdayReturn)],
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
      buyPrice: readNumberOrNull(item.buyPrice),
      currentPrice: readNumberOrNull(item.currentPrice),
      holdingDays: readNumberOrNull(item.holdingDays),
      holdingQuantity: readNumberOrNull(item.holdingQuantity),
      returnRate: readNumberOrNull(item.returnRate),
    }));
}

function createCurrentPriceLookup(
  holdings: PortfolioHolding[],
  popularSignals: PortfolioPopularSignal[],
) {
  const priceByStockId = new Map<number, number | null>();

  holdings.forEach((item) => {
    priceByStockId.set(item.stockId, item.currentPrice);
  });

  popularSignals.forEach((item) => {
    if (!priceByStockId.has(item.stockId)) {
      priceByStockId.set(item.stockId, item.price);
    }
  });

  return priceByStockId;
}

function normalizeTodayTrades(
  value: PortfolioPayload["todayTrades"],
  currentPriceByStockId: Map<number, number | null>,
): PortfolioTodayTrade[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const stockId = readNumber(item.stockId);
      const action = item.action ?? item.tradeType;
      const currentPrice =
        readNumberOrNull(item.currentPrice) ??
        currentPriceByStockId.get(stockId) ??
        null;

      return {
        id: readNumber(item.id, index + 1),
        stockId,
        ticker: readString(item.ticker),
        name: readString(item.name),
        action: action === "SELL" ? "SELL" : "BUY",
        executedAt: formatTradeTimeLabel(item.executedAt ?? item.tradeTime),
        executedPrice: readNumberOrNull(item.executedPrice ?? item.tradePrice),
        currentPrice,
        holdingQuantity: readNumberOrNull(item.holdingQuantity),
        returnRate: readNumberOrNull(item.returnRate),
      };
    });
}

function normalizeMonthlyReturns(
  value: PortfolioPayload["monthlyReturns"],
): PortfolioMonthlyReturn[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      month: formatMonthLabel(item.month),
      portfolioReturnRate: readNumberOrNull(
        item.portfolioReturnRate ?? item.monthlyReturn,
      ),
      realizedProfitAmount: readNumberOrNull(item.realizedProfitAmount),
      buyCount: readNumberOrNull(item.buyCount),
      sellCount: readNumberOrNull(item.sellCount),
    }));
}

function getPortfolioTabItems(payload: PortfolioPayload, tab: PortfolioApiTab) {
  switch (tab) {
    case "HOLDINGS":
      return Array.isArray(payload.holdings) ? payload.holdings : [];
    case "TODAY_TRADES":
      return Array.isArray(payload.todayTrades) ? payload.todayTrades : [];
    case "MONTHLY_RETURNS":
      return Array.isArray(payload.monthlyReturns) ? payload.monthlyReturns : [];
  }
}

function readTotalCount(payload: PortfolioPayload) {
  return readNumberOrNull(payload.page?.totalCount);
}

async function fetchPortfolioTabPage(
  tab: PortfolioApiTab,
  offset: number,
  limit: number,
) {
  const search = new URLSearchParams({
    tab,
    offset: String(offset),
    limit: String(limit),
  });

  const payload = await authApiFetch<ApiResponse<PortfolioPayload>>(
    `/api/portfolio/chairman?${search.toString()}`,
    {
      cache: "no-store",
    },
  );

  if (!payload.data) {
    throw new Error("포트폴리오 데이터를 불러오지 못했습니다.");
  }

  return payload.data;
}

async function fetchAllPortfolioTabItems(tab: PortfolioApiTab): Promise<PortfolioTabQueryResult> {
  let offset = 0;
  let basePayload: PortfolioPayload | null = null;
  const items: unknown[] = [];

  for (let attempt = 0; attempt < MAX_PORTFOLIO_TAB_FETCH_ATTEMPTS; attempt += 1) {
    const payload = await fetchPortfolioTabPage(tab, offset, PORTFOLIO_TAB_FETCH_LIMIT);
    basePayload ??= payload;

    const pageItems = getPortfolioTabItems(payload, tab);
    items.push(...pageItems);

    const totalCount = readTotalCount(payload);
    if (pageItems.length === 0) {
      break;
    }

    if (totalCount !== null && items.length >= totalCount) {
      break;
    }

    if (pageItems.length < PORTFOLIO_TAB_FETCH_LIMIT) {
      break;
    }

    offset += pageItems.length;
  }

  return {
    payload: basePayload,
    items,
  };
}

function normalizePortfolioPageData(
  holdingsPayload: PortfolioPayload | null,
  holdingsItems: unknown[],
  todayTradeItems: unknown[],
  monthlyReturnItems: unknown[],
): PortfolioPageData {
  const candidate = holdingsPayload ?? {};
  const summary =
    typeof candidate.summary === "object" && candidate.summary !== null
      ? candidate.summary
      : null;
  const signalSummary =
    typeof candidate.signalSummary === "object" && candidate.signalSummary !== null
      ? candidate.signalSummary
      : null;
  const hero =
    typeof candidate.hero === "object" && candidate.hero !== null
      ? candidate.hero
      : null;

  const holdings = normalizeHoldings(holdingsItems as PortfolioPayload["holdings"]);
  const popularSignals = normalizePopularSignals(candidate.popularSignals);
  const currentPriceByStockId = createCurrentPriceLookup(holdings, popularSignals);

  return {
    hero: {
      updatedAtLabel:
        formatUpdatedAtLabel(candidate.updatedAt) ||
        readString(hero?.updatedAtLabel, defaultPortfolioPageData.hero.updatedAtLabel),
      metrics: normalizeHeroMetrics(summary, hero?.metrics),
    },
    holdings,
    todayTrades: normalizeTodayTrades(
      todayTradeItems as PortfolioPayload["todayTrades"],
      currentPriceByStockId,
    ),
    monthlyReturns: normalizeMonthlyReturns(
      monthlyReturnItems as PortfolioPayload["monthlyReturns"],
    ),
    signalSummary: {
      baseUniverseLabel: defaultPortfolioPageData.signalSummary.baseUniverseLabel,
      buyCount: readNumber(
        signalSummary?.buyCount,
        defaultPortfolioPageData.signalSummary.buyCount,
      ),
      sellCount: readNumber(
        signalSummary?.sellCount,
        defaultPortfolioPageData.signalSummary.sellCount,
      ),
      holdCount: readNumber(
        signalSummary?.holdCount,
        defaultPortfolioPageData.signalSummary.holdCount,
      ),
      watchCount: readNumber(
        signalSummary?.watchCount,
        defaultPortfolioPageData.signalSummary.watchCount,
      ),
    },
    popularSignals,
    hallOfFame: defaultPortfolioPageData.hallOfFame,
  };
}

export async function getPortfolio() {
  const [holdingsResult, todayTradesResult, monthlyReturnsResult] = await Promise.all([
    fetchAllPortfolioTabItems("HOLDINGS"),
    fetchAllPortfolioTabItems("TODAY_TRADES"),
    fetchAllPortfolioTabItems("MONTHLY_RETURNS"),
  ]);

  return normalizePortfolioPageData(
    holdingsResult.payload,
    holdingsResult.items,
    todayTradesResult.items,
    monthlyReturnsResult.items,
  );
}
