import type {
  ChairmanAnalysisReport,
  ChairmanAnalysisReportsQuery,
  ChairmanAnalysisReportsResponse,
  InvestmentPerformanceResponse,
  ReportPagePresentationSeed,
  TradeHistoryQuery,
  TradeHistoryResponse,
} from "../types/report";

function createChairmanReport(report: ChairmanAnalysisReport): ChairmanAnalysisReport {
  return report;
}

const mockChairmanAnalysisReportsByStockId: Record<string, ChairmanAnalysisReport[]> = {
  "005930": [
    createChairmanReport({
      date: "2026-03-19",
      chairman: {
        signal: "STRONG_BUY",
        confidence: 91,
        summary:
          "HBM와 파운드리 기대감, 밸류에이션 매력이 동시에 확인됩니다. 단기 변동성은 있더라도 중장기 관점의 비중 확대가 유효합니다.",
      },
      finalStances: [
        { agentId: "chart", agentName: "차트 분석가", stance: "분할 매수" },
        { agentId: "news", agentName: "뉴스 전문가", stance: "매수" },
        { agentId: "fund", agentName: "펀더멘탈 위원", stance: "강력 매수" },
      ],
      createdAt: "2026-03-19T09:10:00+09:00",
      debate: {
        rounds: [
          {
            roundNo: 1,
            agents: [
              { name: "차트 분석가", opinion: "매수", summary: "중기 추세선 회복과 거래량 증가가 동반돼 추세 전환 가능성이 높습니다." },
              { name: "뉴스 전문가", opinion: "매수", summary: "AI 반도체 수요와 실적 기대 관련 긍정 뉴스 비중이 우세합니다." },
              { name: "펀더멘탈 위원", opinion: "강력 매수", summary: "실적 상향과 저평가 구간이 겹쳐 안전마진이 충분합니다." },
            ],
          },
          {
            roundNo: 2,
            agents: [
              { name: "차트 분석가", opinion: "분할 매수", summary: "단기 이격 부담을 감안하면 눌림 시 분할 접근이 적절합니다." },
              { name: "뉴스 전문가", opinion: "매수 유지", summary: "대형 고객사 수요와 공급 부족 뉴스 흐름이 여전히 우호적입니다." },
              { name: "펀더멘탈 위원", opinion: "강력 매수 유지", summary: "실적 체력 대비 현재 주가 반영 수준은 아직 보수적입니다." },
            ],
          },
        ],
      },
    }),
    createChairmanReport({
      date: "2026-03-12",
      chairman: {
        signal: "BUY",
        confidence: 86,
        summary: "실적 모멘텀은 유효하지만 단기 속도 조절 가능성을 감안한 분할 매수 전략이 적절합니다.",
      },
      finalStances: [
        { agentId: "chart", agentName: "차트 분석가", stance: "매수" },
        { agentId: "news", agentName: "뉴스 전문가", stance: "보유 후 매수" },
        { agentId: "fund", agentName: "펀더멘탈 위원", stance: "매수" },
      ],
      createdAt: "2026-03-12T10:20:00+09:00",
      debate: {
        rounds: [
          {
            roundNo: 1,
            agents: [
              { name: "차트 분석가", opinion: "매수", summary: "단기 조정 이후 지지선 반등이 확인됐습니다." },
              { name: "뉴스 전문가", opinion: "보유 후 매수", summary: "실적 기대 뉴스는 좋지만 단기 과열 우려도 존재합니다." },
              { name: "펀더멘탈 위원", opinion: "매수", summary: "저평가 영역과 이익 개선 흐름이 유지됩니다." },
            ],
          },
        ],
      },
    }),
    createChairmanReport({
      date: "2026-03-05",
      chairman: {
        signal: "BUY",
        confidence: 84,
        summary: "메모리 업황 반등 기대가 살아있고 기관 수급이 개선돼 매수 우위 의견입니다.",
      },
      finalStances: [
        { agentId: "chart", agentName: "차트 분석가", stance: "매수" },
        { agentId: "news", agentName: "뉴스 전문가", stance: "매수" },
        { agentId: "fund", agentName: "펀더멘탈 위원", stance: "보유 후 매수" },
      ],
      createdAt: "2026-03-05T11:00:00+09:00",
      debate: {
        rounds: [
          {
            roundNo: 1,
            agents: [
              { name: "차트 분석가", opinion: "매수", summary: "거래량이 개선되며 추세 반전 시그널이 확인됐습니다." },
              { name: "뉴스 전문가", opinion: "매수", summary: "AI 수요 관련 긍정 뉴스가 우세합니다." },
              { name: "펀더멘탈 위원", opinion: "보유 후 매수", summary: "펀더멘털은 좋지만 단기 속도는 체크가 필요합니다." },
            ],
          },
        ],
      },
    }),
    createChairmanReport({
      date: "2026-02-26",
      chairman: {
        signal: "HOLD",
        confidence: 73,
        summary: "방향성은 긍정적이지만 단기 이벤트를 앞두고 관망 비중이 일부 필요합니다.",
      },
      finalStances: [
        { agentId: "chart", agentName: "차트 분석가", stance: "관망" },
        { agentId: "news", agentName: "뉴스 전문가", stance: "보유" },
        { agentId: "fund", agentName: "펀더멘탈 위원", stance: "매수" },
      ],
      createdAt: "2026-02-26T15:30:00+09:00",
      debate: {
        rounds: [
          {
            roundNo: 1,
            agents: [
              { name: "차트 분석가", opinion: "관망", summary: "상단 저항 돌파 확인이 먼저 필요합니다." },
              { name: "뉴스 전문가", opinion: "보유", summary: "실적 시즌 전 뉴스 흐름은 중립 이상입니다." },
              { name: "펀더멘탈 위원", opinion: "매수", summary: "기초 체력은 훼손되지 않았습니다." },
            ],
          },
        ],
      },
    }),
    createChairmanReport({
      date: "2026-02-19",
      chairman: {
        signal: "BUY",
        confidence: 80,
        summary: "외국인 수급과 이익 추정치 상향이 동반되며 매수 관점이 강화됐습니다.",
      },
      finalStances: [
        { agentId: "chart", agentName: "차트 분석가", stance: "매수" },
        { agentId: "news", agentName: "뉴스 전문가", stance: "매수" },
        { agentId: "fund", agentName: "펀더멘탈 위원", stance: "매수" },
      ],
      createdAt: "2026-02-19T14:05:00+09:00",
      debate: {
        rounds: [
          {
            roundNo: 1,
            agents: [
              { name: "차트 분석가", opinion: "매수", summary: "단기 박스권 상단 돌파가 나왔습니다." },
              { name: "뉴스 전문가", opinion: "매수", summary: "대형주 선호 심리가 회복되고 있습니다." },
              { name: "펀더멘탈 위원", opinion: "매수", summary: "실적과 밸류에이션 조합이 매력적입니다." },
            ],
          },
        ],
      },
    }),
    createChairmanReport({
      date: "2026-02-12",
      chairman: {
        signal: "BUY",
        confidence: 78,
        summary: "단기 박스권 구간이지만 리스크 대비 기대수익이 더 높습니다.",
      },
      finalStances: [
        { agentId: "chart", agentName: "차트 분석가", stance: "분할 매수" },
        { agentId: "news", agentName: "뉴스 전문가", stance: "보유 후 매수" },
        { agentId: "fund", agentName: "펀더멘탈 위원", stance: "매수" },
      ],
      createdAt: "2026-02-12T13:40:00+09:00",
      debate: {
        rounds: [
          {
            roundNo: 1,
            agents: [
              { name: "차트 분석가", opinion: "분할 매수", summary: "박스권 하단 인근에서는 매수 우위입니다." },
              { name: "뉴스 전문가", opinion: "보유 후 매수", summary: "촉매 확인 전까지는 속도 조절이 필요합니다." },
              { name: "펀더멘탈 위원", opinion: "매수", summary: "실적 체력은 충분히 방어적입니다." },
            ],
          },
        ],
      },
    }),
  ],
};

