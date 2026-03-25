"use client";

import { PORTFOLIO_STATS } from "../utils/aboutContent";
import Reveal from "./Reveal";

export default function AboutPortfolioSection() {
  return (
    <section className="px-6 py-24 md:px-10 lg:px-16 lg:py-32">
      <div className="mx-auto max-w-[1152px]">
        <Reveal className="stack text-center" style={{ gap: "0.75rem" }}>
          <p className="typo-heading-sm text-[color:var(--color-text-interactive-primary)]">모의투자 포트폴리오</p>
          <h2 className="typo-heading-3xl text-[color:var(--color-text-primary)]">
            데이터로 증명하는
            <br />
            AI 모델 포트폴리오
          </h2>
          <p className="typo-body-lg mx-auto max-w-[18rem] font-semibold text-[color:var(--color-text-secondary)] md:max-w-[34rem] lg:max-w-[42rem]">
            AI의 분석, 과연 믿을 수 있을까요? 과거 시장 데이터를 기반으로 한 백테스팅 성과와 의장의 모의투자 포트폴리오 수익률을 투명하게 공개합니다.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {PORTFOLIO_STATS.map((stat, index) => (
            <Reveal
              key={stat.label}
              delay={index * 0.08}
              y={32}
              scale={0.98}
              className="rounded-[2rem] bg-[#f8fafc] px-8 py-8 text-center outline outline-1 outline-[color:rgba(15,23,42,0.05)]"
            >
              <p className="typo-body-sm font-bold text-[color:var(--color-text-tertiary)]">{stat.label}</p>
              <p className={`typo-heading-2xl mt-4 ${stat.tone}`}>{stat.value}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
