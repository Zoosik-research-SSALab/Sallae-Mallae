"use client";

import Image from "next/image";
import { GrLineChart } from "react-icons/gr";
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
      <div className="flex w-full max-w-[400px] aspect-[4/3] items-center justify-center rounded-[2rem] bg-[color:var(--color-bg-inverse-bolder)] px-6 py-6 shadow-[0px_24px_48px_rgba(15,23,42,0.18)] md:py-10">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[color:var(--color-bg-interactive-primary)] shadow-[0px_0px_60px_rgba(255,255,255,0.28)] md:h-20 md:w-20">
            <span className="typo-heading-sm font-black text-[color:var(--color-text-interactive-inverse)] md:text-[2rem]">▶</span>
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
      <div className="relative flex w-full max-w-[400px] aspect-[4/3] flex-col justify-center gap-5 overflow-hidden rounded-[32px] bg-[color:var(--color-bg-primary)] px-6 py-9 shadow-[0px_16px_24px_-4px_rgba(0,0,0,0.16)] md:py-10">
        <div className="flex flex-1 flex-col justify-between gap-3 md:gap-6">
          <div className="flex flex-col gap-3 md:gap-6">
            <div className="flex">
              <div className="rounded-sm bg-[color:var(--color-bg-info-subtle)] px-2 py-1 outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-info)]">
                <span className="typo-body-sm font-medium text-[color:var(--color-text-interactive-primary-hovered)]">신뢰도 85%</span>
              </div>
            </div>

            <div>
              <p className="typo-heading-md text-[color:var(--color-text-interactive-primary)] [text-shadow:0px_1px_2px_rgba(0,0,0,0.16)] md:text-4xl md:leading-10">
                강력 매수
              </p>
            </div>
            <div className="typo-body-sm max-w-[18rem] font-medium text-[color:var(--color-text-primary)]">
              <span>&quot;HBM 기대감과 역사적 저평가 포착.</span>
              <br />
              <span>결론은 &apos;</span>
              <span className="text-[color:var(--color-text-interactive-primary)]">강력 매수</span>
              <span>&apos;입니다.</span>
              <br />
              <span>단, 분할 매수로 접근하세요.&quot;</span>
            </div>
          </div>
        </div>

        <Image
          src="/images/about/judge_result.png"
          alt="의장 결론 예시 카드"
          width={141}
          height={211}
          className="pointer-events-none absolute bottom-0 right-0 h-[211px] w-[141px] opacity-50"
        />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[400px] aspect-[4/3] flex-col items-center justify-center gap-5 rounded-[32px] bg-[color:var(--color-bg-primary)] px-6 py-6 shadow-[0px_16px_24px_-4px_rgba(0,0,0,0.16)] md:py-10">
      <div className="flex w-full flex-col items-center justify-center gap-3 py-3 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[color:var(--color-bg-interactive-primary)]">
          <GrLineChart aria-hidden="true" className="h-8 w-8 stroke-[4] text-[color:var(--color-text-interactive-inverse)]" />
        </div>

        <div className="flex w-full flex-col items-center gap-2">
          <div className="inline-flex w-full items-center justify-center">
            <div className="inline-flex items-center justify-center gap-2">
              <div className="inline-flex flex-col items-center justify-start">
                <div className="typo-heading-sm text-[color:var(--color-text-primary)]">SSAlLAB</div>
              </div>
              <div className="inline-flex flex-col items-center justify-start rounded-sm bg-[color:var(--color-bg-info-subtle)] px-2 py-0.5 outline outline-1 outline-offset-[-1px] outline-[color:var(--color-border-interactive-primary)]">
                <div className="typo-body-sm font-medium text-[color:var(--color-text-interactive-primary)]">급등</div>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col items-center justify-start">
            <p className="typo-body-lg w-full text-center">
              <span className="text-[color:var(--color-text-secondary)]">전일 종가 대비 </span>
              <span className="text-[color:var(--color-text-primary)]">+5.2% 상승</span>
              <span className="text-[color:var(--color-text-secondary)]">하여</span>
              <br />
              <span className="text-[color:var(--color-text-secondary)]">150,000원을 돌파했습니다.</span>
              <br />
              <span className="text-[color:var(--color-text-secondary)]">변동성에 유의하세요.</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AboutProblemSection() {
  return (
    <section className="bg-[color:var(--color-bg-tertiary)] px-6 py-24 md:px-10 lg:px-16 lg:py-32">
      <div className="mx-auto grid w-full max-w-[1440px] grid-cols-12 gap-y-16">
        <Reveal className="col-span-12 text-center min-[769px]:col-start-3 min-[769px]:col-span-8">
          <h2 className="typo-heading-3xl text-[color:var(--color-text-primary)]">
            <span className="block">수많은 정보와 차트 속에서</span>
            <span className="block text-[color:var(--color-text-secondary)]">판단이 흐려진 적 없으신가요?</span>
          </h2>
        </Reveal>

        {PROBLEM_SECTIONS.map((section, index) => (
          <Reveal
            key={section.eyebrow}
            delay={index * 0.08}
            className={`col-span-12 grid w-full gap-8 rounded-[2.5rem] p-10 min-[769px]:grid-cols-12 min-[769px]:items-center ${
              index === 1 ? "min-[769px]:[&>*:first-child]:order-2 min-[769px]:[&>*:last-child]:order-1" : ""
            }`}
          >
            <div
              className={`stack min-w-0 items-center text-center min-[769px]:col-span-7 ${
                index === 1 ? "min-[769px]:items-end min-[769px]:text-right" : "min-[769px]:items-start min-[769px]:text-left"
              }`}
              style={{ gap: "1.25rem" }}
            >
              <p className="typo-heading-sm text-[color:var(--color-text-interactive-primary)]">{section.eyebrow}</p>
              <h3 className="typo-heading-2xl text-[color:var(--color-text-primary)] [word-break:keep-all]">
                {renderMultiline(section.title)}
              </h3>
              <p className="typo-body-lg font-semibold text-[color:var(--color-text-secondary)] [word-break:keep-all]">{section.description}</p>
            </div>

            <div className={`flex justify-center min-[769px]:col-span-5 ${index === 1 ? "min-[769px]:justify-start" : "min-[769px]:justify-end"}`}>
              <ProblemVisual tone={section.accentTone} />
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
