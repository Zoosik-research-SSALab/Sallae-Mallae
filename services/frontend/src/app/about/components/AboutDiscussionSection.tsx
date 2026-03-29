"use client";

import Image from "next/image";
import Reveal from "./Reveal";

export default function AboutDiscussionSection() {
  return (
    <section className="overflow-hidden py-24 lg:py-32">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-24 px-6 lg:px-16">
        <Reveal className="flex w-full flex-col gap-4 lg:px-36">
          <p className="typo-heading-md text-[color:var(--color-text-interactive-primary)]">
            살래말래위원회 토론
          </p>
          <h2 className="typo-heading-3xl text-[color:var(--color-text-primary)] [word-break:keep-all]">
            3인의 전문가가
            <br />
            당신을 위해 토론합니다.
          </h2>
        </Reveal>

        <div className="flex flex-col gap-10 lg:gap-16">
          <div className="hidden items-center justify-between gap-10 lg:flex lg:px-28">
            <Reveal
              className="typo-heading-md flex shrink-0 justify-end self-stretch py-16 text-left font-semibold leading-9 text-[color:var(--color-text-primary)]"
              delay={0.04}
            >
              <p>
                한쪽으로
                <br />
                치우치지 않게
                <br />
                3가지 시선으로
                <br />
                깐깐하게
              </p>
            </Reveal>

            <Reveal className="relative flex flex-1 justify-center" delay={0.08} y={48} scale={0.97}>
              <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(59,130,246,0.12),transparent_65%)] blur-3xl" />
              <Image
                src="/images/about/aboutmock2.svg"
                alt="살래말래위원회 토론 목업 이미지"
                width={980}
                height={620}
                className="relative h-auto w-full max-w-[45rem] object-contain"
              />
            </Reveal>

            <Reveal
              className="typo-heading-md flex shrink-0 items-end justify-end self-stretch py-16 text-right font-semibold leading-9 text-[color:var(--color-text-primary)]"
              delay={0.12}
            >
              <p>
                정해진 결론만
                <br />
                보여주는 대신,
                <br />
                치열한 과정 까지
              </p>
            </Reveal>
          </div>

          <div className="flex flex-col gap-10 lg:hidden">
            <Reveal
              className="typo-heading-md px-10 text-left font-semibold leading-7 text-[color:var(--color-text-primary)]"
              delay={0.04}
            >
              <p>
                한쪽으로
                <br />
                치우치지 않게
                <br />
                3가지 시선으로
                <br />
                깐깐하게
              </p>
            </Reveal>

            <Reveal className="flex justify-center" delay={0.08} y={40} scale={0.98}>
              <Image
                src="/images/about/aboutmock2.svg"
                alt="살래말래위원회 토론 목업 이미지"
                width={316}
                height={209}
                className="h-auto w-full max-w-80 object-contain"
              />
            </Reveal>

            <Reveal
              className="typo-heading-md flex h-20 items-end justify-end px-10 text-right font-semibold leading-7 text-[color:var(--color-text-primary)]"
              delay={0.12}
            >
              <p>
                정해진 결론만
                <br />
                보여주는 대신,
                <br />
                치열한 과정 까지
              </p>
            </Reveal>
          </div>

          <Reveal className="flex justify-center px-10 text-center lg:px-36" delay={0.16}>
            <p className="typo-heading-md font-semibold text-[color:var(--color-text-primary)] lg:leading-9">
              기술적 추세와 내재 가치, 실시간 뉴스를 담당하는
              <br className="hidden lg:block" />
              <span className="lg:hidden">
                <br />
              </span>
              전문가들의 치열한 공방전을
              <br className="lg:hidden" />
              직접 확인해 보세요.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
