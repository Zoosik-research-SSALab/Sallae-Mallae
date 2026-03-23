import type { PortfolioHeroMetric } from "../types/portfolio";

export const PORTFOLIO_HERO_TITLE = "의장 모의투자 포트폴리오";

export const PORTFOLIO_HERO_DESCRIPTION =
  "KOSPI 200 전 종목을 대상으로 매일 AI 위원회의 합의를 거쳐 운용하는 공식 모델 포트폴리오입니다.";

export const PORTFOLIO_HERO_METRICS: PortfolioHeroMetric[] = [
  { id: "cumulative-return", label: "누적 수익률", value: null, unit: "%", decimals: 1, tone: "danger" },
  { id: "hit-rate", label: "예측 적중률", value: null, unit: "%", decimals: 1, tone: "default" },
  { id: "alpha-vs-kospi", label: "코스피 대비 초과", value: null, unit: "%p", decimals: 1, tone: "danger" },
  { id: "holding-count", label: "현재 보유 종목", value: null, unit: "개", decimals: 0, tone: "default" },
];
