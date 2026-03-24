import type {
  StockAnnouncementDetail,
  StockAnnouncementsPayload,
  StockChartPeriod,
  StockDetailOverview,
  StockFinancialItem,
  StockFinancialType,
  StockFinancialsPayload,
  StockIndicators,
  StockKeywordsPayload,
  StockPricesPayload,
} from "@/app/stocks/types/stockDetail";

type LegacyStockIndicatorsMetricSet = {
  per: number;
  pbr: number;
  roe: number;
  debtRatio: number;
};

type LegacyStockIndicators = LegacyStockIndicatorsMetricSet & {
  sectorAvg: LegacyStockIndicatorsMetricSet;
  prevQuarterDiff: LegacyStockIndicatorsMetricSet;
};

type StockSeed = {
  id: number;
  ticker: string;
  name: string;
  marketType: string;
  gicsSector: string;
  category: string;
  basePrice: number;
  indicators: LegacyStockIndicators;
  yearlyFinancials: StockFinancialItem[];
  quarterlyFinancials: StockFinancialItem[];
  keywords: string[];
  news: Array<{
    id: number;
    title: string;
    publisher: string;
    minutesAgo: number;
    url: string;
  }>;
  announcements: StockAnnouncementDetail[];
};

const stockSeeds: StockSeed[] = [
  {
    id: 1,
    ticker: "005930",
    name: "삼성전자",
    marketType: "KOSPI",
    gicsSector: "반도체",
    category: "KOSPI 200",
    basePrice: 74300,
    indicators: {
      per: 26.1,
      pbr: 2.7,
      roe: 10.8,
      debtRatio: 34.2,
      sectorAvg: {
        per: 22.4,
        pbr: 2.2,
        roe: 9.4,
        debtRatio: 41.8,
      },
      prevQuarterDiff: {
        per: 1.1,
        pbr: 0.2,
        roe: 0.7,
        debtRatio: -1.4,
      },
    },
    yearlyFinancials: [
      { year: 2023, revenue: 244.4, operatingProfit: 6.6 },
      { year: 2024, revenue: 258.9, operatingProfit: 6.5 },
      { year: 2025, revenue: 302.1, operatingProfit: 32.4 },
      { year: 2026, revenue: 319.7, operatingProfit: 36.8 },
    ],
    quarterlyFinancials: [
      { year: 2025, quarter: 1, revenue: 71.9, operatingProfit: 6.6 },
      { year: 2025, quarter: 2, revenue: 74.8, operatingProfit: 8.2 },
      { year: 2025, quarter: 3, revenue: 76.7, operatingProfit: 8.9 },
      { year: 2025, quarter: 4, revenue: 78.7, operatingProfit: 8.7 },
      { year: 2026, quarter: 1, revenue: 79.2, operatingProfit: 8.8 },
      { year: 2026, quarter: 2, revenue: 81.4, operatingProfit: 9.1 },
    ],
    keywords: ["HBM 공급망", "외인 대량매수", "파운드리", "AI 메모리"],
    news: [
      {
        id: 101,
        title: "삼성전자, 차세대 HBM 양산 본격화 전망",
        publisher: "한국경제",
        minutesAgo: 45,
        url: "https://www.hankyung.com",
      },
      {
        id: 102,
        title: "외국인·기관 쌍끌이 매수에 반도체 투심 회복",
        publisher: "매일경제",
        minutesAgo: 160,
        url: "https://www.mk.co.kr",
      },
      {
        id: 103,
        title: "파운드리 투자 확대 기대에 밸류체인 동반 강세",
        publisher: "서울경제",
        minutesAgo: 260,
        url: "https://www.sedaily.com",
      },
    ],
    announcements: [
      {
        id: 1,
        title: "현금ㆍ현물배당결정 (결산배당)",
        announcedAt: "2026-02-15T09:00:00+09:00",
        content: "보통주 기준 결산배당을 결정했습니다. 배당 기준일과 세부 일정은 첨부 공시를 참고해 주시기 바랍니다.",
        url: "https://dart.fss.or.kr",
      },
      {
        id: 2,
        title: "기업설명회(IR) 개최 안내",
        announcedAt: "2026-02-01T08:30:00+09:00",
        content: "기관투자자 대상 기업설명회 개최 일정을 안내드립니다. 실적 발표 및 사업 전략이 포함됩니다.",
        url: "https://dart.fss.or.kr",
      },
      {
        id: 3,
        title: "단일판매ㆍ공급계약체결",
        announcedAt: "2026-01-10T10:30:00+09:00",
        content: "대규모 공급계약 체결 사실을 공시합니다. 계약 상대방과 주요 조건은 원문을 확인해 주세요.",
        url: "https://dart.fss.or.kr",
      },
      {
        id: 4,
        title: "최대주주등소유주식변동신고서",
        announcedAt: "2025-12-28T16:10:00+09:00",
        content: "최대주주 보유 주식 수 변동 사항을 공시합니다.",
        url: "https://dart.fss.or.kr",
      },
      {
        id: 5,
        title: "자기주식 취득 결정",
        announcedAt: "2025-12-03T08:10:00+09:00",
        content: "주주가치 제고를 위한 자기주식 취득 계획을 공시합니다.",
        url: "https://dart.fss.or.kr",
      },
    ],
  },
  {
    id: 66,
    ticker: "000660",
    name: "SK하이닉스",
    marketType: "KOSPI",
    gicsSector: "반도체",
    category: "KOSPI 200",
    basePrice: 213500,
    indicators: {
      per: 17.9,
      pbr: 2.3,
      roe: 13.6,
      debtRatio: 28.4,
      sectorAvg: {
        per: 22.4,
        pbr: 2.2,
        roe: 9.4,
        debtRatio: 41.8,
      },
      prevQuarterDiff: {
        per: -0.9,
        pbr: 0.1,
        roe: 0.8,
        debtRatio: -0.7,
      },
    },
    yearlyFinancials: [
      { year: 2023, revenue: 32.8, operatingProfit: -7.7 },
      { year: 2024, revenue: 46.2, operatingProfit: 8.3 },
      { year: 2025, revenue: 68.4, operatingProfit: 24.1 },
      { year: 2026, revenue: 74.9, operatingProfit: 28.7 },
    ],
    quarterlyFinancials: [
      { year: 2025, quarter: 1, revenue: 16.1, operatingProfit: 5.2 },
      { year: 2025, quarter: 2, revenue: 16.8, operatingProfit: 5.9 },
      { year: 2025, quarter: 3, revenue: 17.4, operatingProfit: 6.1 },
      { year: 2025, quarter: 4, revenue: 18.1, operatingProfit: 6.9 },
      { year: 2026, quarter: 1, revenue: 18.4, operatingProfit: 7.1 },
      { year: 2026, quarter: 2, revenue: 18.9, operatingProfit: 7.5 },
    ],
    keywords: ["HBM", "DDR5", "AI 메모리", "서버 수요"],
    news: [
      {
        id: 161,
        title: "SK하이닉스, HBM 증설 기대에 메모리 대장주 부각",
        publisher: "한국경제",
        minutesAgo: 35,
        url: "https://www.hankyung.com",
      },
      {
        id: 162,
        title: "AI 서버 투자 확대에 SK하이닉스 실적 눈높이 상향",
        publisher: "매일경제",
        minutesAgo: 110,
        url: "https://www.mk.co.kr",
      },
      {
        id: 163,
        title: "외국인 순매수 지속에 반도체주 강세",
        publisher: "이데일리",
        minutesAgo: 220,
        url: "https://www.edaily.co.kr",
      },
    ],
    announcements: [
      {
        id: 1,
        title: "기업설명회(IR) 개최 안내",
        announcedAt: "2026-02-21T09:00:00+09:00",
        content: "기관투자자 대상 실적 설명회 개최 일정을 안내합니다.",
        url: "https://dart.fss.or.kr",
      },
      {
        id: 2,
        title: "단일판매ㆍ공급계약체결",
        announcedAt: "2026-02-08T08:40:00+09:00",
        content: "메모리 반도체 공급 계약 체결 사실을 공시합니다.",
        url: "https://dart.fss.or.kr",
      },
      {
        id: 3,
        title: "현금ㆍ현물배당결정 (결산배당)",
        announcedAt: "2026-01-24T15:10:00+09:00",
        content: "결산배당 관련 주요 사항을 공시합니다.",
        url: "https://dart.fss.or.kr",
      },
      {
        id: 4,
        title: "주주총회소집결의",
        announcedAt: "2026-01-03T09:20:00+09:00",
        content: "정기 주주총회 개최 일정을 공시합니다.",
        url: "https://dart.fss.or.kr",
      },
    ],
  },
  {
    id: 102,
    ticker: "035420",
    name: "NAVER",
    marketType: "KOSPI",
    gicsSector: "플랫폼",
    category: "인터넷 대형주",
    basePrice: 185400,
    indicators: {
      per: 18.4,
      pbr: 1.6,
      roe: 8.6,
      debtRatio: 27.2,
      sectorAvg: {
        per: 21.8,
        pbr: 1.9,
        roe: 7.9,
        debtRatio: 31.5,
      },
      prevQuarterDiff: {
        per: -0.8,
        pbr: 0.1,
        roe: 0.4,
        debtRatio: -0.6,
      },
    },
    yearlyFinancials: [
      { year: 2023, revenue: 9.7, operatingProfit: 1.5 },
      { year: 2024, revenue: 10.2, operatingProfit: 1.9 },
      { year: 2025, revenue: 11.4, operatingProfit: 2.3 },
      { year: 2026, revenue: 12.1, operatingProfit: 2.6 },
    ],
    quarterlyFinancials: [
      { year: 2025, quarter: 1, revenue: 2.8, operatingProfit: 0.54 },
      { year: 2025, quarter: 2, revenue: 2.9, operatingProfit: 0.57 },
      { year: 2025, quarter: 3, revenue: 2.8, operatingProfit: 0.58 },
      { year: 2025, quarter: 4, revenue: 2.9, operatingProfit: 0.61 },
      { year: 2026, quarter: 1, revenue: 3.0, operatingProfit: 0.63 },
      { year: 2026, quarter: 2, revenue: 3.1, operatingProfit: 0.66 },
    ],
    keywords: ["AI 검색", "커머스", "광고 회복", "웹툰"],
    news: [
      {
        id: 201,
        title: "NAVER, AI 검색 고도화로 광고 효율 개선 기대",
        publisher: "이데일리",
        minutesAgo: 70,
        url: "https://www.edaily.co.kr",
      },
      {
        id: 202,
        title: "커머스·핀테크 동반 성장에 이익 체력 강화",
        publisher: "서울경제",
        minutesAgo: 185,
        url: "https://www.sedaily.com",
      },
      {
        id: 203,
        title: "웹툰 글로벌 확장 수혜 기대감 확대",
        publisher: "매일경제",
        minutesAgo: 360,
        url: "https://www.mk.co.kr",
      },
    ],
    announcements: [
      {
        id: 1,
        title: "기업설명회(IR) 개최 안내",
        announcedAt: "2026-02-19T09:00:00+09:00",
        content: "분기 실적 설명회 개최 계획을 안내합니다.",
        url: "https://dart.fss.or.kr",
      },
      {
        id: 2,
        title: "현금ㆍ현물배당결정 (중간배당)",
        announcedAt: "2026-02-11T08:30:00+09:00",
        content: "중간배당 관련 결정 사항입니다.",
        url: "https://dart.fss.or.kr",
      },
      {
        id: 3,
        title: "자기주식 소각 결정",
        announcedAt: "2026-01-27T10:00:00+09:00",
        content: "자사주 소각을 통한 주주환원 정책을 공시합니다.",
        url: "https://dart.fss.or.kr",
      },
      {
        id: 4,
        title: "주주총회소집결의",
        announcedAt: "2026-01-09T09:10:00+09:00",
        content: "정기 주주총회 개최 일정을 공시합니다.",
        url: "https://dart.fss.or.kr",
      },
    ],
  },
  {
    id: 201,
    ticker: "035720",
    name: "카카오",
    marketType: "KOSPI",
    gicsSector: "플랫폼",
    category: "인터넷 대형주",
    basePrice: 42150,
    indicators: {
      per: 15.2,
      pbr: 1.1,
      roe: 6.4,
      debtRatio: 41.3,
      sectorAvg: {
        per: 21.8,
        pbr: 1.9,
        roe: 7.9,
        debtRatio: 31.5,
      },
      prevQuarterDiff: {
        per: -1.4,
        pbr: -0.1,
        roe: 0.2,
        debtRatio: 1.8,
      },
    },
    yearlyFinancials: [
      { year: 2023, revenue: 7.6, operatingProfit: 0.5 },
      { year: 2024, revenue: 7.9, operatingProfit: 0.6 },
      { year: 2025, revenue: 8.4, operatingProfit: 0.9 },
      { year: 2026, revenue: 8.9, operatingProfit: 1.1 },
    ],
    quarterlyFinancials: [
      { year: 2025, quarter: 1, revenue: 2.0, operatingProfit: 0.16 },
      { year: 2025, quarter: 2, revenue: 2.1, operatingProfit: 0.19 },
      { year: 2025, quarter: 3, revenue: 2.1, operatingProfit: 0.24 },
      { year: 2025, quarter: 4, revenue: 2.2, operatingProfit: 0.31 },
      { year: 2026, quarter: 1, revenue: 2.2, operatingProfit: 0.28 },
      { year: 2026, quarter: 2, revenue: 2.3, operatingProfit: 0.32 },
    ],
    keywords: ["카카오톡", "AI 서비스", "광고 회복", "콘텐츠"],
    news: [
      {
        id: 301,
        title: "카카오, 신규 서비스 출시 일정 재정비",
        publisher: "매일경제",
        minutesAgo: 90,
        url: "https://www.mk.co.kr",
      },
      {
        id: 302,
        title: "광고·모빌리티 회복세에 실적 반등 기대",
        publisher: "한국경제",
        minutesAgo: 220,
        url: "https://www.hankyung.com",
      },
      {
        id: 303,
        title: "AI 메신저 기능 확장 예고에 투자심리 개선",
        publisher: "이데일리",
        minutesAgo: 410,
        url: "https://www.edaily.co.kr",
      },
    ],
    announcements: [
      {
        id: 1,
        title: "기업설명회(IR) 개최 안내",
        announcedAt: "2026-02-20T09:20:00+09:00",
        content: "분기 실적과 사업 전략 설명회를 개최합니다.",
        url: "https://dart.fss.or.kr",
      },
      {
        id: 2,
        title: "주주총회소집결의",
        announcedAt: "2026-02-04T09:40:00+09:00",
        content: "정기 주주총회 안건과 일정을 공시합니다.",
        url: "https://dart.fss.or.kr",
      },
      {
        id: 3,
        title: "타법인주식및출자증권처분결정",
        announcedAt: "2026-01-18T10:00:00+09:00",
        content: "비핵심 자산 재편을 위한 처분 결정 공시입니다.",
        url: "https://dart.fss.or.kr",
      },
      {
        id: 4,
        title: "단일판매ㆍ공급계약체결",
        announcedAt: "2025-12-29T08:10:00+09:00",
        content: "광고 플랫폼 공급 계약 체결 사실을 공시합니다.",
        url: "https://dart.fss.or.kr",
      },
    ],
  },
  {
    id: 203,
    ticker: "068270",
    name: "셀트리온",
    marketType: "KOSPI",
    gicsSector: "금융/바이오",
    category: "코스피 대형주",
    basePrice: 181200,
    indicators: {
      per: 32.8,
      pbr: 3.1,
      roe: 9.1,
      debtRatio: 19.7,
      sectorAvg: {
        per: 29.6,
        pbr: 2.8,
        roe: 8.4,
        debtRatio: 23.6,
      },
      prevQuarterDiff: {
        per: -0.7,
        pbr: 0.1,
        roe: 0.5,
        debtRatio: -0.4,
      },
    },
    yearlyFinancials: [
      { year: 2023, revenue: 2.4, operatingProfit: 0.8 },
      { year: 2024, revenue: 2.6, operatingProfit: 0.9 },
      { year: 2025, revenue: 3.0, operatingProfit: 1.1 },
      { year: 2026, revenue: 3.2, operatingProfit: 1.2 },
    ],
    quarterlyFinancials: [
      { year: 2025, quarter: 1, revenue: 0.71, operatingProfit: 0.24 },
      { year: 2025, quarter: 2, revenue: 0.74, operatingProfit: 0.27 },
      { year: 2025, quarter: 3, revenue: 0.75, operatingProfit: 0.29 },
      { year: 2025, quarter: 4, revenue: 0.80, operatingProfit: 0.31 },
      { year: 2026, quarter: 1, revenue: 0.79, operatingProfit: 0.30 },
      { year: 2026, quarter: 2, revenue: 0.82, operatingProfit: 0.32 },
    ],
    keywords: ["바이오시밀러", "유럽 허가", "실적 서프라이즈", "원가 개선"],
    news: [
      {
        id: 401,
        title: "셀트리온, 유럽 판매 확대 기대에 수급 개선",
        publisher: "이데일리",
        minutesAgo: 105,
        url: "https://www.edaily.co.kr",
      },
      {
        id: 402,
        title: "바이오시밀러 신제품 허가 모멘텀 부각",
        publisher: "한국경제",
        minutesAgo: 250,
        url: "https://www.hankyung.com",
      },
      {
        id: 403,
        title: "원가 구조 개선으로 마진 회복세 확인",
        publisher: "서울경제",
        minutesAgo: 470,
        url: "https://www.sedaily.com",
      },
    ],
    announcements: [
      {
        id: 1,
        title: "의약품 품목허가(신청) 관련 공시",
        announcedAt: "2026-02-14T10:00:00+09:00",
        content: "신규 바이오시밀러 품목허가 관련 진행 현황입니다.",
        url: "https://dart.fss.or.kr",
      },
      {
        id: 2,
        title: "기업설명회(IR) 개최 안내",
        announcedAt: "2026-01-31T09:20:00+09:00",
        content: "국내외 기관 대상 IR 일정을 안내합니다.",
        url: "https://dart.fss.or.kr",
      },
      {
        id: 3,
        title: "주주총회소집결의",
        announcedAt: "2026-01-06T08:40:00+09:00",
        content: "정기 주주총회 개최 계획을 공시합니다.",
        url: "https://dart.fss.or.kr",
      },
      {
        id: 4,
        title: "현금ㆍ현물배당결정 (결산배당)",
        announcedAt: "2025-12-24T09:10:00+09:00",
        content: "결산배당 관련 결정 사항입니다.",
        url: "https://dart.fss.or.kr",
      },
    ],
  },
];

