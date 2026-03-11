import { formatSignedRate, getRateTone } from "@/shared/lib/stockFormatters";
import type { StockItem, StockRankingMetric } from "../types/stocks";

const numberFormatter = new Intl.NumberFormat("ko-KR");

function formatCurrencyAmount(value: number) {
  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(value >= 10_000_000_000_000 ? 0 : 1)}조`;
  }

  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(value >= 1_000_000_000 ? 0 : 1)}억`;
  }

  return `${numberFormatter.format(Math.round(value))}원`;
}

function formatVolume(value: number) {
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(1)}억주`;
  }

  if (value >= 10_000) {
    return `${(value / 10_000).toFixed(1)}만주`;
  }

  return `${numberFormatter.format(Math.round(value))}주`;
}

export function getMetricValue(item: StockItem, metric: StockRankingMetric) {
  switch (metric) {
    case "TURNOVER":
      return item.tradingValue;
    case "VOLUME":
      return item.tradingVolume;
    case "RETURN":
      return item.fluctuationRate;
    case "DIVIDEND":
      return item.dividendYield;
    default:
      return item.rank;
  }
}

export function sortStocksByMetric(items: StockItem[], metric: StockRankingMetric) {
  return [...items].sort((left, right) => {
    const valueDifference = getMetricValue(right, metric) - getMetricValue(left, metric);

    if (valueDifference !== 0) {
      return valueDifference;
    }

    return left.rank - right.rank;
  });
}

export function getMetricColumnLabel(metric: StockRankingMetric) {
  switch (metric) {
    case "TURNOVER":
      return "거래대금";
    case "VOLUME":
      return "거래량";
    case "RETURN":
      return "수익률";
    case "DIVIDEND":
      return "배당";
    default:
      return "수익률";
  }
}

export function formatMetricValue(item: StockItem, metric: StockRankingMetric) {
  switch (metric) {
    case "TURNOVER":
      return formatCurrencyAmount(item.tradingValue);
    case "VOLUME":
      return formatVolume(item.tradingVolume);
    case "RETURN":
      return formatSignedRate(item.fluctuationRate);
    case "DIVIDEND":
      return `${item.dividendYield.toFixed(2)}%`;
    default:
      return "-";
  }
}

export function getRateClassName(value: number) {
  const tone = getRateTone(value);

  if (tone === "positive") {
    return "text-[color:var(--color-text-danger)]";
  }

  if (tone === "negative") {
    return "text-[color:var(--color-text-info)]";
  }

  return "text-[color:var(--color-text-tertiary)]";
}
