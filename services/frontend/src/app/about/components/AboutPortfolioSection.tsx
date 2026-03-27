"use client";

import { PORTFOLIO_STATS } from "../utils/aboutContent";
import Reveal from "./Reveal";

const MOBILE_DESCRIPTION_LINES = [
  "AI의 분석, 과연 믿을 수 있을까요?",
  "과거의 시장 데이터를 기반으로 한 백테스팅 성과와",
  "의장의 모의투자 포트폴리오 수익률을",
  "매일 투명하게 공개합니다.",
] as const;

export default function AboutPortfolioSection() {
  return (
    <section className="overflow-hidden px-6 py-32 md:px-10 md:py-24 lg:px-16 lg:py-32">
      <div className="mx-auto max-w-[1152px]">
        <Reveal className="stack items-center text-center" style={{ gap: "0.75rem" }}>
          <p className="typo-heading-sm text-[color:var(--color-text-interactive-primary)] md:typo-heading-md">
            모의투자 포트폴리오
          </p>
          <h2 className="typo-heading-3xl text-[color:var(--color-text-primary)] [word-break:keep-all]">
            데이터로 증명하는
            <br />
            AI 모델 포트폴리오
          </h2>
          <p className="typo-body-lg mx-auto hidden max-w-[34rem] font-semibold text-[color:var(--color-text-secondary)] md:block lg:max-w-[42rem]">
            AI의 분석, 과연 믿을 수 있을까요? 과거의 시장 데이터를 기반으로 한 백테스팅 성과와 의장의 모의투자 포트폴리오 수익률을 매일 투명하게 공개합니다.
          </p>
          <div className="typo-body-lg mx-auto flex max-w-[18rem] flex-col items-center pt-2.5 font-semibold text-[color:var(--color-text-secondary)] md:hidden">
            {MOBILE_DESCRIPTION_LINES.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        </Reveal>

        <div className="mx-auto mt-20 flex max-w-[20rem] flex-col items-center gap-8 md:mt-14 md:max-w-none md:grid md:grid-cols-3 md:gap-6">
          {PORTFOLIO_STATS.map((stat, index) => (
            <Reveal
              key={stat.label}
              delay={index * 0.08}
              y={32}
              scale={0.98}
              className="flex h-28 w-full max-w-60 flex-col items-center justify-center gap-2 rounded-[32px] bg-[color:var(--color-bg-secondary)] px-8 py-8 text-center outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-secondary)] md:h-auto md:max-w-none md:rounded-[2rem]"
            >
              <p className="typo-body-sm font-semibold text-[color:var(--color-text-secondary)]">{stat.label}</p>
              <p className={`typo-heading-3xl md:typo-heading-2xl ${stat.tone}`}>{stat.value}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
