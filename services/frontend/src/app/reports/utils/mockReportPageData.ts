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
      final_stances: [
        { agent_id: "chart", agent_name: "차트 분석가", stance: "분할 매수" },
        { agent_id: "news", agent_name: "뉴스 전문가", stance: "매수" },
        { agent_id: "fund", agent_name: "펀더멘탈 위원", stance: "강력 매수" },
      ],
      created_at: "2026-03-19T09:10:00+09:00",
      debate: {
        rounds: [
          {
            round_no: 1,
            agents: [
              { name: "차트 분석가", opinion: "매수", summary: "중기 추세선 회복과 거래량 증가가 동반돼 추세 전환 가능성이 높습니다." },
              { name: "뉴스 전문가", opinion: "매수", summary: "AI 반도체 수요와 실적 기대 관련 긍정 뉴스 비중이 우세합니다." },
              { name: "펀더멘탈 위원", opinion: "강력 매수", summary: "실적 상향과 저평가 구간이 겹쳐 안전마진이 충분합니다." },
            ],
          },
          {
            round_no: 2,
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
      final_stances: [
        { agent_id: "chart", agent_name: "차트 분석가", stance: "매수" },
        { agent_id: "news", agent_name: "뉴스 전문가", stance: "보유 후 매수" },
        { agent_id: "fund", agent_name: "펀더멘탈 위원", stance: "매수" },
      ],
      created_at: "2026-03-12T10:20:00+09:00",
      debate: {
        rounds: [
          {
            round_no: 1,
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
      final_stances: [
        { agent_id: "chart", agent_name: "차트 분석가", stance: "매수" },
        { agent_id: "news", agent_name: "뉴스 전문가", stance: "매수" },
        { agent_id: "fund", agent_name: "펀더멘탈 위원", stance: "보유 후 매수" },
      ],
      created_at: "2026-03-05T11:00:00+09:00",
      debate: {
        rounds: [
          {
            round_no: 1,
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
      final_stances: [
        { agent_id: "chart", agent_name: "차트 분석가", stance: "관망" },
        { agent_id: "news", agent_name: "뉴스 전문가", stance: "보유" },
        { agent_id: "fund", agent_name: "펀더멘탈 위원", stance: "매수" },
      ],
      created_at: "2026-02-26T15:30:00+09:00",
      debate: {
        rounds: [
          {
            round_no: 1,
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
      final_stances: [
        { agent_id: "chart", agent_name: "차트 분석가", stance: "매수" },
        { agent_id: "news", agent_name: "뉴스 전문가", stance: "매수" },
        { agent_id: "fund", agent_name: "펀더멘탈 위원", stance: "매수" },
      ],
      created_at: "2026-02-19T14:05:00+09:00",
      debate: {
        rounds: [
          {
            round_no: 1,
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
      final_stances: [
        { agent_id: "chart", agent_name: "차트 분석가", stance: "분할 매수" },
        { agent_id: "news", agent_name: "뉴스 전문가", stance: "보유 후 매수" },
        { agent_id: "fund", agent_name: "펀더멘탈 위원", stance: "매수" },
      ],
      created_at: "2026-02-12T13:40:00+09:00",
      debate: {
        rounds: [
          {
            round_no: 1,
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

const mockInvestmentPerformanceByStockId: Record<string, InvestmentPerformanceResponse> = {
  "005930": {
    cumulative_return: 38.7,
    win_rate: 85.2,
    recent_return: 12.4,
    holding: {
      buy_date: "2026-02-10",
      buy_price: 68200,
      current_price: 74300,
      holding_quantity: 14,
      investment_amount: 954800,
      evaluation_profit: 85400,
      current_return: 8.94,
      holding_days: 38,
    },
    chart: [
      { date: "2026-02-10", price: 68200, trade_type: "BUY" },
      { date: "2026-02-14", price: 69100 },
      { date: "2026-02-18", price: 70500 },
      { date: "2026-02-24", price: 69800 },
      { date: "2026-02-28", price: 71600 },
      { date: "2026-03-05", price: 72400 },
      { date: "2026-03-11", price: 73800 },
      { date: "2026-03-19", price: 74300 },
    ],
  },
};

const fallbackInvestmentPerformance = mockInvestmentPerformanceByStockId["005930"];

const mockTradeHistoryByStockId: Record<string, TradeHistoryResponse> = {
  "005930": {
    trades: [
      { status: "HOLDING", buy_date: "2026-02-10", buy_price: 68200, current_price: 74300, holding_days: 38, return_rate: 8.94 },
      { status: "CLOSED", buy_date: "2026-01-14", sell_date: "2026-02-03", buy_price: 65500, sell_price: 68900, holding_days: 20, return_rate: 5.19 },
      { status: "CLOSED", buy_date: "2025-12-18", sell_date: "2026-01-07", buy_price: 63100, sell_price: 66700, holding_days: 20, return_rate: 5.71 },
      { status: "CLOSED", buy_date: "2025-11-20", sell_date: "2025-12-05", buy_price: 61200, sell_price: 64100, holding_days: 15, return_rate: 4.74 },
      { status: "CLOSED", buy_date: "2025-10-15", sell_date: "2025-11-04", buy_price: 60100, sell_price: 64500, holding_days: 20, return_rate: 7.32 },
      { status: "CLOSED", buy_date: "2025-09-11", sell_date: "2025-10-01", buy_price: 58400, sell_price: 60300, holding_days: 20, return_rate: 3.25 },
      { status: "CLOSED", buy_date: "2025-08-06", sell_date: "2025-08-28", buy_price: 57100, sell_price: 59800, holding_days: 22, return_rate: 4.73 },
      { status: "CLOSED", buy_date: "2025-07-09", sell_date: "2025-07-29", buy_price: 56300, sell_price: 57900, holding_days: 20, return_rate: 2.84 },
      { status: "CLOSED", buy_date: "2025-06-11", sell_date: "2025-07-01", buy_price: 55200, sell_price: 58800, holding_days: 20, return_rate: 6.52 },
      { status: "CLOSED", buy_date: "2025-05-13", sell_date: "2025-06-03", buy_price: 54100, sell_price: 56600, holding_days: 21, return_rate: 4.62 },
    ],
  },
};

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

export function getMockReportPagePresentation(stockId: string): ReportPagePresentationSeed {
  return mockReportPagePresentationByStockId[stockId] ?? fallbackPresentationSeed;
}
