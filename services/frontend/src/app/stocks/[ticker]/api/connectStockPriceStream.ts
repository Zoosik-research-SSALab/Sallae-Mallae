import type { StockChartPeriod, StockPricePoint } from "@/app/stocks/types/stockDetail";
import { getMockStockPrices } from "@/app/stocks/utils/mockStockDetailData";
import { apiFetch, connectSse } from "@/shared/lib/apiClient";

type StockPriceApiPoint = {
  timestamp?: string | null;
  open?: number | null;
  high?: number | null;
  low?: number | null;
  close?: number | null;
  volume?: number | null;
};

type StockPricesApiPayload = {
  candleType?: string | null;
  hasMore?: boolean | null;
  nextCursor?: string | null;
  prices?: StockPriceApiPoint[] | null;
};

type StockQuoteApiPayload = {
  currentPrice?: number | null;
  changeRate?: number | null;
  fluctuationRate?: number | null;
};

export type StockPricePage = {
  prices: StockPricePoint[];
  hasMore: boolean;
  nextCursor: string | null;
};

export type StockQuoteSnapshot = {
  currentPrice: number | null;
  changeRate: number | null;
};

const SEOUL_TIME_ZONE = "Asia/Seoul";

const chartPeriodToCandleType: Record<StockChartPeriod, "MINUTE" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"> = {
  "1MIN": "MINUTE",
  "1D": "DAILY",
  "1W": "WEEKLY",
  "1M": "MONTHLY",
  "1Y": "YEARLY",
};

function shouldUseMockApi() {
  const explicit = process.env.NEXT_PUBLIC_USE_API_MOCK?.trim().toLowerCase();

  if (explicit === "true") {
    return true;
  }

  if (explicit === "false") {
    return false;
  }

  const raw = process.env.NEXT_PUBLIC_API_MOCKING?.trim().toLowerCase();
  return raw !== "false" && raw !== "disabled";
}

function getSeoulDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SEOUL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function filterTodayMinutePrices(prices: StockPricePoint[]) {
  const todayKey = getSeoulDateKey(new Date());
  return prices.filter((price) => getSeoulDateKey(price.timestamp) === todayKey);
}

function sortAndDedupePrices(prices: Array<StockPricePoint | null>) {
  const priceMap = new Map<string, StockPricePoint>();

  prices.forEach((price) => {
    if (price) {
      priceMap.set(price.timestamp, price);
    }
  });

  return Array.from(priceMap.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function mapPricePoint(point: StockPriceApiPoint): StockPricePoint | null {
  if (
    typeof point.timestamp !== "string" ||
    typeof point.open !== "number" ||
    typeof point.high !== "number" ||
    typeof point.low !== "number" ||
    typeof point.close !== "number" ||
    typeof point.volume !== "number"
  ) {
    return null;
  }

  return {
    timestamp: point.timestamp,
    open: point.open,
    high: point.high,
    low: point.low,
    close: point.close,
    volume: point.volume,
  };
}

function normalizePricePage(payload: StockPricesApiPayload, period: StockChartPeriod): StockPricePage {
  const prices = sortAndDedupePrices((payload.prices ?? []).map(mapPricePoint));

  return {
    prices: period === "1MIN" ? filterTodayMinutePrices(prices) : prices,
    hasMore: Boolean(payload.hasMore),
    nextCursor: typeof payload.nextCursor === "string" ? payload.nextCursor : null,
  };
}

function normalizeQuotePayload(payload: StockQuoteApiPayload): StockQuoteSnapshot {
  const changeRate =
    typeof payload.changeRate === "number"
      ? payload.changeRate
      : typeof payload.fluctuationRate === "number"
        ? payload.fluctuationRate
        : null;

  return {
    currentPrice: typeof payload.currentPrice === "number" ? payload.currentPrice : null,
    changeRate,
  };
}

function getPricePath(ticker: string, period: StockChartPeriod, cursor?: string | null) {
  const query = new URLSearchParams({
    candle_type: chartPeriodToCandleType[period],
  });

  if (cursor) {
    query.set("cursor", cursor);
  }

  return `/api/stocks/${ticker}/prices?${query.toString()}`;
}

function getQuotePath(ticker: string) {
  return `/api/stream/stocks/${ticker}/quote`;
}

function getMockPricePage(ticker: string, period: StockChartPeriod): StockPricePage {
  const payload = getMockStockPrices(ticker, period);

  return {
    prices: period === "1MIN" ? filterTodayMinutePrices(payload.prices) : payload.prices,
    hasMore: false,
    nextCursor: null,
  };
}

function getMockQuoteSnapshot(ticker: string): StockQuoteSnapshot {
  const prices = getMockPricePage(ticker, "1MIN").prices;
  const latest = prices.at(-1) ?? null;
  const previous = prices.at(-2) ?? null;

  if (!latest) {
    return {
      currentPrice: null,
      changeRate: null,
    };
  }

  const changeRate =
    previous && previous.close > 0 ? ((latest.close - previous.close) / previous.close) * 100 : null;

  return {
    currentPrice: latest.close,
    changeRate,
  };
}

export async function fetchStockPricePage(ticker: string, period: StockChartPeriod, cursor?: string | null) {
  if (shouldUseMockApi()) {
    return getMockPricePage(ticker, period);
  }

  const payload = await apiFetch<StockPricesApiPayload>(getPricePath(ticker, period, cursor), {
    cache: "no-store",
  });

  return normalizePricePage(payload, period);
}

export async function fetchStockQuote(ticker: string) {
  if (shouldUseMockApi()) {
    return getMockQuoteSnapshot(ticker);
  }

  const payload = await apiFetch<StockQuoteApiPayload>(`/api/stocks/${ticker}/quote`, {
    cache: "no-store",
  });

  return normalizeQuotePayload(payload);
}

export function subscribeStockQuoteStream(
  ticker: string,
  handlers: {
    onMessage: (payload: StockQuoteSnapshot) => void;
    onError?: (error: Event) => void;
  },
) {
  if (shouldUseMockApi()) {
    const emitSnapshot = () => {
      handlers.onMessage(getMockQuoteSnapshot(ticker));
    };

    emitSnapshot();
    const timer = window.setInterval(emitSnapshot, 4_000);

    return () => {
      window.clearInterval(timer);
    };
  }

  return connectSse<StockQuoteApiPayload>(getQuotePath(ticker), {
    onMessage(payload) {
      handlers.onMessage(normalizeQuotePayload(payload));
    },
    onError: handlers.onError,
  });
}
