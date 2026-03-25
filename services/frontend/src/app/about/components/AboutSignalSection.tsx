"use client";

import Image from "next/image";
import Reveal from "./Reveal";

export default function AboutSignalSection() {
  return (
    <section className="px-6 py-20 md:px-10 lg:px-16 lg:py-32">
      <div className="mx-auto grid max-w-[1152px] gap-12 lg:grid-cols-[minmax(320px,0.95fr)_minmax(0,1.05fr)] lg:items-center">
        <Reveal className="flex justify-center" y={48} scale={0.97}>
          <Image
            src="/images/about/aboutmock1.png"
            alt="종합매매신호 목업 이미지"
            width={520}
            height={760}
            className="h-auto w-full max-w-[28rem] object-contain"
          />
        </Reveal>

        <Reveal className="stack" delay={0.08} style={{ gap: "1.25rem" }}>
          <p className="typo-heading-sm text-[color:var(--color-text-interactive-primary)]">종합매매신호</p>
          <h2 className="typo-heading-3xl text-[color:var(--color-text-primary)]">
            <span className="block">감정을 배제한</span>
            <span className="block">명확한 매매 시그널</span>
          </h2>
          <div className="stack typo-body-lg font-semibold text-[color:var(--color-text-secondary)]" style={{ gap: "0.75rem" }}>
            <p>투자자의 가장 큰 적은 감정입니다. 살래말래위원회는 딥러닝과 머신러닝 알고리즘을 통해 철저하게 정량적 데이터 기반의 매수·매도 시그널을 산출합니다.</p>
            <p>이제 언제 사고 언제 팔아야 할지, 타이밍을 확인하세요.</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
