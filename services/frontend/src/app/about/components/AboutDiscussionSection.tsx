"use client";

import Image from "next/image";
import Reveal from "./Reveal";

export default function AboutDiscussionSection() {
  return (
    <section className="overflow-hidden py-24 md:py-32">
      <div className="mx-auto grid max-w-[1440px] gap-16 px-6 md:px-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(620px,1.1fr)] lg:items-center lg:px-16">
        <Reveal className="stack" style={{ gap: "1.25rem" }}>
          <p className="typo-heading-sm text-[color:var(--color-text-interactive-primary)]">살래말래위원회 토론</p>
          <h2 className="typo-heading-3xl text-[color:var(--color-text-primary)]">
            3인의 전문가가
            <br />
            당신을 위해 토론합니다
          </h2>
          <div className="typo-body-lg grid gap-6 font-semibold text-[color:var(--color-text-primary)] md:grid-cols-2">
            <p>
              한쪽으로
              <br />
              치우치지 않게
              <br />
              3가지 시선으로
              <br />
              깐깐하게
            </p>
            <p>
              정해진 결론만
              <br />
              보여주는 대신,
              <br />
              치열한 과정까지
            </p>
          </div>
          <p className="typo-body-lg pt-2 font-semibold text-[color:var(--color-text-primary)] md:pt-4">
            기술적 추세와 내재 가치, 실시간 뉴스를 담당하는 전문가들의 치열한 공방전을 직접 확인해 보세요.
          </p>
        </Reveal>

        <Reveal className="relative flex justify-center" delay={0.08} y={48} scale={0.97}>
          <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(59,130,246,0.12),transparent_65%)] blur-3xl" />
          <Image
            src="/images/about/aboutmock2.png"
            alt="살래말래위원회 토론 목업 이미지"
            width={980}
            height={620}
            className="relative h-auto w-full max-w-[50rem] object-contain"
          />
        </Reveal>
      </div>
    </section>
  );
}
