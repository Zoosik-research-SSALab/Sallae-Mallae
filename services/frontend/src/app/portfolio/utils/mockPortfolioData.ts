import type { PortfolioPageData } from "../types/portfolio";

const holdingsSeed = [
  { stockId: 2, ticker: "000660", name: "SK하이닉스", buyPrice: 142000, currentPrice: 162500, holdingDays: 14 },
  { stockId: 1, ticker: "005930", name: "삼성전자", buyPrice: 70100, currentPrice: 74300, holdingDays: 11 },
  { stockId: 5, ticker: "035420", name: "NAVER", buyPrice: 172000, currentPrice: 185400, holdingDays: 9 },
  { stockId: 6, ticker: "000270", name: "기아", buyPrice: 101500, currentPrice: 113200, holdingDays: 18 },
  { stockId: 7, ticker: "005380", name: "현대차", buyPrice: 228000, currentPrice: 253500, holdingDays: 16 },
  { stockId: 8, ticker: "207940", name: "삼성바이오로직스", buyPrice: 835000, currentPrice: 872000, holdingDays: 7 },
  { stockId: 9, ticker: "012450", name: "한화에어로스페이스", buyPrice: 348000, currentPrice: 385000, holdingDays: 12 },
  { stockId: 10, ticker: "329180", name: "HD현대중공업", buyPrice: 182000, currentPrice: 196500, holdingDays: 13 },
  { stockId: 11, ticker: "051910", name: "LG화학", buyPrice: 301000, currentPrice: 327500, holdingDays: 22 },
  { stockId: 12, ticker: "267260", name: "HD현대일렉트릭", buyPrice: 263000, currentPrice: 286500, holdingDays: 10 },
  { stockId: 13, ticker: "086790", name: "하나금융지주", buyPrice: 61200, currentPrice: 65700, holdingDays: 25 },
  { stockId: 14, ticker: "316140", name: "우리금융지주", buyPrice: 14620, currentPrice: 15910, holdingDays: 20 },
];

const todayTradesSeed = [
  {
    id: 1,
    stockId: 15,
    ticker: "042700",
    name: "한미반도체",
    action: "BUY" as const,
    executedAt: "09:12",
    executedPrice: 118500,
    currentPrice: 124700,
  },
  {
    id: 2,
    stockId: 16,
    ticker: "035720",
    name: "카카오",
    action: "SELL" as const,
    executedAt: "10:47",
    executedPrice: 48000,
    currentPrice: 46950,
  },
  {
    id: 3,
    stockId: 17,
    ticker: "003670",
    name: "포스코퓨처엠",
    action: "BUY" as const,
    executedAt: "13:36",
    executedPrice: 236500,
    currentPrice: 241800,
  },
];

const monthlyReturnsSeed = [
  { month: "2025.04", portfolioReturnRate: 4.2, kospiReturnRate: 1.1 },
  { month: "2025.05", portfolioReturnRate: 3.4, kospiReturnRate: 0.8 },
  { month: "2025.06", portfolioReturnRate: -1.2, kospiReturnRate: -2.3 },
  { month: "2025.07", portfolioReturnRate: 5.8, kospiReturnRate: 2.9 },
  { month: "2025.08", portfolioReturnRate: 2.1, kospiReturnRate: 0.5 },
  { month: "2025.09", portfolioReturnRate: 6.4, kospiReturnRate: 3.2 },
  { month: "2025.10", portfolioReturnRate: -0.7, kospiReturnRate: -1.1 },
  { month: "2025.11", portfolioReturnRate: 4.8, kospiReturnRate: 1.7 },
  { month: "2025.12", portfolioReturnRate: 3.9, kospiReturnRate: 1.1 },
  { month: "2026.01", portfolioReturnRate: 5.3, kospiReturnRate: 2.2 },
  { month: "2026.02", portfolioReturnRate: 4.6, kospiReturnRate: 1.5 },
  { month: "2026.03", portfolioReturnRate: 4.1, kospiReturnRate: 0.9 },
];

