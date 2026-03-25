"use client";

import Image from "next/image";
import { PROBLEM_SECTIONS } from "../utils/aboutContent";
import type { ProblemAccentTone } from "../types/about";
import { renderMultiline } from "../utils/renderMultiline";
import Reveal from "./Reveal";

type ProblemVisualProps = {
  tone: ProblemAccentTone;
};

function ProblemVisual({ tone }: ProblemVisualProps) {
  if (tone === "dark") {
    return (
      <div className="flex h-full min-h-[19rem] w-full items-center justify-center rounded-[2rem] bg-[color:var(--color-bg-inverse-bolder)] p-10 shadow-[0px_24px_48px_rgba(15,23,42,0.18)]">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[color:var(--color-bg-interactive-primary)] shadow-[0px_0px_60px_rgba(255,255,255,0.28)]">
            <span className="typo-heading-md font-black text-[color:var(--color-text-interactive-inverse)]">AI</span>
          </div>
          <div className="stack items-center" style={{ gap: "0.4rem" }}>
            <p className="typo-heading-sm text-[color:var(--color-text-base)]">위원회 소집하기</p>
            <p className="typo-body-sm text-[color:var(--color-text-secondary)]">소집 버튼을 눌러 심층 토론을 진행하세요.</p>
          </div>
        </div>
      </div>
    );
  }

  if (tone === "light") {
    return (
      <div className="relative flex min-h-[19rem] w-full items-end overflow-hidden rounded-[2rem] bg-[color:var(--color-bg-primary)] p-6 shadow-[0px_20px_40px_rgba(15,23,42,0.12)] outline outline-1 outline-[color:var(--color-border-primary)]">
        <div className="relative z-10 w-full rounded-[1.5rem] bg-[color:var(--color-bg-primary)]/90 p-5 backdrop-blur">
          <Image
            src="/images/about/judge_result.png"
            alt="의장 결론 예시 카드"
            width={420}
            height={260}
            className="mx-auto h-auto w-full max-w-[16rem] opacity-50"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[19rem] w-full items-center rounded-[2rem] bg-[color:var(--color-bg-primary)] p-6 shadow-[0px_20px_40px_rgba(15,23,42,0.08)] outline outline-1 outline-[color:var(--color-border-primary)]">
      <div className="w-full rounded-[1.5rem] bg-[color:var(--color-bg-secondary)] p-5">
        <div className="mb-4 row-between">
          <div className="row">
            <span className="typo-body-sm rounded-md bg-[color:var(--color-bg-interactive-primary)] px-2 py-1 font-bold text-[color:var(--color-text-interactive-inverse)]">
              급등
            </span>
            <span className="typo-heading-sm text-[color:var(--color-text-primary)]">SSAlLAB</span>
          </div>
        </div>
        <p className="typo-body-md font-semibold text-[color:var(--color-text-primary)]">전일 종가 대비 +5.2% 상승하여 150,000원을 돌파했습니다.</p>
        <p className="mt-2 typo-body-sm text-[color:var(--color-text-secondary)]">변동성에 유의하세요.</p>
      </div>
    </div>
  );
}

export default function AboutProblemSection() {
  return (
    <section className="bg-[color:var(--color-bg-tertiary)] px-6 py-24 md:px-10 lg:px-16 lg:py-32">
      <div className="mx-auto flex max-w-[1152px] flex-col gap-16">
        <Reveal className="text-center">
          <h2 className="typo-heading-3xl text-[color:var(--color-text-primary)]">
            <span className="block">수많은 정보와 차트 속에서</span>
            <span className="block text-[color:var(--color-text-secondary)]">판단이 흐려진 적 없으신가요?</span>
          </h2>
        </Reveal>

        {PROBLEM_SECTIONS.map((section, index) => (
          <Reveal
            key={section.eyebrow}
            delay={index * 0.08}
            className={`grid gap-8 rounded-[2.5rem] bg-[color:var(--color-bg-primary)] p-6 shadow-[0px_16px_32px_rgba(15,23,42,0.08)] md:p-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center ${
              index === 1 ? "lg:[&>*:first-child]:order-2 lg:[&>*:last-child]:order-1" : ""
            }`}
          >
            <div className={`stack ${index === 1 ? "lg:items-end lg:text-right" : ""}`} style={{ gap: "1.25rem" }}>
              <p className="typo-heading-sm text-[color:var(--color-text-interactive-primary)]">{section.eyebrow}</p>
              <h3 className="typo-heading-2xl text-[color:var(--color-text-primary)]">
                {renderMultiline(section.title)}
              </h3>
              <p className="typo-body-lg font-semibold text-[color:var(--color-text-secondary)]">{section.description}</p>
            </div>

            <ProblemVisual tone={section.accentTone} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
