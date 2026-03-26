import type { DebateReport, DebateReportsQuery, DebateReportsResponse } from "../types/debate";

type DebateSeed = {
  stockId: string;
  companyName: string;
  date: string;
  createdAt: string;
  chairman: {
    signal: string;
    confidence: number;
    summary: string;
  };
  finalStances: DebateReport["finalStances"];
  rounds: DebateReport["debate"]["rounds"];
};

function createDebateReport(seed: DebateSeed): DebateReport {
  return {
    date: seed.date,
    chairman: seed.chairman,
    finalStances: seed.finalStances,
    createdAt: seed.createdAt,
    debate: {
      rounds: seed.rounds,
    },
  };
}

const debateSeeds: DebateSeed[] = [
  {
    stockId: "8",
    companyName: "삼성전자",
    date: "2026-03-18",
    createdAt: "2026-03-18T10:30:00",
    chairman: {
      signal: "STRONG_BUY",
      confidence: 87,
      summary:
        "기술적 추세 전환, 저평가 구간의 밸류에이션, 긍정 뉴스 흐름이 동시에 확인됐습니다. 다만 단기 과열 가능성을 고려해 2회 이상 분할 매수로 접근하는 전략을 권고합니다.",
    },
    finalStances: [
      { agentId: "chart", agentName: "차트 분석가", stance: "매수" },
      { agentId: "news", agentName: "뉴스 전문가", stance: "단기 매수" },
      { agentId: "fund", agentName: "펀더멘탈 위원", stance: "강력 매수" },
    ],
    rounds: [
      {
        roundNo: 1,
        agents: [
          {
            name: "차트 분석가",
            opinion: "매수",
            summary:
              "20일선과 60일선을 동시에 회복했고 거래대금도 전주 대비 뚜렷하게 증가했습니다. 단기 추세 전환이 확인된 만큼 첫 진입 타이밍으로 판단합니다.",
          },
          {
            name: "뉴스 전문가",
            opinion: "보류",
            summary:
              "FinBERT 기준 긍정 기사 비중은 우세하지만, 커뮤니티 텍스트 클러스터에는 단기 급등 피로감과 차익 실현 심리도 함께 나타납니다. 일단은 보류 의견입니다.",
          },
          {
            name: "펀더멘탈 위원",
            opinion: "강력 매수",
            summary:
              "PER과 PBR 모두 최근 3년 밴드 하단에 가깝고, 영업이익 추정치는 2개 분기 연속 상향 조정 중입니다. 안전마진이 충분해 강력 매수 의견을 냅니다.",
          },
        ],
      },
      {
        roundNo: 2,
        agents: [
          {
            name: "차트 분석가",
            opinion: "매수 유지",
            summary:
              "과열 우려는 인정하지만 이번 상승은 단순 테마성 급등과 다릅니다. 외국인과 기관의 동시 순매수가 확인돼 수급 구조상 추세 지속 가능성이 더 높습니다.",
          },
          {
            name: "뉴스 전문가",
            opinion: "단기 매수",
            summary:
              "뉴스 볼륨과 감성 지표를 다시 확인한 결과, 부정 키워드는 줄고 실적 기대와 AI 수요 관련 긍정 키워드가 확대되고 있습니다. 단기 매수 쪽으로 입장을 수정하겠습니다.",
          },
          {
            name: "펀더멘탈 위원",
            opinion: "강력 매수 유지",
            summary:
              "시장 심리의 단기 흔들림과 무관하게 본질 가치는 여전히 견조합니다. 현재 주가는 실적 개선 속도를 충분히 반영하지 못하고 있어 매수 우위 의견을 유지합니다.",
          },
        ],
      },
      {
        roundNo: 3,
        agents: [
          {
            name: "펀더멘탈 위원",
            opinion: "강력 매수 유지",
            summary:
              "중장기 모아가기 전략이 유효합니다. 단기 조정이 오더라도 펀더멘털 훼손이 아니라면 오히려 비중 확대 기회로 활용할 수 있습니다.",
          },
          {
            name: "차트 분석가",
            opinion: "분할 매수",
            summary:
              "실전 대응 기준으로는 직전 돌파 구간을 1차 지지선으로 삼고, 눌림 시 2차 분할 매수를 권합니다. 손절보다는 변동성 관리 관점이 적절합니다.",
          },
          {
            name: "뉴스 전문가",
            opinion: "모멘텀 유지 확인",
            summary:
              "남은 체크포인트는 다음 실적 발표 전후의 가이던스와 대형 투자자 수급 뉴스입니다. 현재까지는 긍정 모멘텀이 유지되고 있다고 판단합니다.",
          },
        ],
      },
    ],
  },
  {
    stockId: "2",
    companyName: "SK하이닉스",
    date: "2026-03-18",
    createdAt: "2026-03-18T11:05:00",
    chairman: {
      signal: "BUY",
      confidence: 82,
      summary:
        "HBM 수요 모멘텀과 실적 레버리지는 분명하지만, 단기 밸류에이션 부담이 일부 반영돼 공격적 추격 매수보다는 눌림 구간 접근이 적절합니다.",
    },
    finalStances: [
      { agentId: "chart", agentName: "차트 분석가", stance: "단기 매수" },
      { agentId: "news", agentName: "뉴스 전문가", stance: "매수" },
      { agentId: "fund", agentName: "펀더멘탈 위원", stance: "매수" },
    ],
    rounds: [
      {
        roundNo: 1,
        agents: [
          {
            name: "차트 분석가",
            opinion: "단기 매수",
            summary:
              "상승 채널 상단 돌파 이후 거래량이 유지되고 있습니다. 다만 단기 이격이 커서 추격보다는 눌림 구간 분할 진입이 더 안정적입니다.",
          },
          {
            name: "뉴스 전문가",
            opinion: "매수",
            summary:
              "HBM 관련 공급 계약과 AI 서버 수요 기사가 연속적으로 유입되고 있습니다. 부정 뉴스보다 공급 부족 관련 긍정 톤이 우세합니다.",
          },
          {
            name: "펀더멘탈 위원",
            opinion: "매수",
            summary:
              "메모리 업황 반등과 ASP 개선 효과가 동시에 반영되고 있습니다. 밸류에이션 부담은 있지만 실적 상향 속도를 고려하면 여전히 매수 가능합니다.",
          },
        ],
      },
      {
        roundNo: 2,
        agents: [
          {
            name: "뉴스 전문가",
            opinion: "매수 유지",
            summary:
              "시장 우려는 경쟁사 증설 속도에 집중돼 있지만, 현재 기사 흐름은 기술 리더십과 고객사 수요 확보에 더 무게를 두고 있습니다.",
          },
          {
            name: "차트 분석가",
            opinion: "과열 경계",
            summary:
              "단기 RSI 기준 과열 신호가 확인됩니다. 방향성은 긍정적이지만 진입 단가 관리가 중요합니다.",
          },
          {
            name: "펀더멘탈 위원",
            opinion: "매수 유지",
            summary:
              "주가가 선반영된 측면은 있으나, 실적 추정치 상향 폭이 계속 확대되고 있어 고점 논리만으로 설명하기 어렵습니다.",
          },
        ],
      },
      {
        roundNo: 3,
        agents: [
          {
            name: "차트 분석가",
            opinion: "눌림 매수",
            summary:
              "단기 지지선 확인 후 비중을 늘리는 전략이 적절합니다. 추세 훼손 전까지는 매수 관점 유지가 가능합니다.",
          },
          {
            name: "뉴스 전문가",
            opinion: "모멘텀 지속",
            summary:
              "다음 촉매는 실적 발표와 고객사 투자 확대 뉴스입니다. 현재 뉴스 모멘텀은 여전히 우호적입니다.",
          },
        ],
      },
    ],
  },
  {
    stockId: "102",
    companyName: "NAVER",
    date: "2026-03-18",
    createdAt: "2026-03-18T13:20:00",
    chairman: {
      signal: "BUY",
      confidence: 79,
      summary:
        "광고와 커머스 회복, AI 서비스 기대감이 동시에 유효합니다. 다만 성장주 전반 변동성에 영향을 받을 수 있어 단기 파동은 감내가 필요합니다.",
    },
    finalStances: [
      { agentId: "chart", agentName: "차트 분석가", stance: "매수" },
      { agentId: "news", agentName: "뉴스 전문가", stance: "매수" },
      { agentId: "fund", agentName: "펀더멘탈 위원", stance: "보유 후 매수" },
    ],
    rounds: [
      {
        roundNo: 1,
        agents: [
          {
            name: "차트 분석가",
            opinion: "매수",
            summary:
              "장기 하락 추세선 상단을 돌파한 뒤 안착을 시도하고 있습니다. 추세 반전 초기 국면으로 볼 수 있습니다.",
          },
          {
            name: "뉴스 전문가",
            opinion: "매수",
            summary:
              "AI 검색, 쇼핑 추천, 일본 사업 관련 뉴스의 정서가 개선되고 있습니다. 기존 규제 우려보다 서비스 확장 뉴스가 더 강합니다.",
          },
          {
            name: "펀더멘탈 위원",
            opinion: "보유 후 매수",
            summary:
              "광고 회복과 커머스 수익성 개선이 확인되지만, 즉각적인 폭발적 이익 개선보다는 점진적 회복 흐름에 가깝습니다.",
          },
        ],
      },
      {
        roundNo: 2,
        agents: [
          {
            name: "뉴스 전문가",
            opinion: "매수 유지",
            summary:
              "사용자 체류시간 개선과 AI 기능 탑재 확대 관련 보도가 이어지고 있습니다. 심리 측면에서는 반전 기대감이 커지고 있습니다.",
          },
          {
            name: "차트 분석가",
            opinion: "매수 유지",
            summary:
              "직전 저항을 지지선으로 바꾸는지 확인 중입니다. 가격 구조는 나쁘지 않고 거래량도 안정적으로 유지됩니다.",
          },
          {
            name: "펀더멘탈 위원",
            opinion: "신중 매수",
            summary:
              "밸류에이션이 아주 싸다고 보긴 어렵지만, 회복 초기 국면에서는 리레이팅이 가능하다는 점을 감안할 필요가 있습니다.",
          },
        ],
      },
      {
        roundNo: 3,
        agents: [
          {
            name: "펀더멘탈 위원",
            opinion: "분할 매수",
            summary:
              "실적 확인 구간까지는 분할 매수가 적절합니다. 단기 조정이 오더라도 구조적 회복 기대는 유지됩니다.",
          },
          {
            name: "뉴스 전문가",
            opinion: "긍정 유지",
            summary:
              "핵심 체크포인트는 AI 서비스 실제 사용자 지표와 광고 회복 속도입니다. 현재 뉴스 흐름은 긍정 우위입니다.",
          },
        ],
      },
    ],
  },
  {
    stockId: "005380",
    companyName: "현대차",
    date: "2026-03-18",
    createdAt: "2026-03-18T14:10:00",
    chairman: {
      signal: "HOLD",
      confidence: 74,
      summary:
        "실적과 주주환원은 우수하지만 단기 상승폭이 커졌고 매크로 변수 민감도도 남아 있습니다. 신규 진입보다는 기존 보유자의 관망이 더 적절합니다.",
    },
    finalStances: [
      { agentId: "chart", agentName: "차트 분석가", stance: "관망" },
      { agentId: "news", agentName: "뉴스 전문가", stance: "보유" },
      { agentId: "fund", agentName: "펀더멘탈 위원", stance: "매수" },
    ],
    rounds: [
      {
        roundNo: 1,
        agents: [
          {
            name: "차트 분석가",
            opinion: "관망",
            summary:
              "중기 추세는 견조하지만 최근 상승 속도가 빠릅니다. 지금 구간은 신규 진입보다 눌림 대기 전략이 더 합리적입니다.",
          },
          {
            name: "뉴스 전문가",
            opinion: "보유",
            summary:
              "전기차 전략과 주주환원 관련 뉴스는 긍정적입니다. 다만 환율과 글로벌 수요 둔화 이슈가 동시에 언급되고 있습니다.",
          },
          {
            name: "펀더멘탈 위원",
            opinion: "매수",
            summary:
              "PER 기준 저평가가 여전하고 현금창출력도 뛰어납니다. 실적 체력만 보면 매수 의견을 유지할 만합니다.",
          },
        ],
      },
      {
        roundNo: 2,
        agents: [
          {
            name: "차트 분석가",
            opinion: "단기 부담",
            summary:
              "추세는 좋지만 단기 이격이 커지면 수익 실현 매물이 나올 수 있습니다. 기술적으로는 보수적 접근이 맞습니다.",
          },
          {
            name: "펀더멘탈 위원",
            opinion: "매수 유지",
            summary:
              "단기 차트 부담과 별개로 밸류에이션은 여전히 방어적입니다. 매크로 변수만 안정되면 재평가 여지는 남아 있습니다.",
          },
          {
            name: "뉴스 전문가",
            opinion: "관망 강화",
            summary:
              "소비 경기 관련 뉴스 톤이 완전히 회복된 것은 아닙니다. 실적 시즌 전까지는 확신 강도를 낮출 필요가 있습니다.",
          },
        ],
      },
      {
        roundNo: 3,
        agents: [
          {
            name: "뉴스 전문가",
            opinion: "보유",
            summary:
              "기존 보유자는 주주환원과 실적을 확인하며 대응하는 전략이 유효합니다. 다만 신규 진입은 속도 조절이 필요합니다.",
          },
          {
            name: "차트 분석가",
            opinion: "보류",
            summary:
              "가격 조정 이후 재진입 신호를 확인하는 것이 더 안전합니다. 단기적으로는 관망 의견을 유지합니다.",
          },
        ],
      },
    ],
  },
  {
    stockId: "051910",
    companyName: "LG화학",
    date: "2026-03-18",
    createdAt: "2026-03-18T14:55:00",
    chairman: {
      signal: "HOLD",
      confidence: 71,
      summary:
        "배터리 소재 회복 기대는 존재하지만 이익 가시성이 아직 충분히 확보되진 않았습니다. 반등 신호 확인 전까지는 신중한 접근이 필요합니다.",
    },
    finalStances: [
      { agentId: "chart", agentName: "차트 분석가", stance: "보류" },
      { agentId: "news", agentName: "뉴스 전문가", stance: "관망" },
      { agentId: "fund", agentName: "펀더멘탈 위원", stance: "보유" },
    ],
    rounds: [
      {
        roundNo: 1,
        agents: [
          {
            name: "차트 분석가",
            opinion: "보류",
            summary:
              "하락 추세는 둔화됐지만 아직 명확한 반전 구조는 아닙니다. 거래량 역시 추세 전환을 확신하기엔 부족합니다.",
          },
          {
            name: "뉴스 전문가",
            opinion: "관망",
            summary:
              "배터리 소재 업황 회복 기사와 재고 조정 뉴스가 혼재돼 있습니다. 시장 심리는 중립에 가깝습니다.",
          },
          {
            name: "펀더멘탈 위원",
            opinion: "보유",
            summary:
              "밸류에이션 매력은 일부 회복됐지만 실적 가시성이 제한적입니다. 지금은 저가 매수보다 기존 보유 관점이 더 적절합니다.",
          },
        ],
      },
      {
        roundNo: 2,
        agents: [
          {
            name: "뉴스 전문가",
            opinion: "관망 유지",
            summary:
              "정책 뉴스와 업황 회복 기대는 있으나 실제 수요 회복을 입증할 데이터는 더 필요합니다. 심리 반전은 아직 초입입니다.",
          },
          {
            name: "차트 분석가",
            opinion: "기술적 중립",
            summary:
              "지지선 근처에서 반등은 나왔지만 추세 전환 확인 신호로 보긴 이릅니다. 방향성보다는 박스권 대응이 적절합니다.",
          },
        ],
      },
      {
        roundNo: 3,
        agents: [
          {
            name: "펀더멘탈 위원",
            opinion: "보유",
            summary:
              "다음 분기 실적과 수요 회복 강도를 확인한 뒤 판단을 높이는 편이 타당합니다. 현시점 신규 비중 확대는 서두를 필요가 없습니다.",
          },
        ],
      },
    ],
  },
  {
    stockId: "201",
    companyName: "카카오",
    date: "2026-03-18",
    createdAt: "2026-03-18T15:20:00",
    chairman: {
      signal: "SELL",
      confidence: 76,
      summary:
        "기술적 반등 시도가 있더라도 실적 회복과 신사업 확장에 대한 신뢰가 아직 충분치 않습니다. 포트폴리오 방어 관점에서는 비중 축소가 우선입니다.",
    },
    finalStances: [
      { agentId: "chart", agentName: "차트 분석가", stance: "매도" },
      { agentId: "news", agentName: "뉴스 전문가", stance: "보류 후 매도" },
      { agentId: "fund", agentName: "펀더멘탈 위원", stance: "매도" },
    ],
    rounds: [
      {
        roundNo: 1,
        agents: [
          {
            name: "차트 분석가",
            opinion: "매도",
            summary:
              "기술적 반등 시도는 있었지만 상단 저항 돌파에 반복적으로 실패하고 있습니다. 추세는 아직 하방 우위입니다.",
          },
          {
            name: "뉴스 전문가",
            opinion: "보류 후 매도",
            summary:
              "콘텐츠와 플랫폼 개선 뉴스는 있으나 투자자 심리를 되돌릴 만큼 강한 촉매는 아닙니다. 부정 기사 반응이 더 크게 반영됩니다.",
          },
          {
            name: "펀더멘탈 위원",
            opinion: "매도",
            summary:
              "이익 회복 속도와 자본 효율성 측면에서 경쟁사 대비 매력이 제한적입니다. 밸류에이션 할인만으로 매수 논리를 세우기 어렵습니다.",
          },
        ],
      },
      {
        roundNo: 2,
        agents: [
          {
            name: "차트 분석가",
            opinion: "매도 유지",
            summary:
              "거래량이 붙는 날에도 매물 소화가 완전히 되지 않습니다. 반등 시마다 비중 축소가 더 적절한 자리입니다.",
          },
          {
            name: "뉴스 전문가",
            opinion: "심리 취약",
            summary:
              "관련 뉴스의 댓글·커뮤니티 반응을 보면 기대보다 실망이 더 크게 나타납니다. 심리 반전 신호는 아직 약합니다.",
          },
          {
            name: "펀더멘탈 위원",
            opinion: "매도 유지",
            summary:
              "실적 턴어라운드가 수치로 확인되기 전까지는 보수적으로 접근해야 합니다. 자금 효율 관점에서도 다른 대안이 많습니다.",
          },
        ],
      },
      {
        roundNo: 3,
        agents: [
          {
            name: "뉴스 전문가",
            opinion: "매도 동의",
            summary:
              "추가 호재가 나오더라도 시장이 바로 신뢰를 회복할 가능성은 낮습니다. 심리 반전까지 시간이 더 필요합니다.",
          },
          {
            name: "차트 분석가",
            opinion: "반등 시 정리",
            summary:
              "단기 반등은 나올 수 있지만 추세 훼손을 되돌릴 수준은 아닙니다. 기술적으로는 반등 시 정리 전략이 우위입니다.",
          },
        ],
      },
    ],
  },
];

