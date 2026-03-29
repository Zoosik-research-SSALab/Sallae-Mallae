import type { PortfolioHeroMetric } from "../types/portfolio";

export const PORTFOLIO_HERO_TITLE = "의장 모의투자 포트폴리오";

export const PORTFOLIO_HERO_DESCRIPTION =
  "KOSPI 200 전 종목을 대상으로 매일 위원회 합의를 거쳐 운용되는 공식 모델 포트폴리오입니다.";

export const PORTFOLIO_HERO_METRICS: PortfolioHeroMetric[] = [
  { id: "cumulative-return", label: "누적 수익률", value: null, unit: "%", decimals: 1, tone: "danger" },
  { id: "hit-rate", label: "평균 월간 수익률", value: null, unit: "%", decimals: 1, tone: "default" },
  { id: "yesterday_return", label: "전날 대비 수익률", value: null, unit: "%", decimals: 1, tone: "danger" },
  { id: "holding-count", label: "현재 보유 종목", value: null, unit: "개", decimals: 0, tone: "default" },
];