const seedByTicker = new Map(stockSeeds.map((seed) => [seed.ticker, seed] as const));
const seedById = new Map(stockSeeds.map((seed) => [String(seed.id), seed] as const));

export function hasMockStockSeed(stockKey: string) {
  return seedByTicker.has(stockKey) || seedById.has(stockKey);
}

const detailedIndicatorByTicker: Record<string, StockIndicators> = {
  "005930": {
    valuation: {
      per: 26.1,
      psr: 3.5,
      pbr: 2.7,
    },
    earnings: {
      eps: 6563,
      bps: 63997,
      roe: 10.8,
    },
    dividend: {
      periodLabel: "최근 12개월",
      paymentCount: 4,
      paymentMonths: "3월, 6월, 9월, 12월",
      annualDividendPerShare: 1668,
      dividendYield: 0.96,
    },
  },
  "000660": {
    valuation: {
      per: 17.9,
      psr: 4.1,
      pbr: 2.3,
    },
    earnings: {
      eps: 11927,
      bps: 92826,
      roe: 13.6,
    },
    dividend: {
      periodLabel: "최근 12개월",
      paymentCount: 4,
      paymentMonths: "3월, 6월, 9월, 12월",
      annualDividendPerShare: 1800,
      dividendYield: 0.84,
    },
  },
  "035420": {
    valuation: {
      per: 18.4,
      psr: 3.2,
      pbr: 1.6,
    },
    earnings: {
      eps: 10082,
      bps: 116428,
      roe: 8.6,
    },
    dividend: {
      periodLabel: "최근 12개월",
      paymentCount: 1,
      paymentMonths: "4월",
      annualDividendPerShare: 1220,
      dividendYield: 0.66,
    },
  },
  "035720": {
    valuation: {
      per: 15.2,
      psr: 1.9,
      pbr: 1.1,
    },
    earnings: {
      eps: 2774,
      bps: 38324,
      roe: 6.4,
    },
    dividend: {
      periodLabel: "최근 12개월",
      paymentCount: 1,
      paymentMonths: "4월",
      annualDividendPerShare: 61,
      dividendYield: 0.14,
    },
  },
  "068270": {
    valuation: {
      per: 32.8,
      psr: 5.1,
      pbr: 3.1,
    },
    earnings: {
      eps: 5520,
      bps: 57774,
      roe: 9.1,
    },
    dividend: {
      periodLabel: "최근 12개월",
      paymentCount: 1,
      paymentMonths: "12월",
      annualDividendPerShare: 750,
      dividendYield: 0.41,
    },
  },
};

