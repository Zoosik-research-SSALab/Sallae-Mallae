import type {
  CategoriesPayload,
  MarketIndexPayload,
  NewSignalsPayload,
  PopularSearchesPayload,
  TopStocksPayload,
} from "@/app/home/types/main";

const topStockSeeds = [
  { stockId: 1, name: "쌀숭전자", price: 162500, fluctuationRate: 2.45, signal: "strong_buy", confidence: 96 },
  { stockId: 2, name: "쌀숭금융", price: 89500, fluctuationRate: 1.92, signal: "buy", confidence: 90 },
  { stockId: 3, name: "살래모빌리티", price: 118200, fluctuationRate: 3.21, signal: "buy", confidence: 89 },
  { stockId: 4, name: "위원회바이오", price: 214500, fluctuationRate: 5.42, signal: "strong_buy", confidence: 94 },
  { stockId: 5, name: "에코로직스", price: 74200, fluctuationRate: 1.18, signal: "buy", confidence: 84 },
  { stockId: 6, name: "스마트반도체", price: 132000, fluctuationRate: 0.86, signal: "watch", confidence: 79 },
  { stockId: 7, name: "오토비전", price: 56300, fluctuationRate: -0.42, signal: "watch", confidence: 74 },
  { stockId: 8, name: "딥시그널", price: 38150, fluctuationRate: 1.05, signal: "buy", confidence: 82 },
  { stockId: 9, name: "그린웨이", price: 44800, fluctuationRate: -0.18, signal: "watch", confidence: 71 },
  { stockId: 10, name: "메디싱크", price: 99000, fluctuationRate: 0.57, signal: "buy", confidence: 80 },
];

const buySignalSeeds = [
  { stockId: 101, ticker: "005930", name: "쌀숭전자", confidence: 94, price: 162500, fluctuationRate: 2.45 },
  { stockId: 102, ticker: "035420", name: "NAVER", confidence: 88, price: 185400, fluctuationRate: 1.24 },
  { stockId: 103, ticker: "207940", name: "위원회바이오", confidence: 85, price: 842000, fluctuationRate: 0 },
];

const sellSignalSeeds = [
  { stockId: 201, ticker: "035720", name: "카카오", confidence: 81, price: 42150, fluctuationRate: -2.15 },
  { stockId: 202, ticker: "066570", name: "오토비전", confidence: 78, price: 105300, fluctuationRate: -1.33 },
  { stockId: 203, ticker: "068270", name: "셀트리온", confidence: 76, price: 181200, fluctuationRate: -0.64 },
];

