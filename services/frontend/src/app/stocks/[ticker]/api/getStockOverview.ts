import { apiFetch } from "@/shared/lib/apiClient";
import type { StockDetailOverview } from "@/app/stocks/types/stockDetail";
import type { StockDetailApiEnvelope } from "./stockDetailApi";
import { unwrapStockDetailResponse } from "./stockDetailApi";

type StockOverviewApiPayload = {
  stockId?: number | null;
  ticker?: string | null;
  name?: string | null;
  marketType?: string | null;
  gicsSector?: string | null;
  category?: string | null;
  latestPrice?: {
    tradeDate?: string | null;
    closePrice?: number | null;
    fluctuationRate?: number | null;
  } | null;
  priceRange52w?: {
    highPrice?: number | null;
    highDate?: string | null;
    lowPrice?: number | null;
    lowDate?: string | null;
    distanceFromHighRate?: number | null;
    distanceFromLowRate?: number | null;
  } | null;
};

type StockBasicInfoApiPayload = {
  id?: number | null;
  ticker?: string | null;
  name?: string | null;
  marketType?: string | null;
  gicsSector?: string | null;
  category?: string | null;
  baseTime?: string | null;
};

function normalizeStockOverview(
  basicInfoPayload: StockBasicInfoApiPayload,
  overviewPayload: StockOverviewApiPayload,
): StockDetailOverview {
  return {
    id:
      typeof overviewPayload.stockId === "number"
        ? overviewPayload.stockId
        : typeof basicInfoPayload.id === "number"
          ? basicInfoPayload.id
          : 0,
    ticker:
      typeof basicInfoPayload.ticker === "string"
        ? basicInfoPayload.ticker
        : typeof overviewPayload.ticker === "string"
          ? overviewPayload.ticker
          : "",
    name:
      typeof basicInfoPayload.name === "string"
        ? basicInfoPayload.name
        : typeof overviewPayload.name === "string"
          ? overviewPayload.name
          : "",
    marketType:
      typeof basicInfoPayload.marketType === "string"
        ? basicInfoPayload.marketType
        : typeof overviewPayload.marketType === "string"
          ? overviewPayload.marketType
          : "",
    gicsSector:
      typeof basicInfoPayload.gicsSector === "string"
        ? basicInfoPayload.gicsSector
        : typeof overviewPayload.gicsSector === "string"
          ? overviewPayload.gicsSector
          : "",
    category:
      typeof basicInfoPayload.category === "string"
        ? basicInfoPayload.category
        : typeof overviewPayload.category === "string"
          ? overviewPayload.category
          : "",
    baseTime: typeof basicInfoPayload.baseTime === "string" ? basicInfoPayload.baseTime : "",
    latestPrice: overviewPayload.latestPrice
      ? {
          tradeDate:
            typeof overviewPayload.latestPrice.tradeDate === "string" ? overviewPayload.latestPrice.tradeDate : null,
          closePrice:
            typeof overviewPayload.latestPrice.closePrice === "number" ? overviewPayload.latestPrice.closePrice : null,
          fluctuationRate:
            typeof overviewPayload.latestPrice.fluctuationRate === "number"
              ? overviewPayload.latestPrice.fluctuationRate
              : null,
        }
      : null,
    priceRange52w: overviewPayload.priceRange52w
      ? {
          highPrice:
            typeof overviewPayload.priceRange52w.highPrice === "number" ? overviewPayload.priceRange52w.highPrice : null,
          highDate:
            typeof overviewPayload.priceRange52w.highDate === "string" ? overviewPayload.priceRange52w.highDate : null,
          lowPrice:
            typeof overviewPayload.priceRange52w.lowPrice === "number" ? overviewPayload.priceRange52w.lowPrice : null,
          lowDate:
            typeof overviewPayload.priceRange52w.lowDate === "string" ? overviewPayload.priceRange52w.lowDate : null,
          distanceFromHighRate:
            typeof overviewPayload.priceRange52w.distanceFromHighRate === "number"
              ? overviewPayload.priceRange52w.distanceFromHighRate
              : null,
          distanceFromLowRate:
            typeof overviewPayload.priceRange52w.distanceFromLowRate === "number"
              ? overviewPayload.priceRange52w.distanceFromLowRate
              : null,
        }
      : null,
  };
}

export async function getStockOverview(ticker: string) {
  const [basicInfoPayload, overviewPayload] = await Promise.all([
    apiFetch<StockBasicInfoApiPayload | StockDetailApiEnvelope<StockBasicInfoApiPayload>>(`/api/stocks/${ticker}`, {
      cache: "no-store",
    }),
    apiFetch<StockOverviewApiPayload | StockDetailApiEnvelope<StockOverviewApiPayload>>(
      `/api/stocks/${ticker}/overview`,
      {
        cache: "no-store",
      },
    ),
  ]);

  return normalizeStockOverview(
    unwrapStockDetailResponse(basicInfoPayload, "종목 기본 정보 응답이 올바르지 않습니다."),
    unwrapStockDetailResponse(overviewPayload, "종목 개요 응답이 올바르지 않습니다."),
  );
}