const fallbackChairmanReports = mockChairmanAnalysisReportsByStockId["005930"];

const mockTradeHistoryByStockId: Record<string, TradeHistoryResponse> = {
  "005930": {
    trades: [
      { status: "HOLDING", buyDate: "2026-02-10", buyPrice: 68200, currentPrice: 74300, holdingDays: 38, returnRate: 8.94 },
      { status: "CLOSED", buyDate: "2026-01-14", sellDate: "2026-02-03", buyPrice: 65500, sellPrice: 68900, holdingDays: 20, returnRate: 5.19 },
      { status: "CLOSED", buyDate: "2025-12-18", sellDate: "2026-01-07", buyPrice: 63100, sellPrice: 66700, holdingDays: 20, returnRate: 5.71 },
      { status: "CLOSED", buyDate: "2025-11-20", sellDate: "2025-12-05", buyPrice: 61200, sellPrice: 64100, holdingDays: 15, returnRate: 4.74 },
      { status: "CLOSED", buyDate: "2025-10-15", sellDate: "2025-11-04", buyPrice: 60100, sellPrice: 64500, holdingDays: 20, returnRate: 7.32 },
      { status: "CLOSED", buyDate: "2025-09-11", sellDate: "2025-10-01", buyPrice: 58400, sellPrice: 60300, holdingDays: 20, returnRate: 3.25 },
      { status: "CLOSED", buyDate: "2025-08-06", sellDate: "2025-08-28", buyPrice: 57100, sellPrice: 59800, holdingDays: 22, returnRate: 4.73 },
      { status: "CLOSED", buyDate: "2025-07-09", sellDate: "2025-07-29", buyPrice: 56300, sellPrice: 57900, holdingDays: 20, returnRate: 2.84 },
      { status: "CLOSED", buyDate: "2025-06-11", sellDate: "2025-07-01", buyPrice: 55200, sellPrice: 58800, holdingDays: 20, returnRate: 6.52 },
      { status: "CLOSED", buyDate: "2025-05-13", sellDate: "2025-06-03", buyPrice: 54100, sellPrice: 56600, holdingDays: 21, returnRate: 4.62 },
    ],
  },
  "000660": {
    trades: [
      { status: "HOLDING", buyDate: "2026-02-12", buyPrice: 189500, currentPrice: 213500, holdingDays: 40, returnRate: 12.66 },
      { status: "CLOSED", buyDate: "2026-01-16", sellDate: "2026-02-05", buyPrice: 176000, sellPrice: 188500, holdingDays: 20, returnRate: 7.10 },
      { status: "CLOSED", buyDate: "2025-12-19", sellDate: "2026-01-09", buyPrice: 169500, sellPrice: 180000, holdingDays: 21, returnRate: 6.19 },
      { status: "CLOSED", buyDate: "2025-11-24", sellDate: "2025-12-11", buyPrice: 162000, sellPrice: 171500, holdingDays: 17, returnRate: 5.86 },
      { status: "CLOSED", buyDate: "2025-10-20", sellDate: "2025-11-06", buyPrice: 154500, sellPrice: 163800, holdingDays: 17, returnRate: 6.02 },
      { status: "CLOSED", buyDate: "2025-09-15", sellDate: "2025-10-02", buyPrice: 148000, sellPrice: 144500, holdingDays: 17, returnRate: -2.36 },
      { status: "CLOSED", buyDate: "2025-08-11", sellDate: "2025-08-28", buyPrice: 141500, sellPrice: 149000, holdingDays: 17, returnRate: 5.30 },
      { status: "CLOSED", buyDate: "2025-07-14", sellDate: "2025-07-31", buyPrice: 137000, sellPrice: 145500, holdingDays: 17, returnRate: 6.20 },
      { status: "CLOSED", buyDate: "2025-06-16", sellDate: "2025-07-03", buyPrice: 132500, sellPrice: 138500, holdingDays: 17, returnRate: 4.53 },
      { status: "CLOSED", buyDate: "2025-05-19", sellDate: "2025-06-05", buyPrice: 128000, sellPrice: 134500, holdingDays: 17, returnRate: 5.08 },
    ],
  },
};