const categorySeeds = [
  { name: "에너지", stocks: [{ name: "SK이노베이션", price: 111300, fluctuationRate: 1.12 }, { name: "S-Oil", price: 67800, fluctuationRate: -0.42 }] },
  { name: "친환경 / 탄소", stocks: [{ name: "한화솔루션", price: 29850, fluctuationRate: 2.31 }, { name: "씨에스윈드", price: 48700, fluctuationRate: 0.76 }] },
  { name: "소재", stocks: [{ name: "LG화학", price: 319500, fluctuationRate: -0.88 }, { name: "금호석유", price: 132400, fluctuationRate: 1.08 }] },
  { name: "반도체", stocks: [{ name: "삼성전자", price: 73200, fluctuationRate: 1.64 }, { name: "SK하이닉스", price: 184300, fluctuationRate: 2.28 }] },
  { name: "디스플레이", stocks: [{ name: "LG디스플레이", price: 10420, fluctuationRate: -0.72 }, { name: "덕산네오룩스", price: 34200, fluctuationRate: 0.93 }] },
  { name: "전자부품", stocks: [{ name: "삼성전기", price: 148600, fluctuationRate: 0.52 }, { name: "LG이노텍", price: 221000, fluctuationRate: -1.14 }] },
  { name: "IT플랫폼 / 소프트웨어", stocks: [{ name: "NAVER", price: 185400, fluctuationRate: 1.24 }, { name: "카카오", price: 42150, fluctuationRate: -2.15 }] },
  { name: "게임 / 디지털콘텐츠", stocks: [{ name: "크래프톤", price: 292500, fluctuationRate: 1.45 }, { name: "엔씨소프트", price: 212000, fluctuationRate: -0.64 }] },
  { name: "2차전지", stocks: [{ name: "에코프로비엠", price: 174200, fluctuationRate: 2.74 }, { name: "포스코퓨처엠", price: 237500, fluctuationRate: 1.18 }] },
  { name: "스마트기기", stocks: [{ name: "파트론", price: 8180, fluctuationRate: 0.44 }, { name: "캠시스", price: 1560, fluctuationRate: -0.19 }] },
  { name: "기계 / 산업장비", stocks: [{ name: "두산밥캣", price: 48950, fluctuationRate: 1.63 }, { name: "HD현대인프라코어", price: 8980, fluctuationRate: 0.57 }] },
  { name: "건설 / 인프라", stocks: [{ name: "현대건설", price: 33900, fluctuationRate: 0.82 }, { name: "DL이앤씨", price: 34350, fluctuationRate: -0.51 }] },
  { name: "조선", stocks: [{ name: "HD한국조선해양", price: 214000, fluctuationRate: 3.12 }, { name: "한화오션", price: 39550, fluctuationRate: 2.08 }] },
  { name: "방산", stocks: [{ name: "한화에어로스페이스", price: 385000, fluctuationRate: 4.41 }, { name: "LIG넥스원", price: 213500, fluctuationRate: 1.36 }] },
  { name: "운송 / 물류", stocks: [{ name: "현대글로비스", price: 122900, fluctuationRate: -0.38 }, { name: "대한항공", price: 22150, fluctuationRate: 0.67 }] },
  { name: "소비내구재", stocks: [{ name: "코웨이", price: 63700, fluctuationRate: 0.53 }, { name: "쿠쿠홈시스", price: 24250, fluctuationRate: -0.27 }] },
  { name: "필수소비재", stocks: [{ name: "오리온", price: 116400, fluctuationRate: 0.34 }, { name: "농심", price: 384000, fluctuationRate: -0.22 }] },
  { name: "패션 / 뷰티", stocks: [{ name: "아모레퍼시픽", price: 131200, fluctuationRate: 1.07 }, { name: "F&F", price: 67600, fluctuationRate: -0.73 }] },
  { name: "유통 / 서비스", stocks: [{ name: "이마트", price: 74500, fluctuationRate: -0.84 }, { name: "호텔신라", price: 49500, fluctuationRate: 0.48 }] },
  { name: "금융 / 헬스케어", stocks: [{ name: "삼성생명", price: 94800, fluctuationRate: 0.41 }, { name: "셀트리온", price: 181200, fluctuationRate: -0.64 }] },
  { name: "기타", stocks: [{ name: "포스코홀딩스", price: 432500, fluctuationRate: 0.92 }, { name: "한국전력", price: 21050, fluctuationRate: -0.16 }] },
];

const popularSearchSeeds = ["에코프로비엠", "NAVER", "HLB", "쌀숭전자", "알테오젠"];

function jitterPrice(base: number, spread = 700) {
  return Math.max(1000, Math.round(base + (Math.random() - 0.5) * spread));
}

function jitterRate(base: number, spread = 0.35) {
  return Number((base + (Math.random() - 0.5) * spread).toFixed(2));
}

export function getTopStocksMock(): TopStocksPayload {
  return {
    stocks: topStockSeeds.map((item, index) => ({
      rank: index + 1,
      stockId: item.stockId,
      name: item.name,
      price: jitterPrice(item.price),
      fluctuationRate: jitterRate(item.fluctuationRate),
      signal: item.signal,
      confidence: item.confidence,
    })),
  };
}

export function getNewSignalsMock(): NewSignalsPayload {
  return {
    buy: buySignalSeeds.map((item) => ({
      ...item,
      price: jitterPrice(item.price, 500),
      fluctuationRate: jitterRate(item.fluctuationRate, 0.28),
    })),
    sell: sellSignalSeeds.map((item) => ({
      ...item,
      price: jitterPrice(item.price, 500),
      fluctuationRate: jitterRate(item.fluctuationRate, 0.28),
    })),
  };
}

export function getMarketIndexMock(): MarketIndexPayload {
  return {
    kospi: {
      value: Number((2654.12 + (Math.random() - 0.5) * 8).toFixed(2)),
      changeRate: jitterRate(1.24, 0.18),
    },
    kosdaq: {
      value: Number((850.32 + (Math.random() - 0.5) * 4).toFixed(2)),
      changeRate: jitterRate(-0.52, 0.16),
    },
    usdKrw: {
      value: Number((1376.4 + (Math.random() - 0.5) * 3).toFixed(2)),
      changeRate: jitterRate(0.43, 0.12),
    },
    baseTime: new Date().toISOString(),
  };
}

export function getCategoriesMock(): CategoriesPayload {
  return {
    categories: categorySeeds.map((category) => ({
      name: category.name,
      stocks: category.stocks.map((stock) => ({
        name: stock.name,
        price: jitterPrice(stock.price, 400),
        fluctuationRate: jitterRate(stock.fluctuationRate, 0.22),
      })),
    })),
  };
}

export function getPopularSearchesMock(): PopularSearchesPayload {
  return {
    keywords: popularSearchSeeds.map((keyword, index) => ({
      rank: index + 1,
      keyword,
    })),
  };
}
