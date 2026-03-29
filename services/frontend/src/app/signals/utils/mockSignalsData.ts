import type { SignalMarketCapSize, SignalQueryFilter, SignalQuerySort, SignalResponse, SignalSectorName, SignalsQueryParams } from "../types/signals";

type SignalSeed = {
  stockId: number;
  ticker: string;
  name: string;
  category: SignalSectorName;
  marketCapSize: SignalMarketCapSize;
  price: number;
  fluctuationRate: number;
  signal: Exclude<SignalQueryFilter, "ALL">;
  confidence: number;
  createdAt: string;
};

const signalSeeds: SignalSeed[] = [
  { stockId: 1, ticker: "005930", name: "삼성전자", category: "반도체", marketCapSize: "LARGE", price: 74300, fluctuationRate: 1.24, signal: "BUY", confidence: 98, createdAt: "2026-03-09T09:10:00+09:00" },
  { stockId: 2, ticker: "000660", name: "SK하이닉스", category: "반도체", marketCapSize: "LARGE", price: 184300, fluctuationRate: 2.38, signal: "BUY", confidence: 95, createdAt: "2026-03-09T09:06:00+09:00" },
  { stockId: 3, ticker: "035420", name: "NAVER", category: "IT플랫폼 / 소프트웨어", marketCapSize: "MID", price: 185400, fluctuationRate: 1.12, signal: "BUY", confidence: 90, createdAt: "2026-03-09T09:03:00+09:00" },
  { stockId: 4, ticker: "035720", name: "카카오", category: "IT플랫폼 / 소프트웨어", marketCapSize: "MID", price: 42150, fluctuationRate: -2.15, signal: "SELL", confidence: 88, createdAt: "2026-03-09T08:59:00+09:00" },
  { stockId: 5, ticker: "247540", name: "에코프로비엠", category: "2차전지", marketCapSize: "MID", price: 174200, fluctuationRate: 3.02, signal: "BUY", confidence: 93, createdAt: "2026-03-09T08:55:00+09:00" },
  { stockId: 6, ticker: "086520", name: "에코프로", category: "2차전지", marketCapSize: "MID", price: 118700, fluctuationRate: 2.47, signal: "BUY", confidence: 87, createdAt: "2026-03-09T08:50:00+09:00" },
  { stockId: 7, ticker: "329180", name: "HD현대중공업", category: "조선", marketCapSize: "MID", price: 214000, fluctuationRate: 3.12, signal: "BUY", confidence: 85, createdAt: "2026-03-09T08:47:00+09:00" },
  { stockId: 8, ticker: "042660", name: "한화오션", category: "조선", marketCapSize: "MID", price: 39550, fluctuationRate: 1.98, signal: "BUY", confidence: 82, createdAt: "2026-03-09T08:43:00+09:00" },
  { stockId: 9, ticker: "012450", name: "한화에어로스페이스", category: "방산", marketCapSize: "LARGE", price: 385000, fluctuationRate: 4.41, signal: "BUY", confidence: 96, createdAt: "2026-03-09T08:38:00+09:00" },
  { stockId: 10, ticker: "079550", name: "LIG넥스원", category: "방산", marketCapSize: "MID", price: 213500, fluctuationRate: 1.36, signal: "BUY", confidence: 84, createdAt: "2026-03-09T08:35:00+09:00" },
  { stockId: 11, ticker: "012330", name: "현대모비스", category: "전자부품", marketCapSize: "LARGE", price: 245000, fluctuationRate: 0.42, signal: "SELL", confidence: 86, createdAt: "2026-03-09T08:32:00+09:00" },
  { stockId: 12, ticker: "011070", name: "LG이노텍", category: "전자부품", marketCapSize: "MID", price: 221000, fluctuationRate: -1.14, signal: "SELL", confidence: 79, createdAt: "2026-03-09T08:29:00+09:00" },
  { stockId: 13, ticker: "051910", name: "LG화학", category: "소재", marketCapSize: "LARGE", price: 319500, fluctuationRate: -0.88, signal: "SELL", confidence: 80, createdAt: "2026-03-09T08:25:00+09:00" },
  { stockId: 14, ticker: "011780", name: "금호석유", category: "소재", marketCapSize: "MID", price: 132400, fluctuationRate: 1.08, signal: "BUY", confidence: 76, createdAt: "2026-03-09T08:20:00+09:00" },
  { stockId: 15, ticker: "000720", name: "현대건설", category: "건설 / 인프라", marketCapSize: "MID", price: 33900, fluctuationRate: 0.82, signal: "BUY", confidence: 74, createdAt: "2026-03-09T08:16:00+09:00" },
  { stockId: 16, ticker: "375500", name: "DL이앤씨", category: "건설 / 인프라", marketCapSize: "MID", price: 34350, fluctuationRate: -0.51, signal: "SELL", confidence: 72, createdAt: "2026-03-09T08:13:00+09:00" },
  { stockId: 17, ticker: "090430", name: "아모레퍼시픽", category: "패션 / 뷰티", marketCapSize: "MID", price: 131200, fluctuationRate: 1.07, signal: "BUY", confidence: 70, createdAt: "2026-03-09T08:09:00+09:00" },
  { stockId: 18, ticker: "383220", name: "F&F", category: "패션 / 뷰티", marketCapSize: "MID", price: 67600, fluctuationRate: -0.73, signal: "SELL", confidence: 69, createdAt: "2026-03-09T08:05:00+09:00" },
  { stockId: 19, ticker: "096770", name: "SK이노베이션", category: "에너지", marketCapSize: "LARGE", price: 111300, fluctuationRate: 1.12, signal: "BUY", confidence: 83, createdAt: "2026-03-09T08:02:00+09:00" },
  { stockId: 20, ticker: "010950", name: "S-Oil", category: "에너지", marketCapSize: "MID", price: 67800, fluctuationRate: -0.42, signal: "SELL", confidence: 71, createdAt: "2026-03-09T07:57:00+09:00" },
  { stockId: 21, ticker: "012750", name: "에스원", category: "유통 / 서비스", marketCapSize: "MID", price: 59500, fluctuationRate: 0.61, signal: "BUY", confidence: 67, createdAt: "2026-03-09T07:54:00+09:00" },
  { stockId: 22, ticker: "008770", name: "호텔신라", category: "유통 / 서비스", marketCapSize: "MID", price: 49500, fluctuationRate: -1.21, signal: "SELL", confidence: 73, createdAt: "2026-03-09T07:50:00+09:00" },
  { stockId: 23, ticker: "032830", name: "삼성생명", category: "금융 / 헬스케어", marketCapSize: "LARGE", price: 94800, fluctuationRate: 0.41, signal: "BUY", confidence: 68, createdAt: "2026-03-09T07:47:00+09:00" },
  { stockId: 24, ticker: "068270", name: "셀트리온", category: "금융 / 헬스케어", marketCapSize: "LARGE", price: 181200, fluctuationRate: -0.64, signal: "SELL", confidence: 81, createdAt: "2026-03-09T07:44:00+09:00" },
];