const periodConfig: Record<
  StockChartPeriod,
  {
    points: number;
    stepMs: number;
    volatility: number;
    drift: number;
  }
> = {
  "1MIN": { points: 60, stepMs: 60_000, volatility: 0.3, drift: 0.08 },
  "1D": { points: 78, stepMs: 5 * 60_000, volatility: 0.42, drift: 0.14 },
  "1W": { points: 7, stepMs: 24 * 60 * 60_000, volatility: 0.85, drift: 0.24 },
  "1M": { points: 30, stepMs: 24 * 60 * 60_000, volatility: 1.2, drift: 0.4 },
  "1Y": { points: 12, stepMs: 30 * 24 * 60 * 60_000, volatility: 2.6, drift: 0.9 },
};

function roundPrice(value: number) {
  if (value >= 100000) {
    return Math.round(value / 100) * 100;
  }

  if (value >= 10000) {
    return Math.round(value / 10) * 10;
  }

  return Math.round(value);
}

function buildFallbackIndicators(basePrice: number): LegacyStockIndicators {
  const per = Number((basePrice / 4200).toFixed(1));
  const pbr = Number((basePrice / 27500).toFixed(1));
  const roe = Number((7 + (basePrice % 8)).toFixed(1));
  const debtRatio = Number((25 + (basePrice % 17)).toFixed(1));
  const sectorAvg: LegacyStockIndicatorsMetricSet = {
    per: Number((per * 0.92).toFixed(1)),
    pbr: Number((pbr * 0.9).toFixed(1)),
    roe: Number((roe * 0.95).toFixed(1)),
    debtRatio: Number((debtRatio * 1.08).toFixed(1)),
  };

  return {
    per,
    pbr,
    roe,
    debtRatio,
    sectorAvg,
    prevQuarterDiff: {
      per: 0.6,
      pbr: 0.1,
      roe: 0.3,
      debtRatio: -0.4,
    },
  };
}

