import type { AboutAgent, PortfolioStat, ProblemSection } from "../types/about";

export const PROBLEM_SECTIONS: ProblemSection[] = [
  {
    eyebrow: "감정을 배제한 검증",
    title: "감정은 빼고\n오직 데이터로만 토론",
    description:
      "차트, 뉴스, 기업 가치 3가지 관점의 치열한 교차 검증을 통해 가장 이성적이고 안전한 매매 타점을 확인하세요.",
    accentTone: "dark",
  },
  {
    eyebrow: "투명한 투자 의사결정",
    title: "이유 없는 결정은\n하지 않습니다",
    description:
      "자극적인 뉴스 기사에 초조해하며 소중한 자산을 걸지 마세요. 전문적인 3인의 가상 위원들이 어떻게 합의하고 왜 그런 결론을 내렸는지, 투명한 토론 과정을 거친 결과만 받아보세요.",
    accentTone: "light",
  },
  {
    eyebrow: "관심종목 알람",
    title: "계속 바뀌는 주가,\n계속 들여다볼 필요 없어요",
    description:
      "내가 관심있는 종목은 관심종목으로 설정해보세요. 특이사항이 있으면 알람을 전송해드릴게요.",
    accentTone: "card",
  },
];

export const AGENTS: AboutAgent[] = [
  {
    name: "Fundamental Agent",
    title: "가치를 분석하는 펀더멘탈 위원",
    description: "기업의 재무제표, 매출 성장성, 산업의 미래 가치를 분석하여 본질적인 매력도를 평가합니다.",
    image: "/images/about/fund_idle.png",
    accentClassName: "text-[color:var(--color-text-danger)]",
    reverse: false,
  },
  {
    name: "Chart Agent",
    title: "흐름을 읽는 차트 위원",
    description: "과거의 주가 패턴, 거래량, 이동평균선을 계산하여 최적의 매수·매도 타이밍을 포착합니다.",
    image: "/images/about/chart_idle.png",
    accentClassName: "text-[color:var(--color-text-info)]",
    reverse: true,
  },
  {
    name: "Sentiment Agent",
    title: "심리를 진단하는 뉴스 위원",
    description: "뉴스 헤드라인, 투자자 포럼, 시장 분위기를 자연어 처리로 분석해 공포와 탐욕의 흐름을 읽어냅니다.",
    image: "/images/about/news_idle.png",
    accentClassName: "text-[color:var(--color-text-success)]",
    reverse: false,
  },
];

export const PORTFOLIO_STATS: PortfolioStat[] = [
  { label: "포트폴리오 누적 수익률", value: "+42.5%", tone: "text-rose-500" },
  { label: "AI 예측 적중률", value: "85.2%", tone: "text-[color:var(--color-text-primary)]" },
  { label: "코스피 대비 초과", value: "+15.4%p", tone: "text-rose-500" },
];
