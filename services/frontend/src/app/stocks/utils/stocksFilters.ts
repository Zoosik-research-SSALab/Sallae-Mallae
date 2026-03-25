import type { StockRankingMetric, StocksApiSort } from "../types/stocks";

export const STOCK_PAGE_SIZE = 30;
export const STOCK_TOTAL_COUNT = 200;
export const ALL_SECTOR = "전체";

const STOCK_SECTOR_LABELS = [
  "에너지",
  "친환경 / 탄소",
  "소재",
  "반도체",
  "디스플레이",
  "전자부품",
  "IT플랫폼 / 소프트웨어",
  "게임 / 디지털콘텐츠",
  "2차전지",
  "스마트기기",
  "기계 / 산업장비",
  "건설 / 인프라",
  "조선",
  "방산",
  "운송 / 물류",
  "소비내구재",
  "필수소비재",
  "패션 / 뷰티",
  "유통 / 서비스",
  "금융 / 헬스케어",
  "기타",
] as const;

export const STOCK_SECTOR_OPTIONS = [ALL_SECTOR, ...STOCK_SECTOR_LABELS] as const;

const STOCK_SECTOR_REQUEST_MAP: Record<(typeof STOCK_SECTOR_LABELS)[number], string> = {
  에너지: "ENERGY",
  "친환경 / 탄소": "GREEN_CARBON",
  소재: "MATERIALS",
  반도체: "SEMICONDUCTOR",
  디스플레이: "DISPLAY",
  전자부품: "ELECTRONIC_COMPONENTS",
  "IT플랫폼 / 소프트웨어": "IT_PLATFORM_SOFTWARE",
  "게임 / 디지털콘텐츠": "GAME_DIGITAL_CONTENT",
  "2차전지": "SECONDARY_BATTERY",
  스마트기기: "SMART_DEVICES",
  "기계 / 산업장비": "MACHINERY_INDUSTRIAL_EQUIPMENT",
  "건설 / 인프라": "CONSTRUCTION_INFRA",
  조선: "SHIPBUILDING",
  방산: "DEFENSE",
  "운송 / 물류": "TRANSPORT_LOGISTICS",
  소비내구재: "CONSUMER_DURABLES",
  필수소비재: "CONSUMER_STAPLES",
  "패션 / 뷰티": "FASHION_BEAUTY",
  "유통 / 서비스": "RETAIL_SERVICES",
  "금융 / 헬스케어": "FINANCE_HEALTHCARE",
  기타: "ETC",
};

const STOCK_SECTOR_LABEL_BY_REQUEST_VALUE = Object.fromEntries(
  Object.entries(STOCK_SECTOR_REQUEST_MAP).map(([label, requestValue]) => [requestValue, label]),
) as Record<string, string>;

const STOCK_SECTOR_ALIASES: Record<string, string[]> = {
  [normalizeStockSectorKey("에너지")]: ["에너지"],
  [normalizeStockSectorKey("친환경 / 탄소")]: ["친환경 / 탄소", "신재생"],
  [normalizeStockSectorKey("소재")]: ["소재", "화학", "철강"],
  [normalizeStockSectorKey("반도체")]: ["반도체"],
  [normalizeStockSectorKey("디스플레이")]: ["디스플레이"],
  [normalizeStockSectorKey("전자부품")]: ["전자부품"],
  [normalizeStockSectorKey("IT플랫폼 / 소프트웨어")]: ["IT플랫폼 / 소프트웨어", "플랫폼"],
  [normalizeStockSectorKey("게임 / 디지털콘텐츠")]: ["게임 / 디지털콘텐츠", "게임", "엔터"],
  [normalizeStockSectorKey("2차전지")]: ["2차전지", "이차전지"],
  [normalizeStockSectorKey("스마트기기")]: ["스마트기기"],
  [normalizeStockSectorKey("기계 / 산업장비")]: ["기계 / 산업장비", "로봇"],
  [normalizeStockSectorKey("건설 / 인프라")]: ["건설 / 인프라", "건설"],
  [normalizeStockSectorKey("조선")]: ["조선"],
  [normalizeStockSectorKey("방산")]: ["방산"],
  [normalizeStockSectorKey("운송 / 물류")]: ["운송 / 물류", "항공"],
  [normalizeStockSectorKey("소비내구재")]: ["소비내구재", "자동차"],
  [normalizeStockSectorKey("필수소비재")]: ["필수소비재"],
  [normalizeStockSectorKey("패션 / 뷰티")]: ["패션 / 뷰티", "화장품"],
  [normalizeStockSectorKey("유통 / 서비스")]: ["유통 / 서비스", "유통", "통신"],
  [normalizeStockSectorKey("금융 / 헬스케어")]: ["금융 / 헬스케어", "금융", "바이오"],
  [normalizeStockSectorKey("기타")]: ["기타", "지주사"],
};

export const STOCK_RANKING_TABS: Array<{
  value: StockRankingMetric;
  label: string;
}> = [
  { value: "TURNOVER", label: "거래대금" },
  { value: "VOLUME", label: "거래량" },
];

function normalizeStockSectorKey(value: string) {
  const normalized = value.replace(/\s*\/\s*/g, "").replace(/\s+/g, "").trim();

  if (normalized === "이차전지") {
    return "2차전지";
  }

  return normalized;
}

export function getStockSectorOptionLabel(value: string) {
  return value;
}

export function isSupportedStockSectorOption(value: string) {
  return (STOCK_SECTOR_OPTIONS as readonly string[]).includes(value);
}

export function isSupportedStockSectorRequestValue(value: string) {
  return value in STOCK_SECTOR_LABEL_BY_REQUEST_VALUE;
}

export function toStockSectorRequestValue(value: string) {
  return STOCK_SECTOR_REQUEST_MAP[value as keyof typeof STOCK_SECTOR_REQUEST_MAP] ?? value;
}

export function fromStockSectorRequestValue(value: string) {
  return STOCK_SECTOR_LABEL_BY_REQUEST_VALUE[value] ?? value;
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