function buildDetailedFallbackIndicators(seed: StockSeed): StockIndicators {
  const valuationPer = seed.indicators.per;
  const valuationPbr = seed.indicators.pbr;
  const earningsRoe = seed.indicators.roe;
  const valuationPsr = Number(Math.max(0.5, valuationPbr * 1.3).toFixed(1));
  const earningsEps = Math.round(seed.basePrice / Math.max(valuationPer, 1));
  const earningsBps = Math.round(seed.basePrice / Math.max(valuationPbr, 0.2));
  const dividendYield = Number(Math.max(0.2, Math.min(4.8, earningsRoe / 8)).toFixed(2));
  const annualDividendPerShare = Math.max(
    10,
    Math.round(((seed.basePrice * dividendYield) / 100) / 10) * 10,
  );

  return {
    valuation: {
      per: valuationPer,
      psr: valuationPsr,
      pbr: valuationPbr,
    },
    earnings: {
      eps: earningsEps,
      bps: earningsBps,
      roe: earningsRoe,
    },
    dividend: {
      periodLabel: "최근 12개월",
      paymentCount: 2,
      paymentMonths: "6월, 12월",
      annualDividendPerShare,
      dividendYield,
    },
  };
}

function createFallbackSeed(stockKey: string): StockSeed {
  const normalizedKey = stockKey.trim() || "000000";
  const numericKey = Number(normalizedKey.replace(/\D/g, "").slice(0, 6) || "999999");
  const ticker = /^\d{6}$/.test(normalizedKey) ? normalizedKey : String(numericKey).padStart(6, "0");
  const basePrice = roundPrice(42000 + (numericKey % 17000));

  return {
    id: numericKey,
    ticker,
    name: `샘플종목 ${ticker}`,
    marketType: "KOSPI",
    gicsSector: "기타",
    category: "대표지수",
    basePrice,
    indicators: buildFallbackIndicators(basePrice),
    yearlyFinancials: [
      { year: 2023, revenue: 1.8, operatingProfit: 0.24 },
      { year: 2024, revenue: 2.0, operatingProfit: 0.31 },
      { year: 2025, revenue: 2.2, operatingProfit: 0.38 },
      { year: 2026, revenue: 2.4, operatingProfit: 0.42 },
    ],
    quarterlyFinancials: [
      { year: 2025, quarter: 1, revenue: 0.52, operatingProfit: 0.08 },
      { year: 2025, quarter: 2, revenue: 0.55, operatingProfit: 0.09 },
      { year: 2025, quarter: 3, revenue: 0.56, operatingProfit: 0.1 },
      { year: 2025, quarter: 4, revenue: 0.57, operatingProfit: 0.11 },
      { year: 2026, quarter: 1, revenue: 0.59, operatingProfit: 0.1 },
      { year: 2026, quarter: 2, revenue: 0.6, operatingProfit: 0.11 },
    ],
    keywords: ["실적 개선", "기관 수급", "신규 수주", "업종 강세"],
    news: Array.from({ length: 3 }, (_, index) => ({
      id: 900 + index,
      title: `샘플종목 ${ticker}, 모멘텀 점검 리포트 ${index + 1}`,
      publisher: ["한국경제", "매일경제", "이데일리"][index] ?? "연합뉴스",
      minutesAgo: 40 + index * 90,
      url: "https://www.hankyung.com",
    })),
    announcements: Array.from({ length: 4 }, (_, index) => ({
      id: index + 1,
      title: `샘플종목 ${ticker} 공시 ${index + 1}`,
      announcedAt: new Date(Date.now() - index * 9 * 24 * 60 * 60_000).toISOString(),
      content: `샘플종목 ${ticker} 공시 본문 ${index + 1}입니다.`,
      url: "https://dart.fss.or.kr",
    })),
  };
}

