import type {
  StockItem,
  StockMarketCapFilter,
  StockSignal,
  StockSignalFilter,
  StocksApiSort,
  StocksQueryParams,
  StocksResponse,
} from "../types/stocks";
import { ALL_SECTOR, isMatchedStockSector, isSupportedStockSectorOption } from "./stocksFilters";

type SectorSeed = {
  sector: string;
  names: [string, string, string];
  tickerBase: number;
  priceBase: number;
  tradingValueBase: number;
  tradingVolumeBase: number;
  dividendBase: number;
  marketCapBase: number;
};

const WATCHLIST_SEED_IDS = new Set([4, 9, 16, 24, 31, 47, 55]);

const sectorSeeds: SectorSeed[] = [
  {
    sector: "반도체",
    names: ["쌀숭전자", "한빛칩스", "네오웨이퍼"],
    tickerBase: 5930,
    priceBase: 74300,
    tradingValueBase: 582_000_000_000,
    tradingVolumeBase: 3_450_000,
    dividendBase: 1.85,
    marketCapBase: 420_000_000_000_000,
  },
  {
    sector: "자동차",
    names: ["미래모터스", "다온오토", "프라임드라이브"],
    tickerBase: 5380,
    priceBase: 218000,
    tradingValueBase: 465_000_000_000,
    tradingVolumeBase: 2_650_000,
    dividendBase: 2.1,
    marketCapBase: 176_000_000_000_000,
  },
  {
    sector: "이차전지",
    names: ["블루셀에너지", "넥스트배터리", "그린볼트"],
    tickerBase: 373220,
    priceBase: 336500,
    tradingValueBase: 498_000_000_000,
    tradingVolumeBase: 2_880_000,
    dividendBase: 0.45,
    marketCapBase: 152_000_000_000_000,
  },
  {
    sector: "바이오",
    names: ["에이원바이오", "휴먼젠랩", "셀비전"],
    tickerBase: 68270,
    priceBase: 124000,
    tradingValueBase: 301_000_000_000,
    tradingVolumeBase: 2_120_000,
    dividendBase: 0.1,
    marketCapBase: 96_000_000_000_000,
  },
  {
    sector: "금융",
    names: ["한결금융지주", "코어캐피탈", "다온뱅크"],
    tickerBase: 55550,
    priceBase: 63200,
    tradingValueBase: 288_000_000_000,
    tradingVolumeBase: 3_700_000,
    dividendBase: 3.25,
    marketCapBase: 88_000_000_000_000,
  },
  {
    sector: "플랫폼",
    names: ["링크포털", "넥스테이지", "모먼트랩"],
    tickerBase: 35720,
    priceBase: 151500,
    tradingValueBase: 334_000_000_000,
    tradingVolumeBase: 2_010_000,
    dividendBase: 0.3,
    marketCapBase: 82_000_000_000_000,
  },
  {
    sector: "엔터",
    names: ["스타웨이브", "드림스튜디오", "비트엔터"],
    tickerBase: 352820,
    priceBase: 88900,
    tradingValueBase: 214_000_000_000,
    tradingVolumeBase: 1_760_000,
    dividendBase: 0.55,
    marketCapBase: 54_000_000_000_000,
  },
  {
    sector: "게임",
    names: ["레벨업게임즈", "제로원인터랙티브", "플레이허브"],
    tickerBase: 365570,
    priceBase: 74400,
    tradingValueBase: 226_000_000_000,
    tradingVolumeBase: 1_980_000,
    dividendBase: 0.22,
    marketCapBase: 49_000_000_000_000,
  },
  {
    sector: "조선",
    names: ["오션크래프트", "블루도크조선", "하이마린"],
    tickerBase: 329180,
    priceBase: 176500,
    tradingValueBase: 267_000_000_000,
    tradingVolumeBase: 1_420_000,
    dividendBase: 1.4,
    marketCapBase: 43_000_000_000_000,
  },
  {
    sector: "방산",
    names: ["에이펙스디펜스", "실드테크", "프론티어시스템"],
    tickerBase: 122630,
    priceBase: 143000,
    tradingValueBase: 251_000_000_000,
    tradingVolumeBase: 1_360_000,
    dividendBase: 1.05,
    marketCapBase: 39_000_000_000_000,
  },
  {
    sector: "로봇",
    names: ["모션다이내믹스", "휴머노이드랩", "오토메카"],
    tickerBase: 454910,
    priceBase: 92800,
    tradingValueBase: 189_000_000_000,
    tradingVolumeBase: 1_580_000,
    dividendBase: 0.18,
    marketCapBase: 35_000_000_000_000,
  },
  {
    sector: "신재생",
    names: ["솔라브릿지", "윈드플로우", "그린그리드"],
    tickerBase: 475150,
    priceBase: 51700,
    tradingValueBase: 165_000_000_000,
    tradingVolumeBase: 1_840_000,
    dividendBase: 1.18,
    marketCapBase: 31_000_000_000_000,
  },
  {
    sector: "화학",
    names: ["코어케미칼", "에코폴리머", "퓨어소재"],
    tickerBase: 51920,
    priceBase: 67300,
    tradingValueBase: 178_000_000_000,
    tradingVolumeBase: 1_260_000,
    dividendBase: 2.42,
    marketCapBase: 29_000_000_000_000,
  },
  {
    sector: "철강",
    names: ["스틸포지", "메탈코어", "유니온철강"],
    tickerBase: 54900,
    priceBase: 43600,
    tradingValueBase: 156_000_000_000,
    tradingVolumeBase: 1_980_000,
    dividendBase: 3.05,
    marketCapBase: 24_000_000_000_000,
  },
  {
    sector: "건설",
    names: ["한길건설", "스카이라인개발", "도시인프라"],
    tickerBase: 2870,
    priceBase: 38900,
    tradingValueBase: 132_000_000_000,
    tradingVolumeBase: 1_440_000,
    dividendBase: 2.74,
    marketCapBase: 21_000_000_000_000,
  },
  {
    sector: "유통",
    names: ["메가리테일", "코어커머스", "에브리마켓"],
    tickerBase: 69500,
    priceBase: 25700,
    tradingValueBase: 141_000_000_000,
    tradingVolumeBase: 2_240_000,
    dividendBase: 1.92,
    marketCapBase: 18_000_000_000_000,
  },
  {
    sector: "통신",
    names: ["퀀텀텔레콤", "링크네트웍스", "웨이브모바일"],
    tickerBase: 17670,
    priceBase: 51200,
    tradingValueBase: 117_000_000_000,
    tradingVolumeBase: 1_160_000,
    dividendBase: 4.18,
    marketCapBase: 15_000_000_000_000,
  },
  {
    sector: "항공",
    names: ["스카이익스프레스", "에어브릿지", "플라이트원"],
    tickerBase: 298690,
    priceBase: 47300,
    tradingValueBase: 128_000_000_000,
    tradingVolumeBase: 1_720_000,
    dividendBase: 0.84,
    marketCapBase: 13_000_000_000_000,
  },
  {
    sector: "지주사",
    names: ["센트럴홀딩스", "넥스트지주", "비전인베스트"],
    tickerBase: 267250,
    priceBase: 60400,
    tradingValueBase: 123_000_000_000,
    tradingVolumeBase: 980_000,
    dividendBase: 3.84,
    marketCapBase: 11_000_000_000_000,
  },
  {
    sector: "화장품",
    names: ["루미에르뷰티", "스킨포커스", "글로우랩"],
    tickerBase: 91050,
    priceBase: 38100,
    tradingValueBase: 136_000_000_000,
    tradingVolumeBase: 2_460_000,
    dividendBase: 1.24,
    marketCapBase: 9_800_000_000_000,
  },
];

