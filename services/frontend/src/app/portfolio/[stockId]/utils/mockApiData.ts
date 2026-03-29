/**
 * Mock data shaped as API responses (camelCase, before snakelizeKeys).
 * These match the API contract defined in types/api.ts.
 */

import type {
  ReportResponse,
  PerformanceResponse,
  TradesResponse,
} from "../types/api";

export function getMockReportResponse(
  offset = 0,
  limit = 6,
): ReportResponse {
  const allReports = [
    {
      date: "2026-02-13",
      chairman: {
        signal: "강력 매수",
        confidence: 95,
        summary:
          "세 위원의 의견을 종합합니다. 펀더멘탈, 수급, 기술적 분석 모두 긍정적 신호를 보내고 있습니다. 목표 수익률 25%, 손절선 -8% 설정하여 강력 매수를 결정합니다. 신뢰도 95%.",
      },
      finalStances: [
        { agentId: "fund-1", agentName: "펀더멘탈 위원", stance: "매수" },
        { agentId: "sent-1", agentName: "센티멘트 위원", stance: "매수" },
        { agentId: "chart-1", agentName: "차트 위원", stance: "매수" },
      ],
      createdAt: "2026-02-13T09:00:00Z",
      debate: {
        rounds: [
          {
            roundNo: 1,
            agents: [
              {
                name: "펀더멘탈 위원",
                opinion:
                  "SK하이닉스의 HBM3E 양산 확대로 AI 서버 수요가 폭발적으로 증가하고 있습니다.",
                summary:
                  "SK하이닉스의 HBM3E 양산 확대로 AI 서버 수요가 폭발적으로 증가하고 있습니다. 2026년 EPS 성장률은 전년 대비 +68% 예상되며, PBR 1.8배는 역사적 저평가 구간입니다. 강력 매수 의견입니다.",
              },
              {
                name: "센티멘트 위원",
                opinion:
                  "외국인 순매수가 3주 연속 지속 중이며, 공매도 잔고 비율이 역대 최저 수준입니다.",
                summary:
                  "외국인 순매수가 3주 연속 지속 중이며, 공매도 잔고 비율이 역대 최저 수준입니다. 개인 투자자 관심도 지수도 상승 추세로 시장 심리는 매우 긍정적입니다.",
              },
              {
                name: "차트 위원",
                opinion:
                  "주봉 기준 200일 이동평균선을 강하게 돌파했습니다.",
                summary:
                  "주봉 기준 200일 이동평균선을 강하게 돌파했습니다. MACD 골든크로스 발생, RSI 62로 과열 없이 상승 여력 충분합니다. 1차 목표가 175,000원 제시합니다.",
              },
            ],
          },
        ],
      },
    },
  ];

  return { reports: allReports.slice(offset, offset + limit) };
}

export function getMockPerformanceResponse(): PerformanceResponse {
  return {
    cumulativeReturn: 124.5,
    winRate: 75.0,
    averageReturn1y: 10.2,
    recentReturn: 14.43,
    holding: {
      buyDate: "2026-02-13",
      buyPrice: 142000,
      currentPrice: 162500,
      holdingQuantity: 70,
      investmentAmount: 9940000,
      evaluationProfit: 1434342,
      currentReturn: 14.43,
      holdingDays: 14,
    },
    chart: [
      { date: "2026-02-13", price: 142000, tradeType: "buy" },
      { date: "2026-02-14", price: 143500 },
      { date: "2026-02-17", price: 146000 },
      { date: "2026-02-18", price: 148200 },
      { date: "2026-02-19", price: 145800 },
      { date: "2026-02-20", price: 150000 },
      { date: "2026-02-21", price: 152300 },
      { date: "2026-02-24", price: 155000 },
      { date: "2026-02-25", price: 157800 },
      { date: "2026-02-26", price: 159000 },
      { date: "2026-02-27", price: 160500 },
      { date: "2026-02-28", price: 162500 },
    ],
  };
}

export function getMockTradesResponse(
  offset = 0,
  limit = 10,
): TradesResponse {
  const allTrades = [
    {
      status: "holding",
      buyDate: "2026-02-13",
      buyPrice: 142000,
      currentPrice: 162500,
      holdingDays: 14,
      returnRate: 14.43,
    },
    {
      status: "sold",
      buyDate: "2025-04-10",
      sellDate: "2025-05-25",
      buyPrice: 88000,
      sellPrice: 127700,
      holdingDays: 45,
      returnRate: 45.2,
    },
    {
      status: "sold",
      buyDate: "2025-06-01",
      sellDate: "2025-08-14",
      buyPrice: 115000,
      sellPrice: 138000,
      holdingDays: 75,
      returnRate: 20.0,
    },
    {
      status: "sold",
      buyDate: "2025-08-20",
      sellDate: "2025-11-01",
      buyPrice: 128000,
      sellPrice: 119000,
      holdingDays: 73,
      returnRate: -7.03,
    },
    {
      status: "sold",
      buyDate: "2025-01-05",
      sellDate: "2025-03-18",
      buyPrice: 105000,
      sellPrice: 131000,
      holdingDays: 72,
      returnRate: 24.76,
    },
    {
      status: "sold",
      buyDate: "2025-06-20",
      sellDate: "2025-09-10",
      buyPrice: 135000,
      sellPrice: 148000,
      holdingDays: 82,
      returnRate: 9.63,
    },
  ];

  return { trades: allTrades.slice(offset, offset + limit) };
}
