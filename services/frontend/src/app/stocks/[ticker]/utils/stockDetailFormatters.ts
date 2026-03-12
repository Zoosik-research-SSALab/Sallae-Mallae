import type {
  StockChartPeriod,
  StockFinancialItem,
  StockFinancialType,
  StockPriceChartMode,
  StockPricePoint,
} from "@/app/stocks/types/stockDetail";

export const stockChartPeriods: Array<{
  value: StockChartPeriod;
  label: string;
}> = [
  { value: "1MIN", label: "1분봉" },
  { value: "1D", label: "1일" },
  { value: "1W", label: "1주" },
  { value: "1M", label: "1개월" },
  { value: "3M", label: "3개월" },
  { value: "1Y", label: "1년" },
];

export const financialTypeOptions = [
  { value: "YEARLY", label: "연간" },
  { value: "QUARTERLY", label: "분기" },
] as const;

export function formatWon(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

export function formatSignedPercent(value: number, digits = 2) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

export function formatMultiplier(value: number) {
  return `${value.toFixed(1)}배`;
}

export function formatAnnouncementDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatBaseTime(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatRelativePublishedAt(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.floor(diffMs / 60_000));

  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}시간 전`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}일 전`;
}

export function getRateClassName(value: number) {
  if (value > 0) {
    return "text-[color:var(--color-text-danger-bold)]";
  }

  if (value < 0) {
    return "text-[color:var(--color-text-interactive-primary)]";
  }

  return "text-[color:var(--color-text-secondary)]";
}

export function getLatestClose(prices: StockPricePoint[]) {
  return prices.at(-1)?.close ?? 0;
}

export function getChangeRate(prices: StockPricePoint[]) {
  const first = prices[0]?.close;
  const last = prices.at(-1)?.close;

  if (!first || !last) {
    return 0;
  }

  return ((last - first) / first) * 100;
}

export function getDisplayChartPrices(prices: StockPricePoint[], period: StockChartPeriod) {
  if (period === "1MIN") {
    return prices.slice(-30);
  }

  return prices;
}

export function getChartPriceRange(prices: StockPricePoint[], mode: StockPriceChartMode = "line") {
  if (prices.length === 0) {
    return {
      min: 0,
      max: 0,
      interval: 1,
    };
  }

  const values =
    mode === "candlestick"
      ? prices.flatMap((item) => [item.low, item.high])
      : prices.map((item) => item.close);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const referencePrice = prices.at(-1)?.close ?? maxValue;
  const span = maxValue - minValue;
  const tickSize = getKoreanStockTickSize(referencePrice);

  if (span === 0) {
    const interval = tickSize;
    const padding = Math.max(interval * 2, Math.round(minValue * 0.01));

    return {
      min: Math.max(0, Math.floor((minValue - padding) / interval) * interval),
      max: Math.ceil((maxValue + padding) / interval) * interval,
      interval,
    };
  }

  const padding = Math.max(1, span * 0.12);
  const paddedMin = Math.max(0, minValue - padding);
  const paddedMax = maxValue + padding;
  const desiredInterval = Math.max(tickSize, (paddedMax - paddedMin) / 4);
  const interval = Math.ceil(desiredInterval / tickSize) * tickSize;

  return {
    min: Math.max(0, Math.floor(paddedMin / interval) * interval),
    max: Math.ceil(paddedMax / interval) * interval,
    interval,
  };
}

export function getKoreanStockTickSize(price: number) {
  if (price < 2_000) {
    return 1;
  }

  if (price < 5_000) {
    return 5;
  }

  if (price < 20_000) {
    return 10;
  }

  if (price < 50_000) {
    return 50;
  }

  if (price < 200_000) {
    return 100;
  }

  if (price < 500_000) {
    return 500;
  }

  return 1_000;
}

export function formatChartAxisLabel(timestamp: string, period: StockChartPeriod) {
  const date = new Date(timestamp);

  if (period === "1MIN" || period === "1D") {
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  if (period === "1W" || period === "1M") {
    return new Intl.DateTimeFormat("ko-KR", {
      month: "numeric",
      day: "numeric",
    }).format(date);
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "2-digit",
    month: "numeric",
  }).format(date);
}

export function shouldShowChartLabel(index: number, total: number, period: StockChartPeriod) {
  const maxLabelCounts: Record<StockChartPeriod, number> = {
    "1MIN": 4,
    "1D": 5,
    "1W": 5,
    "1M": 6,
    "3M": 6,
    "1Y": 6,
    "3Y": 6,
  };
  const interval = Math.max(1, Math.ceil((total - 1) / Math.max(1, maxLabelCounts[period] - 1)));

  return index === 0 || index === total - 1 || index % interval === 0;
}

export function formatFinancialValue(value: number) {
  return value.toFixed(1);
}

export function formatVolume(value: number) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

export function formatFinancialLabel(item: StockFinancialItem) {
  if (typeof item.quarter === "number") {
    return `${item.year}.${item.quarter}Q`;
  }

  return `${item.year}`;
}

export function getVisibleFinancials(financials: StockFinancialItem[], type: StockFinancialType) {
  return type === "QUARTERLY" ? financials.slice(-4) : financials;
}

export function formatFinancialQuarterLabel(item: StockFinancialItem) {
  if (typeof item.quarter === "number") {
    return `${item.quarter}분기`;
  }

  return formatFinancialLabel(item);
}

export function formatFinancialYearMarker(item: StockFinancialItem) {
  return `${item.year}년`;
}
