import type {
  WatchlistNotificationResponse,
  WatchlistStatus,
  WatchlistToggleResponse,
} from "@/shared/types/watchlist";

type WatchlistEntry = {
  isNotifiedEnabled: boolean;
};

type MockWatchlistSeed = {
  stockId: number;
  ticker: string;
  name: string;
  sector: string;
  price: number;
  fluctuationRate: number;
  signal: "BUY" | "SELL" | "HOLD";
  confidence: number;
};

type MockWatchlistItem = MockWatchlistSeed & {
  total: number;
};

type MockWatchlistSnapshot = {
  buyCount: number;
  sellCount: number;
  upCount: number;
  watchlist: MockWatchlistItem[];
};

type MockWatchlistSnapshotOptions = {
  page: number;
  limit: number;
};

export type MockWatchlistNewsItem = {
  id: number;
  title: string;
  summary: string;
  source: string;
  url?: string;
  publishedAt: string;
  relatedStocks: string[];
};

type MockWatchlistNewsPayload = {
  news: MockWatchlistNewsItem[];
};

type MockWatchlistNewsOptions = {
  offset?: number;
  limit?: number;
};

const watchlistCatalog = new Map<number, MockWatchlistSeed>([
  [
    1,
    {
      stockId: 1,
      ticker: "005930",
      name: "삼성전자",
      sector: "반도체",
      price: 74300,
      fluctuationRate: 1.24,
      signal: "BUY",
      confidence: 95,
    },
  ],
  [
    4,
    {
      stockId: 4,
      ticker: "207940",
      name: "위원회바이오",
      sector: "바이오",
      price: 214500,
      fluctuationRate: 2.41,
      signal: "BUY",
      confidence: 91,
    },
  ],
  [
    5,
    {
      stockId: 5,
      ticker: "247540",
      name: "에코로직스",
      sector: "2차전지",
      price: 74200,
      fluctuationRate: 1.18,
      signal: "BUY",
      confidence: 84,
    },
  ],
  [
    7,
    {
      stockId: 7,
      ticker: "005380",
      name: "오토비전",
      sector: "자동차",
      price: 56300,
      fluctuationRate: -0.42,
      signal: "HOLD",
      confidence: 74,
    },
  ],
  [
    10,
    {
      stockId: 10,
      ticker: "196170",
      name: "메디싱크",
      sector: "헬스케어",
      price: 99000,
      fluctuationRate: 0.57,
      signal: "BUY",
      confidence: 80,
    },
  ],
  [
    102,
    {
      stockId: 102,
      ticker: "035420",
      name: "NAVER",
      sector: "플랫폼",
      price: 185400,
      fluctuationRate: 1.24,
      signal: "BUY",
      confidence: 88,
    },
  ],
  [
    201,
    {
      stockId: 201,
      ticker: "035720",
      name: "카카오",
      sector: "플랫폼",
      price: 42150,
      fluctuationRate: -2.15,
      signal: "SELL",
      confidence: 81,
    },
  ],
  [
    203,
    {
      stockId: 203,
      ticker: "068270",
      name: "셀트리온",
      sector: "바이오",
      price: 181200,
      fluctuationRate: -0.64,
      signal: "SELL",
      confidence: 76,
    },
  ],
  [
    301,
    {
      stockId: 301,
      ticker: "373220",
      name: "LG에너지솔루션",
      sector: "이차전지",
      price: 341000,
      fluctuationRate: 1.67,
      signal: "BUY",
      confidence: 89,
    },
  ],
  [
    302,
    {
      stockId: 302,
      ticker: "000270",
      name: "기아",
      sector: "자동차",
      price: 103500,
      fluctuationRate: 0.94,
      signal: "BUY",
      confidence: 82,
    },
  ],
  [
    303,
    {
      stockId: 303,
      ticker: "012330",
      name: "현대모비스",
      sector: "자동차",
      price: 251500,
      fluctuationRate: -0.38,
      signal: "HOLD",
      confidence: 73,
    },
  ],
  [
    304,
    {
      stockId: 304,
      ticker: "042700",
      name: "한미반도체",
      sector: "반도체",
      price: 118400,
      fluctuationRate: 2.11,
      signal: "BUY",
      confidence: 86,
    },
  ],
  [
    305,
    {
      stockId: 305,
      ticker: "329180",
      name: "HD현대중공업",
      sector: "조선",
      price: 244000,
      fluctuationRate: 1.32,
      signal: "BUY",
      confidence: 78,
    },
  ],
  [
    306,
    {
      stockId: 306,
      ticker: "105560",
      name: "KB금융",
      sector: "금융",
      price: 87700,
      fluctuationRate: -0.56,
      signal: "SELL",
      confidence: 79,
    },
  ],
  [
    307,
    {
      stockId: 307,
      ticker: "086790",
      name: "하나금융지주",
      sector: "금융",
      price: 61200,
      fluctuationRate: 0.84,
      signal: "BUY",
      confidence: 75,
    },
  ],
  [
    308,
    {
      stockId: 308,
      ticker: "000660",
      name: "SK하이닉스",
      sector: "반도체",
      price: 198400,
      fluctuationRate: 2.48,
      signal: "BUY",
      confidence: 92,
    },
  ],
]);