function resolveStockSeed(stockKey: string) {
  return seedByTicker.get(stockKey) ?? seedById.get(stockKey) ?? createFallbackSeed(stockKey);
}

function getBaseTime() {
  const now = new Date();
  now.setHours(15, 30, 0, 0);
  return now.toISOString();
}

function buildLiveAdjustment(seedId: number, index: number, period: StockChartPeriod) {
  const config = periodConfig[period];
  const minutes = Date.now() / 60_000;
  const longWave = Math.sin((minutes + seedId * 7 + index * 3) / 11) * config.volatility;
  const shortWave = Math.cos((minutes + seedId * 13 + index * 5) / 5.5) * config.volatility * 0.45;
  const drift = ((index - config.points / 2) / config.points) * config.drift;

  return longWave + shortWave + drift;
}

export function getMockStockOverview(stockKey: string): StockDetailOverview {
  const seed = resolveStockSeed(stockKey);
  const latestClosePrice = roundPrice(seed.basePrice * 1.01);

  return {
    id: seed.id,
    ticker: seed.ticker,
    name: seed.name,
    marketType: seed.marketType,
    gicsSector: seed.gicsSector,
    category: seed.category,
    baseTime: getBaseTime(),
    latestPrice: {
      tradeDate: getBaseTime(),
      closePrice: latestClosePrice,
      fluctuationRate: 1.01,
    },
    priceRange52w: {
      highPrice: roundPrice(seed.basePrice * 1.22),
      highDate: "2026-01-15",
      lowPrice: roundPrice(seed.basePrice * 0.81),
      lowDate: "2025-08-19",
      distanceFromHighRate: -17.2,
      distanceFromLowRate: 24.7,
    },
  };
}