const mockInvestmentPerformanceByStockId: Record<string, InvestmentPerformanceResponse> = {
  "005930": {
    cumulativeReturn: 38.7,
    winRate: 85.2,
    recentReturn: 12.4,
    holding: {
      buyDate: "2026-02-10",
      buyPrice: 68200,
      currentPrice: 74300,
      holdingQuantity: 14,
      investmentAmount: 954800,
      evaluationProfit: 85400,
      currentReturn: 8.94,
      holdingDays: 38,
    },
    chart: [
      { date: "2025-05-13", price: 54100 },
      { date: "2025-06-03", price: 56600 },
      { date: "2025-06-11", price: 55200 },
      { date: "2025-07-01", price: 58800 },
      { date: "2025-07-09", price: 56300 },
      { date: "2025-07-29", price: 57900 },
      { date: "2025-08-06", price: 57100 },
      { date: "2025-08-28", price: 59800 },
      { date: "2025-09-11", price: 58400 },
      { date: "2025-10-01", price: 60300 },
      { date: "2025-10-15", price: 60100 },
      { date: "2025-11-04", price: 64500 },
      { date: "2025-11-20", price: 61200 },
      { date: "2025-12-05", price: 64100 },
      { date: "2025-12-18", price: 63100 },
      { date: "2026-01-07", price: 66700 },
      { date: "2026-01-14", price: 65500 },
      { date: "2026-02-03", price: 68900 },
      { date: "2026-02-10", price: 68200, tradeType: "BUY" },
      { date: "2026-02-14", price: 69100 },
      { date: "2026-02-18", price: 70500 },
      { date: "2026-02-24", price: 69800 },
      { date: "2026-02-28", price: 71600 },
      { date: "2026-03-05", price: 72400 },
      { date: "2026-03-11", price: 73800 },
      { date: "2026-03-19", price: 74300 },
    ],
  },
  "000660": {
    cumulativeReturn: 42.3,
    winRate: 77.8,
    recentReturn: 14.6,
    holding: {
      buyDate: "2026-02-12",
      buyPrice: 189500,
      currentPrice: 213500,
      holdingQuantity: 5,
      investmentAmount: 947500,
      evaluationProfit: 120000,
      currentReturn: 12.66,
      holdingDays: 40,
    },
    chart: [
      { date: "2025-05-19", price: 128000 },
      { date: "2025-06-05", price: 134500 },
      { date: "2025-06-16", price: 132500 },
      { date: "2025-07-03", price: 138500 },
      { date: "2025-07-14", price: 137000 },
      { date: "2025-07-31", price: 145500 },
      { date: "2025-08-11", price: 141500 },
      { date: "2025-08-28", price: 149000 },
      { date: "2025-09-15", price: 148000 },
      { date: "2025-10-02", price: 144500 },
      { date: "2025-10-20", price: 154500 },
      { date: "2025-11-06", price: 163800 },
      { date: "2025-11-24", price: 162000 },
      { date: "2025-12-11", price: 171500 },
      { date: "2025-12-19", price: 169500 },
      { date: "2026-01-09", price: 180000 },
      { date: "2026-01-16", price: 176000 },
      { date: "2026-02-05", price: 188500 },
      { date: "2026-02-12", price: 189500, tradeType: "BUY" },
      { date: "2026-02-17", price: 193000 },
      { date: "2026-02-24", price: 197500 },
      { date: "2026-02-28", price: 195800 },
      { date: "2026-03-05", price: 201200 },
      { date: "2026-03-10", price: 206500 },
      { date: "2026-03-17", price: 210800 },
      { date: "2026-03-23", price: 213500 },
    ],
  },
};