export function getMockPortfolioPage(): PortfolioPageData {
  return {
    hero: {
      updatedAtLabel: "오늘 09:00 업데이트 완료",
      title: "의장 모의투자 포트폴리오",
      description: "KOSPI 200 전 종목을 대상으로 매일 위원회 합의를 거쳐 운용되는 공식 모델 포트폴리오입니다",
      metrics: [
        { id: "cumulative-return", label: "누적 수익률", value: 42.5, unit: "%", decimals: 1, tone: "danger" },
        { id: "hit-rate", label: "예측 적중률", value: 85.2, unit: "%", decimals: 1, tone: "default" },
        { id: "alpha-vs-kospi", label: "코스피 대비 초과", value: 15.4, unit: "%p", decimals: 1, tone: "danger" },
        { id: "holding-count", label: "현재 보유 종목", value: holdingsSeed.length, unit: "개", decimals: 0, tone: "default" },
      ],
    },
    holdings: holdingsSeed.map((item) => ({
      ...item,
      returnRate: Number((((item.currentPrice - item.buyPrice) / item.buyPrice) * 100).toFixed(2)),
    })),
    todayTrades: todayTradesSeed.map((item) => ({
      ...item,
      returnRate: Number((((item.currentPrice - item.executedPrice) / item.executedPrice) * 100).toFixed(2)),
    })),
    monthlyReturns: monthlyReturnsSeed.map((item) => ({
      ...item,
      excessReturnRate: Number((item.portfolioReturnRate - item.kospiReturnRate).toFixed(1)),
    })),
    signalSummary: {
      baseUniverseLabel: "KOSPI 200 종목 기준",
      buyCount: 15,
      sellCount: 8,
      holdCount: 124,
      watchCount: 53,
    },
    popularSignals: [
      { rank: 1, stockId: 1, ticker: "005930", name: "삼성전자", price: 74300, action: "BUY" },
      { rank: 2, stockId: 2, ticker: "000660", name: "SK하이닉스", price: 162500, action: "BUY" },
      { rank: 3, stockId: 7, ticker: "005380", name: "현대차", price: 253500, action: "HOLD" },
      { rank: 4, stockId: 16, ticker: "035720", name: "카카오", price: 48000, action: "SELL" },
      { rank: 5, stockId: 5, ticker: "035420", name: "NAVER", price: 185400, action: "WATCH" },
    ],
    hallOfFame: [
      {
        id: "hit-rate",
        title: "예측 적중률 TOP 5",
        tone: "info",
        items: [
          { rank: 1, name: "삼성바이오로직스", value: 94.2, suffix: "%" },
          { rank: 2, name: "NAVER", value: 91.5, suffix: "%" },
          { rank: 3, name: "현대차", value: 89.1, suffix: "%" },
          { rank: 4, name: "기아", value: 88.4, suffix: "%" },
          { rank: 5, name: "SK하이닉스", value: 87.2, suffix: "%" },
        ],
      },
      {
        id: "cumulative-return",
        title: "누적 수익률 TOP 10",
        tone: "danger",
        items: [
          { rank: 1, name: "한미반도체", value: 425.1, suffix: "%" },
          { rank: 2, name: "에코프로", value: 312.4, suffix: "%" },
          { rank: 3, name: "SK하이닉스", value: 124.5, suffix: "%" },
          { rank: 4, name: "기아", value: 95.2, suffix: "%" },
          { rank: 5, name: "포스코퓨처엠", value: 88.4, suffix: "%" },
        ],
      },
      {
        id: "best-single-trade",
        title: "최대 단일 수익률 TOP 10",
        tone: "warning",
        items: [
          { rank: 1, name: "에코프로", value: 185.2, suffix: "%" },
          { rank: 2, name: "포스코퓨처엠", value: 112.5, suffix: "%" },
          { rank: 3, name: "한미반도체", value: 95.4, suffix: "%" },
          { rank: 4, name: "알테오젠", value: 88.1, suffix: "%" },
          { rank: 5, name: "레인보우로보틱스", value: 75.2, suffix: "%" },
        ],
      },
      {
        id: "average-return",
        title: "매매당 평균 수익률 TOP 10",
        tone: "success",
        items: [
          { rank: 1, name: "한미반도체", value: 24.5, suffix: "%" },
          { rank: 2, name: "기아", value: 18.2, suffix: "%" },
          { rank: 3, name: "현대차", value: 15.4, suffix: "%" },
          { rank: 4, name: "메리츠금융지주", value: 14.2, suffix: "%" },
          { rank: 5, name: "SK하이닉스", value: 13.8, suffix: "%" },
        ],
      },
    ],
  };
}