const signalCycle: StockSignal[] = ["BUY", "HOLD", "SELL"];

function toMarketCapSize(value: number): Exclude<StockMarketCapFilter, "ALL"> {
  return value >= 30_000_000_000_000 ? "LARGE" : "MID";
}

function createBaseRate(index: number, stockIndex: number) {
  const trend = ((index % 5) - 2) * 0.76;
  const offset = (stockIndex - 1) * 0.48;
  return Number((trend + offset).toFixed(2));
}

function createMockStocks() {
  return sectorSeeds.flatMap((seed, sectorIndex) =>
    seed.names.map((name, stockIndex) => {
      const id = sectorIndex * 3 + stockIndex + 1;
      const marketCap = seed.marketCapBase - stockIndex * 1_200_000_000_000;

      return {
        rank: id,
        id,
        ticker: String(seed.tickerBase + stockIndex * 17).padStart(6, "0"),
        name,
        gicsSector: seed.sector,
        price: seed.priceBase + stockIndex * 2100 + sectorIndex * 180,
        fluctuationRate: createBaseRate(sectorIndex, stockIndex),
        signal: signalCycle[id % signalCycle.length],
        confidence: 57 + ((sectorIndex * 7 + stockIndex * 11) % 37),
        isWatchlisted: WATCHLIST_SEED_IDS.has(id),
        tradingValue: seed.tradingValueBase - sectorIndex * 4_300_000_000 - stockIndex * 8_200_000_000,
        tradingVolume: seed.tradingVolumeBase + sectorIndex * 74_000 + stockIndex * 146_000,
        dividendYield: Number((seed.dividendBase + stockIndex * 0.26).toFixed(2)),
        marketCap,
        marketCapSize: toMarketCapSize(marketCap),
      } satisfies StockItem;
    }),
  );
}