export const mockCompanyNameByStockId: Record<string, string> = Object.fromEntries(
  debateSeeds.map((seed) => [seed.stockId, seed.companyName]),
);

export const mockDebateReportsByStockId: Record<string, DebateReport[]> = Object.fromEntries(
  debateSeeds.map((seed) => [seed.stockId, [createDebateReport(seed)]]),
);

export function hasMockDebateReports(stockId: string) {
  return Boolean(mockDebateReportsByStockId[stockId]);
}

export function getMockDebateReportsResponse(stockId: string): DebateReportsResponse {
  return {
    reports: mockDebateReportsByStockId[stockId] ?? mockDebateReportsByStockId["1"],
  };
}

export function getMockDebateReportsResponseByQuery(stockId: string, query: DebateReportsQuery = {}): DebateReportsResponse {
  const reports = getMockDebateReportsResponse(stockId).reports;
  const offset = Math.max(0, query.offset ?? 0);
  const limit = Math.max(0, query.limit ?? reports.length);

  return {
    reports: reports.slice(offset, offset + limit),
  };
}

export function getMockLatestDebateReport(stockId: string): DebateReport {
  return getMockDebateReportsResponse(stockId).reports[0];
}

export function getMockCompanyName(stockId: string) {
  return mockCompanyNameByStockId[stockId] ?? "종목 리포트";
}
