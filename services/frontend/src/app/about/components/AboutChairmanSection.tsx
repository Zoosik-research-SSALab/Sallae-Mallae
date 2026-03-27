"use client";

import Image from "next/image";
import Reveal from "./Reveal";

export default function AboutChairmanSection() {
  return (
    <section className="bg-[color:var(--color-bg-inverse-bolder)] px-6 py-24 md:px-10 lg:px-16 lg:py-32">
      <div className="mx-auto hidden max-w-[1152px] gap-12 md:grid md:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.05fr)] md:items-center">
        <Reveal className="flex justify-center" y={48} scale={0.96}>
          <Image
            src="/images/about/judge_idel.png"
            alt="의장 AI 이미지"
            width={440}
            height={560}
            className="h-auto w-full max-w-[24rem] object-contain"
          />
        </Reveal>

        <Reveal className="stack" delay={0.08} style={{ gap: "1.25rem" }}>
          <p className="typo-heading-md text-[color:var(--color-text-interactive-primary)]">최종 결론</p>
          <h2 className="typo-heading-3xl text-[color:var(--color-text-base)]">
            <span className="block">흔들림 없는 결단,</span>
            <span className="block">의장 AI가 마무리합니다</span>
          </h2>
          <div className="stack typo-body-lg font-semibold text-[color:var(--color-text-tertiary)]" style={{ gap: "0.75rem" }}>
            <p>다양한 의견 속에서도 방향을 잃지 마세요. 치열한 토론이 종료되면, 의장 AI가 객관적이고 냉철하게 의견을 종합합니다.</p>
            <p>
              가장 중요한 <span className="font-extrabold text-[color:var(--color-text-base)]">매수 / 매도 / 보류</span> 중 하나의 명확한 결론과{" "}
              <span className="font-extrabold text-[color:var(--color-text-base)]">판단 신뢰도</span>를 도출하여 당신의 결정을 확실하게 돕습니다.
            </p>
          </div>
        </Reveal>
      </div>

      <Reveal className="mx-auto flex max-w-[1152px] flex-col items-start gap-4 md:hidden" delay={0.08}>
        <div className="grid w-full grid-cols-12 items-end gap-4">
          <div className="col-span-8">
            <p className="text-lg font-extrabold leading-6 text-[color:var(--color-text-interactive-primary)]">최종 결론</p>
          </div>
          <div className="col-span-4 flex justify-end">
            <Image
              src="/images/about/judge_idel.png"
              alt="의장 AI 이미지"
              width={120}
              height={152}
              className="h-auto w-full max-w-[7.5rem] object-contain"
            />
          </div>
        </div>

        <h2 className="w-full text-3xl font-extrabold leading-9 text-[color:var(--color-text-base)]">
          흔들림 없는 결단,
          <br />
          의장 AI가 마무리합니다
        </h2>

        <div className="flex w-full flex-col gap-7 pt-[2.38px] text-sm font-semibold leading-5 text-[color:var(--color-text-tertiary)]">
          <p>
            다양한 의견 속에서도 방향을 잃지 마세요.
            <br />
            치열한 토론이 종료되면, 의장 AI가 객관적이고
            <br />
            냉철하게 의견을 종합합니다.
          </p>
          <p>
            가장 중요한{" "}
            <span className="font-extrabold text-[color:var(--color-text-base)]">매수 / 매도 / 보류</span> 3가지 중
            <br />
            하나의 명확한 결론과{" "}
            <span className="font-extrabold text-[color:var(--color-text-base)]">판단 신뢰도</span>를
            <br />
            도출하여 당신의 결정을 확실하게 돕습니다.
          </p>
        </div>
      </Reveal>
    </section>
  );
}