export function getMockStockPrices(stockKey: string, period: StockChartPeriod): StockPricesPayload {
  const seed = resolveStockSeed(stockKey);
  const config = periodConfig[period];
  const now = Date.now();
  const prices = Array.from({ length: config.points }, (_, index) => {
    const timestamp = new Date(now - (config.points - index - 1) * config.stepMs).toISOString();
    const currentClose = roundPrice(seed.basePrice * (1 + buildLiveAdjustment(seed.id, index, period) / 100));
    const previousClose =
      index === 0
        ? roundPrice(seed.basePrice * (1 + buildLiveAdjustment(seed.id, index - 1, period) / 100))
        : roundPrice(seed.basePrice * (1 + buildLiveAdjustment(seed.id, index - 1, period) / 100));
    const open = roundPrice((currentClose + previousClose) / 2);
    const high = Math.max(open, currentClose) + roundPrice(seed.basePrice * 0.0012);
    const low = Math.max(1000, Math.min(open, currentClose) - roundPrice(seed.basePrice * 0.0011));
    const volume = Math.max(25000, Math.round(seed.basePrice * 52 + index * 870 + seed.id * 13));

    return {
      timestamp,
      open,
      high,
      low,
      close: currentClose,
      volume,
    };
  });

  return { prices };
}