const watchlistStore = new Map<number, WatchlistEntry>([
  [1, { isNotifiedEnabled: true }],
  [4, { isNotifiedEnabled: true }],
  [5, { isNotifiedEnabled: false }],
  [10, { isNotifiedEnabled: false }],
  [102, { isNotifiedEnabled: false }],
  [201, { isNotifiedEnabled: true }],
  [203, { isNotifiedEnabled: true }],
  [301, { isNotifiedEnabled: true }],
  [302, { isNotifiedEnabled: false }],
  [303, { isNotifiedEnabled: false }],
  [304, { isNotifiedEnabled: true }],
  [305, { isNotifiedEnabled: true }],
  [308, { isNotifiedEnabled: true }],
]);

const watchlistNewsSeeds = [
  {
    id: 1001,
    stockIds: [1, 102],
    title: '"AI 반도체 수요 폭발" 외국인 매수세에 관련주 강세',
    summary:
      "AI 서버 투자 확대 기대가 커지며 반도체와 플랫폼 대형주에 외국인 수급이 몰리고 있습니다. HBM과 데이터센터 투자 흐름이 단기 실적 기대를 자극하는 분위기입니다.",
    source: "한국경제",
    url: "https://www.hankyung.com",
    minutesAgo: 15,
  },
  {
    id: 1002,
    stockIds: [201],
    title: "카카오, 신규 서비스 출시 지연에 성장성 우려 확대",
    summary:
      "핵심 플랫폼 사업의 성장 정체와 신사업 출시 지연이 겹치며 투자 심리가 둔화됐습니다. 증권가에서는 단기 모멘텀 회복 시점에 대한 눈높이를 낮추고 있습니다.",
    source: "매일경제",
    url: "https://www.mk.co.kr",
    minutesAgo: 120,
  },
  {
    id: 1003,
    stockIds: [203, 4],
    title: "바이오 대형주, 임상 일정과 실적 기대 사이 엇갈린 흐름",
    summary:
      "대형 바이오 종목들은 단기 변동성이 확대되고 있지만, 주요 파이프라인 일정과 실적 개선 여부에 따라 종목별 차별화가 이어질 가능성이 높다는 분석이 나옵니다.",
    source: "이데일리",
    url: "https://www.edaily.co.kr",
    minutesAgo: 240,
  },
  {
    id: 1004,
    stockIds: [5, 7],
    title: "2차전지와 자동차 밸류체인, 수급 회복 여부에 주목",
    summary:
      "전기차 업황 둔화 우려에도 불구하고 소재와 완성차 전반의 밸류에이션 매력이 부각되면서 단기 반등 기대가 형성되고 있습니다.",
    source: "서울경제",
    url: "https://www.sedaily.com",
    minutesAgo: 330,
  },
];

