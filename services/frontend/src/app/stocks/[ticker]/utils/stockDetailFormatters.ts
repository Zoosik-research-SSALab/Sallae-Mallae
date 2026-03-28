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
  { value: "1MIN", label: "분봉" },
  { value: "1D", label: "일봉" },
  { value: "1W", label: "주봉" },
  { value: "1M", label: "월봉" },
  { value: "1Y", label: "년봉" },
];

export const financialTypeOptions = [
  { value: "YEARLY", label: "연간" },
  { value: "QUARTERLY", label: "분기" },
] as const;

const KOREAN_WON_PER_EOK = 100_000_000;
const KOREAN_WON_PER_JO = 1_000_000_000_000;

export type FinancialDisplayUnit = "조" | "억";

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function formatWon(value: number | null | undefined) {
  if (!isFiniteNumber(value)) {
    return "-";
  }

  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

export function formatSignedPercent(value: number | null | undefined, digits = 2) {
  if (!isFiniteNumber(value)) {
    return "-";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatPercent(value: number | null | undefined, digits = 1) {
  if (!isFiniteNumber(value)) {
    return "-";
  }

  return `${value.toFixed(digits)}%`;
}

export function formatMultiplier(value: number | null | undefined) {
  if (!isFiniteNumber(value)) {
    return "-";
  }

  return `${value.toFixed(1)}배`;
}

export function formatAnnouncementDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatBaseTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatRelativePublishedAt(value: string | null | undefined) {
  if (!value) {
    return "-";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs)) {
    return "-";
  }

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

export function getDisplayChartPrices(prices: StockPricePoint[]) {
  return prices;
}

export function getInitialVisiblePointCount(period: StockChartPeriod, total: number) {
  if (total <= 0) {
    return 0;
  }

  switch (period) {
    case "1MIN":
      return Math.min(total, 60);
    case "1D":
      return Math.min(total, 120);
    case "1W":
      return Math.min(total, 60);
    case "1M":
      return Math.min(total, 36);
    case "1Y":
      return total;
    default:
      return Math.min(total, 60);
  }
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

function parseChartDate(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

function padTimeUnit(value: number) {
  return value.toString().padStart(2, "0");
}

function getSeoulDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const readPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "00";

  return {
    year: Number(readPart("year")),
    month: Number(readPart("month")),
    day: Number(readPart("day")),
    hour: Number(readPart("hour")),
    minute: Number(readPart("minute")),
  };
}

export function formatChartTooltipLabel(timestamp: string, period: StockChartPeriod) {
  const date = parseChartDate(timestamp);

  if (!date) {
    return "-";
  }

  const parts = getSeoulDateParts(date);

  if (period === "1MIN") {
    return `${padTimeUnit(parts.hour)}:${padTimeUnit(parts.minute)}`;
  }

  if (period === "1D" || period === "1W") {
    return `${parts.year}.${parts.month}.${parts.day}`;
  }

  if (period === "1M") {
    return `${parts.year}.${parts.month}`;
  }

  return `${parts.year}`;
}

function getVisibleChartBounds(
  total: number,
  visibleRange?: {
    startValue: number;
    endValue: number;
  } | null,
) {
  const maxIndex = Math.max(0, total - 1);
  const visibleStart = Math.max(0, Math.min(maxIndex, visibleRange?.startValue ?? 0));
  const visibleEnd = Math.max(visibleStart, Math.min(maxIndex, visibleRange?.endValue ?? maxIndex));

  return {
    visibleStart,
    visibleEnd,
  };
}

function getVisibleDistinctYearCount(
  timestamps: string[],
  visibleRange?: {
    startValue: number;
    endValue: number;
  } | null,
) {
  if (timestamps.length === 0) {
    return 0;
  }

  const { visibleStart, visibleEnd } = getVisibleChartBounds(timestamps.length, visibleRange);
  const years = new Set<number>();

  for (let index = visibleStart; index <= visibleEnd; index += 1) {
    const date = parseChartDate(timestamps[index] ?? "");

    if (!date) {
      continue;
    }

    years.add(getSeoulDateParts(date).year);
  }

  return years.size;
}

function shouldUseYearOnlyChartLabels(
  period: StockChartPeriod,
  timestamps: string[],
  visibleRange?: {
    startValue: number;
    endValue: number;
  } | null,
) {
  if (period === "1MIN" || period === "1Y") {
    return false;
  }

  return getVisibleDistinctYearCount(timestamps, visibleRange) >= 4;
}

export function formatChartAxisLabel(
  timestamp: string,
  period: StockChartPeriod,
  timestamps: string[] = [],
  visibleRange?: {
    startValue: number;
    endValue: number;
  } | null,
) {
  const date = parseChartDate(timestamp);

  if (!date) {
    return "";
  }

  const parts = getSeoulDateParts(date);

  if (period === "1MIN") {
    return `${padTimeUnit(parts.hour)}:${padTimeUnit(parts.minute)}`;
  }

  if (shouldUseYearOnlyChartLabels(period, timestamps, visibleRange)) {
    return `${parts.year}년`;
  }

  if (period === "1D" || period === "1W") {
    return parts.month === 1 ? `${parts.year}년` : `${parts.month}월`;
  }

  if (period === "1M" || period === "1Y") {
    return `${parts.year}년`;
  }

  return "";
}

export function shouldShowChartLabel(
  index: number,
  total: number,
  period: StockChartPeriod,
  timestamps: string[] = [],
  visibleRange?: {
    startValue: number;
    endValue: number;
  } | null,
) {
  const maxLabelCounts: Record<StockChartPeriod, number> = {
    "1MIN": 6,
    "1D": 7,
    "1W": 8,
    "1M": 7,
    "1Y": 7,
  };

  const { visibleStart, visibleEnd } = getVisibleChartBounds(total, visibleRange);

  if (index < visibleStart || index > visibleEnd) {
    return false;
  }

  if (shouldUseYearOnlyChartLabels(period, timestamps, visibleRange) && timestamps.length > 0) {
    const currentDate = parseChartDate(timestamps[index] ?? "");
    const previousDate = index > visibleStart ? parseChartDate(timestamps[index - 1] ?? "") : null;

    if (!currentDate) {
      return false;
    }

    const currentYear = getSeoulDateParts(currentDate).year;
    const previousYear = previousDate ? getSeoulDateParts(previousDate).year : null;

    return index === visibleStart || currentYear !== previousYear;
  }

  if (period === "1M" && timestamps.length > 0) {
    const currentDate = parseChartDate(timestamps[index] ?? "");
    const previousDate = index > visibleStart ? parseChartDate(timestamps[index - 1] ?? "") : null;

    if (!currentDate) {
      return false;
    }

    const currentYear = getSeoulDateParts(currentDate).year;
    const previousYear = previousDate ? getSeoulDateParts(previousDate).year : null;

    return index === visibleStart || currentYear !== previousYear;
  }

  const labelCount = Math.max(2, maxLabelCounts[period]);
  const visibleTotal = visibleEnd - visibleStart + 1;

  if (visibleTotal <= labelCount) {
    return true;
  }

  const targetIndexes = new Set<number>();

  for (let step = 0; step < labelCount; step += 1) {
    const distributedIndex = visibleStart + Math.round((step * (visibleTotal - 1)) / (labelCount - 1));
    targetIndexes.add(distributedIndex);
  }

  return targetIndexes.has(index);
}

export function getFinancialDisplayUnit(values: Array<number | null | undefined>): FinancialDisplayUnit {
  const finiteValues = values.filter((value): value is number => isFiniteNumber(value));
  const maxAbsValue = finiteValues.reduce((max, value) => Math.max(max, Math.abs(value)), 0);

  return maxAbsValue >= KOREAN_WON_PER_JO ? "조" : "억";
}

export function formatFinancialValue(value: number | null | undefined, unit: FinancialDisplayUnit = "조") {
  if (!isFiniteNumber(value)) {
    return "-";
  }

  const divisor = unit === "조" ? KOREAN_WON_PER_JO : KOREAN_WON_PER_EOK;
  const scaledValue = value / divisor;
  const absScaledValue = Math.abs(scaledValue);
  const digits = absScaledValue >= 100 ? 0 : absScaledValue >= 10 ? 1 : 2;

  return scaledValue
    .toFixed(digits)
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, "");
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

function compareFinancialItems(a: StockFinancialItem, b: StockFinancialItem) {
  if (a.year !== b.year) {
    return a.year - b.year;
  }

  return (a.quarter ?? 0) - (b.quarter ?? 0);
}

function normalizeQuarterlyFinancials(financials: StockFinancialItem[]) {
  const runningSumsByYear = new Map<
    number,
    {
      revenue: number;
      operatingProfit: number;
    }
  >();

  return [...financials]
    .sort(compareFinancialItems)
    .map((item) => {
      if (item.quarter !== 4) {
        if (typeof item.quarter === "number" && item.quarter >= 1 && item.quarter <= 3) {
          const previousSums = runningSumsByYear.get(item.year) ?? {
            revenue: 0,
            operatingProfit: 0,
          };

          runningSumsByYear.set(item.year, {
            revenue: previousSums.revenue + item.revenue,
            operatingProfit: previousSums.operatingProfit + item.operatingProfit,
          });
        }

        return item;
      }

      const previousSums = runningSumsByYear.get(item.year) ?? {
        revenue: 0,
        operatingProfit: 0,
      };

      return {
        ...item,
        revenue: item.revenue - previousSums.revenue,
        operatingProfit: item.operatingProfit - previousSums.operatingProfit,
      };
    });
}

export function getVisibleFinancials(financials: StockFinancialItem[], type: StockFinancialType) {
  const sortedFinancials =
    type === "QUARTERLY"
      ? normalizeQuarterlyFinancials(financials)
      : [...financials].sort(compareFinancialItems);
  return type === "QUARTERLY" ? sortedFinancials.slice(-4) : sortedFinancials;
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