const MOCK_STOCKS = createMockStocks();

function getLiveWave(stockId: number) {
  const bucket = Math.floor(Date.now() / 15_000);
  return (((stockId * 13 + bucket * 7) % 9) - 4) * 0.18;
}

function applyLiveSnapshot(stock: StockItem): StockItem {
  const bucket = Math.floor(Date.now() / 15_000);
  const wave = getLiveWave(stock.id);
  const nextRate = Number((stock.fluctuationRate + wave).toFixed(2));

  return {
    ...stock,
    price: Math.max(1000, Math.round(stock.price * (1 + wave / 120))),
    fluctuationRate: nextRate,
    confidence: Math.max(48, Math.min(99, stock.confidence + (((bucket + stock.id) % 3) - 1))),
    tradingValue: Math.max(10_000_000_000, Math.round(stock.tradingValue * (1 + wave / 55))),
    tradingVolume: Math.max(50_000, Math.round(stock.tradingVolume * (1 + Math.abs(wave) / 35))),
  };
}

function sortByApi(stocks: StockItem[], sort: StocksApiSort) {
  if (sort === "MARKET_CAP") {
    return [...stocks].sort((left, right) => right.marketCap - left.marketCap || right.tradingValue - left.tradingValue);
  }

  return [...stocks].sort(
    (left, right) => right.fluctuationRate - left.fluctuationRate || right.tradingValue - left.tradingValue,
  );
}

function filterBySignal(stocks: StockItem[], signal: StockSignalFilter) {
  if (signal === "ALL") {
    return stocks;
  }

  return stocks.filter((stock) => stock.signal === signal);
}

function filterByKeyword(stocks: StockItem[], keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return stocks;
  }

  return stocks.filter((stock) => {
    const normalizedName = stock.name.toLowerCase();
    return normalizedName.includes(normalizedKeyword) || stock.ticker.includes(normalizedKeyword);
  });
}

function filterBySector(stocks: StockItem[], sector: string) {
  if (!sector || sector === ALL_SECTOR) {
    return stocks;
  }

  return stocks.filter((stock) => isMatchedStockSector(sector, stock.gicsSector));
}

function filterByMarketCap(stocks: StockItem[], marketCap: StockMarketCapFilter) {
  if (marketCap === "ALL") {
    return stocks;
  }

  return stocks.filter((stock) => stock.marketCapSize === marketCap);
}

function getFilterCounts(stocks: StockItem[]) {
  return {
    buy: stocks.filter((stock) => stock.signal === "BUY").length,
    sell: stocks.filter((stock) => stock.signal === "SELL").length,
    hold: stocks.filter((stock) => stock.signal === "HOLD").length,
  };
}

export function getMockStocksResponse(params: StocksQueryParams): StocksResponse {
  const liveStocks = MOCK_STOCKS.map(applyLiveSnapshot);
  const sectorScopedStocks = filterBySector(liveStocks, params.sector);
  const marketCapScopedStocks = filterByMarketCap(sectorScopedStocks, params.marketCap);
  const keywordScopedStocks = filterByKeyword(marketCapScopedStocks, params.keyword);
  const filterCounts = getFilterCounts(keywordScopedStocks);
  const signalScopedStocks = filterBySignal(keywordScopedStocks, params.signal);
  const sortedStocks = sortByApi(signalScopedStocks, params.sort ?? "CHANGE");
  const slicedStocks = sortedStocks.slice(params.offset, params.offset + params.limit);

  return {
    filterCounts,
    stocks: slicedStocks.map((stock, index) => ({
      ...stock,
      rank: params.offset + index + 1,
    })),
  };
}

export function isSupportedStockSector(value: string) {
  return isSupportedStockSectorOption(value);
}