function jitterPrice(base: number, spread = 900) {
  return Math.max(1000, Math.round(base + (Math.random() - 0.5) * spread));
}

function jitterRate(base: number, spread = 0.42) {
  return Number((base + (Math.random() - 0.5) * spread).toFixed(2));
}

function getFallbackStock(stockId: number): MockWatchlistSeed {
  return {
    stockId,
    ticker: String(stockId).padStart(6, "0"),
    name: `관심종목 ${stockId}`,
    sector: "기타",
    price: 50000,
    fluctuationRate: 0,
    signal: "HOLD",
    confidence: 70,
  };
}

function resolveCatalogItem(stockId: number) {
  return watchlistCatalog.get(stockId) ?? getFallbackStock(stockId);
}

export function getMockWatchlistStatus(stockId: number): WatchlistStatus {
  const entry = watchlistStore.get(stockId);

  return {
    isWatched: Boolean(entry),
    isNotifiedEnabled: entry?.isNotifiedEnabled ?? false,
  };
}

export function addMockWatchlist(stockId: number): WatchlistToggleResponse {
  watchlistStore.set(stockId, {
    isNotifiedEnabled: false,
  });

  return {
    message: "관심종목 추가 완료",
    count: watchlistStore.size,
  };
}

export function removeMockWatchlist(stockId: number): WatchlistToggleResponse {
  watchlistStore.delete(stockId);

  return {
    message: "관심종목 삭제 완료",
    count: watchlistStore.size,
  };
}

export function toggleMockWatchlistNotification(
  stockId: number,
  isNotifiedEnabled?: boolean,
): WatchlistNotificationResponse {
  const entry = watchlistStore.get(stockId);

  if (!entry) {
    throw new Error("Watchlist entry not found");
  }

  const nextValue =
    typeof isNotifiedEnabled === "boolean"
      ? isNotifiedEnabled
      : !entry.isNotifiedEnabled;

  watchlistStore.set(stockId, {
    isNotifiedEnabled: nextValue,
  });

  return {
    isNotifiedEnabled: nextValue,
  };
}

export function getMockWatchlistSnapshot({ page, limit }: MockWatchlistSnapshotOptions): MockWatchlistSnapshot {
  const watchedItems = Array.from(watchlistStore.keys()).map((stockId) => {
    const catalogItem = resolveCatalogItem(stockId);
    return {
      ...catalogItem,
      price: jitterPrice(catalogItem.price),
      fluctuationRate: jitterRate(catalogItem.fluctuationRate),
    };
  });

  const total = watchedItems.length;
  const totalPages = total === 0 ? 1 : Math.ceil(total / Math.max(1, limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const safeLimit = Math.max(1, limit);
  const pageStart = (safePage - 1) * safeLimit;
  const paginatedItems = watchedItems.slice(pageStart, pageStart + safeLimit);

  return {
    buyCount: watchedItems.filter((item) => item.signal === "BUY").length,
    sellCount: watchedItems.filter((item) => item.signal === "SELL").length,
    upCount: watchedItems.filter((item) => item.fluctuationRate > 0).length,
    watchlist: paginatedItems.map((item) => ({
      ...item,
      total,
    })),
  };
}

export function getMockWatchlistNews(options: MockWatchlistNewsOptions = {}): MockWatchlistNewsPayload {
  const watchedStockIds = new Set(watchlistStore.keys());
  const safeOffset = Math.max(0, options.offset ?? 0);
  const safeLimit = options.limit === undefined ? Number.POSITIVE_INFINITY : Math.max(1, options.limit);

  return {
    news: watchlistNewsSeeds
      .filter((item) => item.stockIds.some((stockId) => watchedStockIds.has(stockId)))
      .map((item) => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        source: item.source,
        url: item.url,
        publishedAt: new Date(Date.now() - item.minutesAgo * 60_000).toISOString(),
        relatedStocks: item.stockIds
          .filter((stockId) => watchedStockIds.has(stockId))
          .map((stockId) => resolveCatalogItem(stockId).name),
      }))
      .slice(safeOffset, safeOffset + safeLimit),
  };
}