function sortSignals(signals: SignalSeed[], sort: SignalQuerySort) {
  const next = [...signals];
  const marketCapRank: Record<SignalMarketCapSize, number> = {
    LARGE: 2,
    MID: 1,
  };

  if (sort === "UP") {
    return next.sort((left, right) => right.fluctuationRate - left.fluctuationRate);
  }

  if (sort === "DOWN") {
    return next.sort((left, right) => right.confidence - left.confidence);
  }

  return next.sort((left, right) => {
    const marketCapGap = marketCapRank[right.marketCapSize] - marketCapRank[left.marketCapSize];

    if (marketCapGap !== 0) {
      return marketCapGap;
    }

    return right.price - left.price;
  });
}

export function getSignalsMock(params: SignalsQueryParams): SignalResponse {
  const normalizedKeyword = params.keyword.trim().toLowerCase();
  const activeCategories = params.categories.filter(Boolean);

  const scopedSignals = signalSeeds.filter((signal) => {
    const matchesCategory = activeCategories.length === 0 ? true : activeCategories.includes(signal.category);
    const matchesMarketCap = params.marketCap === "ALL" ? true : signal.marketCapSize === params.marketCap;
    const matchesKeyword =
      normalizedKeyword.length === 0 ? true : `${signal.name} ${signal.ticker}`.toLowerCase().includes(normalizedKeyword);

    return matchesCategory && matchesMarketCap && matchesKeyword;
  });

  const buyCount = scopedSignals.filter((signal) => signal.signal === "BUY").length;
  const sellCount = scopedSignals.filter((signal) => signal.signal === "SELL").length;
  const filteredSignals = params.filter === "ALL" ? scopedSignals : scopedSignals.filter((signal) => signal.signal === params.filter);
  const pagedSignals = sortSignals(filteredSignals, params.sort).slice(params.offset, params.offset + params.limit);

  return {
    buyCount,
    sellCount,
    signals: pagedSignals,
  };
}
