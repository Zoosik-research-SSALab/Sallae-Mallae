import type { StockDetailData } from "../types/portfolioStockDetail";

export const mockStockDetail: StockDetailData = {
  ticker: "000660",
  name: "SK하이닉스",
  description: "AI 의장이 실제 운용 중인 모의투자 성과입니다.",
  portfolioLabel: "의장 포트폴리오",
  isAiPortfolio: true,
  performance: {
    totalPnl: 1434342,
    returnRate: 14.43,
    holdingCount: 70,
    investmentPrincipal: 9940000,
    buyDate: "26.02.13",
    holdingDays: 14,
    buyPrice: 142000,
    currentPrice: 162500,
  },
  trades: [
    {
      id: "trade-1",
      status: "holding",
      dateRange: "26.02.13 ~ 현재",
      buyPrice: 142000,
      sellPrice: null,
      currentPrice: 162500,
      returnRate: 14.43,
      durationLabel: "14일 째",
    },
    {
      id: "trade-2",
      status: "best",
      dateRange: "23.05.12 ~ 23.06.26",
      buyPrice: 88000,
      sellPrice: 127700,
      currentPrice: null,
      returnRate: 45.2,
      durationLabel: "45일",
    },
    {
      id: "trade-3",
      status: "sold",
      dateRange: "24.03.01 ~ 24.05.15",
      buyPrice: 115000,
      sellPrice: 138000,
      currentPrice: null,
      returnRate: 20.0,
      durationLabel: "75일",
    },
    {
      id: "trade-4",
      status: "sold",
      dateRange: "24.08.10 ~ 24.10.22",
      buyPrice: 128000,
      sellPrice: 119000,
      currentPrice: null,
      returnRate: -7.03,
      durationLabel: "73일",
    },
    {
      id: "trade-5",
      status: "sold",
      dateRange: "25.01.05 ~ 25.03.18",
      buyPrice: 105000,
      sellPrice: 131000,
      currentPrice: null,
      returnRate: 24.76,
      durationLabel: "72일",
    },
    {
      id: "trade-6",
      status: "sold",
      dateRange: "25.06.20 ~ 25.09.10",
      buyPrice: 135000,
      sellPrice: 148000,
      currentPrice: null,
      returnRate: 9.63,
      durationLabel: "82일",
    },
  ],
  backtest: {
    bestTrade: {
      returnRate: 45.2,
      period: "보유 기간: 45일 (23.05.12 ~ 23.06.26)",
      buyPrice: 88000,
      sellPrice: 127700,
    },
    stats: {
      threeYearReturn: 124.5,
      threeYearTradeCount: 8,
      allTimeTradeCount: 32,
      allTimeSince: "2016년~",
    },
  },
  committee: {
    finalDecision: "강력 매수",
    confidence: 95,
    briefingDate: "2026.02.13 정기 브리핑 기준",
    members: [
      {
        role: "펀더멘탈 위원",
        opinion:
          "SK하이닉스의 HBM3E 양산 확대로 AI 서버 수요가 폭발적으로 증가하고 있습니다. 2026년 EPS 성장률은 전년 대비 +68% 예상되며, PBR 1.8배는 역사적 저평가 구간입니다. 강력 매수 의견입니다.",
        alignment: "left",
      },
      {
        role: "센티멘트 위원",
        opinion:
          "외국인 순매수가 3주 연속 지속 중이며, 공매도 잔고 비율이 역대 최저 수준입니다. 개인 투자자 관심도 지수도 상승 추세로 시장 심리는 매우 긍정적입니다.",
        alignment: "right",
      },
      {
        role: "차트 위원",
        opinion:
          "주봉 기준 200일 이동평균선을 강하게 돌파했습니다. MACD 골든크로스 발생, RSI 62로 과열 없이 상승 여력 충분합니다. 1차 목표가 175,000원 제시합니다.",
        alignment: "left",
      },
      {
        role: "의장 최종 판결",
        opinion:
          "세 위원의 의견을 종합합니다. 펀더멘탈, 수급, 기술적 분석 모두 긍정적 신호를 보내고 있습니다. 목표 수익률 25%, 손절선 -8% 설정하여 강력 매수를 결정합니다. 신뢰도 95%.",
        alignment: "right",
        isDark: true,
      },
    ],
  },
};