const fallbackInvestmentPerformance = mockInvestmentPerformanceByStockId["005930"];

const fallbackTradeHistory = mockTradeHistoryByStockId["005930"];

const mockReportPagePresentationByStockId: Record<string, ReportPagePresentationSeed> = {
  "005930": {
    market: "KOSPI 50",
    price: 74300,
    changeRate: 1.2,
    benchmarkTime: "2026.03.19 15:30 마감 기준",
    events: [
      {
        id: "a",
        date: "2026.03.11",
        category: "실적",
        title: "반도체 수익성 개선 전망 상향",
        description: "증권가에서 메모리 ASP 상승 반영으로 연간 영업이익 추정치를 상향 조정했습니다.",
        tone: "info",
      },
      {
        id: "b",
        date: "2026.03.14",
        category: "공시",
        title: "자사주 소각 검토 공시",
        description: "주주환원 기대가 부각되며 기관 수급이 개선됐습니다.",
        tone: "neutral",
      },
      {
        id: "c",
        date: "2026.03.18",
        category: "시세특이",
        title: "외국인 순매수 확대",
        description: "외국인 순매수가 4거래일 연속 이어지며 종가 기준 고점을 갱신했습니다.",
        tone: "danger",
      },
    ],
  },
  "000660": {
    market: "KOSPI 200",
    price: 213500,
    changeRate: 1.8,
    benchmarkTime: "2026.03.23 15:30 마감 기준",
    events: [
      {
        id: "a",
        date: "2026.03.07",
        category: "실적",
        title: "HBM 수요 확대에 연간 영업이익 전망 상향",
        description: "증권가에서 AI 서버 메모리 출하 증가를 반영해 실적 추정치를 상향 조정했습니다.",
        tone: "info",
      },
      {
        id: "b",
        date: "2026.03.14",
        category: "공시",
        title: "대규모 메모리 공급계약 체결 공시",
        description: "주요 고객사향 공급계약 체결 소식이 전해지며 수주 가시성이 높아졌습니다.",
        tone: "neutral",
      },
      {
        id: "c",
        date: "2026.03.20",
        category: "시세특이",
        title: "외국인 순매수 유입으로 신고가 경신",
        description: "메모리 업황 개선 기대가 반영되며 외국인 순매수가 이어졌습니다.",
        tone: "danger",
      },
    ],
  },
};

