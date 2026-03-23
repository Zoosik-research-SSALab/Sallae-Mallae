import type { StockChartPeriod, StockPricePoint } from "@/app/stocks/types/stockDetail";
import { getMockStockPrices } from "@/app/stocks/utils/mockStockDetailData";
import { apiFetch, connectSse, resolveApiUrl } from "@/shared/lib/apiClient";
import { camelizeKeys } from "@/shared/utils/case";

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

export function isStockPriceMockApiEnabled() {
  return shouldUseMockApi();
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

function parseSseEventBlock<TPayload>(eventBlock: string) {
  const lines = eventBlock.split("\n");
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(":")) {
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  const data = dataLines.join("\n");
  if (!data) {
    return null;
  }

  return camelizeKeys<TPayload>(JSON.parse(data) as unknown);
}

async function readFirstSseMessage<TPayload>(url: string) {
  const response = await fetch(resolveApiUrl(url), {
    method: "GET",
    headers: {
      Accept: "text/event-stream",
    },
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok || !response.body) {
    throw new Error(`SSE request failed: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer = `${buffer}${decoder.decode(value, { stream: true })}`.replace(/\r\n/g, "\n");
      const eventBlocks = buffer.split("\n\n");
      buffer = eventBlocks.pop() ?? "";

      for (const eventBlock of eventBlocks) {
        const payload = parseSseEventBlock<TPayload>(eventBlock);

        if (payload) {
          await reader.cancel();
          return payload;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  throw new Error("차트 데이터를 불러오지 못했습니다.");
}

function getPriceStreamPath(stockId: number, period: StockChartPeriod) {
  const query = new URLSearchParams({
    period,
  });

  return `/api/stream/stocks/${stockId}/prices?${query.toString()}`;
}

function getMockPricePage(ticker: string, period: StockChartPeriod): StockPricePage {
  const payload = getMockStockPrices(ticker, period);

  return {
    prices: period === "1MIN" ? filterTodayMinutePrices(payload.prices) : payload.prices,
    hasMore: false,
    nextCursor: null,
  };
}

export async function fetchStockPricePage(
  ticker: string,
  stockId: number | null | undefined,
  period: StockChartPeriod,
  cursor?: string | null,
) {
  if (shouldUseMockApi()) {
    return getMockPricePage(ticker, period);
  }

  if (!stockId) {
    throw new Error("종목 정보를 불러오는 중입니다.");
  }

  const streamPath = getPriceStreamPath(stockId, period);
  const payload = cursor
    ? await apiFetch<StockPricesApiPayload>(`${streamPath}&cursor=${encodeURIComponent(cursor)}`, {
        cache: "no-store",
      })
    : await readFirstSseMessage<StockPricesApiPayload>(streamPath);

  if (!isStockPriceArrayPayload(payload)) {
    throw new Error("차트 데이터를 불러오지 못했습니다.");
  }

  return normalizePricePage(payload, period);
}

export function subscribeMinutePriceStream(
  ticker: string,
  stockId: number | null | undefined,
  handlers: StockMinuteStreamHandlers,
) {
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

  if (!stockId) {
    return () => {};
  }

  return connectSse<StockPricesApiPayload | StockPriceApiPoint>(getPriceStreamPath(stockId, "1MIN"), {
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