export function getMockStockIndicators(stockKey: string): StockIndicators {
  const seed = resolveStockSeed(stockKey);

  return detailedIndicatorByTicker[seed.ticker] ?? buildDetailedFallbackIndicators(seed);
}

export function getMockStockFinancials(stockKey: string, type: StockFinancialType): StockFinancialsPayload {
  const seed = resolveStockSeed(stockKey);

  return {
    financials: type === "YEARLY" ? seed.yearlyFinancials : seed.quarterlyFinancials,
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getMockStockKeywordsLegacy(stockKey: string) {
  const seed = resolveStockSeed(stockKey);

  return {
    keywords: seed.keywords.map((name, index) => ({
      id: index + 1,
      name,
    })),
    news: Array.from({ length: 9 }, (_, index) => {
      const baseItem = seed.news[index % seed.news.length];
      const keyword = seed.keywords[index % seed.keywords.length];

      return {
        id: baseItem.id * 10 + index,
        title: `${baseItem.title} · ${keyword}`,
        publisher: baseItem.publisher,
        publishedAt: new Date(Date.now() - (baseItem.minutesAgo + index * 33) * 60_000).toISOString(),
        url: baseItem.url,
      };
    }),
  };
}

export function getMockStockKeywords(stockKey: string): StockKeywordsPayload {
  const seed = resolveStockSeed(stockKey);
  const keywordSeeds = seed.keywords.slice(0, 3);

  return {
    keywords: keywordSeeds.map((name, keywordIndex) => ({
      id: keywordIndex + 1,
      name,
    })),
    news: Array.from({ length: keywordSeeds.length * 3 }, (_, index) => {
      const baseItem = seed.news[index % seed.news.length];
      const keyword = keywordSeeds[index % keywordSeeds.length];
      const offsetMinutes = index * 29;

      return {
        id: baseItem.id * 10 + index,
        title: `${baseItem.title} · ${keyword}`,
        publisher: baseItem.publisher,
        publishedAt: new Date(Date.now() - (baseItem.minutesAgo + offsetMinutes) * 60_000).toISOString(),
        url: baseItem.url,
      };
    }),
  };
}

export function getMockAnnouncements(stockKey: string, limit: number, offset: number): StockAnnouncementsPayload {
  const seed = resolveStockSeed(stockKey);
  const safeLimit = Math.max(1, limit);
  const safeOffset = Math.max(0, offset);

  return {
    total: seed.announcements.length,
    announcements: seed.announcements.slice(safeOffset, safeOffset + safeLimit).map(({ id, title, announcedAt }) => ({
      id,
      title,
      announcedAt,
    })),
  };
}

export function getMockAnnouncementDetail(stockKey: string, announcementId: number): StockAnnouncementDetail | null {
  const seed = resolveStockSeed(stockKey);

  return seed.announcements.find((item) => item.id === announcementId) ?? null;
}