const fallbackPresentationSeed = mockReportPagePresentationByStockId["005930"];

export function getMockChairmanAnalysisReports(stockId: string, query: ChairmanAnalysisReportsQuery = {}): ChairmanAnalysisReportsResponse {
  const reports = mockChairmanAnalysisReportsByStockId[stockId] ?? fallbackChairmanReports;
  const offset = Math.max(0, query.offset ?? 0);
  const limit = Math.max(0, query.limit ?? reports.length);

  return {
    reports: reports.slice(offset, offset + limit),
  };
}

export function getMockInvestmentPerformance(stockId: string): InvestmentPerformanceResponse {
  return mockInvestmentPerformanceByStockId[stockId] ?? fallbackInvestmentPerformance;
}

export function getMockTradeHistory(stockId: string, query: TradeHistoryQuery = {}): TradeHistoryResponse {
  const trades = (mockTradeHistoryByStockId[stockId] ?? fallbackTradeHistory).trades;
  const offset = Math.max(0, query.offset ?? 0);
  const limit = Math.max(0, query.limit ?? trades.length);

  return {
    trades: trades.slice(offset, offset + limit),
  };
}

export function hasMockTradeHistory(stockId: string) {
  return Boolean(mockTradeHistoryByStockId[stockId]);
}

export function getMockReportPagePresentation(stockId: string): ReportPagePresentationSeed {
  return mockReportPagePresentationByStockId[stockId] ?? fallbackPresentationSeed;
}
