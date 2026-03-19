import { MARKET_CATEGORIES, formatCategoryDisplayName, normalizeCategoryKey } from "@/shared/lib/marketCategories";
import type { StockRankingMetric, StocksApiSort } from "../types/stocks";

export const STOCK_PAGE_SIZE = 30;
export const STOCK_TOTAL_COUNT = 200;
export const ALL_SECTOR = "전체";

export const STOCK_SECTOR_OPTIONS = [ALL_SECTOR, ...MARKET_CATEGORIES.map((category) => category.name)] as const;

const STOCK_SECTOR_ALIASES: Record<string, string[]> = {
  [normalizeCategoryKey("에너지")]: ["에너지"],
  [normalizeCategoryKey("친환경 / 탄소")]: ["친환경 / 탄소", "신재생"],
  [normalizeCategoryKey("소재")]: ["소재", "화학", "철강"],
  [normalizeCategoryKey("반도체")]: ["반도체"],
  [normalizeCategoryKey("디스플레이")]: ["디스플레이"],
  [normalizeCategoryKey("전자부품")]: ["전자부품"],
  [normalizeCategoryKey("IT플랫폼 / 소프트웨어")]: ["IT플랫폼 / 소프트웨어", "플랫폼"],
  [normalizeCategoryKey("게임 / 디지털콘텐츠")]: ["게임 / 디지털콘텐츠", "게임", "엔터"],
  [normalizeCategoryKey("2차전지")]: ["2차전지", "이차전지"],
  [normalizeCategoryKey("스마트기기")]: ["스마트기기"],
  [normalizeCategoryKey("기계 / 산업장비")]: ["기계 / 산업장비", "로봇"],
  [normalizeCategoryKey("건설 / 인프라")]: ["건설 / 인프라", "건설"],
  [normalizeCategoryKey("조선")]: ["조선"],
  [normalizeCategoryKey("방산")]: ["방산"],
  [normalizeCategoryKey("운송 / 물류")]: ["운송 / 물류", "항공"],
  [normalizeCategoryKey("소비내구재")]: ["소비내구재", "자동차"],
  [normalizeCategoryKey("필수소비재")]: ["필수소비재"],
  [normalizeCategoryKey("패션 / 뷰티")]: ["패션 / 뷰티", "화장품"],
  [normalizeCategoryKey("유통 / 서비스")]: ["유통 / 서비스", "유통", "통신"],
  [normalizeCategoryKey("금융 / 헬스케어")]: ["금융 / 헬스케어", "금융", "바이오"],
  [normalizeCategoryKey("기타")]: ["기타", "지주사"],
};

export const STOCK_RANKING_TABS: Array<{
  value: StockRankingMetric;
  label: string;
}> = [
  { value: "TURNOVER", label: "거래대금" },
  { value: "VOLUME", label: "거래량" },
  { value: "DIVIDEND", label: "배당" },
];

function normalizeStockSectorKey(value: string) {
  const normalized = normalizeCategoryKey(value);

  if (normalized === "이차전지") {
    return "2차전지";
  }

  return normalized;
}

export function getStockSectorOptionLabel(value: string) {
  if (value === ALL_SECTOR) {
    return value;
  }

  return formatCategoryDisplayName(value);
}

export function isSupportedStockSectorOption(value: string) {
  return (STOCK_SECTOR_OPTIONS as readonly string[]).includes(value);
}

export function isMatchedStockSector(selectedSector: string, stockSector: string) {
  if (!selectedSector || selectedSector === ALL_SECTOR) {
    return true;
  }

  const selectedKey = normalizeStockSectorKey(selectedSector);
  const stockKey = normalizeStockSectorKey(stockSector);

  if (selectedKey === stockKey) {
    return true;
  }

  return (STOCK_SECTOR_ALIASES[selectedKey] ?? []).some((alias) => normalizeStockSectorKey(alias) === stockKey);
}

export function getApiSortForRankingMetric(metric: StockRankingMetric): StocksApiSort {
  switch (metric) {
    case "TURNOVER":
      return "TRADING_VALUE";
    case "VOLUME":
      return "TRADING_VOLUME";
    case "DIVIDEND":
      return "DIVIDEND_YIELD";
    case "RETURN":
      return "CHANGE";
    default:
      return "TRADING_VALUE";
  }
}
