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

type StockMinuteStreamHandlers = {
  onSnapshot: (payload: { prices: StockPricePoint[] }) => void;
  onPoint: (point: StockPricePoint) => void;
  onError?: (error: Event) => void;
};

export type StockPricePage = {
  prices: StockPricePoint[];
  hasMore: boolean;
  nextCursor: string | null;
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

function isStockPriceArrayPayload(value: unknown): value is StockPricesApiPayload {
  return typeof value === "object" && value !== null && "prices" in value;
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

function getSeoulDateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function filterTodayMinutePrices(prices: StockPricePoint[]) {
  const todayKey = getSeoulDateKey(new Date());
  return prices.filter((price) => getSeoulDateKey(price.timestamp) === todayKey);
}

function normalizePricePage(payload: StockPricesApiPayload, period: StockChartPeriod): StockPricePage {
  const prices = sortAndDedupePrices((payload.prices ?? []).map(mapPricePoint));

  return {
    prices: period === "1MIN" ? filterTodayMinutePrices(prices) : prices,
    hasMore: Boolean(payload.hasMore),
    nextCursor: typeof payload.nextCursor === "string" ? payload.nextCursor : null,
  };
}

function getCandleType(period: StockChartPeriod) {
  switch (period) {
    case "1MIN":
      return "MINUTE";
    case "1D":
      return "DAILY";
    case "1W":
      return "WEEKLY";
    case "1M":
    case "3M":
      return "MONTHLY";
    case "1Y":
    case "3Y":
      return "YEARLY";
    default:
      return "DAILY";
  }
}

function getMockPricePage(ticker: string, period: StockChartPeriod): StockPricePage {
  const payload = getMockStockPrices(ticker, period);

  return {
    prices: period === "1MIN" ? filterTodayMinutePrices(payload.prices) : payload.prices,
    hasMore: false,
    nextCursor: null,
  };
}

export async function fetchStockPricePage(ticker: string, period: StockChartPeriod, cursor?: string | null) {
  if (shouldUseMockApi()) {
    return getMockPricePage(ticker, period);
  }

  const query = new URLSearchParams({
    candleType: getCandleType(period),
  });

  if (cursor) {
    query.set("cursor", cursor);
  }

  const payload = await apiFetch<StockPricesApiPayload>(`/api/stream/stocks/${ticker}/prices?${query.toString()}`, {
    cache: "no-store",
  });

  if (!isStockPriceArrayPayload(payload)) {
    throw new Error("차트 데이터를 불러오지 못했습니다.");
  }

  return normalizePricePage(payload, period);
}

export function subscribeMinutePriceStream(ticker: string, handlers: StockMinuteStreamHandlers) {
  if (shouldUseMockApi()) {
    const emitSnapshot = () => {
      handlers.onSnapshot({
        prices: getMockPricePage(ticker, "1MIN").prices,
      });
    };

    emitSnapshot();
    const timer = window.setInterval(emitSnapshot, 4_000);

    return () => {
      window.clearInterval(timer);
    };
  }

  return connectSse<StockPricesApiPayload | StockPriceApiPoint>(`/api/stream/stocks/${ticker}/prices/stream?candleType=MINUTE`, {
    onMessage(payload) {
      if (isStockPriceArrayPayload(payload)) {
        const page = normalizePricePage(payload, "1MIN");
        handlers.onSnapshot({ prices: page.prices });
        return;
      }

      const point = mapPricePoint(payload);
      if (point && getSeoulDateKey(point.timestamp) === getSeoulDateKey(new Date())) {
        handlers.onPoint(point);
      }
    },
    onError: handlers.onError,
  });
}
